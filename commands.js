import {
  sendMessage,
  inlineButtons,
  isAdmin,
  isValidWallet
} from "./functions.js";

import {
  saveUser,
  updateUser,
  getUserByAny,
  getAllUsers,
  deleteUser
} from "./db.js";

/* TEMP STATE (fast, serverless-safe for short flows) */
const userState = new Map();

export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  /* /start */
  if (text === "/start") {
    await saveUser({
      telegramId: from.id,
      username: from.username || null,
      firstName: from.first_name || null,
      lastName: from.last_name || null,
      registeredAt: new Date()
    });

    return sendMessage(
      chatId,
      `<b>Welcome!</b>\n\nAvailable commands:\n/getinfo — View your info\n/recordinfo — Save X & wallet\n/updateinfo — Update details\n/help — Help menu`,
      inlineButtons([
        [{ text: "👤 User Info", callback_data: "getinfo" }],
        [{ text: "ℹ️ Help", callback_data: "help" }],
        [{ text: "❓ FAQs", callback_data: "faqs" }]
      ])
    );
  }

  /* /help */
  if (text === "/help") {
    return sendMessage(
      chatId,
      `<b>Commands</b>\n\n/getinfo\n/recordinfo\n/updateinfo`
    );
  }

  /* /recordinfo */
  if (text === "/recordinfo") {
    userState.set(from.id, { step: "xhandle" });
    return sendMessage(chatId, "Send your <b>X username</b> (without @)");
  }

  /* ADMIN COMMANDS */
  if (text.startsWith("/cast")) {
    if (!isAdmin(from.id)) return;

    const msg = text.replace("/cast", "").trim();
    const users = await getAllUsers();

    for (const u of users) {
      await sendMessage(u.telegramId, msg);
    }
    return;
  }

  if (text.startsWith("/getuser")) {
    if (!isAdmin(from.id)) return;

    const id = text.split(" ")[1];
    const user = await getUserByAny(id);
    return sendMessage(chatId, `<pre>${JSON.stringify(user, null, 2)}</pre>`);
  }

  if (text.startsWith("/deleteuser")) {
    if (!isAdmin(from.id)) return;
    const id = text.split(" ")[1];
    await deleteUser(id);
    return sendMessage(chatId, "✅ User deleted");
  }

  if (text === "/infoall") {
    if (!isAdmin(from.id)) return;

    const users = await getAllUsers();
    let out = users.map(u =>
      `👤 ${u.username || u.telegramId}\nX: ${u.x || "—"}\nWallet: ${u.wallet || "—"}\n`
    ).join("\n");

    return sendMessage(chatId, out || "No users found");
  }

  /* STEP HANDLING */
  const state = userState.get(from.id);

  if (state?.step === "xhandle") {
    state.x = text;
    state.step = "wallet";
    userState.set(from.id, state);

    return sendMessage(
      chatId,
      "Select wallet chain:",
      inlineButtons([
        [{ text: "EVM", callback_data: "chain_EVM" }],
        [{ text: "ERC20", callback_data: "chain_ERC20" }],
        [{ text: "BNB", callback_data: "chain_BNB" }],
        [{ text: "SOL", callback_data: "chain_SOL" }],
        [{ text: "Skip", callback_data: "skip_wallet" }]
      ])
    );
  }
}

/* CALLBACK HANDLER */
export async function handleCallback(query) {
  const from = query.from;
  const chatId = query.message.chat.id;
  const data = query.data;

  const state = userState.get(from.id);

  if (data === "skip_wallet") {
    await updateUser(from.id, { x: state.x });
    userState.delete(from.id);
    return sendMessage(chatId, "✅ Info saved (wallet skipped)");
  }

  if (data.startsWith("chain_")) {
    state.chain = data.replace("chain_", "");
    state.step = "wallet_address";
    userState.set(from.id, state);
    return sendMessage(chatId, `Send your ${state.chain} wallet address`);
  }
}
