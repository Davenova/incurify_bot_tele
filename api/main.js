import { handleCommand, handleCallback } from "../commands.js";

/**
 * Telegram webhook entry for Vercel
 * URL: https://your-project.vercel.app/api/main
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("OK");
    }

    const update = req.body;

    // Message (commands, text input)
    if (update.message) {
      await handleCommand(update.message);
    }

    // Inline button callbacks
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("OK"); // ALWAYS 200 for Telegram
  }
}
