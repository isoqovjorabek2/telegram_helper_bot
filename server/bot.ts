import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const DIAGNOSTIC_QUESTIONS_UZ = [
  {
    question: "Oxirgi vaqtda o'zingizni qanday his qilyapsiz? (Umumiy holatingiz)",
    options: ["Yaxshi, quvvatga to'laman", "O'rtacha, charchoq bor", "Yomon, tushkunlikdaman", "Juda yomon, holsizman"]
  },
  {
    question: "Uyqungizda o'zgarishlar bormi? (Uyqusizlik yoki ko'p uxlash)",
    options: ["Hammasi joyida", "Uyqusizlik qiynayapti", "Ko'p uxlayapman", "Uyqum notinch"]
  },
  {
    question: "Ishtahangiz qanday? (O'zgarishlar bormi?)",
    options: ["O'zgarmagan", "Ishtaham yo'qolgan", "Haddan tashqari ko'p yeyapman", "Ishtaham tez-tez o'zgarib turibdi"]
  },
  {
    question: "Yaqinlaringiz bilan munosabatlaringiz sizni qoniqtiradimi?",
    options: ["Ha, juda yaxshi", "Qisman qoniqtiradi", "Ko'p tushunmovchiliklar bor", "Munosabatlarimiz sovuqlashgan"]
  },
  {
    question: "O'zingizga bo'lgan ishonchingiz darajasini qanday baholaysiz?",
    options: ["Juda yuqori", "O'rtacha", "Past", "O'zimga mutlaqo ishonmayman"]
  },
  {
    question: "Tez-tez tashvish yoki qo'rquv his qilasizmi?",
    options: ["Yo'q, deyarli his qilmayman", "Ba'zida bo'lib turadi", "Tez-tez tashvishlanaman", "Doimiy qo'rquv ostidaman"]
  },
  {
    question: "Kelajakka bo'lgan qarashingiz qanday? (Umidli yoki umidsiz)",
    options: ["Juda umidli va ijobiy", "O'rtacha, rejalari bor", "Biroz xavotirliman", "Umuman umidim yo'q"]
  },
  {
    question: "Kunlik ishlaringizga kuchingiz yetyaptimi? (Horg'inlik bormi?)",
    options: ["Ha, hammasiga ulguryapman", "Biroz charchoq bor", "Tez horg'inlikni his qilyapman", "Hech narsaga kuchim yetmayapti"]
  },
  {
    question: "Sizni eng ko'p nima bezovta qilyapti?",
    options: ["Munosabatlar", "Moliyaviy muammolar", "Sog'liq yoki tushkunlik", "O'z yo'limni topolmaslik"]
  },
  {
    question: "Psixologdan qanday yordam kutayotgan edingiz?",
    options: ["Maslahat va yo'nalish", "Shunchaki tinglashlarini", "Muammoni ildizi bilan hal qilishni", "Ichki xotirjamlikni topishni"]
  }
];

const DIAGNOSTIC_QUESTIONS_RU = [
  {
    question: "Как вы себя чувствуете в последнее время? (Общее состояние)",
    options: ["Хорошо, полна сил", "Средне, есть усталость", "Плохо, в депрессии", "Очень плохо, нет сил"]
  },
  {
    question: "Есть ли изменения в вашем сне? (Бессонница или сонливость)",
    options: ["Все в порядке", "Мучает бессонница", "Сплю слишком много", "Сон беспокойный"]
  },
  {
    question: "Как ваш аппетит? (Есть ли изменения?)",
    options: ["Не изменился", "Пропал аппетит", "Ем слишком много", "Аппетит часто меняется"]
  },
  {
    question: "Удовлетворены ли вы отношениями с близкими?",
    options: ["Да, очень", "Частично", "Много недопониманий", "Отношения охладились"]
  },
  {
    question: "Как вы оцениваете свой уровень уверенности в себе?",
    options: ["Очень высокий", "Средний", "Низкий", "Совсем не уверена в себе"]
  },
  {
    question: "Часто ли вы чувствуете тревогу или страх?",
    options: ["Нет, почти никогда", "Иногда бывает", "Часто тревожусь", "Постоянно в страхе"]
  },
  {
    question: "Каков ваш взгляд на будущее? (С надеждой или безнадежностью)",
    options: ["С большой надеждой", "Средне, есть планы", "Немного тревожно", "Совсем нет надежды"]
  },
  {
    question: "Хватает ли вам сил на ежедневные дела? (Есть ли усталость?)",
    options: ["Да, все успеваю", "Есть небольшая усталость", "Быстро устаю", "Ни на что нет сил"]
  },
  {
    question: "Что вас беспокоит больше всего?",
    options: ["Отношения", "Финансовые проблемы", "Здоровье или депрессия", "Поиск своего пути"]
  },
  {
    question: "Какую помощь вы ожидаете от психолога?",
    options: ["Совет и направление", "Просто чтобы выслушали", "Решение проблемы в корне", "Обретение внутреннего спокойствия"]
  }
];

