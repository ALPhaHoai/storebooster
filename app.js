import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import indexRouter from "./routes/index.js";
import { initStoreBooster } from "./core.js";
import { sleep } from "steamutils/utils.js";

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);

setTimeout(async function () {
  await sleep(5000);
  await initStoreBooster();
}, 5000);

export default app;
