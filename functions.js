import axios from "axios";

const API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  return axios.post(`${API}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options
  });
}

export function isAdmin(userId) {
  return process.env.ADMIN_IDS.split(",").includes(String(userId));
}

/* Wallet validation */
export function validateWallet(chain, address) {
  if (!address) return false;

  if (["EVM", "ERC20", "BNB"].includes(chain)) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  if (chain === "SOL") {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  return false;
}
