const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini client configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /chat (actions)
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Utilizing free-tier Google Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Sending prompt
    const result = await model.generateContent([
      "You are a helpful AI assistant.",
      message,
    ]);

    // Extracting reply text
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
