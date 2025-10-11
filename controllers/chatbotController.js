import { farmingFAQs } from "../utils/faqs.js";
import axios from "axios";
import ErrorHandler from "../middlewares/error.js";


const checkFAQ = (question) => {
  const found = farmingFAQs.find(
    (faq) => question.toLowerCase().includes(faq.question.toLowerCase()) ||
           faq.question.toLowerCase().includes(question.toLowerCase())
  );
  return found ? found.answer : null;
};


const isAgricultureRelated = (question) => {
  const agricultureKeywords = [
    // Crops
    'wheat', 'rice', 'cotton', 'sugarcane', 'corn', 'maize', 'tomato', 'potato', 'onion', 'chili', 'pepper',
    'vegetable', 'fruit', 'crop', 'plant', 'seed', 'harvest', 'cultivation', 'farming', 'agriculture',
    
    // Farming practices
    'irrigation', 'fertilizer', 'pesticide', 'herbicide', 'soil', 'compost', 'manure', 'organic',
    'pest', 'disease', 'weed', 'yield', 'production', 'crop rotation', 'sowing', 'planting',
    
    // Livestock & animals
    'cattle', 'cow', 'buffalo', 'goat', 'sheep', 'chicken', 'poultry', 'livestock', 'animal',
    'milk', 'meat', 'dairy', 'fodder', 'feed',
    
    // Equipment & tools
    'tractor', 'plow', 'harvester', 'irrigation system', 'drip', 'sprinkler', 'farm equipment',
    
    // Weather & climate
    'weather', 'rain', 'drought', 'flood', 'temperature', 'climate', 'season', 'monsoon',
    
    // Economics & marketing
    'price', 'market', 'profit', 'cost', 'subsidy', 'loan', 'credit', 'insurance',
    
    // Pakistani specific
    'punjab', 'sindh', 'balochistan', 'kpk', 'pakistan', 'pakistani', 'basmati', 'bt cotton',
    
    // General farming terms
    'farm', 'farmer', 'agricultural', 'agro', 'rural', 'village', 'field', 'land', 'acre', 'hectare'
  ];
  
  const questionLower = question.toLowerCase();
  return agricultureKeywords.some(keyword => questionLower.includes(keyword));
};

//Call Gemini AI if not found in FAQs
const askGemini = async (question) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return "I'm currently unable to access AI services. Please check our FAQ section or contact support for assistance.";
    }
    const prompt = `You are an expert Pakistani agricultural consultant for Agro Farm Connect platform. 
    
    IMPORTANT: You ONLY answer questions related to agriculture, farming, crops, livestock, and rural development in Pakistan. 
    If the question is NOT related to agriculture/farming, politely decline and redirect to farming topics.
    
    Question: ${question}
    
    If this is an agriculture-related question, provide:
    1. A clear, practical answer specific to Pakistani farming
    2. Cost-effective solutions for Pakistani farmers
    3. Seasonal considerations and timing
    4. Local market insights where relevant
    
    If this is NOT agriculture-related, respond with: "I'm Agro Farm Connect's agricultural assistant. I can only help with farming, agriculture, crops, livestock, and rural development questions. Please ask me about farming practices, crop management, pest control, soil health, or any other agricultural topics."
    
    Keep responses concise but informative (2-3 paragraphs max).`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "I couldn't generate a response for your question. Please try rephrasing or check our FAQ section.";
  } catch (err) {
    console.error(" Gemini API error:", err.response?.data || err.message);
    
    // Check if it's a billing/quota issue
    if (err.response?.data?.error?.code === 404 || 
        err.response?.data?.error?.status === 'NOT_FOUND' ||
        err.message.includes('billing') || 
        err.message.includes('quota')) {
      return "AI services are currently unavailable due to billing issues. Please check our FAQ section below or contact our support team for immediate assistance with your farming questions.";
    }
    
    return "I'm currently experiencing technical difficulties. Please check our FAQ section or contact support for assistance with your farming questions.";
  }
};

// 🎯 Main controller
export const askChatbot = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return next(new ErrorHandler("Question is required", 400));
    }

    const trimmedQuestion = question.trim();

    // 🔍 Check if question is agriculture-related
    if (!isAgricultureRelated(trimmedQuestion)) {
      return res.status(200).json({
        success: true,
        question: trimmedQuestion,
        answer: "I'm Agro Farm Connect's agricultural assistant. I can only help with farming, agriculture, crops, livestock, and rural development questions. Please ask me about farming practices, crop management, pest control, soil health, or any other agricultural topics.",
        source: "Filter",
        aiAvailable: true,
        isAgricultureRelated: false,
        timestamp: new Date().toISOString()
      });
    }

    // 1️⃣ First check FAQs
    let answer = checkFAQ(trimmedQuestion);
    let source = "FAQ";

    // 2️⃣ If not in FAQs, try Gemini AI
    if (!answer) {
      answer = await askGemini(trimmedQuestion);
      source = "AI";
    }

    // 3️⃣ If AI fails, provide helpful fallback
    if (!answer || answer.includes("billing issues") || answer.includes("technical difficulties")) {
      const relevantFAQs = farmingFAQs.filter(faq => 
        faq.question.toLowerCase().includes(trimmedQuestion.toLowerCase().split(' ')[0]) ||
        faq.answer.toLowerCase().includes(trimmedQuestion.toLowerCase().split(' ')[0])
      ).slice(0, 3);

      if (relevantFAQs.length > 0) {
        answer = `I found some relevant information in our FAQ section that might help:

${relevantFAQs.map(faq => `• ${faq.question}: ${faq.answer}`).join('\n')}

For more specific questions, please contact our support team or check our complete FAQ section.`;
      } else {
        answer = `I found some general farming information that might help:

${farmingFAQs.slice(0, 3).map(faq => `• ${faq.question}: ${faq.answer}`).join('\n')}

For more specific questions, please contact our support team or check our complete FAQ section.`;
      }
      source = "FAQ Fallback";
    }

    res.status(200).json({ 
      success: true, 
      question: trimmedQuestion, 
      answer,
      source,
      aiAvailable: !answer.includes("billing issues") && !answer.includes("technical difficulties"),
      isAgricultureRelated: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// 📚 Get all FAQs
export const getFAQs = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      faqs: farmingFAQs,
      count: farmingFAQs.length
    });
  } catch (error) {
    next(error);
  }
};

// 🔍 Search FAQs
export const searchFAQs = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return next(new ErrorHandler("Search query is required", 400));
    }

    const searchTerm = query.trim().toLowerCase();
    const results = farmingFAQs.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm) ||
      faq.answer.toLowerCase().includes(searchTerm)
    );

    res.status(200).json({
      success: true,
      query: searchTerm,
      results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
};