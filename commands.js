import {
  sendMessage,
  isAdmin,
  validateWallet
} from "./functions.js";

import {
  saveUserBasic,
  updateUser,
  getUser,
  getAllUsers,
  deleteUser,
  setState,
  getState,
  clearState
} from "./db.js";

export async function handleCommand(message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();
  const from = message.from;

  /* STATE HANDLING */
  const state = await getState(from.id);
  if (state) return handleState(state, text, chatId, from);

  /* /start */
  if (text === "/start") {
    await saveUserBasic({
      telegramId: from.id,
      username: from.username || null,
      firstName: from.first_name || "",
      lastName: from.last_name || "",
      registeredAt: new Date()
    });

    return sendMessage(
      chatId,
      `👋 <b>Welcome!</b>

Available commands:
/recordinfo — Save your info
/getinfo — View your info
/updateinfo — Update info
/help — Command list`,
      {
        reply_markup: {
          keyboard: [
            ["🧾 User Info"],
            ["❓ Help", "📘 FAQs"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  /* /recordinfo */
  if (text === "/recordinfo") {
    await setState(from.id, { step: "ASK_X" });
    return sendMessage(chatId, "Send your X (Twitter) username (without @):");
  }

  /* /getinfo */
  if (text === "/getinfo") {
    const user = await getUser(from.id);
    if (!user) return sendMessage(chatId, "No data found.");

    return sendMessage(
      chatId,
      `<b>Your Info</b>
X: ${user.xHandle || "—"}
Chain: ${user.chain || "—"}
Wallet: ${user.wallet || "—"}`
    );
  }

  /* /help */
  if (text === "/help" || text === "❓ Help") {
    return sendMessage(
      chatId,
      `/start — Register
/recordinfo — Save info
/getinfo — View info
/updateinfo — Update info`
    );
  }

  /* ADMIN COMMANDS */
  if (!isAdmin(from.id)) return;

  if (text.startsWith("/cast ")) {
    const msg = text.replace("/cast ", "");
    const users = await getAllUsers();

    for (const u of users) {
      await sendMessage(u.telegramId, msg).catch(() => {});
    }
    return;
  }

  if (text === "/infoall") {
    const users = await getAllUsers();
    let out = users.map(u =>
      `@${u.username || "—"} | ${u.xHandle || "—"} | ${u.wallet || "—"}`
    ).join("\n");

    return sendMessage(chatId, out || "No users.");
  }

  if (text.startsWith("/getuser ")) {
    const q = text.split(" ")[1];
    const u = await getUser(q);
    return sendMessage(chatId, JSON.stringify(u, null, 2));
  }

  if (text.startsWith("/deleteuser ")) {
    const q = text.split(" ")[1];
    await deleteUser(q);
    return sendMessage(chatId, "User deleted.");
  }
}

/* STATE FLOW */
async function handleState(state, text, chatId, from) {
  if (state.step === "ASK_X") {
    await updateUser(from.id, { xHandle: text });
    await setState(from.id, { step: "ASK_CHAIN" });

    return sendMessage(chatId, "Select wallet chain:", {
      reply_markup: {
        keyboard: [
          ["EVM", "ERC20"],
          ["SOL", "BNB"],
          ["Skip"]
        ],
        resize_keyboard: true
      }
    });
  }

  if (state.step === "ASK_CHAIN") {
    if (text === "Skip") {
      await clearState(from.id);
      return sendMessage(chatId, "Skipped wallet.");
    }

    await setState(from.id, { step: "ASK_WALLET", chain: text });
    return sendMessage(chatId, `Send your ${text} wallet address:`);
  }

  if (state.step === "ASK_WALLET") {
    if (!validateWallet(state.chain, text)) {
      return sendMessage(chatId, "Invalid wallet. Try again:");
    }

    await updateUser(from.id, {
      chain: state.chain,
      wallet: text
    });

    await clearState(from.id);
    return sendMessage(chatId, "✅ Info saved!");
  }
}
