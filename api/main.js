import { handleCommand } from "../commands.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const update = req.body;

  if (update.message?.text) {
    await handleCommand(update.message);
  }

  return res.status(200).send("OK");
}
