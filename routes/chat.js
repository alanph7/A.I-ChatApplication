const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios"); // Use axios instead of node-fetch for consistency

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * GET /chat/history
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

    // Detect image request based on keywords
    const imageKeywords = ["image of", "show me", "generate image", "picture of"];
    const lowerMsg = message.toLowerCase();

    if (imageKeywords.some(keyword => lowerMsg.includes(keyword))) {
      console.log("🖼️ Image request detected, forwarding to /image/generate");
      console.log("📝 Prompt being sent:", message);

      try {
        // Forward to image route using axios
        const imgResponse = await axios.post("http://localhost:5000/image/generate", {
          prompt: message
        });

        console.log("📡 Image API response status:", imgResponse.status);
        console.log("🖼️ Image API result:", imgResponse.data);

        if (!imgResponse.data.image) {
          throw new Error("Image API did not return a valid image");
        }

        // Save AI image message
        const aiMsg = new Message({ 
          role: "ai", 
          text: `Generated image: ${message}`, // Provide actual text content
          image: imgResponse.data.image, 
          type: "image" 
        });
        await aiMsg.save();
        console.log("💾 Saved image message to DB");

        return res.json({
          type: "image",
          image: imgResponse.data.image,
        });

      } catch (imageError) {
        console.error("❌ Image generation error:", imageError.message);
        console.error("❌ Image error details:", imageError.response?.data || imageError);
        
        // Fall back to text response instead of failing completely
        const errorMsg = new Message({ 
          role: "ai", 
          text: "I encountered an error generating the image. Let me help you with a text response instead.", 
          type: "text" 
        });
        await errorMsg.save();

        return res.json({
          type: "text",
          text: "I encountered an error generating the image. Let me help you with a text response instead.",
        });
      }
    }

    // Otherwise → normal Gemini text response
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

    // Save AI text message
    const aiMsg = new Message({ role: "ai", text: aiReply, type: "text" });
    await aiMsg.save();

    res.json({ type: "text", text: aiReply });

  } catch (error) {
    console.error("❌ Chat API Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

/**
 * DELETE /chat/history
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