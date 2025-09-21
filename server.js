// server.js
require('dotenv').config(); // ✅ load env vars first

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Env vars
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB connect
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
const chatRoute = require("./routes/chat");
const imageRoute = require("./routes/image"); // <-- import image.js

app.use("/chat", chatRoute);
app.use("/image", imageRoute); // <-- mount image routes

// Root route
app.get('/', (req, res) => {
  res.send('🚀 Server is running!');
});

// Global error handler (optional, good for debugging)
app.use((err, req, res, next) => {
  console.error("🔥 Server error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌐 Server is running on http://localhost:${PORT}`);
});
