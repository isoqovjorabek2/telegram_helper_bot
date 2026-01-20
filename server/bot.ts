import TelegramBot from "node-telegram-bot-api";
import { storage } from "./storage";

// Using polling for development. For production, webhooks are better but require SSL and a public domain.
// Replit URLs are public and have SSL, so webhooks are possible, but polling is easier to setup without
// domain verification issues during dev.

let bot: TelegramBot | null = null;

export function setupBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. Bot will not start.");
    return null;
  }

  try {
    // polling: true starts the bot immediately
    bot = new TelegramBot(token, { polling: true });

    bot.on("message", async (msg) => {
      try {
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

Bu holatlarda siz yolg‘iz emassiz.

Quyidagi menudan birini tanlang:`;

            await bot?.sendMessage(chatId, onboardingText, {
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
            await bot?.sendMessage(chatId, "Diagnostika bo'limi tez kunda ishga tushadi. Iltimos, kutib qoling.");
          } else if (msg.text === "📚 Psixologlar Katalogi") {
            await bot?.sendMessage(chatId, "Hozirda bizning katalogimizda malakali ayol psixologlar mavjud. Ro'yxatni shakllantirishimiz uchun kuting.");
          } else if (msg.text === "ℹ️ Biz haqimizda") {
            await bot?.sendMessage(chatId, "Bizning loyihamiz ayollarga ruhiy salomatlik yo'lida yordam berishni maqsad qilgan.");
          } else if (msg.text === "👨‍💻 Admin bilan bog'lanish") {
            await bot?.sendMessage(chatId, "Admin bilan bog'lanish uchun: @admin_username");
          } else if (msg.text === "🎓 Bepul Darslar") {
            await bot?.sendMessage(chatId, "Bepul darslarimiz ro'yxati yaqin orada taqdim etiladi.");
          } else {
            await bot?.sendMessage(chatId, `Siz yozdingiz: ${msg.text}`);
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
