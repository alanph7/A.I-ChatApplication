AI-Powered Chat Backend

Overview
- Express + MongoDB backend for the AI chat app
- Supports text chat via Gemini 1.5 Flash, simple image generation (proxy to Pollinations), and file uploads with analysis (PDF, images via OCR, and text files)

Requirements
- Node.js 18+
- MongoDB connection string
- Env var: `GEMINI_API_KEY`

Setup
1) Install deps
   npm install

2) Create .env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/optaai
   GEMINI_API_KEY=your_key_here

3) Run dev
   npm run dev

Endpoints
- GET /          health check
- GET /chat/history   list all messages
- POST /chat          { message } → AI response (text or image URL)
- DELETE /chat/history   clears all
- POST /image/generate   { prompt } → { image: url }
- POST /upload (multipart) field: file → stores file under /uploads, returns { url, extractedText, analysis }

Notes
- Static files are served from /uploads
- OCR uses Tesseract (eng). If OCR fails, the API still returns a fallback analysis
- Image generation uses Pollinations image URLs

Troubleshooting
- 401/analysis empty: ensure GEMINI_API_KEY is set and backend restarted
- OCR errors: ensure `eng.traineddata` exists in backend folder; we attempt langPath fallback
