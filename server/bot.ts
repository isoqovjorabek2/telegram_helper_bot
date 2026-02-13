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
            await currentBot.sendMessage(chatId, "Keling, 10 ta savol orqali holatingizni aniqlaymiz.\n\n1-savol: " + DIAGNOSTIC_QUESTIONS[0]);
          } else if (user.testState && typeof user.testState === 'object' && !(user.testState as any).isComplete) {
            const state = user.testState as { currentQuestion: number, answers: string[], isComplete: boolean };
            state.answers.push(msg.text || "");
            state.currentQuestion++;

            if (state.currentQuestion < DIAGNOSTIC_QUESTIONS.length) {
              await storage.updateUser(user.id, { testState: state });
              await currentBot.sendMessage(chatId, `${state.currentQuestion + 1}-savol: ${DIAGNOSTIC_QUESTIONS[state.currentQuestion]}`);
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
                await currentBot.sendMessage(chatId, "\nSizga mos psixologni topish uchun '📚 Psixologlar Katalogi' bo'limiga o'tishingiz mumkin.");
              } catch (err) {
                console.error("AI Error:", err);
                await currentBot.sendMessage(chatId, "Kechirasiz, tahlil qilishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.");
              }
            }
          } else if (msg.text === "📚 Psixologlar Katalogi") {
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
          } else if (msg.text === "💑 Munosabatlar bo'yicha psixolog" || msg.text === "🎨 Art Terapevt") {
            const caption = `👤 **Suyunova Muhayyo**\n📍 Amaliy psixolog\n\nMen 2 yildan ortiq vaqt davomida onlayn va offlayn ko‘rinishda psixologik konsultatsiyalar olib borib, ayollarning ichki holatini tiklash, oilaviy muammolardan chiqish va o‘ziga bo‘lgan ishonchni shakllantirishda yordam beraman.\n\n📌 **Men yordam beradigan holatlar:**\n💔 Ayollikni yo‘qotish, o‘zini qadrsiz his qilish\n❤️ Eri yoki qaynonasi bilan emotsional tushunmovchiliklar\n👨‍👩‍👧 Ota-ona bilan bolalikdan qolgan ichki og‘riqlar\n💸 Moliyaviy bloklar va pul bilan bog‘liq psixologik cheklovlar\n😔 Stress, ichki bosim va ruhiy charchoq\n🔢 O‘z yo‘lini topishda sonlar orqali yo‘nalish aniqlash\n\n🎯 **Ish uslublarim:**\n✅ Art-terapiya\n✅ Mak-karta orqali ichki holatni ochish\n✅ Neyrografika yordamida hissiyotlarni bo‘shatish\n✅ Meditatsiya va amaliy mashqlar\n\n🌷 **Shiorim:**\n“Har bir ayol ichida kuch bor — men uni uyg‘onishiga yordam beraman.”`;
            
            try {
              // Using local file path for Replit environment
              await currentBot.sendPhoto(chatId, "./client/public/images/muhayyo.jpg", {
                caption: caption,
                parse_mode: 'Markdown'
              });
            } catch (err) {
              console.error("Error sending photo:", err);
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
            }
          } else if (msg.text === "👶 Bolalar Psixologi") {
            await currentBot.sendMessage(chatId, "Bolalar psixologlari ro'yxati shakllantirilmoqda. Tez orada bu yerda ma'lumotlar paydo bo'ladi.");
          } else if (msg.text === "🎨 Art Terapevt") {
            await currentBot.sendMessage(chatId, "Art terapevtlar ro'yxati shakllantirilmoqda. Tez orada bu yerda ma'lumotlar paydo bo'ladi.");
          } else if (msg.text === "🧘 Yoga Trener") {
            await currentBot.sendMessage(chatId, "Yoga trenerlari ro'yxati shakllantirilmoqda. Tez orada bu yerda ma'lumotlar paydo bo'ladi.");
          } else if (msg.text === "🚀 Kouch") {
            await currentBot.sendMessage(chatId, "Kouchlar ro'yxati shakllantirilmoqda. Tez orada bu yerda ma'lumotlar paydo bo'ladi.");
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
            await currentBot.sendMessage(chatId, "Savollar va takliflar bo'yicha bizning adminimiz bilan bog'laning:\n\n👉 @psixolog_top_admin\n\nBiz har qanday murojaatga javob berishga tayyormiz.", { parse_mode: 'Markdown' });
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
