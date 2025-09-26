import express from "express";
import { askChatbot } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/ask", askChatbot); // POST /api/chatbot/ask {question: "How to grow tomatoes?"}

export default router;
