import express from "express";
import { askChatbot, getFAQs, searchFAQs } from "../controllers/chatbotController.js";

const router = express.Router();

// Chatbot endpoints
router.post("/ask", askChatbot); // POST /api/chatbot/ask {question: "How to grow tomatoes?"}
router.get("/faqs", getFAQs); // GET /api/chatbot/faqs - Get all FAQs
router.get("/search", searchFAQs); // GET /api/chatbot/search?query=wheat - Search FAQs

export default router;
