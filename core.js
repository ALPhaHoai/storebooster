import SteamClient from "steamutils/SteamClient.js";
import axios from "axios";
import { logNow } from "steamutils/utils.js";
import SteamUser from "steamutils";
import { decryptData } from "./crypto_db.js";

const api = axios.create({
  baseURL: process.env.API_ENDPOINT,
  headers: {
    [process.env.API_AUTH_HEADER_NAME]: process.env.API_AUTH_HEADER_VALUE,
  },
});

const accounts = [];
let steamClient = null;

export async function initStoreBooster() {
  console.log(`[StoreBooster][Init] Starting store booster...`);
  await boostAccounts(); // Run once immediately
  setInterval(
    () => {
      boostAccounts();
    },
    20 * 60 * 1000,
  );
  console.log(`[StoreBooster][Init] Booster scheduled: every 20 minutes.`);
}

async function boostAccounts() {
  console.log(`[StoreBooster][Cycle] Boost cycle started.`);
  if (await tryBoostAccounts(accounts)) {
    console.log(`[StoreBooster][Cycle] Boost cycle succeeded.`);
    return;
  }
  console.log(
    `[StoreBooster][Cycle] Fetching new accounts and retrying boost...`,
  );
  await fetchRandomStoreMyAccount();
  if (await tryBoostAccounts(accounts)) {
    console.log(
      `[StoreBooster][Cycle] Boost cycle succeeded after fetching new accounts.`,
    );
  } else {
    console.warn(
      `[StoreBooster][Cycle] Boost cycle failed - no available account.`,
    );
  }
}

async function boostAccount(account) {
  if (!account?.cookie) {
    console.warn(
      `[StoreBooster][Boost][Skip] No cookie for account ${account?._id || "[unknown id]"}, skipping.`,
    );
    return;
  }
  let cookie = account.cookie;
  try {
    cookie = decryptData(cookie);
  } catch (e) {
    console.warn(
      `[StoreBooster][Crypto][Warn] Cookie decryption failed or not needed for account ${account._id || "[unknown id]"}: ${e.message}`,
    );
    // Proceed with original cookie
  }
  const steamId =
    SteamUser.parseCookie(cookie)?.steamId || account._id || "[unknown id]";
  logNow(`[StoreBooster][Boost] Attempting to boost account: ${steamId}`);

  const client = new SteamClient({ cookie });
  try {
    const playable = await client.playCSGO();
    client.offAllEvent();
    if (playable) {
      console.log(
        `[StoreBooster][Boost] Account ${steamId} is online & playing CSGO.`,
      );
      return client;
    } else {
      console.warn(
        `[StoreBooster][Boost] Unable to play CSGO for account ${steamId}. Logging off.`,
      );
      await client.logOff();
    }
  } catch (e) {
    console.error(
      `[StoreBooster][Boost][Error] Exception boosting account ${steamId}:`,
      e?.message || e,
    );
    try {
      await client.logOff();
    } catch {}
  }
}

// --- Helper: Try boosting accounts sequentially ---
async function tryBoostAccounts(accountsArr) {
  console.log(
    `[StoreBooster][Boost] Trying to boost ${accountsArr.length} accounts...`,
  );
  for (const account of accountsArr) {
    const client = await boostAccount(account);
    if (client) {
      if (steamClient) {
        console.log(`[StoreBooster][Boost] Logging off previous SteamClient.`);
        steamClient.logOff();
      }
      steamClient = client;
      console.log(
        `[StoreBooster][Boost] Successfully boosted account: ${account._id || "[unknown id]"}`,
      );
      return true;
    }
  }
  console.log(`[StoreBooster][Boost] No account was boosted successfully.`);
  return false;
}

async function fetchRandomStoreMyAccount() {
  console.log(`[StoreBooster][Fetch] Fetching random accounts from store...`);
  try {
    const res = await api.get("/getRandomStoreMyAccount?limit=20");
    const remoteAccounts = res?.data?.result;
    if (Array.isArray(remoteAccounts)) {
      console.log(
        `[StoreBooster][Fetch] Received ${remoteAccounts.length} accounts.`,
      );
      accounts.length = 0;
      accounts.push(...remoteAccounts);
    } else {
      console.warn(`[StoreBooster][Fetch] No accounts received from store.`);
    }
  } catch (e) {
    console.error(
      `[StoreBooster][Fetch][Error] Failed to fetch accounts:`,
      e?.message || e,
    );
  }
}
