// ============================================
// PART 1 OF 4 - IMPORTS AND BASIC COMMANDS
// WITH APPROVAL SYSTEM
// ============================================

import {
  sendMessage,
  isAdmin,
  validateWallet,
  validateXProfile,
  normalizeXProfile,
  editMessage,
  addToGoogleSheet
} from "./functions.js";

import {
  saveUserBasic,
  updateUser,
  getUser,
  getAllUsers,
  getPendingUsers,
  deleteUser,
  setState,
  getState,
  clearState,
  getSettings,
  updateSettings,
  createTicket,
  getTicket,
  getAllTickets,
  updateTicket,
  getOpenTickets,
  getTicketsByUser
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

Fill out the form to join our group.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Form", callback_data: "cmd_recordinfo" }],
            [{ text: "👤 Get Info", callback_data: "cmd_getinfo" }],
            [{ text: "✏️ Update Info", callback_data: "cmd_updateinfo" }],
            [{ text: "🎫 Ticket System", callback_data: "ticket_menu" }]
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
      "📱 Please send your <b>X (Twitter) profile link</b>\n\nYou can send it as:\n• x.com/username\n• https://x.com/username\n• twitter.com/username",
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
      return sendMessage(chatId, "❌ No data found. Please use the Form first.");
    }

    return sendMessage(
      chatId,
      `<b>Update Your Information</b>

Current Data:
• X Profile: ${user.xHandle || "—"}
• Discord: ${user.discord || "—"}
• Chain: ${user.chain || "—"}
• Wallet: ${user.wallet || "—"}

What would you like to update?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Update X Profile", callback_data: "update_x" }],
            [{ text: "💬 Update Discord", callback_data: "update_discord" }],
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
      return sendMessage(chatId, "❌ No data found. Please fill out the Form first.");
    }

    return sendMessage(
      chatId,
      `<b>📋 Your Information</b>

👤 <b>Name:</b> ${user.firstName} ${user.lastName || ""}
🆔 <b>Username:</b> @${user.username || "—"}
📱 <b>X Profile:</b> ${user.xHandle || "—"}
💬 <b>Discord:</b> ${user.discord || "—"}
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

  /* /status - Check approval status */
  if (text === "/status") {
    const user = await getUser(from.id);
    if (!user) {
      return sendMessage(chatId, "❌ No data found. Please fill out the Form first.");
    }

    const statusEmoji = {
      "none": "⚪",
      "pending": "🟡",
      "approved": "🟢",
      "rejected": "🔴"
    };

    const statusText = {
      "none": "Not Submitted",
      "pending": "Pending Review",
      "approved": "Approved ✅",
      "rejected": "Rejected"
    };

    let message = `<b>📊 Application Status</b>

<b>Status:</b> ${statusEmoji[user.approvalStatus || "none"]} ${statusText[user.approvalStatus || "none"]}
`;

    if (user.approvalStatus === "pending") {
      message += `\n⏳ Your application is being reviewed by our team. You will be notified once a decision is made.`;
    } else if (user.approvalStatus === "approved") {
      const settings = await getSettings();
      const groupLink = settings?.groupLink || "https://t.me/+G4xabOPPuo02M2E1";
      
      message += `\n✅ Congratulations! Your application has been approved.`;
      
      return sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Join Incurify Group", url: groupLink }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      });
    } else if (user.approvalStatus === "rejected") {
      message += `\n\n<b>Reason:</b> ${user.rejectionReason || "Not specified"}`;
      message += `\n\nYou can update your information and resubmit using /updateinfo`;
    } else {
      message += `\n\nℹ️ You haven't submitted your application yet. Please complete the form to apply.`;
    }

    return sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
        ]
      }
    });
  }

  /* /help */
  if (text === "/help") {
    return sendMessage(
      chatId,
      `<b>📚 Available Commands</b>

/start — Register and start
/recordinfo — Fill out the form
/getinfo — View your information
/updateinfo — Update your information
/status — Check approval status
/ticket — Create a support ticket
/mytickets — View your tickets
/help — Show this help message`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* TICKET COMMANDS */
  if (text === "/ticket") {
    await setState(from.id, { step: "TICKET_CREATE" });
    return sendMessage(
      chatId,
      `<b>🎫 Create Support Ticket</b>

Please describe your issue or question in detail. Our team will respond as soon as possible.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (text === "/mytickets") {
    const tickets = await getTicketsByUser(from.id);
    
    if (tickets.length === 0) {
      return sendMessage(
        chatId,
        "📭 You don't have any tickets yet.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎫 Create Ticket", callback_data: "ticket_create" }],
              [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
            ]
          }
        }
      );
    }

    let message = `<b>🎫 Your Support Tickets</b>\n\n`;
    
    tickets.forEach((t, i) => {
      const statusEmoji = t.status === "open" ? "🟢" : t.status === "in_progress" ? "🟡" : "🔴";
      message += `${statusEmoji} <b>Ticket #${t.ticketId}</b>\n`;
      message += `   Status: ${t.status}\n`;
      message += `   Created: ${new Date(t.createdAt).toLocaleDateString()}\n`;
      message += `   Subject: ${t.subject.substring(0, 50)}${t.subject.length > 50 ? "..." : ""}\n\n`;
    });

    const buttons = tickets.slice(0, 10).map(t => ([
      { text: `#${t.ticketId} - ${t.status}`, callback_data: `view_ticket_${t.ticketId}` }
    ]));

    buttons.push([{ text: "🏠 Main Menu", callback_data: "cmd_start" }]);

    return sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  /* ADMIN COMMANDS START HERE */
  if (!isAdmin(from.id)) return;

  /* /listcmds */
  if (text === "/listcmds") {
    const pendingCount = (await getPendingUsers()).length;
    
    return sendMessage(
      chatId,
      `<b>🔧 Admin Commands Panel</b>

<b>User Management:</b>
/getuser &lt;username|userid&gt; — Get user details
/modifyuser &lt;username|userid&gt; — Modify user data
/deleteuser &lt;username|userid&gt; — Delete user
/infoall — List all users
/pending — View pending approvals ${pendingCount > 0 ? `(${pendingCount})` : ""}

<b>Ticket Management:</b>
/tickets — View all tickets
/ticket_stats — Ticket statistics

<b>Settings:</b>
/setgrouplink &lt;link&gt; — Update Telegram group link
/viewsettings — View current settings

<b>Broadcasting:</b>
/cast &lt;message&gt; — Send message to all users`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ Pending (${pendingCount})`, callback_data: "admin_pending" },
              { text: "👥 All Users", callback_data: "admin_infoall" }
            ],
            [
              { text: "📊 Stats", callback_data: "admin_stats" },
              { text: "🎫 Tickets", callback_data: "admin_tickets" }
            ],
            [
              { text: "⚙️ Settings", callback_data: "admin_settings" }
            ],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* /pending - View pending approvals */
  if (text === "/pending") {
    const pending = await getPendingUsers();
    
    if (pending.length === 0) {
      return sendMessage(chatId, "✅ No pending applications.");
    }

    let message = `<b>⏳ Pending Approvals (${pending.length})</b>\n\n`;
    
    pending.forEach((u, i) => {
      message += `<b>${i + 1}. ${u.firstName}</b> ${u.username ? `(@${u.username})` : ""}\n`;
      message += `   ID: <code>${u.telegramId}</code>\n`;
      message += `   Submitted: ${new Date(u.submittedAt).toLocaleString()}\n\n`;
    });

    const buttons = pending.slice(0, 10).map(u => ([
      { text: `Review ${u.firstName}`, callback_data: `review_user_${u.telegramId}` }
    ]));

    buttons.push([{ text: "🔙 Back", callback_data: "cmd_listcmds" }]);

    return sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  }

// END OF PART 1 - CONTINUE TO PART 2

// ============================================
// PART 2 OF 4 - ADMIN COMMANDS CONTINUED
// ============================================

  /* /setgrouplink */
  if (text.startsWith("/setgrouplink ")) {
    const link = text.replace("/setgrouplink ", "").trim();
    
    if (!link.includes("t.me/")) {
      return sendMessage(chatId, "❌ Invalid Telegram link. Please provide a valid t.me link.");
    }

    await updateSettings({ groupLink: link });
    return sendMessage(
      chatId,
      `✅ <b>Group link updated!</b>\n\nNew link: ${link}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Admin", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  /* /viewsettings */
  if (text === "/viewsettings") {
    const settings = await getSettings();
    return sendMessage(
      chatId,
      `<b>⚙️ Current Settings</b>

🔗 <b>Telegram Group Link:</b>
${settings?.groupLink || "Not set"}

📅 <b>Last Updated:</b> ${settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Never"}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✏️ Update Link", callback_data: "admin_update_link" }],
            [{ text: "🔙 Back", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  /* /tickets */
  if (text === "/tickets") {
    const tickets = await getAllTickets();
    
    if (tickets.length === 0) {
      return sendMessage(chatId, "📭 No tickets found.");
    }

    let message = `<b>🎫 All Support Tickets (${tickets.length})</b>\n\n`;
    
    const openTickets = tickets.filter(t => t.status === "open");
    const inProgressTickets = tickets.filter(t => t.status === "in_progress");
    const closedTickets = tickets.filter(t => t.status === "closed");

    message += `🟢 Open: ${openTickets.length}\n`;
    message += `🟡 In Progress: ${inProgressTickets.length}\n`;
    message += `🔴 Closed: ${closedTickets.length}\n\n`;

    const recentTickets = tickets.slice(0, 10);
    recentTickets.forEach(t => {
      const statusEmoji = t.status === "open" ? "🟢" : t.status === "in_progress" ? "🟡" : "🔴";
      message += `${statusEmoji} <b>#${t.ticketId}</b> - ${t.username || t.firstName}\n`;
      message += `   ${t.subject.substring(0, 60)}${t.subject.length > 60 ? "..." : ""}\n\n`;
    });

    const buttons = recentTickets.map(t => ([
      { text: `#${t.ticketId} - ${t.status}`, callback_data: `admin_view_ticket_${t.ticketId}` }
    ]));

    buttons.push([{ text: "🔙 Back", callback_data: "cmd_listcmds" }]);

    return sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  /* /ticket_stats */
  if (text === "/ticket_stats") {
    const tickets = await getAllTickets();
    const users = await getAllUsers();
    const pending = await getPendingUsers();

    const openTickets = tickets.filter(t => t.status === "open").length;
    const inProgressTickets = tickets.filter(t => t.status === "in_progress").length;
    const closedTickets = tickets.filter(t => t.status === "closed").length;

    const approved = users.filter(u => u.approvalStatus === "approved").length;
    const rejected = users.filter(u => u.approvalStatus === "rejected").length;

    return sendMessage(
      chatId,
      `<b>📊 Bot Statistics</b>

<b>Users:</b>
👥 Total Users: ${users.length}
✅ Approved: ${approved}
⏳ Pending: ${pending.length}
❌ Rejected: ${rejected}

<b>Tickets:</b>
🎫 Total: ${tickets.length}
🟢 Open: ${openTickets}
🟡 In Progress: ${inProgressTickets}
🔴 Closed: ${closedTickets}

📅 Generated: ${new Date().toLocaleString()}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎫 View All Tickets", callback_data: "admin_tickets" }],
            [{ text: "✅ Pending Approvals", callback_data: "admin_pending" }],
            [{ text: "🔙 Back", callback_data: "cmd_listcmds" }]
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
      const statusEmoji = {
        "none": "⚪",
        "pending": "🟡",
        "approved": "🟢",
        "rejected": "🔴"
      };

      message += `<b>${i + 1}. ${u.firstName} ${u.lastName || ""}</b> ${statusEmoji[u.approvalStatus || "none"]}\n`;
      message += `   🆔 ID: <code>${u.telegramId}</code>\n`;
      message += `   👤 Username: ${u.username ? "@" + u.username : "—"}\n`;
      message += `   📱 X: ${u.xHandle || "—"}\n`;
      message += `   💬 Discord: ${u.discord || "—"}\n`;
      message += `   🔗 Chain: ${u.chain || "—"}\n`;
      message += `   💼 Wallet: ${u.wallet ? `<code>${u.wallet.slice(0, 6)}...${u.wallet.slice(-4)}</code>` : "—"}\n`;
      message += `   📅 Registered: ${new Date(u.registeredAt).toLocaleDateString()}\n\n`;
    });

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

    const statusEmoji = {
      "none": "⚪",
      "pending": "🟡",
      "approved": "🟢",
      "rejected": "🔴"
    };

    return sendMessage(
      chatId,
      `<b>👤 User Details</b>

<b>Personal Info:</b>
• Name: ${u.firstName} ${u.lastName || ""}
• Username: ${u.username ? "@" + u.username : "—"}
• Telegram ID: <code>${u.telegramId}</code>

<b>Social & Wallet:</b>
• X Profile: ${u.xHandle || "—"}
• Discord: ${u.discord || "—"}
• Blockchain: ${u.chain || "—"}
• Wallet: ${u.wallet ? `<code>${u.wallet}</code>` : "—"}

<b>Status:</b>
• Approval: ${statusEmoji[u.approvalStatus || "none"]} ${u.approvalStatus || "none"}
${u.rejectionReason ? `• Rejection Reason: ${u.rejectionReason}` : ""}

<b>Activity:</b>
• Registered: ${new Date(u.registeredAt).toLocaleString()}
• Last Updated: ${u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "—"}
${u.submittedAt ? `• Submitted: ${new Date(u.submittedAt).toLocaleString()}` : ""}`,
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
            [{ text: "📱 X Profile", callback_data: `modify_x_${u.telegramId}` }],
            [{ text: "💬 Discord", callback_data: `modify_discord_${u.telegramId}` }],
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
<b>X Profile:</b> ${u.xHandle || "—"}

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

// END OF PART 2 - CONTINUE TO PART 3

// ============================================
// PART 3 OF 4 - STATE HANDLERS WITH CONFIRMATION STEP
// ============================================

/* STATE FLOW */
async function handleState(state, text, chatId, from) {
  /* User recording info */
  if (state.step === "ASK_X") {
    if (!validateXProfile(text)) {
      return sendMessage(
        chatId,
        "❌ <b>Invalid X/Twitter profile link.</b>\n\nPlease send a valid link like:\n• x.com/username\n• https://x.com/username\n• twitter.com/username",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Cancel", callback_data: "cancel" }]
            ]
          }
        }
      );
    }

    const normalizedUrl = normalizeXProfile(text);
    await updateUser(from.id, { xHandle: normalizedUrl, updatedAt: new Date() });
    await setState(from.id, { step: "ASK_DISCORD" });

    return sendMessage(
      chatId,
      "💬 Please send your <b>Discord username</b>\n\nIf you don't have Discord, type <b>NA</b> to continue.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (state.step === "ASK_DISCORD") {
    const discord = text.toLowerCase() === "na" ? "N/A" : text;
    await updateUser(from.id, { discord, updatedAt: new Date() });
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
    
    // Show confirmation step
    const user = await getUser(from.id);
    
    return sendMessage(
      chatId,
      `<b>📋 Please Confirm Your Information</b>

👤 <b>Name:</b> ${user.firstName} ${user.lastName || ""}
🆔 <b>Username:</b> @${user.username || "—"}
📱 <b>X Profile:</b> ${user.xHandle || "—"}
💬 <b>Discord:</b> ${user.discord || "—"}
🔗 <b>Chain:</b> ${user.chain || "—"}
💼 <b>Wallet:</b> ${user.wallet ? `<code>${user.wallet}</code>` : "—"}

Is this information correct?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Submit", callback_data: "confirm_submit" },
              { text: "✏️ Edit", callback_data: "confirm_edit" }
            ]
          ]
        }
      }
    );
  }

  /* Update flows */
  if (state.step === "UPDATE_X") {
    if (!validateXProfile(text)) {
      return sendMessage(
        chatId,
        "❌ <b>Invalid X/Twitter profile link.</b>\n\nPlease send a valid link."
      );
    }

    const normalizedUrl = normalizeXProfile(text);
    await updateUser(from.id, { xHandle: normalizedUrl, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>X Profile updated!</b>\n\nNew profile: ${normalizedUrl}`,
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

  if (state.step === "UPDATE_DISCORD") {
    const discord = text.toLowerCase() === "na" ? "N/A" : text;
    await updateUser(from.id, { discord, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>Discord username updated!</b>\n\nNew Discord: ${discord}`,
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

  /* Ticket Creation */
  if (state.step === "TICKET_CREATE") {
    const ticketId = Date.now();
    await createTicket({
      ticketId,
      userId: from.id,
      username: from.username || null,
      firstName: from.first_name,
      subject: text,
      status: "open",
      messages: [{
        from: "user",
        text,
        timestamp: new Date()
      }],
      createdAt: new Date()
    });

    await clearState(from.id);

    // Notify admins
    const adminIds = process.env.ADMIN_IDS?.split(",") || [];
    for (const adminId of adminIds) {
      try {
        await sendMessage(
          adminId,
          `<b>🎫 New Support Ticket #${ticketId}</b>

<b>From:</b> ${from.first_name} ${from.username ? `(@${from.username})` : ""}
<b>User ID:</b> <code>${from.id}</code>

<b>Message:</b>
${text}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📝 Reply to Ticket", callback_data: `admin_reply_ticket_${ticketId}` }],
                [{ text: "🟡 Mark In Progress", callback_data: `admin_progress_ticket_${ticketId}` }],
                [{ text: "✅ Close Ticket", callback_data: `admin_close_ticket_${ticketId}` }]
              ]
            }
          }
        );
      } catch {}
    }

    return sendMessage(
      chatId,
      `✅ <b>Ticket Created!</b>

Your support ticket #${ticketId} has been created successfully. Our team will respond as soon as possible.

You can view your tickets anytime using /mytickets`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 My Tickets", callback_data: "my_tickets" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* Ticket Reply - User */
  if (state.step === "TICKET_REPLY") {
    const ticket = await getTicket(state.ticketId);
    
    if (!ticket) {
      await clearState(from.id);
      return sendMessage(chatId, "❌ Ticket not found.");
    }

    ticket.messages.push({
      from: "user",
      text,
      timestamp: new Date()
    });

    await updateTicket(state.ticketId, { messages: ticket.messages });
    await clearState(from.id);

    // Notify admins
    const adminIds = process.env.ADMIN_IDS?.split(",") || [];
    for (const adminId of adminIds) {
      try {
        await sendMessage(
          adminId,
          `<b>💬 New Reply on Ticket #${state.ticketId}</b>

<b>From:</b> ${from.first_name}

<b>Message:</b>
${text}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📝 Reply", callback_data: `admin_reply_ticket_${state.ticketId}` }],
                [{ text: "🔍 View Full Ticket", callback_data: `admin_view_ticket_${state.ticketId}` }]
              ]
            }
          }
        );
      } catch {}
    }

    return sendMessage(
      chatId,
      `✅ <b>Reply sent!</b>

Your message has been added to ticket #${state.ticketId}. You'll receive a notification when an admin responds.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 View Ticket", callback_data: `view_ticket_${state.ticketId}` }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  /* Admin Ticket Reply */
  if (state.step === "ADMIN_TICKET_REPLY") {
    const ticket = await getTicket(state.ticketId);
    
    if (!ticket) {
      await clearState(from.id);
      return sendMessage(chatId, "❌ Ticket not found.");
    }

    ticket.messages.push({
      from: "admin",
      adminName: from.first_name,
      text,
      timestamp: new Date()
    });

    await updateTicket(state.ticketId, { 
      messages: ticket.messages,
      status: "in_progress"
    });
    
    await clearState(from.id);

    // Notify user
    try {
      await sendMessage(
        ticket.userId,
        `<b>📬 Admin replied to your ticket #${state.ticketId}</b>

<b>From:</b> ${from.first_name} (Admin)

<b>Message:</b>
${text}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💬 Reply", callback_data: `reply_ticket_${state.ticketId}` }],
              [{ text: "📋 View Full Ticket", callback_data: `view_ticket_${state.ticketId}` }]
            ]
          }
        }
      );
    } catch {}

    return sendMessage(
      chatId,
      `✅ <b>Reply sent to user!</b>

Your message has been sent to the ticket creator.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔍 View Ticket", callback_data: `admin_view_ticket_${state.ticketId}` }],
            [{ text: "🔙 Back to Tickets", callback_data: "admin_tickets" }]
          ]
        }
      }
    );
  }

  /* Admin Rejection Reason */
  if (state.step === "ADMIN_REJECT_REASON") {
    const targetUserId = state.targetUserId;
    
    await updateUser(targetUserId, {
      approvalStatus: "rejected",
      rejectionReason: text,
      reviewedAt: new Date()
    });
    
    await clearState(from.id);

    const user = await getUser(targetUserId);

    // Notify user
    try {
      await sendMessage(
        targetUserId,
        `<b>❌ Application Rejected</b>

Your application has been reviewed and unfortunately was not approved.

<b>Reason:</b> ${text}

You can update your information and resubmit using /updateinfo`
      );
    } catch {}

    return sendMessage(
      chatId,
      `✅ <b>User rejected</b>\n\nUser: ${user.firstName}\nReason sent to user.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ View Pending", callback_data: "admin_pending" }],
            [{ text: "🔙 Back", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  /* Admin modify user */
  if (state.step === "ADMIN_MODIFY_X") {
    if (!validateXProfile(text)) {
      return sendMessage(chatId, "❌ Invalid X profile link. Try again:");
    }

    const normalizedUrl = normalizeXProfile(text);
    await updateUser(state.targetUserId, { xHandle: normalizedUrl, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>User updated!</b>\n\nNew X Profile for ${state.targetUsername}: ${normalizedUrl}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Admin", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  if (state.step === "ADMIN_MODIFY_DISCORD") {
    const discord = text.toLowerCase() === "na" ? "N/A" : text;
    await updateUser(state.targetUserId, { discord, updatedAt: new Date() });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>User updated!</b>\n\nNew Discord for ${state.targetUsername}: ${discord}`,
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

  if (state.step === "ADMIN_UPDATE_LINK") {
    if (!text.includes("t.me/")) {
      return sendMessage(chatId, "❌ Invalid Telegram link. Please provide a valid t.me link.");
    }

    await updateSettings({ groupLink: text });
    await clearState(from.id);
    
    return sendMessage(
      chatId,
      `✅ <b>Group link updated!</b>\n\nNew link: ${text}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Back to Settings", callback_data: "admin_settings" }]
          ]
        }
      }
    );
  }
}

