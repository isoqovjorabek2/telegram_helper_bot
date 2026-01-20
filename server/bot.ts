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
                      content: "Siz malakali psixologsiz. Foydalanuvchining 10 ta savolga bergan javoblarini tahlil qiling va unga qisqa diagnostika hamda qaysi turdagi psixologga murojaat qilishi kerakligi haqida maslahat bering. O'zbek tilida javob bering." 
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
            await currentBot.sendMessage(chatId, "Hozirda bizning katalogimizda malakali ayol psixologlar mavjud. Ro'yxatni shakllantirishimiz uchun kuting.");
          } else if (msg.text === "ℹ️ Biz haqimizda") {
            await currentBot.sendMessage(chatId, "Bizning loyihamiz ayollarga ruhiy salomatlik yo'lida yordam berishni maqsad qilgan.");
          } else if (msg.text === "👨‍💻 Admin bilan bog'lanish") {
            await currentBot.sendMessage(chatId, "Admin bilan bog'lanish uchun: @admin_username");
          } else if (msg.text === "🎓 Bepul Darslar") {
            await currentBot.sendMessage(chatId, "Bepul darslarimiz ro'yxati yaqin orada taqdim etiladi.");
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
