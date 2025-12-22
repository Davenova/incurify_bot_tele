import { handleMessage, handleCallback } from "../commands.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).send("OK");
    }

    const update = req.body;

    // Message handler
    if (update.message) {
      await handleMessage(update.message);
    }

    // Inline button handler
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("ERROR");
  }
}
