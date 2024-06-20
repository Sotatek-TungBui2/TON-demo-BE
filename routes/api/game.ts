import express from "express";
import gameController from "../../controllers/game";
import tgMiddleware from "../../middlewares/tg";

const router = express.Router();

router.post("/upscore", tgMiddleware.tgauth_required, gameController.upscore);
router.get("/getscore", tgMiddleware.tgauth_required, gameController.getscore);

export default router;