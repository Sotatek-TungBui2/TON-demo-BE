import express from "express";
import tg from "../../controllers/tg";

const router = express.Router();

router.post("/auth", tg.auth);

export default router;