// END OF PART 3 - CONTINUE TO PART 4

// ============================================
// PART 4 OF 4 - CALLBACK HANDLERS WITH APPROVAL SYSTEM (FINAL)
// ============================================

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

  /* Confirmation callbacks */
  if (data === "confirm_submit") {
    const user = await getUser(from.id);
    
    await updateUser(from.id, {
      approvalStatus: "pending",
      submittedAt: new Date()
    });

    // Add to Google Sheets
    await addToGoogleSheet(user);

    // Get settings for group link
    const settings = await getSettings();
    const groupLink = settings?.groupLink || "https://t.me/+G4xabOPPuo02M2E1";

    // Notify admins
    const adminIds = process.env.ADMIN_IDS?.split(",") || [];
    for (const adminId of adminIds) {
      try {
        await sendMessage(
          adminId,
          `<b>📋 New Application Submitted</b>

<b>User:</b> ${user.firstName} ${user.username ? `(@${user.username})` : ""}
<b>Telegram ID:</b> <code>${user.telegramId}</code>

<b>Details:</b>
📱 X Profile: ${user.xHandle || "—"}
💬 Discord: ${user.discord || "—"}
🔗 Chain: ${user.chain || "—"}
💼 Wallet: ${user.wallet ? `<code>${user.wallet}</code>` : "—"}

📅 Submitted: ${new Date().toLocaleString()}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Approve", callback_data: `approve_user_${user.telegramId}` },
                  { text: "❌ Reject", callback_data: `reject_user_${user.telegramId}` }
                ],
                [{ text: "👤 View Profile", callback_data: `review_user_${user.telegramId}` }]
              ]
            }
          }
        );
      } catch {}
    }

    return sendMessage(
      chatId,
      `✅ <b>Registration Complete!</b>

Thank you for submitting your application!

<b>What's Next?</b>
Your form has been submitted for approval. Once verified, you will be able to access our group <b>Incurify</b>.

You will receive a notification once your application has been reviewed.

Use /status anytime to check your application status.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Check Status", callback_data: "check_status" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  if (data === "confirm_edit") {
    return sendMessage(
      chatId,
      `<b>✏️ Edit Your Information</b>

What would you like to edit?`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 X Profile", callback_data: "update_x" }],
            [{ text: "💬 Discord", callback_data: "update_discord" }],
            [{ text: "🔗 Wallet", callback_data: "update_wallet" }],
            [{ text: "🔄 Start Over", callback_data: "cmd_recordinfo" }],
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (data === "check_status") {
    await handleCommand({ chat: { id: chatId }, text: "/status", from });
    return;
  }

  /* Admin Approval Callbacks */
  if (data.startsWith("review_user_")) {
    if (!isAdmin(from.id)) return;

    const userId = Number(data.replace("review_user_", ""));
    const user = await getUser(userId);

    if (!user) {
      return sendMessage(chatId, "❌ User not found.");
    }

    const statusEmoji = {
      "none": "⚪",
      "pending": "🟡",
      "approved": "🟢",
      "rejected": "🔴"
    };

    return sendMessage(
      chatId,
      `<b>📋 Application Review</b>

<b>User Info:</b>
👤 Name: ${user.firstName} ${user.lastName || ""}
🆔 Username: ${user.username ? "@" + user.username : "—"}
🆔 Telegram ID: <code>${user.telegramId}</code>

<b>Submitted Details:</b>
📱 X Profile: ${user.xHandle || "—"}
💬 Discord: ${user.discord || "—"}
🔗 Chain: ${user.chain || "—"}
💼 Wallet: ${user.wallet ? `<code>${user.wallet}</code>` : "—"}

<b>Status:</b> ${statusEmoji[user.approvalStatus || "none"]} ${user.approvalStatus || "none"}

📅 Submitted: ${user.submittedAt ? new Date(user.submittedAt).toLocaleString() : "—"}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_user_${userId}` },
              { text: "❌ Reject", callback_data: `reject_user_${userId}` }
            ],
            [{ text: "🔙 Back to Pending", callback_data: "admin_pending" }]
          ]
        }
      }
    );
  }

  if (data.startsWith("approve_user_")) {
    if (!isAdmin(from.id)) return;

    const userId = Number(data.replace("approve_user_", ""));
    const user = await getUser(userId);

    if (!user) {
      return sendMessage(chatId, "❌ User not found.");
    }

    await updateUser(userId, {
      approvalStatus: "approved",
      approvedBy: from.id,
      approvedAt: new Date()
    });

    const settings = await getSettings();
    const groupLink = settings?.groupLink || "https://t.me/+G4xabOPPuo02M2E1";

    // Notify user
    try {
      await sendMessage(
        userId,
        `<b>🎉 Application Approved!</b>

Congratulations! Your application to join Incurify has been approved.

You can now join our exclusive Telegram group using the button below.

Welcome to the community! 🚀`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Join Incurify Group", url: groupLink }]
            ]
          }
        }
      );
    } catch {}

    return sendMessage(
      chatId,
      `✅ <b>User Approved!</b>

User: ${user.firstName} ${user.username ? `(@${user.username})` : ""}
Status: Approved
User has been notified and can now join the group.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ View Pending", callback_data: "admin_pending" }],
            [{ text: "🔙 Back", callback_data: "cmd_listcmds" }]
          ]
        }
      }
    );
  }

  if (data.startsWith("reject_user_")) {
    if (!isAdmin(from.id)) return;

    const userId = Number(data.replace("reject_user_", ""));
    const user = await getUser(userId);

    if (!user) {
      return sendMessage(chatId, "❌ User not found.");
    }

    await setState(from.id, {
      step: "ADMIN_REJECT_REASON",
      targetUserId: userId
    });

    return sendMessage(
      chatId,
      `<b>❌ Reject Application</b>

User: ${user.firstName} ${user.username ? `(@${user.username})` : ""}

Please provide a reason for rejection. This will be sent to the user.`
    );
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
    return sendMessage(chatId, "📱 Send your new X (Twitter) profile link:");
  }

  if (data === "update_discord") {
    await setState(from.id, { step: "UPDATE_DISCORD" });
    return sendMessage(chatId, "💬 Send your new Discord username (or NA if none):");
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
    
    // Show confirmation without wallet
    const user = await getUser(from.id);
    
    return sendMessage(
      chatId,
      `<b>📋 Please Confirm Your Information</b>

👤 <b>Name:</b> ${user.firstName} ${user.lastName || ""}
🆔 <b>Username:</b> @${user.username || "—"}
📱 <b>X Profile:</b> ${user.xHandle || "—"}
💬 <b>Discord:</b> ${user.discord || "—"}
🔗 <b>Wallet:</b> Not provided

Is this information correct?`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Submit", callback_data: "confirm_submit" },
              { text: "✏️ Edit", callback_data: "confirm_edit" }
            ]
          ]
        }
      }
    );
  }

  /* Ticket System - User */
  if (data === "ticket_menu") {
    return sendMessage(
      chatId,
      `<b>🎫 Ticket System</b>

Need help or have questions? Create a support ticket and our team will assist you.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎫 Create New Ticket", callback_data: "ticket_create" }],
            [{ text: "📋 My Tickets", callback_data: "my_tickets" }],
            [{ text: "🏠 Main Menu", callback_data: "cmd_start" }]
          ]
        }
      }
    );
  }

  if (data === "ticket_create") {
    await setState(from.id, { step: "TICKET_CREATE" });
    return sendMessage(
      chatId,
      `<b>🎫 Create Support Ticket</b>

Please describe your issue or question in detail.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (data === "my_tickets") {
    await handleCommand({ chat: { id: chatId }, text: "/mytickets", from });
    return;
  }

  if (data.startsWith("view_ticket_")) {
    const ticketId = data.replace("view_ticket_", "");
    const ticket = await getTicket(ticketId);
    
    if (!ticket) {
      return sendMessage(chatId, "❌ Ticket not found.");
    }

    const statusEmoji = ticket.status === "open" ? "🟢" : ticket.status === "in_progress" ? "🟡" : "🔴";
    let message = `<b>${statusEmoji} Ticket #${ticket.ticketId}</b>\n\n`;
    message += `<b>Status:</b> ${ticket.status}\n`;
    message += `<b>Created:</b> ${new Date(ticket.createdAt).toLocaleString()}\n\n`;
    message += `<b>📝 Conversation:</b>\n\n`;
    
    ticket.messages.forEach((msg, i) => {
      const sender = msg.from === "user" ? "You" : `Admin (${msg.adminName || "Staff"})`;
      message += `<b>${sender}:</b>\n${msg.text}\n`;
      message += `<i>${new Date(msg.timestamp).toLocaleString()}</i>\n\n`;
    });

    const buttons = [];
    if (ticket.status !== "closed") {
      buttons.push([{ text: "💬 Reply", callback_data: `reply_ticket_${ticketId}` }]);
    }
    buttons.push([{ text: "🔙 Back to My Tickets", callback_data: "my_tickets" }]);

    return sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (data.startsWith("reply_ticket_")) {
    const ticketId = data.replace("reply_ticket_", "");
    await setState(from.id, { step: "TICKET_REPLY", ticketId: Number(ticketId) });
    return sendMessage(chatId, "💬 Type your reply:");
  }

  /* Admin callbacks */
  if (!isAdmin(from.id)) return;

  if (data === "admin_pending") {
    await handleCommand({ chat: { id: chatId }, text: "/pending", from });
    return;
  }

  if (data === "admin_infoall") {
    await handleCommand({ chat: { id: chatId }, text: "/infoall", from });
    return;
  }

  if (data === "admin_stats") {
    const users = await getAllUsers();
    const pending = await getPendingUsers();
    const withWallet = users.filter(u => u.wallet).length;
    const withX = users.filter(u => u.xHandle).length;
    const withDiscord = users.filter(u => u.discord && u.discord !== "N/A").length;
    const approved = users.filter(u => u.approvalStatus === "approved").length;
    const rejected = users.filter(u => u.approvalStatus === "rejected").length;

    return sendMessage(
      chatId,
      `<b>📊 Bot Statistics</b>

<b>Users:</b>
👥 Total Users: ${users.length}
✅ Approved: ${approved}
⏳ Pending: ${pending.length}
❌ Rejected: ${rejected}

<b>Data Completion:</b>
💼 With Wallet: ${withWallet}
📱 With X Profile: ${withX}
💬 With Discord: ${withDiscord}

📅 Generated: ${new Date().toLocaleString()}`
    );
  }

  if (data === "admin_tickets") {
    await handleCommand({ chat: { id: chatId }, text: "/tickets", from });
    return;
  }

  if (data === "admin_settings") {
    await handleCommand({ chat: { id: chatId }, text: "/viewsettings", from });
    return;
  }

  if (data === "admin_update_link") {
    await setState(from.id, { step: "ADMIN_UPDATE_LINK" });
    return sendMessage(chatId, "🔗 Send the new Telegram group link:");
  }

  /* Admin Ticket Management */
  if (data.startsWith("admin_view_ticket_")) {
    const ticketId = data.replace("admin_view_ticket_", "");
    const ticket = await getTicket(ticketId);
    
    if (!ticket) {
      return sendMessage(chatId, "❌ Ticket not found.");
    }

    const statusEmoji = ticket.status === "open" ? "🟢" : ticket.status === "in_progress" ? "🟡" : "🔴";
    let message = `<b>${statusEmoji} Ticket #${ticket.ticketId}</b>\n\n`;
    message += `<b>From:</b> ${ticket.firstName} ${ticket.username ? `(@${ticket.username})` : ""}\n`;
    message += `<b>User ID:</b> <code>${ticket.userId}</code>\n`;
    message += `<b>Status:</b> ${ticket.status}\n`;
    message += `<b>Created:</b> ${new Date(ticket.createdAt).toLocaleString()}\n\n`;
    message += `<b>📝 Conversation:</b>\n\n`;
    
    ticket.messages.forEach((msg, i) => {
      const sender = msg.from === "user" ? ticket.firstName : `Admin (${msg.adminName})`;
      message += `<b>${sender}:</b>\n${msg.text}\n`;
      message += `<i>${new Date(msg.timestamp).toLocaleString()}</i>\n\n`;
    });

    const buttons = [];
    if (ticket.status !== "closed") {
      buttons.push([
        { text: "📝 Reply", callback_data: `admin_reply_ticket_${ticketId}` },
        { text: "🟡 In Progress", callback_data: `admin_progress_ticket_${ticketId}` }
      ]);
      buttons.push([{ text: "✅ Close Ticket", callback_data: `admin_close_ticket_${ticketId}` }]);
    } else {
      buttons.push([{ text: "🔄 Reopen", callback_data: `admin_reopen_ticket_${ticketId}` }]);
    }
    buttons.push([{ text: "🔙 Back to Tickets", callback_data: "admin_tickets" }]);

    return sendMessage(chatId, message, {
      reply_markup: { inline_keyboard: buttons }
    });
  }

  if (data.startsWith("admin_reply_ticket_")) {
    const ticketId = data.replace("admin_reply_ticket_", "");
    await setState(from.id, { step: "ADMIN_TICKET_REPLY", ticketId: Number(ticketId) });
    return sendMessage(chatId, "📝 Type your reply to the user:");
  }

  if (data.startsWith("admin_progress_ticket_")) {
    const ticketId = data.replace("admin_progress_ticket_", "");
    await updateTicket(Number(ticketId), { status: "in_progress" });
    
    const ticket = await getTicket(ticketId);
    try {
      await sendMessage(
        ticket.userId,
        `<b>🟡 Ticket #${ticketId} Status Updated</b>

Your ticket is now being worked on by our team.`
      );
    } catch {}

    return sendMessage(chatId, `✅ Ticket #${ticketId} marked as in progress.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 View Ticket", callback_data: `admin_view_ticket_${ticketId}` }],
          [{ text: "🔙 Back", callback_data: "admin_tickets" }]
        ]
      }
    });
  }

  if (data.startsWith("admin_close_ticket_")) {
    const ticketId = data.replace("admin_close_ticket_", "");
    await updateTicket(Number(ticketId), { status: "closed" });
    
    const ticket = await getTicket(ticketId);
    try {
      await sendMessage(
        ticket.userId,
        `<b>✅ Ticket #${ticketId} Closed</b>

Your support ticket has been resolved and closed. Thank you for reaching out!

If you need further assistance, feel free to create a new ticket.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎫 Create New Ticket", callback_data: "ticket_create" }]
            ]
          }
        }
      );
    } catch {}

    return sendMessage(chatId, `✅ Ticket #${ticketId} has been closed.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Tickets", callback_data: "admin_tickets" }]
        ]
      }
    });
  }

  if (data.startsWith("admin_reopen_ticket_")) {
    const ticketId = data.replace("admin_reopen_ticket_", "");
    await updateTicket(Number(ticketId), { status: "open" });
    
    return sendMessage(chatId, `✅ Ticket #${ticketId} has been reopened.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 View Ticket", callback_data: `admin_view_ticket_${ticketId}` }]
        ]
      }
    });
  }

  /* Admin modify user */
  if (data.startsWith("modify_x_")) {
    const userId = Number(data.replace("modify_x_", ""));
    const user = await getUser(userId);
    
    await setState(from.id, {
      step: "ADMIN_MODIFY_X",
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, `📱 Send new X profile link for <b>${user.username || user.firstName}</b>:`);
  }

  if (data.startsWith("modify_discord_")) {
    const userId = Number(data.replace("modify_discord_", ""));
    const user = await getUser(userId);
    
    await setState(from.id, {
      step: "ADMIN_MODIFY_DISCORD",
      targetUserId: userId,
      targetUsername: user.username || user.firstName
    });

    return sendMessage(chatId, `💬 Send new Discord username for <b>${user.username || user.firstName}</b>:`);
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

// ============================================
// END OF PART 4 - FILE COMPLETE!
// ============================================
