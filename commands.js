import {
  sendMessage,
  editMessage,
  isAdmin,
  validateWallet
} from "./functions.js";

import {
  upsertUser,
  updateUserById,
  getUserByAny,
  deleteUserByAny,
  getAllUsers,
  setState,
  getState,
  clearState
} from "./db.js";

/* MAIN ENTRY */
export async function handleUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

/* MESSAGES */
async function handleMessage(msg) {
  const text = msg.text;
  const id = msg.from.id;

  const state = await getState(id);

  if (state?.step === "xhandle") {
    await updateUserById(id, { xHandle: text.replace("@", "") });
    await setState(id, { step: "wallet_chain" });

    return sendMessage(id, "Select wallet chain:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "EVM", callback_data: "chain_EVM" }],
          [{ text: "SOL", callback_data: "chain_SOL" }],
          [{ text: "BNB", callback_data: "chain_BNB" }],
          [{ text: "Skip", callback_data: "skip_wallet" }]
        ]
      }
    });
  }

  if (state?.step === "wallet_address") {
    if (!validateWallet(state.chain, text)) {
      return sendMessage(id, "❌ Invalid address. Try again.");
    }

    await updateUserById(id, {
      walletChain: state.chain,
      walletAddress: text
    });

    await clearState(id);
    return sendMessage(id, "✅ Wallet saved.");
  }

  if (text === "/start") {
    await upsertUser({
      telegramId: id,
      username: msg.from.username || null,
      firstName: msg.from.first_name || "",
      lastName: msg.from.last_name || "",
      registeredAt: new Date()
    });

    return sendMessage(id,
      "**Welcome!**\n\n" +
      "/recordinfo – save your info\n" +
      "/getinfo – view your info\n" +
      "/updateinfo – update info\n" +
      "/help – help menu",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "User Info", callback_data: "getinfo" }],
            [{ text: "Help", callback_data: "help" }],
            [{ text: "FAQs", callback_data: "faqs" }]
          ]
        }
      }
    );
  }

  if (text === "/recordinfo") {
    await setState(id, { step: "xhandle" });
    return sendMessage(id, "Send your X (Twitter) username:");
  }

  if (text === "/getinfo") {
    const u = await getUserByAny(id);
    if (!u) return sendMessage(id, "No data found.");

    return sendMessage(id,
      `**Your Info**\nX: ${u.xHandle || "-"}\nChain: ${u.walletChain || "-"}\nWallet: ${u.walletAddress || "-"}`
    );
  }

  if (text === "/help") {
    return sendMessage(id,
      "/recordinfo – save info\n/getinfo – view info\n/updateinfo – update info"
    );
  }

  /* ADMIN */
  if (text.startsWith("/cast")) {
    if (!isAdmin(id)) return;
    const msgText = text.replace("/cast", "").trim();
    const { users } = await getAllUsers(1, 1000);
    for (const u of users) {
      await sendMessage(u.telegramId, msgText);
    }
  }
}

/* CALLBACKS */
async function handleCallback(q) {
  const id = q.from.id;
  const data = q.data;

  if (data.startsWith("chain_")) {
    const chain = data.split("_")[1];
    await setState(id, { step: "wallet_address", chain });
    return editMessage(id, q.message.message_id,
      `Send your ${chain} wallet address:`
    );
  }

  if (data === "skip_wallet") {
    await clearState(id);
    return editMessage(id, q.message.message_id, "Skipped wallet setup.");
  }

  if (data === "getinfo") {
    const u = await getUserByAny(id);
    return editMessage(id, q.message.message_id,
      `X: ${u?.xHandle || "-"}\nWallet: ${u?.walletAddress || "-"}`
    );
  }

  if (data === "help") {
    return editMessage(id, q.message.message_id,
      "/recordinfo\n/getinfo\n/updateinfo"
    );
  }

  if (data === "faqs") {
    return editMessage(id, q.message.message_id,
      "No FAQs yet."
    );
  }
}