const MESSAGES = {
  uz: {
    welcome: "🌿 Psixolog Top’ga xush kelibsiz!\n\nBa’zan hayotda hammasi joyida ko‘ringan bo‘lsa ham, ichingizda tushunarsiz og‘irlik, charchoq yoki savollar bo‘ladi.\n\nQuyidagi menudan birini tanlang:",
    diagnostics: "📝 Bepul Diagnostika",
    catalog: "📚 Psixologlar Katalogi",
    about: "ℹ️ Biz haqimizda",
    admin: "👨‍💻 Admin bilan bog'lanish",
    courses: "🎓 Bepul Darslar",
    back: "🔙 Orqaga",
    lang: "🌐 Tilni o'zgartirish",
    start_diagnostics: "Keling, 10 ta savol orqali holatingizni aniqlaymiz.",
    ai_analyzing: "Rahmat! AI tahlil qilmoqda, iltimos kuting...",
    ai_result: "📊 Diagnostika natijasi:",
    ai_recommendation: "\nSizning holatingizdan kelib chiqib, biz sizga **'{category}'** yo'nalishidagi mutaxassis bilan bog'lanishni maslahat beramiz.",
    ai_error: "Kechirasiz, tahlil qilishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
    about_text: "🌿 **'Psixolog Top' - Ayollar uchun ko'mak va qo'llab-quvvatlash markazi**\n\nBizning maqsadimiz — har bir ayolning ruhiy salomatligini asrash va unga kerakli mutaxassisni topishga ko'maklashish.",
    admin_text: "Savollar va takliflar bo'yicha bizning adminimiz bilan bog'laning:",
    courses_text: "🎓 **Bepul bilimlar va darslar bo'limi**\n\nHozirda quyidagi darslarimiz mavjud...",
    select_cat: "Quyidagi yo'nalishlardan birini tanlang:",
    return_catalog: "📚 Katalogga qaytish",
    cats: {
      rel: "💑 Munosabatlar bo'yicha psixolog",
      child: "👶 Bolalar Psixologi",
      art: "🎨 Art Terapevt",
      yoga: "🧘 Yoga Trener",
      coach: "🚀 Kouch"
    }
  },
  ru: {
    welcome: "🌿 Добро пожаловать в Psixolog Top!\n\nИногда даже когда кажется, что все в порядке, внутри может быть непонятная тяжесть, усталость или вопросы.\n\nВыберите один из пунктов меню:",
    diagnostics: "📝 Бесплатная диагностика",
    catalog: "📚 Каталог психологов",
    about: "ℹ️ О нас",
    admin: "👨‍💻 Связь с админом",
    courses: "🎓 Бесплатные уроки",
    back: "🔙 Назад",
    lang: "🌐 Сменить язык",
    start_diagnostics: "Давайте определим ваше состояние с помощью 10 вопросов.",
    ai_analyzing: "Спасибо! ИИ проводит анализ, пожалуйста, подождите...",
    ai_result: "📊 Результат диагностики:",
    ai_recommendation: "\nИсходя из вашего состояния, мы рекомендуем вам обратиться к специалисту в направлении **'{category}'**.",
    ai_error: "Извините, произошла ошибка при анализе. Пожалуйста, попробуйте позже.",
    about_text: "🌿 **'Psixolog Top' - Центр помощи и поддержки для женщин**\n\nНаша цель — сохранить психическое здоровье каждой женщины и помочь ей найти нужного специалиста.",
    admin_text: "По вопросам и предложениям обращайтесь к нашему админу:",
    courses_text: "🎓 **Раздел бесплатных знаний и уроков**\n\nВ настоящее время доступны следующие уроки...",
    select_cat: "Выберите одно из направлений:",
    return_catalog: "📚 Вернуться в каталог",
    cats: {
      rel: "💑 Психолог по отношениям",
      child: "👶 Детский психолог",
      art: "🎨 Арт-терапевт",
      yoga: "🧘 Йога-тренер",
      coach: "🚀 Коуч"
    }
  }
};

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

        const lang = (user.languageCode === 'ru' || user.languageCode === 'uz') ? user.languageCode : 'uz';
        const t = MESSAGES[lang];
        const questions = lang === 'ru' ? DIAGNOSTIC_QUESTIONS_RU : DIAGNOSTIC_QUESTIONS_UZ;

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
            await currentBot.sendMessage(chatId, "Iltimos, tilni tanlang / Пожалуйста, выберите язык:", {
              reply_markup: {
                keyboard: [
                  [{ text: "🇺🇿 O'zbekcha" }, { text: "🇷🇺 Русский" }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            });
          } else if (msg.text === "🇺🇿 O'zbekcha") {
            await storage.updateUser(user.id, { languageCode: 'uz' });
            const uzT = MESSAGES.uz;
            await currentBot.sendMessage(chatId, uzT.welcome, {
              reply_markup: {
                keyboard: [
                  [{ text: uzT.diagnostics }, { text: uzT.catalog }],
                  [{ text: uzT.about }, { text: uzT.admin }],
                  [{ text: uzT.courses }, { text: uzT.lang }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "🇷🇺 Русский") {
            await storage.updateUser(user.id, { languageCode: 'ru' });
            const ruT = MESSAGES.ru;
            await currentBot.sendMessage(chatId, ruT.welcome, {
              reply_markup: {
                keyboard: [
                  [{ text: ruT.diagnostics }, { text: ruT.catalog }],
                  [{ text: ruT.about }, { text: ruT.admin }],
                  [{ text: ruT.courses }, { text: ruT.lang }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.lang) {
            await currentBot.sendMessage(chatId, "Tilni tanlang / Выберите язык:", {
              reply_markup: {
                keyboard: [
                  [{ text: "🇺🇿 O'zbekcha" }, { text: "🇷🇺 Русский" }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
              }
            });
          } else if (msg.text === t.diagnostics) {
            await storage.updateUser(user.id, { 
              testState: { currentQuestion: 0, answers: [], isComplete: false } 
            });
            const firstQ = questions[0];
            await currentBot.sendMessage(chatId, t.start_diagnostics + "\n\n1-savol/вопрос: " + firstQ.question, {
              reply_markup: {
                keyboard: firstQ.options.map(opt => [{ text: opt }]),
                resize_keyboard: true,
                one_time_keyboard: true
              }
            });
          } else if (user.testState && typeof user.testState === 'object' && !(user.testState as any).isComplete) {
            const menuButtons = [t.diagnostics, t.catalog, t.about, t.admin, t.courses, t.lang, "🇺🇿 O'zbekcha", "🇷🇺 Русский"];
            if (menuButtons.includes(msg.text || "")) {
              await storage.updateUser(user.id, { testState: null });
            } else {
              const state = user.testState as { currentQuestion: number, answers: string[], isComplete: boolean };
              state.answers.push(msg.text || "");
              state.currentQuestion++;

              if (state.currentQuestion < questions.length) {
                await storage.updateUser(user.id, { testState: state });
                const nextQ = questions[state.currentQuestion];
                await currentBot.sendMessage(chatId, `${state.currentQuestion + 1}-savol/вопрос: ${nextQ.question}`, {
                  reply_markup: {
                    keyboard: nextQ.options.map(opt => [{ text: opt }]),
                    resize_keyboard: true,
                    one_time_keyboard: true
                  }
                });
                return;
              } else {
                state.isComplete = true;
                await storage.updateUser(user.id, { testState: state });
                await currentBot.sendMessage(chatId, t.ai_analyzing, {
                  reply_markup: { remove_keyboard: true }
                });

                try {
                  const systemPrompt = lang === 'ru' 
                    ? "Вы заботливый и искренний ассистент проекта 'Psixolog Top'. Проанализируйте ответы пользователя на 10 вопросов. Ваш ответ не должен быть сухим и роботизированным. Пишите как близкий друг, на мягком и человечном языке. Поддержите его. В конце посоветуйте, психолог какого направления сможет помочь ему больше всего. Отвечайте на русском языке."
                    : "Siz 'Psixolog Top' loyihasining g'amxo'r va samimiy assistentisiz. Foydalanuvchining 10 ta savolga bergan javoblarini tahlil qiling. Javobingiz quruq va robotlashgan bo'lmasin. Huddi yaqin do'stidek, uni tushunayotganingizni va his qilayotganingizni bildirib, juda yumshoq va insoniy tilda yozing. Uni qo'llab-quvvatlang. Oxirida esa unga aynan qaysi yo'nalishdagi psixolog ko'proq yordam bera olishini maslahat sifatida kiriting. O'zbek tilida javob bering.";

                  const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                      { role: "system", content: systemPrompt },
                      { 
                        role: "user", 
                        content: state.answers.map((a, i) => `${i+1}. ${questions[i].question}: ${a}`).join("\n") 
                      }
                    ]
                  });

                  const diagnosis = response.choices[0].message.content;
                  await currentBot.sendMessage(chatId, t.ai_result + "\n\n" + diagnosis);

                  let recommendedCategoryKey = 'rel';
                  const lowerDiagnosis = diagnosis?.toLowerCase() || "";
                  if (lowerDiagnosis.includes("bolalar") || lowerDiagnosis.includes("farzand") || lowerDiagnosis.includes("дети") || lowerDiagnosis.includes("ребенок")) {
                    recommendedCategoryKey = 'child';
                  } else if (lowerDiagnosis.includes("art") || lowerDiagnosis.includes("арт") || lowerDiagnosis.includes("творчество")) {
                    recommendedCategoryKey = 'art';
                  } else if (lowerDiagnosis.includes("yoga") || lowerDiagnosis.includes("йога") || lowerDiagnosis.includes("медитация")) {
                    recommendedCategoryKey = 'yoga';
                  } else if (lowerDiagnosis.includes("kouch") || lowerDiagnosis.includes("коуч") || lowerDiagnosis.includes("цель")) {
                    recommendedCategoryKey = 'coach';
                  }

                  const recommendedCategoryName = t.cats[recommendedCategoryKey as keyof typeof t.cats];
                  await currentBot.sendMessage(chatId, t.ai_recommendation.replace('{category}', recommendedCategoryName), {
                    parse_mode: 'Markdown',
                    reply_markup: {
                      keyboard: [
                        [{ text: recommendedCategoryName }],
                        [{ text: t.catalog }],
                        [{ text: t.back }]
                      ],
                      resize_keyboard: true
                    }
                  });
                } catch (err) {
                  console.error("AI Error:", err);
                  await currentBot.sendMessage(chatId, t.ai_error);
                }
                return;
              }
            }
          }

          if (msg.text === t.catalog || msg.text === t.return_catalog) {
            await currentBot.sendMessage(chatId, t.select_cat, {
              reply_markup: {
                keyboard: [
                  [{ text: t.cats.rel }, { text: t.cats.child }],
                  [{ text: t.cats.art }, { text: t.cats.yoga }],
                  [{ text: t.cats.coach }],
                  [{ text: t.back }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.cats.rel) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Наши специалисты по отношениям и личностному росту:" : "Munosabatlar va shaxsiy rivojlanish bo'yicha mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Zamira Xolbayeva" }],
                  [{ text: "👤 Zilola Azimova" }],
                  [{ text: "👤 Suyunova Muhayyo" }, { text: "👤 Erkinova Sevara" }],
                  [{ text: "👤 Azimova Muxlisa" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "👤 Dilrabo Ilxomjonovna" }],
                  [{ text: t.return_catalog }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.cats.art) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Наши арт-терапевты и специалисты по эмоциям:" : "Art Terapevtlar va hissiyotlar bilan ishlovchi mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Zamira Xolbayeva" }],
                  [{ text: "👤 Zilola Azimova" }],
                  [{ text: "👤 Suyunova Muhayyo" }, { text: "👤 Erkinova Sevara" }],
                  [{ text: "👤 Azimova Muxlisa" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "👤 Umarova Fotima" }],
                  [{ text: t.return_catalog }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.cats.child) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Детские и подростковые психологи, специалисты по воспитанию:" : "Bolalar, o'smirlar psixologlari va tarbiya mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Zamira Xolbayeva" }],
                  [{ text: "👤 Zilola Azimova" }],
                  [{ text: "👤 Umarova Fotima" }, { text: "👤 Mamasharipova Laylo" }],
                  [{ text: "👤 Alibayeva Umida" }, { text: "👤 Azimova Muxlisa" }],
                  [{ text: t.return_catalog }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "👤 Zilola Azimova") {
            const caption = `👤 **Zilola Azimova**\nOliy Ma'lumotli Psixolog\n\n💬 Менинг консультацияларимда сиз:\n✨ ҳис-туйғулангизни англашни ўрганасиз\n✨ хавотир ва стрессни бошқариш усулларини билиб оласиз\n✨ ўзингизнинг ички ресурсларингизни қайта тиклайсиз\n✨ ҳаётингизни бошқаришни қайта ўрганасиз\n\n👶 Bolalar bilan ham ishlay olaman`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/zilola.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === t.cats.yoga) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Наши специалисты по йоге, медитации и женской энергии:" : "Yoga, meditatsiya va ayollik energiyasi mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Zamira Xolbayeva" }],
                  [{ text: "🧘 Yoga Mutaxassisi" }, { text: "👤 Suyunova Muhayyo" }],
                  [{ text: t.return_catalog }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.cats.coach) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Наши коучи, менторы и специалисты по достижению целей:" : "Kouch, mentor va maqsadlarga erishish mutaxassislarimiz:", {
              reply_markup: {
                keyboard: [
                  [{ text: "👤 Zamira Xolbayeva" }],
                  [{ text: "👤 Dilrabo Ilxomjonovna" }, { text: "👤 Erkinova Sevara" }],
                  [{ text: t.return_catalog }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "👤 Zamira Xolbayeva") {
            const caption = lang === 'ru'
              ? `👤 **Замира Холбаева Нарзуллаевна**\n\nОснователь Академии Психологии «PsyPro Academy», Практический Психолог, Специалист по отношениям. 13 лет опыта. Психолог с высшим образованием.\n\n✨ 10.000+ довольных клиентов`
              : `👤 **Zamira Xolbayeva Narzullayevna**\n\n“PsyPro Academy” Psixologiya Akademiyasi asoschisi, Amaliy Psixolog, Munosabatlar buyicha mutaxassis. 13 yillik tajriba. Oliy ma’lumotli Psixolog.\n\n✨ 10.000 + mamnun mijozlar`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/zamira.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === t.back) {
            await currentBot.sendMessage(chatId, lang === 'ru' ? "Главное меню:" : "Asosiy menu:", {
              reply_markup: {
                keyboard: [
                  [{ text: t.diagnostics }, { text: t.catalog }],
                  [{ text: t.about }, { text: t.admin }],
                  [{ text: t.courses }, { text: t.lang }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === t.about) {
            await currentBot.sendMessage(chatId, t.about_text, { parse_mode: 'Markdown' });
          } else if (msg.text === t.admin) {
            await currentBot.sendMessage(chatId, t.admin_text, { 
              reply_markup: {
                inline_keyboard: [
                  [{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]
                ]
              }
            });
          } else if (msg.text === t.courses) {
            await currentBot.sendMessage(chatId, t.courses_text, { parse_mode: 'Markdown' });
          } else if (msg.text === "👤 Suyunova Muhayyo") {
            const caption = `👤 **Suyunova Muhayyo**\n📍 Amaliy psixolog\n\nMen 2 yildan ortiq vaqt davomida onlayn va offlayn ko‘rinishda psixologik konsultatsiyalar olib borib, ayollarning ichki holatini tiklash, oilaviy muammolardan chiqish va o‘ziga bo‘lgan ishonchni shakllantirishda yordam beraman.\n\n📌 **Men yordam beradigan holatlar:**\n💔 Ayollikni yo‘qotish, o‘zini qadrsiz his qilish\n❤️ Eri yoki qaynonasi bilan emotsional tushunmovchiliklar\n👨‍👩‍👧 Ota-ona bilan bolalikdan qolgan ichki og‘riqlar\n💸 Moliyaviy bloklar va pul bilan bog‘liq psixologik cheklovlar\n😔 Stress, ichki bosim va ruhiy charchoq\n🔢 O‘z yo‘lini topishda sonlar orqali yo‘nalish aniqlash\n\n🎯 **Ish uslublarim:**\n✅ Art-terapiya\n✅ Mak-karta orqali ichki holatni ochish\n✅ Neyrografika yordamida hissiyotlarni bo‘shatish\n✅ Meditatsiya va amaliy mashqlar\n\n🌷 **Shiorim:**\n“Har bir ayol ichida kuch bor — men uni uyg‘onishiga yordam beraman.”`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/muhayyo.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Erkinova Sevara") {
            const caption = `👤 **Erkinova Sevara Najmiddin qizi**\n📍 Amaliy psixolog | EMU University o’qituvchisi\n\nMen insonni stressdan asabiylikdan chiqarishda, ayollikni his etishda, o’ziga ishonchni oshirishda, ota-ona, turmusho’rtoq hamda farzand bilan munosabatlarni yaxshilashda amaliy ko’mak beraman.\n\n📚 **Faoliyat va tajriba:**\n1) 6 yillik nazariy tajriba.\n2) 3 yildan ortiq amaliy tajriba.\n3) Shaxsiy konsultatsiyalar, trening va art-terapiya.\n\n🎯 **Asosiy yo’nalishlar:**\nShaxsiy o‘sish | Oila psixologiyasi | Stress boshqarish | Motivatsiya | Art-terapiya | Neyrografika\n\n🌷 **Shiorim:**\n“Hech narsa shunchaki bo’lmaydi, hamma narsada hikmat bor va bu hikmatni ko’rishda yordam beraman.”`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/sevara.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Azimova Muxlisa") {
            const caption = `👤 **Azimova Muxlisa Baxtiyor qizi**\n📍 Pedagog Psixolog\n\nMen insonlarning o'ziga bo'lgan ishonchini mustahkamlashda, stressda, xotirjamlikni barqarorlashtirishda, muammolarga art-terapiya (chizgilar) yordamida yechim topishda yordam beraman.\n\n📚 **Faoliyat va tajriba:**\n✅ 4 yillik nazariy bilim\n✅ 2 yillik amaliy tajriba\n✅ "Anor" amaliy psixologlar klubi a'zosi\n\n🎯 **Asosiy yo'nalishlar:**\nArt terapiya | Munosabatlar | Mandala terapiya | Oila Psixologiyasi | Neyrografika | Moliyaviy rivoj | Ayollik energiyasi\n\n🌟 **Shaxsiy Shior:**\n“Hozir yoki hech qachon!!! Har bir kichik qadam katta maqsadlar sari yo'l ochadi..!!”`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/muxlisa.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Mamasharipova Laylo") {
            const caption = `👤 **Mamasharipova Laylo Alisher qizi**\n📍 Oila va bolalar psixologi | Magistrant\n\nMen oila muammolari, bolalardagi rivojlanish va emotsional holatlar bilan ishlashda 4 yillik amaliy tajribaga ega mutaxassisman.\n\n📚 **Mutaxassislik:**\n✅ Oila va bolalar psixologi\n✅ Neyrograf va Art Terapevt\n✅ Psixoanaliz bo'yicha mutaxassis\n\n🎯 **Yo'nalishlar:**\nShaxsiy konsultatsiya | Shogirdlik kurslari | Bolalar psixologiyasi\n\n✨ *Psixologik o'zgarish sari birinchi qadamni birgalikda qo'yamiz!*`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/laylo.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Umarova Fotima") {
            const caption = `👤 **Umarova Fotima Rixsiboyevna**\n📍 Oliy ma’lumotli psixolog | Oila va bolalar psixologi | Lirik-logoped\n\nMen bolalardagi rivojlanish kechikishlari (ZPR, ZRR, RAS, Autizm) va duduqlanish onaning ruhiy holatiga bog'liqligini ko'rsatib beraman. Ona bilan ishlab, farzandning holati yaxshilanishiga yordam beraman.\n\n🏆 **Yutuq va tajriba:**\n✅ 13 yillik logopedik tajriba\n✅ 3 yillik amaliy psixologik tajriba\n✅ "Yilning eng malakali logopedi" nominatsiyasi g'olibi\n✅ "Anor" amaliy psixologlar klubi a'zosi\n\n🎯 **Asosiy yo'nalishlar:**\nPsichoanaliz | Oila va bolalar psixologiyasi | Nutq chiqarish | duduqlanishni davolash | Neyrografika | Kouching\n\n🌟 **Maqsadim:**\nJamiyatimizda sog'lom avlod ko'payishiga va insonlarning baxtli yashashiga sababchi bo'lish.`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/fotima.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Alibayeva Umida") {
            const caption = `👤 **Umida Alibayeva Asomiddinovna**\n📍 Psixoanalit | Oila va bolalar psixologi\n\nMen 7 yillik amaliy tajribaga ega psixologman. Insonning ichki dunyosini tushunish, oilaviy munosabatlarni sog'lomlashtirish va bolalardagi psixologik o'zgarishlarni to'g'ri yo'naltirishda yordam beraman.\n\n📚 **Tajriba va Yo'nalishlar:**\n✅ 7 yillik amaliy tajriba\n✅ Shaxsiy psixologik tahlil (Psixoanaliz)\n✅ Oila va juftliklar bilan ishlash\n✅ Bolalar va o'smirlar psixologiyasi\n\n🎯 **Asosiy maqsadim:**\nInsonlarga o'zligini anglashda va hayotiy qiyinchiliklarni ruhiy xotirjamlik bilan yengishda ko'maklashish.\n\n🌟 **Shiorim:**\n“O‘zini anglagan inson — baxtli inson!”`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/umida.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "🧘 Yoga Mutaxassisi") {
            const caption = `🧘 **Yoga va Meditatsiya bo'yicha mutaxassis**\n\n📜 **Ma'lumoti va tajribasi:**\n1) Heartfulness meditatsiyasi bo'yicha sertifikatlangan trener.\n2) IHYTP RYT-200 xalqaro yoga va meditatsiya instruktori.\n3) Yogaschool YTTC-100 o'qituvchilar kursini tamomlagan.\n4) Yoga Federation: Perinatal yoga (homiladorlar uchun yoga) mutaxassisi.\n\n🇮🇳 Hindistondagi **Kanha Shanti Vanam** ashramida tahsil olgan va o'sha yerda malaka oshirgan. Ko'plab sayyor retreitlar tashkilotchisi.\n\n✨ **Yo'nalishlar:**\n✅ Kattalar uchun yoga\n✅ Bolalar uchun yoga\n✅ Meditatsiya amaliyotlari\n✅ Homiladorlar uchun maxsus yoga`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/yoga_instructor.png", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else if (msg.text === "👤 Dilrabo Ilxomjonovna") {
            const caption = `👤 **Dilrabo Ilxomjonovna**\n📍 Oliy ma’lumotli psixolog va mentor\n\nMen 11 yillik professional tajribaga ega psixolog va mentor sifatida, insonlarning ichki kuchini ochishga, qo'rquvlarini yengishga va o'ziga bo'lgan ishonchini oshirishga yordam beraman.\n\n📚 **Faoliyat yo'nalishlarim:**\n✅ Psixoterapya va kouching\n✅ Seminar-treninglar\n✅ Individual konsultatsiyalar\n\n🌟 **Maqsadim:**\nInsonlar hayotida ijobiy o'zgarishlarga ilhom berish. Har bir insonda cheksiz imkoniyatlar borligiga ishonaman!\n\n☝️ *Ishonch, qat'iyat va ichki kuch — muvaffaqiyat kalitidir!*`;
            const adminMarkup = { inline_keyboard: [[{ text: lang === 'ru' ? "💬 Связаться с админом" : "💬 Admin bilan bog'lanish", url: "https://t.me/Feruza_PsixologTop" }]] };
            try {
              await currentBot.sendPhoto(chatId, "./client/public/images/dilraboxon.jpg", { caption, parse_mode: 'Markdown', reply_markup: adminMarkup });
            } catch (err) {
              await currentBot.sendMessage(chatId, caption, { parse_mode: 'Markdown', reply_markup: adminMarkup });
            }
          } else {
            // bot yana bergan komandani qayta uzimizga yuborish bilan band - Removed this echo behavior
            // await currentBot.sendMessage(chatId, lang === 'ru' ? `Вы написали: ${msg.text}` : `Siz yozdingiz: ${msg.text}`);
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
