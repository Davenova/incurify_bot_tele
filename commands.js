import {
  sendMessage,
  isAdmin,
  validateWallet,
  editMessage
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
      `👋 <b>Welcome ${from.first_name}!</b>

I'm here to help you manage your information securely.

<b>Available Commands:</b>
• /recordinfo — Save your information
• /getinfo — View your saved information
• /updateinfo — Update your information
• /help — Show all commands`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Record Info", callback_data: "cmd_recordinfo" }],
            [{ text: "👤 View My Info", callback_data: "cmd_getinfo" }],
            [{ text: "ℹ️ Help", callback_data: "cmd_help" }]
          ]
        }
      }
    );
  }

  /* /recordinfo */
  if (text === "/recordinfo") {
    await setState(from.id, { step: "ASK_X" });
    return sendMessage(
      chatId,
      "📱 Please send your <b>X (Twitter) username</b> (without @):",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  /* /updateinfo */
  if (text === "/updateinfo") {
    const user = await getUser(from.id);
    if (!user) {
      return sendMessage(chatId, "❌ No data found. Please use /recordinfo first.");
    }

    return sendMessage(
      chatId,
      `<b>Update Your Information</b>

Current Data:
• X Handle: ${user.xHandle || "—"}
• Chain: ${user.chain || "—"}
• Wallet: ${user.wallet || "—"}

What would you like to update?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Update X Handle", callback_data: "update_x" }],
            [{ text: "🔗 Update Chain & Wallet", callback_data: "update_wallet" }],
            [{ text: "🔄 Update All", callback_data: "cmd_recordinfo" }],
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  /* /getinfo */
  if (text === "/getinfo") {
    const user = await getUser(from.id);
    if (!user) {
      return sendMessage(chatId, "❌ No data found. Please use /recordinfo to save your information first.");
    }

    return sendMessage(
      chatId,
      `<b>📋 Your Information</b>

👤 <b>Name:</b> ${user.firstName} ${user.lastName || ""}
🆔 <b>Username:</b> @${user.username || "—"}
📱 <b>X Handle:</b> ${user.xHandle ? "@" + user.xHandle : "—"}
🔗 <b>Chain:</b> ${user.chain || "—"}
💼 <b>Wallet:</b> ${user.wallet ? `<code>${user.wallet}</code>` : "—"}
📅 <b>Registered:</b> ${new Date(user.registeredAt).toLocaleString()}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✏️ Update Info", callback_data: "cmd_updateinfo" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* /help */
  if (text === "/help") {
    return sendMessage(
      chatId,
      `<b>📚 Available Commands</b>

/start — Register and start
/recordinfo — Save your information
/getinfo — View your information
/updateinfo — Update your information
/help — Show this help message

<b>How to use:</b>
1️⃣ Use /recordinfo to save your X handle and wallet
2️⃣ Use /getinfo to view your saved data
3️⃣ Use /updateinfo to modify your information`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* ADMIN COMMANDS */
  if (!isAdmin(from.id)) return;

  /* /listcmds */
  if (text === "/listcmds") {
    return sendMessage(
      chatId,
      `<b>🔧 Admin Commands Panel</b>

<b>User Management:</b>
/getuser &lt;username|userid&gt; — Get user details
/modifyuser &lt;username|userid&gt; — Modify user data
/deleteuser &lt;username|userid&gt; — Delete user
/infoall — List all users

<b>Broadcasting:</b>
/cast &lt;message&gt; — Send message to all users

<b>Example Usage:</b>
<code>/getuser @john</code>
<code>/getuser 123456789</code>
<code>/modifyuser @john</code>
<code>/deleteuser 123456789</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "👥 All Users", callback_data: "admin_infoall" },
              { text: "📊 Stats", callback_data: "admin_stats" }
            ],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* /cast */
  if (text.startsWith("/cast ")) {
    const msg = text.replace("/cast ", "");
    const users = await getAllUsers();

    let success = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await sendMessage(u.telegramId, msg);
        success++;
      } catch {
        failed++;
      }
    }

    return sendMessage(
      chatId,
      `📢 <b>Broadcast Complete</b>

✅ Sent: ${success}
❌ Failed: ${failed}
👥 Total: ${users.length}`
    );
  }

  /* /infoall */
  if (text === "/infoall") {
    const users = await getAllUsers();
    
    if (users.length === 0) {
      return sendMessage(chatId, "❌ No users found in database.");
    }

    let message = `<b>👥 All Users (${users.length})</b>\n\n`;

    users.forEach((u, i) => {
      message += `<b>${i + 1}. ${u.firstName} ${u.lastName || ""}</b>\n`;
      message += `   🆔 ID: <code>${u.telegramId}</code>\n`;
      message += `   👤 Username: ${u.username ? "@" + u.username : "—"}\n`;
      message += `   📱 X: ${u.xHandle ? "@" + u.xHandle : "—"}\n`;
      message += `   🔗 Chain: ${u.chain || "—"}\n`;
      message += `   💼 Wallet: ${u.wallet ? `<code>${u.wallet.slice(0, 6)}...${u.wallet.slice(-4)}</code>` : "—"}\n`;
      message += `   📅 Registered: ${new Date(u.registeredAt).toLocaleDateString()}\n\n`;
    });

    // Split message if too long
    if (message.length > 4000) {
      const chunks = message.match(/[\s\S]{1,4000}/g);
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk);
      }
    } else {
      await sendMessage(chatId, message);
    }
    return;
  }

  /* /getuser */
  if (text.startsWith("/getuser ")) {
    const query = text.split(" ")[1]?.replace("@", "");
    if (!query) {
      return sendMessage(chatId, "❌ Please provide a username or user ID.\n\nExample: <code>/getuser @john</code> or <code>/getuser 123456789</code>");
    }

    const u = await getUser(query);
    
    if (!u) {
      return sendMessage(chatId, `❌ User not found: <b>${query}</b>`);
    }

    return sendMessage(
      chatId,
      `<b>👤 User Details</b>

<b>Personal Info:</b>
• Name: ${u.firstName} ${u.lastName || ""}
• Username: ${u.username ? "@" + u.username : "—"}
• Telegram ID: <code>${u.telegramId}</code>

<b>Social & Wallet:</b>
• X Handle: ${u.xHandle ? "@" + u.xHandle : "—"}
• Blockchain: ${u.chain || "—"}
• Wallet: ${u.wallet ? `<code>${u.wallet}</code>` : "—"}

<b>Activity:</b>
• Registered: ${new Date(u.registeredAt).toLocaleString()}
• Last Updated: ${u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "—"}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✏️ Modify", callback_data: `admin_modify_${u.telegramId}` },
              { text: "🗑️ Delete", callback_data: `admin_delete_${u.telegramId}` }
            ],
            [{ text: "🔙 Back", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  /* /modifyuser */
  if (text.startsWith("/modifyuser ")) {
    const query = text.split(" ")[1]?.replace("@", "");
    if (!query) {
      return sendMessage(chatId, "❌ Please provide a username or user ID.\n\nExample: <code>/modifyuser @john</code>");
    }

    const u = await getUser(query);
    
    if (!u) {
      return sendMessage(chatId, `❌ User not found: <b>${query}</b>`);
    }

    await setState(from.id, { 
      step: "ADMIN_MODIFY",
      targetUserId: u.telegramId,
      targetUsername: u.username || u.firstName
    });

    return sendMessage(
      chatId,
      `<b>✏️ Modify User: ${u.username ? "@" + u.username : u.firstName}</b>

What would you like to modify?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 X Handle", callback_data: `modify_x_${u.telegramId}` }],
            [{ text: "🔗 Chain", callback_data: `modify_chain_${u.telegramId}` }],
            [{ text: "💼 Wallet", callback_data: `modify_wallet_${u.telegramId}` }],
            [{ text: "❌ Cancel", callback_data: "cancel_admin" }]
          ]
        }
      }
    );
  }

  /* /deleteuser */
  if (text.startsWith("/deleteuser ")) {
    const query = text.split(" ")[1]?.replace("@", "");
    if (!query) {
      return sendMessage(chatId, "❌ Please provide a username or user ID.\n\nExample: <code>/deleteuser @john</code>");
    }

    const u = await getUser(query);
    
    if (!u) {
      return sendMessage(chatId, `❌ User not found: <b>${query}</b>`);
    }

    return sendMessage(
      chatId,
      `<b>⚠️ Confirm Deletion</b>

Are you sure you want to delete this user?

<b>User:</b> ${u.username ? "@" + u.username : u.firstName}
<b>ID:</b> <code>${u.telegramId}</code>
<b>X Handle:</b> ${u.xHandle ? "@" + u.xHandle : "—"}

This action cannot be undone!`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Yes, Delete", callback_data: `confirm_delete_${u.telegramId}` },
              { text: "❌ Cancel", callback_data: "cancel_admin" }
            ]
          ]
        }
      }
    );
  }
}

/* STATE FLOW */
async function handleState(state, text, chatId, from) {
  /* User recording info */
  if (state.step === "ASK_X") {
    await updateUser(from.id, { xHandle: text, updatedAt: new Date() });
    await setState(from.id, { step: "ASK_CHAIN" });

    return sendMessage(chatId, "🔗 <b>Select your wallet chain:</b>", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "EVM", callback_data: "chain_EVM" },
            { text: "ERC20", callback_data: "chain_ERC20" }
          ],
          [
            { text: "SOL", callback_data: "chain_SOL" },
            { text: "BNB", callback_data: "chain_BNB" }
          ],
          [{ text: "⏭️ Skip Wallet", callback_data: "skip_wallet" }]
        ]
      }
    });
  }

  if (state.step === "ASK_WALLET") {
    if (!validateWallet(state.chain, text)) {
      return sendMessage(
        chatId,
        `❌ <b>Invalid ${state.chain} wallet address.</b>\n\nPlease send a valid wallet address:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Cancel", callback_data: "cancel" }]
            ]
          }
        }
      );
    }

    await updateUser(from.id, {
      chain: state.chain,
      wallet: text,
      updatedAt: new Date()
    });

    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>Information saved successfully!</b>

Your data has been securely stored.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👤 View My Info", callback_data: "cmd_getinfo" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* Update X only */
  if (state.step === "UPDATE_X") {
    await updateUser(from.id, { xHandle: text, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>X Handle updated!</b>\n\nNew X Handle: @${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👤 View My Info", callback_data: "cmd_getinfo" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* Update wallet flow */
  if (state.step === "UPDATE_WALLET") {
    if (!validateWallet(state.chain, text)) {
      return sendMessage(
        chatId,
        `❌ <b>Invalid ${state.chain} wallet address.</b>\n\nPlease send a valid wallet address:`
      );
    }

    await updateUser(from.id, {
      chain: state.chain,
      wallet: text,
      updatedAt: new Date()
    });

    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>Wallet updated successfully!</b>

Chain: ${state.chain}
Wallet: <code>${text}</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "👤 View My Info", callback_data: "cmd_getinfo" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* Admin modify user */
  if (state.step === "ADMIN_MODIFY_X") {
    await updateUser(state.targetUserId, { xHandle: text, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>User updated!</b>\n\nNew X Handle for ${state.targetUsername}: @${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Admin", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  if (state.step === "ADMIN_MODIFY_WALLET") {
    if (!validateWallet(state.chain, text)) {
      return sendMessage(chatId, `❌ Invalid ${state.chain} wallet. Try again:`);
    }

    await updateUser(state.targetUserId, {
      chain: state.chain,
      wallet: text,
      updatedAt: new Date()
    });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>Wallet updated for ${state.targetUsername}!</b>\n\nChain: ${state.chain}\nWallet: <code>${text}</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Admin", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }
}

/* CALLBACK QUERY HANDLER */
export async function handleCallback(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const from = callbackQuery.from;

  /* Command callbacks */
  if (data.startsWith("cmd_")) {
    const cmd = data.replace("cmd_", "");
    await handleCommand({ chat: { id: chatId }, text: `/${cmd}`, from });
    return;
  }

  /* Cancel */
  if (data === "cancel") {
    await clearState(from.id);
    return sendMessage(chatId, "❌ Operation cancelled.");
  }

  if (data === "cancel_admin") {
    await clearState(from.id);
    return sendMessage(chatId, "❌ Admin operation cancelled.");
  }

  /* Update flows */
  if (data === "update_x") {
    await setState(from.id, { step: "UPDATE_X" });
    return sendMessage(chatId, "📱 Send your new X (Twitter) username (without @):");
  }

  if (data === "update_wallet") {
    await setState(from.id, { step: "ASK_CHAIN" });
    return sendMessage(chatId, "🔗 <b>Select your wallet chain:</b>", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "EVM", callback_data: "chain_EVM" }, { text: "ERC20", callback_data: "chain_ERC20" }],
          [{ text: "SOL", callback_data: "chain_SOL" }, { text: "BNB", callback_data: "chain_BNB" }],
          [{ text: "❌ Cancel", callback_data: "cancel" }]
        ]
      }
    });
  }

  /* Chain selection */
  if (data.startsWith("chain_")) {
    const chain = data.replace("chain_", "");
    const state = await getState(from.id);
    
    if (state?.step === "ASK_CHAIN") {
      await setState(from.id, { step: "ASK_WALLET", chain });
      return sendMessage(chatId, `💼 Send your <b>${chain}</b> wallet address:`);
    }
    
    if (state?.step === "UPDATE_WALLET") {
      await setState(from.id, { step: "UPDATE_WALLET", chain });
      return sendMessage(chatId, `💼 Send your new <b>${chain}</b> wallet address:`);
    }
  }

  /* Skip wallet */
  if (data === "skip_wallet") {
    await clearState(from.id);
    return sendMessage(chatId, "✅ Wallet setup skipped. You can add it later with /updateinfo");
  }

  /* Admin callbacks */
  if (!isAdmin(from.id)) return;

  if (data === "admin_infoall") {
    await handleCommand({ chat: { id: chatId }, text: "/infoall", from });
    return;
  }

  if (data === "admin_stats") {
    const users = await getAllUsers();
    const withWallet = users.filter(u => u.wallet).length;
    const withX = users.filter(u => u.xHandle).length;

    return sendMessage(
      chatId,
      `<b>📊 Bot Statistics</b>

👥 Total Users: ${users.length}
💼 With Wallet: ${withWallet}
📱 With X Handle: ${withX}
📅 Generated: ${new Date().toLocaleString()}`
    );
  }

  /* Admin modify */
  if (data.startsWith("modify_x_")) {
    const userId = Number(data.replace("modify_x_", ""));
    const user = await getUser(userId);
    
    await setState(from.id, {
      step: "ADMIN_MODIFY_X",
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, `📱 Send new X handle for <b>${user.username || user.firstName}</b>:`);
  }

  if (data.startsWith("modify_chain_")) {
    const userId = Number(data.replace("modify_chain_", ""));
    const user = await getUser(userId);
    
    await setState(from.id, {
      step: "ADMIN_MODIFY_CHAIN",
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, "🔗 Select new chain:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "EVM", callback_data: `admin_chain_EVM_${userId}` }, { text: "ERC20", callback_data: `admin_chain_ERC20_${userId}` }],
          [{ text: "SOL", callback_data: `admin_chain_SOL_${userId}` }, { text: "BNB", callback_data: `admin_chain_BNB_${userId}` }]
        ]
      }
    });
  }

  if (data.startsWith("admin_chain_")) {
    const parts = data.replace("admin_chain_", "").split("_");
    const chain = parts[0];
    const userId = Number(parts[1]);
    const user = await getUser(userId);

    await setState(from.id, {
      step: "ADMIN_MODIFY_WALLET",
      chain,
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, `💼 Send new <b>${chain}</b> wallet address for ${user.username || user.firstName}:`);
  }

  if (data.startsWith("modify_wallet_")) {
    const userId = Number(data.replace("modify_wallet_", ""));
    const user = await getUser(userId);
    
    await setState(from.id, {
      step: "ADMIN_MODIFY_CHAIN",
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, "🔗 Select chain:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "EVM", callback_data: `admin_chain_EVM_${userId}` }, { text: "ERC20", callback_data: `admin_chain_ERC20_${userId}` }],
          [{ text: "SOL", callback_data: `admin_chain_SOL_${userId}` }, { text: "BNB", callback_data: `admin_chain_BNB_${userId}` }]
        ]
      }
    });
  }

  /* Delete confirmation */
  if (data.startsWith("confirm_delete_")) {
    const userId = Number(data.replace("confirm_delete_", ""));
    await deleteUser(userId);
    await clearState(userId);

    return sendMessage(
      chatId,
      `✅ <b>User deleted successfully!</b>\n\nUser ID: <code>${userId}</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Admin", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }
}
