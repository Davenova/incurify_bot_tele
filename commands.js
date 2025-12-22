import { sendMessage, editMessage, answerCallback } from "./functions.js";
import {
  saveBasicUser,
  saveXHandle,
  saveWallet,
  getUserByTelegramId,
  getUserByAny,
  getAllUsersPaginated,
  updateUserByAny,
  deleteUserByAny
} from "./db.js";
import {
  isAdmin,
  validateEVM,
  validateSOL
} from "./functions.js";

/**
 * In-memory state store (safe for short-lived flows)
 * key = telegram user id
 */
const userStates = new Map();

/* =========================
   MAIN COMMAND HANDLER
========================= */
export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const from = message.from;

  if (!text) return;

  /* ---------- /start ---------- */
  if (text === "/start") {
    await saveBasicUser(from);

    return sendMessage(chatId,
      `👋 *Welcome!*

Available commands:
• /recordinfo — Save your X & wallet info
• /getinfo — View your saved details
• /updateinfo — Update your info
• /help — Help & FAQs

Choose an option below 👇`,
      {
        inline_keyboard: [
          [{ text: "👤 User Info", callback_data: "getinfo" }],
          [{ text: "❓ Help", callback_data: "help" }],
          [{ text: "📘 FAQs", callback_data: "faqs" }]
        ]
      }
    );
  }

  /* ---------- /help ---------- */
  if (text === "/help") {
    return sendMessage(chatId,
      `ℹ️ *Help*

• /recordinfo — save X & wallet
• /getinfo — view your info
• /updateinfo — update details

Admins have additional commands.`,
      { parse_mode: "Markdown" }
    );
  }

  /* ---------- /recordinfo ---------- */
  if (text === "/recordinfo") {
    userStates.set(from.id, { step: "WAIT_X" });

    return sendMessage(chatId,
      "✏️ Send your *X (Twitter) username* (without @):",
      { parse_mode: "Markdown" }
    );
  }

  /* ---------- /getinfo ---------- */
  if (text === "/getinfo") {
    const user = await getUserByTelegramId(from.id);

    if (!user || !user.xHandle) {
      return sendMessage(chatId, "❌ No info found. Use /recordinfo first.");
    }

    let msg = `👤 *Your Info*\n\n`;
    msg += `X: @${user.xHandle}\n`;

    if (user.wallet) {
      msg += `Chain: ${user.wallet.chain}\n`;
      msg += `Address: \`${user.wallet.address}\``;
    } else {
      msg += `Wallet: Not provided`;
    }

    return sendMessage(chatId, msg, { parse_mode: "Markdown" });
  }

  /* ---------- ADMIN COMMANDS ---------- */
  if (text.startsWith("/cast")) {
    if (!isAdmin(from.id)) {
      return sendMessage(chatId, "❌ Admin only.");
    }

    const content = text.replace("/cast", "").trim();
    if (!content) {
      return sendMessage(chatId, "Usage: /cast <message>");
    }

    const users = await getAllUsersPaginated(1, 10000);

    for (const u of users.data) {
      await sendMessage(u.telegramId, content, { parse_mode: "Markdown" });
    }

    return sendMessage(chatId, `✅ Broadcast sent to ${users.data.length} users.`);
  }

  if (text.startsWith("/getuser")) {
    if (!isAdmin(from.id)) return sendMessage(chatId, "❌ Admin only.");

    const query = text.split(" ")[1];
    if (!query) return sendMessage(chatId, "Usage: /getuser <@username|id>");

    const user = await getUserByAny(query);
    if (!user) return sendMessage(chatId, "User not found.");

    return sendMessage(chatId,
      `👤 *User Info*
Telegram: ${user.firstName} ${user.lastName || ""}
Username: @${user.username || "N/A"}
ID: ${user.telegramId}
Joined: ${user.createdAt}

X: ${user.xHandle || "N/A"}
Wallet: ${user.wallet?.address || "N/A"}`,
      { parse_mode: "Markdown" }
    );
  }

  if (text.startsWith("/deleteuser")) {
    if (!isAdmin(from.id)) return sendMessage(chatId, "❌ Admin only.");

    const query = text.split(" ")[1];
    if (!query) return sendMessage(chatId, "Usage: /deleteuser <@username|id>");

    await deleteUserByAny(query);
    return sendMessage(chatId, "🗑 User deleted.");
  }

  if (text.startsWith("/infoall")) {
    if (!isAdmin(from.id)) return sendMessage(chatId, "❌ Admin only.");

    const page = Number(text.split(" ")[1]) || 1;
    const result = await getAllUsersPaginated(page, 5);

    let msg = `📊 *All Users* (Page ${page})\n\n`;
    result.data.forEach((u, i) => {
      msg += `${i + 1}. ${u.firstName} (@${u.username || "N/A"})\n`;
    });

    const buttons = [];
    if (result.hasPrev) buttons.push({ text: "⬅️ Prev", callback_data: `infoall:${page - 1}` });
    if (result.hasNext) buttons.push({ text: "➡️ Next", callback_data: `infoall:${page + 1}` });

    return sendMessage(chatId, msg, {
      parse_mode: "Markdown",
      inline_keyboard: [buttons]
    });
  }

  /* ---------- STATE HANDLER ---------- */
  const state = userStates.get(from.id);
  if (!state) return;

  if (state.step === "WAIT_X") {
    await saveXHandle(from.id, text);

    userStates.set(from.id, { step: "WAIT_CHAIN" });

    return sendMessage(chatId,
      "Select wallet chain:",
      {
        inline_keyboard: [
          [{ text: "EVM / ERC20", callback_data: "chain:EVM" }],
          [{ text: "SOL", callback_data: "chain:SOL" }],
          [{ text: "BNB", callback_data: "chain:BNB" }],
          [{ text: "Skip", callback_data: "chain:SKIP" }]
        ]
      }
    );
  }
}

/* =========================
   CALLBACK HANDLER
========================= */
export async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  await answerCallback(query.id);

  if (data === "getinfo") {
    return handleCommand({ text: "/getinfo", chat: { id: chatId }, from: query.from });
  }

  if (data === "help") {
    return handleCommand({ text: "/help", chat: { id: chatId }, from: query.from });
  }

  if (data.startsWith("chain:")) {
    const chain = data.split(":")[1];

    if (chain === "SKIP") {
      userStates.delete(userId);
      return editMessage(chatId, query.message.message_id, "✅ Info saved (wallet skipped).");
    }

    userStates.set(userId, { step: "WAIT_WALLET", chain });

    return editMessage(
      chatId,
      query.message.message_id,
      `Send your *${chain} wallet address*:`,
      { parse_mode: "Markdown" }
    );
  }

  if (data.startsWith("infoall:")) {
    const page = Number(data.split(":")[1]);
    return handleCommand({
      text: `/infoall ${page}`,
      chat: { id: chatId },
      from: query.from
    });
  }
}
