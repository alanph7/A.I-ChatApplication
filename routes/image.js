// routes/image.js
const express = require("express");
//const fetch = require("node-fetch"); // npm install node-fetch@2
const router = express.Router();

// POST /image/generate
router.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Calling DeepAI Stable Diffusion API
    const response = await fetch("https://api.deepai.org/api/text2img", {
      method: "POST",
      headers: {
        "api-key": process.env.DEEPAI_API_KEY, // ✅ Use DeepAI key
      },
      body: new URLSearchParams({
        text: prompt,
      }),
    });

    const result = await response.json();

    if (!result.output_url) {
      return res.status(500).json({ error: "DeepAI API error", details: result });
    }

    // Fetching the actual image from the output_url
    const imgResponse = await fetch(result.output_url);
    const buffer = await imgResponse.arrayBuffer();

    // Converting to Base64
    const base64Image = Buffer.from(buffer).toString("base64");

    // Returning Base64 image (same format as Hugging Face route)
    res.json({ image: `data:image/png;base64,${base64Image}` });

  } catch (error) {
    console.error("❌ Image generation error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

module.exports = router;
