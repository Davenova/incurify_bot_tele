import { sendMessage, isAdmin } from "./functions.js";
import { saveUser, toggleFeature } from "./db.js";

export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  if (text === "/start") {
    await saveUser({
      telegramId: from.id,
      username: from.username || null,
      name: `${from.first_name || ""} ${from.last_name || ""}`.trim(),
      joinedAt: new Date()
    });

    return sendMessage(chatId, "👋 Welcome! Your info has been saved.");
  }

  if (text.startsWith("/toggle")) {
    if (!isAdmin(from.id)) {
      return sendMessage(chatId, "❌ Admin only command.");
    }

    const [, feature] = text.split(" ");
    if (!feature) {
      return sendMessage(chatId, "Usage: /toggle featureName");
    }

    const state = await toggleFeature(feature);
    return sendMessage(
      chatId,
      `🔧 Feature "${feature}" is now ${state ? "ON" : "OFF"}`
    );
  }

  return sendMessage(chatId, "Unknown command.");
}

