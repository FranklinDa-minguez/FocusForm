const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationMinutes: { type: Number },
  focusScore: { type: Number, default: 0 },
  postureEvents: [{ timestamp: Date, type: String }],
  breakSuggestions: {
    sent: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model("Session", sessionSchema);