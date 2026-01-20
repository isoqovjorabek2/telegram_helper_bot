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
            await bot?.sendMessage(chatId, "Salom! Men sizning botingizman. Quyidagi menudan birini tanlang:", {
              reply_markup: {
                keyboard: [
                  [{ text: "📊 Statistika" }, { text: "❓ Yordam" }],
                  [{ text: "📝 Xabar qoldirish" }]
                ],
                resize_keyboard: true
              }
            });
          } else if (msg.text === "📊 Statistika") {
            const usersCount = (await storage.getUsers()).length;
            await bot?.sendMessage(chatId, `Botimizdan foydalanuvchilar soni: ${usersCount} ta`);
          } else if (msg.text === "❓ Yordam") {
            await bot?.sendMessage(chatId, "Bu bot orqali siz biz bilan bog'lanishingiz va xabarlaringizni qoldirishingiz mumkin.");
          } else if (msg.text === "📝 Xabar qoldirish") {
            await bot?.sendMessage(chatId, "Iltimos, xabaringizni yozing. Biz uni albatta ko'rib chiqamiz.");
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
