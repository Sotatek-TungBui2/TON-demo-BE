import express from "express";
import tgauthRouter from "./tg";
import gameRouter from "./game";

const router = express.Router();

router.use("/tg", tgauthRouter);
router.use("/game", gameRouter);

export default router;
