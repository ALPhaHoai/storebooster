import SteamClient from "steamutils/SteamClient.js";
import axios from "axios";
import { logNow } from "steamutils/utils.js";
import SteamUser from "steamutils";
import { decryptData } from "./crypto_db.js";

const api = axios.create({
  baseURL: process.env.API_ENDPOINT,
  headers: {
    [process.env.API_AUTH_HEADER_NAME]: process.env.API_AUTH_HEADER_VALUE
  }
});

let steamClient = null;
export async function initStoreBooster() {
  console.log("initStoreBooster");

  boostAccounts();
  setInterval(boostAccounts, 20 * 60000);
}

async function boostAccounts() {
  const accounts = await getRandomStoreMyAccount();
  if (!Array.isArray(accounts)) {
    return console.error("No accounts found.");
  }

  while (accounts.length) {
    const client = await boostAccount(accounts.pop());
    if (client) {
      steamClient?.logOff();
      steamClient = client;
      break;
    }
  }
}

async function boostAccount(account) {
  if (!account?.cookie) {
    return;
  }

  let cookie = account.cookie;
  try {
    cookie = decryptData(cookie);
  } catch (e) {}

  logNow(
    "boosting account",
    SteamUser.parseCookie(cookie)?.steamId || account._id,
  );
  const client = new SteamClient({
    cookie: cookie,
  });
  const playable = await client.playCSGO();
  client.offAllEvent();
  if (playable) {
    return client;
  } else {
    await client.logOff();
  }
}

async function getRandomStoreMyAccount() {
  try {
    return (
      await api.get(
        `/getRandomStoreMyAccount?limit=20`,
      )
    )?.data?.result;
  } catch (e) {}
}
