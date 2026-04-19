const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Session = require("./models/Session");
const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb+srv://focusformuser:focusform123@cluster0.gnxgdum.mongodb.net/focusform?appName=Cluster0")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

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
      startTime: new Date()
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