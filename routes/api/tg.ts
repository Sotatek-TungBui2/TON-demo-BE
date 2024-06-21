import express from "express";
import tg from "../../controllers/tg";
import tgMiddleware from "../../middlewares/tg";

const router = express.Router();

router.post("/auth", tg.auth);
router.post("/claim", tgMiddleware.tgauth_required, tg.claim);

export default router;