import { handleCommand } from "../commands.js";
import { sendMessage } from "../functions.js";

export default async function handler(req, res) {
  const update = req.body;

  if (update.message) {
    await handleCommand(update.message);
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id;
    const data = update.callback_query.data;

    if (data === "USER_INFO") {
      await sendMessage(chatId, "Use /getinfo to view your data.");
    }

    if (data === "HELP") {
      await sendMessage(chatId, "Use /help to see commands.");
    }

    if (data === "FAQ") {
      await sendMessage(chatId, "FAQs coming soon.");
    }

    if (data.startsWith("CHAIN_")) {
      const chain = data.replace("CHAIN_", "");
      userStates.set(update.callback_query.from.id, {
        ...userStates.get(update.callback_query.from.id),
        step: "WALLET",
        chain
      });

      await sendMessage(chatId, `Send your ${chain} wallet address:`);
    }

    if (data === "SKIP_WALLET") {
      userStates.delete(update.callback_query.from.id);
      await sendMessage(chatId, "Skipped wallet entry.");
    }
  }

  res.status(200).send("OK");
}
