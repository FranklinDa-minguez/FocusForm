import express from "express";
import Session from "../models/Session.js";

const router = express.Router();


// 🟢 CREATE session (start session)
router.post("/start", async (req, res) => {
  console.log("SESSION START HIT:", req.body);
  const session = await Session.create({
    userId: req.body.userId,
    focusScore: 0,
    postureScore: 0,
    distractions: 0,
    breaks: 0,
    sessionDuration: 0
  });

  res.json(session);
});


// 🔵 END session (update scores)
router.post("/end", async (req, res) => {
  const updated = await Session.findByIdAndUpdate(
    req.body.sessionId,
    {
      focusScore: req.body.focusScore,
      postureScore: req.body.postureScore,
      distractions: req.body.distractions,
      breaks: req.body.breaks
    },
    { new: true }
  );

  res.json(updated);
});


// 🟣 GET sessions (for dashboard)
router.get("/:userId", async (req, res) => {
  const sessions = await Session.find({ userId: req.params.userId });
  res.json(sessions);
});

export default router;