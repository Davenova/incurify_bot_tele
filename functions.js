import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  try {
    return await axios.post(`${API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options
    });
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
    throw error;
  }
}

export async function editMessage(chatId, messageId, text, options = {}) {
  try {
    return await axios.post(`${API}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...options
    });
  } catch (error) {
    console.error("Error editing message:", error.response?.data || error.message);
    throw error;
  }
}

export async function answerCallbackQuery(callbackQueryId, text = "") {
  try {
    return await axios.post(`${API}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text
    });
  } catch (error) {
    console.error("Error answering callback:", error.response?.data || error.message);
  }
}

export function isAdmin(userId) {
  const adminIds = process.env.ADMIN_IDS?.split(",") || [];
  return adminIds.includes(String(userId));
}

/* X/Twitter Profile Validation - Accept both formats */
export function validateXProfile(url) {
  if (!url) return false;
  
  // Remove whitespace
  url = url.trim();
  
  // Accept both x.com/username and https://x.com/username formats
  const xPatternWithProtocol = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/;
  const xPatternWithoutProtocol = /^(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/;
  
  return xPatternWithProtocol.test(url) || xPatternWithoutProtocol.test(url);
}

/* Normalize X Profile URL - Add https:// if missing */
export function normalizeXProfile(url) {
  if (!url) return url;
  
  url = url.trim();
  
  // If it doesn't start with http:// or https://, add https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  
  return url;
}

/* Create unique invite link for user - 1 use only */
export async function createUniqueInviteLink(userId, userName) {
  try {
    const groupChatId = process.env.GROUP_CHAT_ID; // Your group chat ID
    
    if (!groupChatId) {
      console.error("GROUP_CHAT_ID not set in environment variables");
      return null;
    }

    const response = await axios.post(`${API}/createChatInviteLink`, {
      chat_id: groupChatId,
      name: `Invite for ${userName}`,
      member_limit: 1, // Only 1 user can join with this link
      creates_join_request: false // Direct join without approval
    });

    return response.data.result.invite_link;
  } catch (error) {
    console.error("Error creating invite link:", error.response?.data || error.message);
    return null;
  }
}

/* Revoke invite link */
export async function revokeInviteLink(inviteLink) {
  try {
    const groupChatId = process.env.GROUP_CHAT_ID;
    
    if (!groupChatId) {
      return;
    }

    await axios.post(`${API}/revokeChatInviteLink`, {
      chat_id: groupChatId,
      invite_link: inviteLink
    });
    
    console.log("Invite link revoked successfully");
  } catch (error) {
    console.error("Error revoking invite link:", error.message);
  }
}

/* Google Sheets Integration - Update or Create */
export async function updateGoogleSheet(userData) {
  try {
    const SHEET_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    
    if (!SHEET_URL) {
      console.log("Google Sheets webhook URL not configured");
      return;
    }

    const data = {
      telegramUsername: userData.username || "N/A",
      telegramId: userData.telegramId,
      xProfile: userData.xHandle || "N/A",
      discord: userData.discord || "N/A",
      registrationDate: new Date(userData.registeredAt).toLocaleString(),
      status: userData.approvalStatus || "pending",
      submissionCount: userData.submissionCount || 1
    };

    await axios.post(SHEET_URL, data);
    console.log("Google Sheets updated successfully");
  } catch (error) {
    console.error("Error updating Google Sheets:", error.message);
  }
}
