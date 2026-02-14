import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const DIAGNOSTIC_QUESTIONS = [
  "Oxirgi vaqtda o'zingizni qanday his qilyapsiz? (Umumiy holatingiz)",
  "Uyqungizda o'zgarishlar bormi? (Uyqusizlik yoki ko'p uxlash)",
  "Ishtahangiz qanday? (O'zgarishlar bormi?)",
  "Yaqinlaringiz bilan munosabatlaringiz sizni qoniqtiradimi?",
  "O'zingizga bo'lgan ishonchingiz darajasini qanday baholaysiz?",
  "Tez-tez tashvish yoki qo'rquv his qilasizmi?",
  "Kelajakka bo'lgan qarashingiz qanday? (Umidli yoki umidsiz)",
  "Kunlik ishlaringizga kuchingiz yetyaptimi? (Horg'inlik bormi?)",
  "Sizni eng ko'p nima bezovta qilyapti?",
  "Psixologdan qanday yordam kutayotgan edingiz?"
];

let bot: TelegramBot | null = null;

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
    return null;
  }

  if (bot) {
    console.log("Bot already running, skipping initialization.");
    return bot;
  }

  try {
    // polling: true starts the bot immediately
    bot = new TelegramBot(token, { polling: true });

    bot.on("message", async (msg) => {
      try {
        const currentBot = bot;
        if (!currentBot) return;

        const telegramId = msg.from?.id.toString();
        if (!telegramId) return;

        // 1. Find or Create User
        let user = await storage.getUserByTelegramId(telegramId);
        if (!user) {
          user = await storage.createUser({
            telegramId,
            username: msg.from?.username,
            firstName: msg.from?.first_name,
            lastName: msg.from?.last_name,
            languageCode: msg.from?.language_code,
            isBot: msg.from?.is_bot,
          });
        }

        // 2. Save Message
        await storage.createMessage({
          userId: user.id,
          messageId: msg.message_id,
          content: msg.text || (msg.photo ? "[Photo]" : "[Non-text message]"),
          rawData: msg,
        });

        // 3. Simple Response Logic
        if (msg.text) {
          const chatId = msg.chat.id;

          if (msg.text.startsWith('/start')) {
            const onboardingText = `🌿 Psixolog Top’ga xush kelibsiz!

Ba’zan hayotda hammasi joyida ko‘ringan bo‘lsa ham,
ichingizda tushunarsiz og‘irlik, charchoq yoki savollar bo‘ladi.

💔 Munosabatlar…
😔 O‘ziga ishonchsizlik…
😟 Stress, qo‘rquv, ikkilanish…
$ qarz, pulsizlik
Farzand tarbiyasidagi qiyinchiliklar
Shaxsiy Rivoj

Bu holatlarda siz yolg‘iz emassiz. Sizga yordam berishga tayyormiz!

Quyidagi menudan birini tanlang:`;

            await currentBot.sendMessage(chatId, onboardingText, {
              reply_markup: {
                keyboard: [
                  [{ text: "📝 Bepul Diagnostika" }, { text: "📚 Psixologlar Katalogi" }],
                  [{ text: "ℹ️ Biz haqimizda" }, { text: "👨‍💻 Admin bilan bog'lanish" }],
                  [{ text: "🎓 Bepul Darslar" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "📝 Bepul Diagnostika") {
            await storage.updateUser(user.id, { 
              testState: { currentQuestion: 0, answers: [], isComplete: false } 
            });
            await currentBot.sendMessage(chatId, "Keling, 10 ta savol orqali holatingizni aniqlaymiz.\n\n1-savol: " + DIAGNOSTIC_QUESTIONS[0], {
              reply_markup: { remove_keyboard: true }
            });
          } else if (user.testState && typeof user.testState === 'object' && !(user.testState as any).isComplete) {
            // Check if user is trying to use main menu buttons during diagnostic
            const menuButtons = ["📝 Bepul Diagnostika", "📚 Psixologlar Katalogi", "ℹ️ Biz haqimizda", "👨‍💻 Admin bilan bog'lanish", "🎓 Bepul Darslar"];
            if (menuButtons.includes(msg.text || "")) {
              // Reset state and handle as new command
              await storage.updateUser(user.id, { testState: null });
            } else {
              const state = user.testState as { currentQuestion: number, answers: string[], isComplete: boolean };
              state.answers.push(msg.text || "");
              state.currentQuestion++;

              if (state.currentQuestion < DIAGNOSTIC_QUESTIONS.length) {
                await storage.updateUser(user.id, { testState: state });
                await currentBot.sendMessage(chatId, `${state.currentQuestion + 1}-savol: ${DIAGNOSTIC_QUESTIONS[state.currentQuestion]}`);
                return; // Prevent further processing
              } else {
                state.isComplete = true;
                await storage.updateUser(user.id, { testState: state });
                await currentBot.sendMessage(chatId, "Rahmat! AI tahlil qilmoqda, iltimos kuting...");

                try {
                  const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                      { 
                        role: "system", 
                        content: "Siz 'Psixolog Top' loyihasining g'amxo'r va samimiy assistentisiz. Foydalanuvchining 10 ta savolga bergan javoblarini tahlil qiling. Javobingiz quruq va robotlashgan bo'lmasin. Huddi yaqin do'stidek, uni tushunayotganingizni va his qilayotganingizni bildirib, juda yumshoq va insoniy tilda yozing. Uni qo'llab-quvvatlang. Oxirida esa unga aynan qaysi yo'nalishdagi psixolog ko'proq yordam bera olishini maslahat sifatida kiriting. O'zbek tilida javob bering." 
                      },
                      { 
                        role: "user", 
                        content: state.answers.map((a, i) => `${i+1}. ${DIAGNOSTIC_QUESTIONS[i]}: ${a}`).join("\n") 
                      }
                    ]
                  });

                  const diagnosis = response.choices[0].message.content;
                  await currentBot.sendMessage(chatId, "📊 Diagnostika natijasi:\n\n" + diagnosis);
                  await currentBot.sendMessage(chatId, "\nSizga mos psixologni topish uchun '📚 Psixologlar Katalogi' bo'limiga o'tishingiz mumkin.", {
                    reply_markup: {
                      keyboard: [
                        [{ text: "📝 Bepul Diagnostika" }, { text: "📚 Psixologlar Katalogi" }],
                        [{ text: "ℹ️ Biz haqimizda" }, { text: "👨‍💻 Admin bilan bog'lanish" }],
                        [{ text: "🎓 Bepul Darslar" }]
                      ],
                      resize_keyboard: true
                    }
                  });
                } catch (err) {
                  console.error("AI Error:", err);
                  await currentBot.sendMessage(chatId, "Kechirasiz, tahlil qilishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.");
                }
                return; // Prevent further processing
              }
            }
          }

          if (msg.text === "📚 Psixologlar Katalogi") {
            await currentBot.sendMessage(chatId, "Quyidagi yo'nalishlardan birini tanlang:", {
              reply_markup: {
                keyboard: [
                  [{ text: "💑 Munosabatlar bo'yicha psixolog" }, { text: "👶 Bolalar Psixologi" }],
                  [{ text: "🎨 Art Terapevt" }, { text: "🧘 Yoga Trener" }],
                  [{ text: "🚀 Kouch" }],
                  [{ text: "🔙 Orqaga" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "💑 Munosabatlar bo'yicha psixolog") {
            await currentBot.sendMessage(chatId, "Munosabatlar bo'yicha mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Suyunova Muhayyo" }, { text: "👤 Erkinova Sevara" }],
                  [{ text: "👤 Azimova Muxlisa" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "📚 Katalogga qaytish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "🎨 Art Terapevt") {
            await currentBot.sendMessage(chatId, "Art Terapevtlarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Suyunova Muhayyo" }, { text: "👤 Erkinova Sevara" }],
                  [{ text: "👤 Azimova Muxlisa" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "📚 Katalogga qaytish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "👶 Bolalar Psixologi") {
            await currentBot.sendMessage(chatId, "Bolalar psixologlari:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Umarova Fotima" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "👤 Alibayeva Umida" }],
                  [{ text: "📚 Katalogga qaytish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "🧘 Yoga Trener") {
            await currentBot.sendMessage(chatId, "Yoga va meditatsiya mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "🧘 Yoga Mutaxassisi" }],
                  [{ text: "📚 Katalogga qaytish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "🚀 Kouch") {
            await currentBot.sendMessage(chatId, "Kouch va mentorlarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Dilrabo Ilxomjonovna" }],
                  [{ text: "📚 Katalogga qaytish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "📚 Katalogga qaytish") {
            await currentBot.sendMessage(chatId, "Yo'nalishni tanlang:", {
              reply_markup: {
                keyboard: [
                  [{ text: "💑 Munosabatlar bo'yicha psixolog" }, { text: "👶 Bolalar Psixologi" }],
                  [{ text: "🎨 Art Terapevt" }, { text: "🧘 Yoga Trener" }],
                  [{ text: "🚀 Kouch" }],
                  [{ text: "🔙 Orqaga" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "👤 Suyunova Muhayyo") {
            const caption = `👤 **Suyunova Muhayyo**\n📍 Amaliy psixolog\n\nMen 2 yildan ortiq vaqt davomida onlayn va offlayn ko‘rinishda psixologik konsultatsiyalar olib borib, ayollarning ichki holatini tiklash, oilaviy muammolardan chiqish va o‘ziga bo‘lgan ishonchni shakllantirishda yordam beraman.\n\n📌 **Men yordam beradigan holatlar:**\n💔 Ayollikni yo‘qotish, o‘zini qadrsiz his qilish\n❤️ Eri yoki qaynonasi bilan emotsional tushunmovchiliklar\n👨‍👩‍👧 Ota-ona bilan bolalikdan qolgan ichki og‘riqlar\n💸 Moliyaviy bloklar va pul bilan bog‘liq psixologik cheklovlar\n😔 Stress, ichki bosim va ruhiy charchoq\n🔢 O‘z yo‘lini topishda sonlar orqali yo‘nalish aniqlash\n\n🎯 **Ish uslublarim:**\n✅ Art-terapiya\n✅ Mak-karta orqali ichki holatni ochish\n✅ Neyrografika yordamida hissiyotlarni bo‘shatish\n✅ Meditatsiya va amaliy mashqlar\n\n🌷 **Shiorim:**\n“Har bir ayol ichida kuch bor — men uni uyg‘onishiga yordam beraman.”`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/muhayyo.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Erkinova Sevara") {
            const caption = `👤 **Erkinova Sevara Najmiddin qizi**\n📍 Amaliy psixolog | EMU University o’qituvchisi\n\nMen insonni stressdan asabiylikdan chiqarishda, ayollikni his etishda, o’ziga ishonchni oshirishda, ota-ona, turmusho’rtoq hamda farzand bilan munosabatlarni yaxshilashda amaliy ko’mak beraman.\n\n📚 **Faoliyat va tajriba:**\n1) 6 yillik nazariy tajriba.\n2) 3 yildan ortiq amaliy tajriba.\n3) Shaxsiy konsultatsiyalar, trening va art-terapiya.\n\n🎯 **Asosiy yo’nalishlar:**\nShaxsiy o‘sish | Oila psixologiyasi | Stress boshqarish | Motivatsiya | Art-terapiya | Neyrografika\n\n🌷 **Shiorim:**\n“Hech narsa shunchaki bo’lmaydi, hamma narsada hikmat bor va bu hikmatni ko’rishda yordam beraman.”`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/sevara.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Azimova Muxlisa") {
            const caption = `👤 **Azimova Muxlisa Baxtiyor qizi**\n📍 Pedagog Psixolog\n\nMen insonlarning o'ziga bo'lgan ishonchini mustahkamlashda, stressda, xotirjamlikni barqarorlashtirishda, muammolarga art-terapiya (chizgilar) yordamida yechim topishda yordam beraman.\n\n📚 **Faoliyat va tajriba:**\n✅ 4 yillik nazariy bilim\n✅ 2 yillik amaliy tajriba\n✅ "Anor" amaliy psixologlar klubi a'zosi\n\n🎯 **Asosiy yo'nalishlar:**\nArt terapiya | Munosabatlar | Mandala terapiya | Oila Psixologiyasi | Neyrografika | Moliyaviy rivoj | Ayollik energiyasi\n\n🌟 **Shaxsiy Shior:**\n“Hozir yoki hech qachon!!! Har bir kichik qadam katta maqsadlar sari yo'l ochadi..!!”`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/muxlisa.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Mamasharipova Laylo") {
            const caption = `👤 **Mamasharipova Laylo Alisher qizi**\n📍 Oila va bolalar psixologi | Magistrant\n\nMen oila muammolari, bolalardagi rivojlanish va emotsional holatlar bilan ishlashda 4 yillik amaliy tajribaga ega mutaxassisman.\n\n📚 **Mutaxassislik:**\n✅ Oila va bolalar psixologi\n✅ Neyrograf va Art Terapevt\n✅ Psixoanaliz bo'yicha mutaxassis\n\n🎯 **Yo'nalishlar:**\nShaxsiy konsultatsiya | Shogirdlik kurslari | Bolalar psixologiyasi\n\n✨ *Psixologik o'zgarish sari birinchi qadamni birgalikda qo'yamiz!*`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/laylo.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Umarova Fotima") {
            const caption = `👤 **Umarova Fotima Rixsiboyevna**\n📍 Oliy ma’lumotli psixolog | Oila va bolalar psixologi | Lirik-logoped\n\nMen bolalardagi rivojlanish kechikishlari (ZPR, ZRR, RAS, Autizm) va duduqlanish onaning ruhiy holatiga bog'liqligini ko'rsatib beraman. Ona bilan ishlab, farzandning holati yaxshilanishiga yordam beraman.\n\n🏆 **Yutuq va tajriba:**\n✅ 13 yillik logopedik tajriba\n✅ 3 yillik amaliy psixologik tajriba\n✅ "Yilning eng malakali logopedi" nominatsiyasi g'olibi\n✅ "Anor" amaliy psixologlar klubi a'zosi\n\n🎯 **Asosiy yo'nalishlar:**\nPsichoanaliz | Oila va bolalar psixologiyasi | Nutq chiqarish | duduqlanishni davolash | Neyrografika | Kouching\n\n🌟 **Maqsadim:**\nJamiyatimizda sog'lom avlod ko'payishiga va insonlarning baxtli yashashiga sababchi bo'lish.`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/fotima.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Alibayeva Umida") {
            const caption = `👤 **Umida Alibayeva Asomiddinovna**\n📍 Psixoanalit | Oila va bolalar psixologi\n\nMen 7 yillik amaliy tajribaga ega psixologman. Insonning ichki dunyosini tushunish, oilaviy munosabatlarni sog'lomlashtirish va bolalardagi psixologik o'zgarishlarni to'g'ri yo'naltirishda yordam beraman.\n\n📚 **Tajriba va Yo'nalishlar:**\n✅ 7 yillik amaliy tajriba\n✅ Shaxsiy psixologik tahlil (Psixoanaliz)\n✅ Oila va juftliklar bilan ishlash\n✅ Bolalar va o'smirlar psixologiyasi\n\n🎯 **Asosiy maqsadim:**\nInsonlarga o'zligini anglashda va hayotiy qiyinchiliklarni ruhiy xotirjamlik bilan yengishda ko'maklashish.\n\n🌟 **Shiorim:**\n“O‘zini anglagan inson — baxtli inson!”`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/umida.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "🧘 Yoga Mutaxassisi") {
            const caption = `🧘 **Yoga va Meditatsiya bo'yicha mutaxassis**\n\n📜 **Ma'lumoti va tajribasi:**\n1) Heartfulness meditatsiyasi bo'yicha sertifikatlangan trener.\n2) IHYTP RYT-200 xalqaro yoga va meditatsiya instruktori.\n3) Yogaschool YTTC-100 o'qituvchilar kursini tamomlagan.\n4) Yoga Federation: Perinatal yoga (homiladorlar uchun yoga) mutaxassisi.\n\n🇮🇳 Hindistondagi **Kanha Shanti Vanam** ashramida tahsil olgan va o'sha yerda malaka oshirgan. Ko'plab sayyor retreitlar tashkilotchisi.\n\n✨ **Yo'nalishlar:**\n✅ Kattalar uchun yoga\n✅ Bolalar uchun yoga\n✅ Meditatsiya amaliyotlari\n✅ Homiladorlar uchun maxsus yoga`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/yoga_instructor.png", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Dilrabo Ilxomjonovna") {
            const caption = `👤 **Dilrabo Ilxomjonovna**\n📍 Oliy ma’lumotli psixolog va mentor\n\nMen 11 yillik professional tajribaga ega psixolog va mentor sifatida, insonlarning ichki kuchini ochishga, qo'rquvlarini yengishga va o'ziga bo'lgan ishonchini oshirishga yordam beraman.\n\n📚 **Faoliyat yo'nalishlarim:**\n✅ Psixoterapya va kouching\n✅ Seminar-treninglar\n✅ Individual konsultatsiyalar\n\n🌟 **Maqsadim:**\nInsonlar hayotida ijobiy o'zgarishlarga ilhom berish. Har bir insonda cheksiz imkoniyatlar borligiga ishonaman!\n\n☝️ *Ishonch, qat'iyat va ichki kuch — muvaffaqiyat kalitidir!*`;
            const adminMarkup = { inline_keyboard: [[{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/dilraboxon.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "🔙 Orqaga") {
            await currentBot.sendMessage(chatId, "Asosiy menu:", {
              reply_markup: {
                keyboard: [
                  [{ text: "📝 Bepul Diagnostika" }, { text: "📚 Psixologlar Katalogi" }],
                  [{ text: "ℹ️ Biz haqimizda" }, { text: "👨‍💻 Admin bilan bog'lanish" }],
                  [{ text: "🎓 Bepul Darslar" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "ℹ️ Biz haqimizda") {
            await currentBot.sendMessage(chatId, "🌿 **'Psixolog Top' - Ayollar uchun ko'mak va qo'llab-quvvatlash markazi**\n\nBizning maqsadimiz — har bir ayolning ruhiy salomatligini asrash va unga kerakli mutaxassisni topishga ko'maklashish. \n\n✨ **Biz nimalarni taklif qilamiz?**\n✅ Bepul AI-diagnostika tizimi\n✅ Malakali psixologlar va kouchlar katalogi\n✅ Foydali darslar va amaliy mashqlar\n\nSiz yolg'iz emassiz. Biz sizga o'zingizni kashf etishingizda yordam beramiz.", { parse_mode: 'Markdown' });
          } else if (msg.text === "👨‍💻 Admin bilan bog'lanish") {
            await currentBot.sendMessage(chatId, "Savollar va takliflar bo'yicha bizning adminimiz bilan bog'laning:", { 
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]
                ]
              }
            });
          } else if (msg.text === "🎓 Bepul Darslar") {
            await currentBot.sendMessage(chatId, "🎓 **Bepul bilimlar va darslar bo'limi**\n\nHozirda quyidagi darslarimiz mavjud:\n\n1️⃣ **'O'zingni sevish sirlari'** — 3 kunlik marafon\n2️⃣ **'Stressdan chiqish mashqlari'** — Video dars\n3️⃣ **'Ayollik energiyasini uyg'otish'** — Amaliy qo'llanma\n\nDarslarni boshlash uchun admin bilan bog'laning yoki yangiliklarimizni kuzatib boring!", { parse_mode: 'Markdown' });
          } else {
            await currentBot.sendMessage(chatId, `Siz yozdingiz: ${msg.text}`);
          }
        }

      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    console.log("Telegram Bot started successfully!");
    return bot;
  } catch (error) {
    console.error("Failed to start Telegram Bot:", error);
    return null;
  }
}
