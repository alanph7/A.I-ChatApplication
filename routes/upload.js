const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const mime = require("mime-types");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function extractTextFromFile(filePath, mimeType) {
  const type = mimeType || mime.lookup(filePath) || "application/octet-stream";

  if (type === "application/pdf") {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const result = await pdfParse(dataBuffer);
      return result.text || "";
    } catch (err) {
      console.error("PDF parse failed:", err.message);
      return "";
    }
  }

  if (type.startsWith("text/")) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return content;
    } catch (err) {
      console.error("Text read failed:", err.message);
      return "";
    }
  }

  if (type.startsWith("image/")) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        filePath,
        "eng",
        { langPath: path.join(__dirname, "..") }
      );
      return text || "";
    } catch (err) {
      console.error("OCR failed:", err.message);
      return "";
    }
  }

  // Fallback: try to treat as text
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (_) {
    return "";
  }
}

// POST /upload (field name: file)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const absolutePath = path.join(uploadsDir, req.file.filename);
    const mimeType = req.file.mimetype;

    // Extract text
    const extractedText = await extractTextFromFile(absolutePath, mimeType);

    // Ask Gemini to analyze
    let aiAnalysis = "";
    try {
      const prompt = `You are an assistant that analyzes uploaded files. Summarize and extract key insights, and suggest next actions.\n\nFilename: ${req.file.originalname}\nMIME: ${mimeType}\nSize: ${req.file.size} bytes\n\nExtracted content (raw):\n${extractedText?.slice(0, 8000)}`;
      const result = await model.generateContent(prompt);
      if (result?.response?.text) {
        aiAnalysis = result.response.text();
      }
    } catch (aiErr) {
      console.error("❌ Gemini analysis error:", aiErr);
      aiAnalysis = "I couldn't analyze the file with AI at the moment, but here's the extracted content preview:\n\n" + (extractedText?.slice(0, 1000) || "<no text>");
    }

    return res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: mimeType,
      size: req.file.size,
      url: fileUrl,
      extractedText: extractedText?.slice(0, 2000) || "",
      analysis: aiAnalysis,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    // Return a graceful fallback instead of 500 so UI shows something useful
    return res.json({
      error: "Upload processing failed",
      details: err?.message || String(err),
      analysis: "I couldn't analyze the file due to a server error. Please verify the server configuration (e.g., GEMINI_API_KEY) and try again.",
    });
  }
});

module.exports = router;


