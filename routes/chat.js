const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

// Initialize OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /chat (actions)
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Call OpenAI ChatGPT API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // you can use "gpt-4o" or "gpt-3.5-turbo" too
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;

    res.json({ reply });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
