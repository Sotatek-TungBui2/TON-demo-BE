import express from "express";
import tg from "../../controllers/tg";
import tgMiddleware from "../../middlewares/tg";

const router = express.Router();

router.post("/auth", tg.auth);
router.post("/claim", tgMiddleware.tgauth_required, tg.claim);
router.post("/request-claim", tgMiddleware.tgauth_required, tg.request_claim);
router.get("/request-claim", tgMiddleware.tgauth_required, tg.get_request_claim);
router.post("/claim/:id", tgMiddleware.tgauth_required, tg.claimed);

export default router;