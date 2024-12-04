import SteamClient from "steamutils/SteamClient.js";
import axios from "axios";
import { logNow } from "steamutils/utils.js";
import SteamUser from "steamutils";

let steamClient = null;
export async function initStoreBooster() {
  console.log("initStoreBooster");

  boostAccounts();
  setInterval(boostAccounts, 20 * 60000);
}

async function boostAccounts() {
  const accounts = await getRandomStoreMyAccount();
  if (!Array.isArray(accounts)) {
    return;
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

  logNow(
    "boosting account",
    SteamUser.parseCookie(account.cookie)?.steamId || account._id,
  );
  const client = new SteamClient({
    cookie: account.cookie,
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
      await axios.get(
        `${process.env.API_ENDPOINT}/getRandomStoreMyAccount?limit=20`,
      )
    )?.data?.result;
  } catch (e) {}
}
