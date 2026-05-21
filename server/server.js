const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Session = require("./models/Session");
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const mongoUri = process.env.MONGODB_URI?.trim();

if (!mongoUri) {
  console.error(
    "Missing MONGODB_URI in server/.env\n" +
      "  1. cd server\n" +
      "  2. cp .env.example .env\n" +
      "  3. Edit .env and paste your Atlas connection string on the MONGODB_URI= line (no quotes)\n" +
      "  4. npm start\n" +
      "Get the URI from a teammate or MongoDB Atlas → Connect → Drivers."
  );
} else {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err.message));
}

// Test route
app.get("/", (req, res) => {
  res.send("Backend works");
});

// Start a session
app.post("/session/start", async (req, res) => {
  try {
    const { userId } = req.body;

    const session = new Session({
      userId,
      startTime: new Date(),
    });

    await session.save();
    res.json({ message: "Session started", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

// Get all sessions for a user
app.get("/sessions/:userId", async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
