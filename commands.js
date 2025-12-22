import {
  sendMessage,
  sendInline,
  isAdmin,
  validateWallet
} from "./functions.js";

import {
  saveUser,
  updateUser,
  getUserByAny,
  deleteUser,
  getAllUsers
} from "./db.js";

const userStates = new Map(); // in-memory step tracking

export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  /* ---------- START ---------- */
  if (text === "/start") {
    await saveUser({
      telegramId: from.id,
      username: from.username || null,
      firstName: from.first_name || null,
      lastName: from.last_name || null,
      registeredAt: new Date()
    });

    return sendInline(
      chatId,
      `<b>Welcome ${from.first_name} 👋</b>\n\nChoose an option below:`,
      [
        [{ text: "👤 User Info", callback_data: "USER_INFO" }],
        [{ text: "❓ Help", callback_data: "HELP" }],
        [{ text: "📘 FAQs", callback_data: "FAQ" }]
      ]
    );
  }

  /* ---------- HELP ---------- */
  if (text === "/help") {
    return sendMessage(
      chatId,
      `/recordinfo — save your info
/getinfo — view saved info
/updateinfo — update your data`
    );
  }

  /* ---------- RECORD INFO ---------- */
  if (text === "/recordinfo") {
    userStates.set(from.id, { step: "X_HANDLE" });
    return sendMessage(chatId, "Send your X (Twitter) username (example: @elonmusk)");
  }

  /* ---------- USER INPUT FLOW ---------- */
  if (userStates.has(from.id)) {
    const state = userStates.get(from.id);

    if (state.step === "X_HANDLE") {
      state.xHandle = text;
      state.step = "CHAIN";
      userStates.set(from.id, state);

      return sendInline(
        chatId,
        "Choose wallet chain:",
        [
          [{ text: "EVM", callback_data: "CHAIN_EVM" }],
          [{ text: "ERC20", callback_data: "CHAIN_ERC20" }],
          [{ text: "SOL", callback_data: "CHAIN_SOL" }],
          [{ text: "BNB", callback_data: "CHAIN_BNB" }],
          [{ text: "⏭ Skip", callback_data: "SKIP_WALLET" }]
        ]
      );
    }

    if (state.step === "WALLET") {
      if (!validateWallet(state.chain, text)) {
        return sendMessage(chatId, "❌ Invalid wallet. Please send a valid address.");
      }

      await updateUser(from.id, {
        xHandle: state.xHandle,
        wallet: { chain: state.chain, address: text }
      });

      userStates.delete(from.id);
      return sendMessage(chatId, "✅ Info saved successfully.");
    }
  }

  /* ---------- GET INFO ---------- */
  if (text === "/getinfo") {
    const user = await getUserByAny(from.id);
    if (!user) return sendMessage(chatId, "No data found.");

    return sendMessage(
      chatId,
      `<b>Your Info</b>
X: ${user.xHandle || "N/A"}
Wallet: ${user.wallet?.chain || "N/A"} — ${user.wallet?.address || "N/A"}`
    );
  }

  /* ---------- ADMIN ONLY ---------- */
  if (!isAdmin(from.id)) return;

  if (text === "/listcmds") {
    return sendMessage(
      chatId,
      `<b>Admin Commands</b>
/cast
/getuser
/modifyuser
/deleteuser
/infoall`
    );
  }

  if (text.startsWith("/cast ")) {
    const msg = text.replace("/cast ", "");
    const users = await getAllUsers();

    for (const u of users) {
      await sendMessage(u.telegramId, msg);
    }

    return sendMessage(chatId, "📣 Broadcast sent.");
  }

  if (text.startsWith("/getuser ")) {
    const id = text.split(" ")[1];
    const user = await getUserByAny(id);
    if (!user) return sendMessage(chatId, "User not found.");

    return sendMessage(
      chatId,
      JSON.stringify(user, null, 2)
    );
  }

  if (text.startsWith("/deleteuser ")) {
    const id = text.split(" ")[1];
    const deleted = await deleteUser(id);
    if (!deleted) return sendMessage(chatId, "User not found.");

    return sendMessage(chatId, "🗑 User deleted.");
  }

  if (text === "/infoall") {
    const users = await getAllUsers();
    let output = "<b>All Users</b>\n\n";

    users.forEach(u => {
      output += `👤 ${u.username || u.telegramId}
X: ${u.xHandle || "N/A"}
Wallet: ${u.wallet?.chain || "N/A"}\n\n`;
    });

    return sendMessage(chatId, output);
  }
}
