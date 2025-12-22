import { handleCommand } from "../commands.js";
import { sendMessage } from "../functions.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body;

  if (update.message?.text) {
    await handleCommand(update.message);
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "HELP") {
      await sendMessage(chatId, "Use /recordinfo to save your data.");
    }
    if (data === "FAQ") {
      await sendMessage(chatId, "FAQ coming soon.");
    }
    if (data === "USER_INFO") {
      await sendMessage(chatId, "Use /getinfo to view your details.");
    }
  }

  res.status(200).send("OK");
}
