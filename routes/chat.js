const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * GET /chat/history
 * Sending a new message and getting an AI reply
 */
router.get("/history", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("❌ Fetch history error:", error);
    res.status(500).json({ error: "Could not fetch chat history" });
  }
});

/**
 * POST /chat
 */
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Save user message
    const userMsg = new Message({ role: "user", text: message });
    await userMsg.save();

    // Get AI response
    let aiReply = "⚠️ Sorry, I could not generate a reply.";
    try {
      const result = await model.generateContent(message);
      console.log("✅ Gemini raw result:", result);

      if (result?.response?.text) {
        aiReply = result.response.text();
      }
    } catch (geminiErr) {
      console.error("❌ Gemini API error:", geminiErr);
    }

    // Save AI message
    const aiMsg = new Message({ role: "ai", text: aiReply });
    await aiMsg.save();

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("❌ Chat API Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/**
 * DELETE /chat/history
 * Clears chat history
 */
router.delete("/history", async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("❌ Clear history error:", error);
    res.status(500).json({ error: "Could not clear chat history" });
  }
});

module.exports = router;
