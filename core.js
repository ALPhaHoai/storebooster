import { requireDB } from "./db.js";
import SteamClient from "steamutils/SteamClient.js";

export async function initStoreBooster() {
  console.log("initStoreBooster");

  const accounts = await new Promise((resolve) => {
    requireDB(async function (collection) {
      resolve(
        await collection.MyAccount.aggregate([
          {
            $match: {
              "config.store": true,
              prime: {
                $ne: true,
              },
            },
          },
          {
            $sample: {
              size: 100,
            },
          },
          {
            $project: {
              cookie: 1,
            },
          },
        ]).toArray(),
      );
    });
  });

  for await (const account of accounts) {
    const result = await SteamClient.isAccountPlayable({
      cookie: account.cookie,
      isInvisible: false,
      isFakeGameScore: false,
      isPartyRegister: false,
      keepLoginWhenPlayable: true,
    });
    if (result?.playable) {
      break;
    }
  }
}
