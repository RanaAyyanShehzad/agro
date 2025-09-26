import { farmingFAQs } from "../utils/faqs.js";
import axios from "axios";
import ErrorHandler from "../middlewares/error.js";

// ✅ First check FAQs (offline answers)
const checkFAQ = (question) => {
  const found = farmingFAQs.find(
    (faq) => question.toLowerCase().includes(faq.question.toLowerCase())
  );
  return found ? found.answer : null;
};

// 🌐 Option 2: Call Gemini API if not found in FAQs
const askGemini = async (question) => {
  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: `Answer as a Pakistani farming expert: ${question}` }
            ]
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not find an answer."
    );
  } catch (err) {
    console.error("❌ Gemini API error:", err.response?.data || err.message);
    return "Sorry, I am unable to process your question right now.";
  }
};

// 🎯 Main controller
export const askChatbot = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question) return next(new ErrorHandler("Question is required", 400));

    // 1️⃣ First check FAQs
    let answer = checkFAQ(question);

    // 2️⃣ If not in FAQs, ask Gemini AI
    if (!answer) {
      answer = await askGemini(question);
    }

    res.status(200).json({ success: true, question, answer });
  } catch (error) {
    next(error);
  }
};
