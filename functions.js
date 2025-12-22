import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text, extra = {}) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...extra
  });
}

export async function editMessage(chatId, msgId, text, extra = {}) {
  return axios.post(`${API}/editMessageText`, {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: "Markdown",
    ...extra
  });
}

export function isAdmin(id) {
  return process.env.ADMIN_IDS.split(",").includes(String(id));
}

/* WALLET VALIDATION */
export function validateWallet(chain, address) {
  if (chain === "EVM" || chain === "BNB") {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  if (chain === "SOL") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  return false;
}
