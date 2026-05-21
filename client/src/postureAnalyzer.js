// ─────────────────────────────────────────────────────────────────────────────
// postureAnalyzer.js
//
// Takes a single frame of MediaPipe PoseLandmarker landmarks (plus optional
// external signals like phone detection) and returns a list of posture /
// distraction issues plus an overall score (0–100, higher = better).
//
// All landmark coordinates are in normalized [0, 1] space (x, y).
// ─────────────────────────────────────────────────────────────────────────────

// MediaPipe landmark indices we care about
const LM = {
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
};


// ── Geometry helpers ──────────────────────────────────────────────────────────

const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

// ── Individual checks ─────────────────────────────────────────────────────────

/**
 * UNEVEN SHOULDERS
 * Both shoulders should be at the same height (same y-coordinate).
 * We normalize the y-difference by shoulder width.
 *
 * Threshold: y-diff > 8% of shoulder width → uneven.
 */
function checkUnevenShoulders(lm) {
  const yDiff = Math.abs(lm[LM.LEFT_SHOULDER].y - lm[LM.RIGHT_SHOULDER].y);
  const shoulderWidth = dist(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER]);
  const normalized = yDiff / shoulderWidth;

  // Which side is higher? Lower y = higher on screen.
  const side =
    lm[LM.LEFT_SHOULDER].y < lm[LM.RIGHT_SHOULDER].y ? "left" : "right";

  return {
    name: "Uneven Shoulders",
    value: normalized,
    unit: "shoulder-widths",
    bad: normalized > 0.08,
    severe: normalized > 0.18,
    message:
      normalized > 0.08
        ? `${side.charAt(0).toUpperCase() + side.slice(1)} shoulder raised — relax and level them`
        : null,
  };
}

/**
 * HEAD TILT
 * Both ears should be at the same height (same y-coordinate).
 * Normalized by shoulder width for scale independence.
 *
 * Threshold: y-diff > 6% of shoulder width → tilted.
 */
function checkHeadTilt(lm) {
  const yDiff = Math.abs(lm[LM.LEFT_EAR].y - lm[LM.RIGHT_EAR].y);
  const shoulderWidth = dist(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER]);
  const normalized = yDiff / shoulderWidth;

  const side = lm[LM.LEFT_EAR].y < lm[LM.RIGHT_EAR].y ? "left" : "right";

  return {
    name: "Head Tilt",
    value: normalized,
    unit: "shoulder-widths",
    bad: normalized > 0.06,
    severe: normalized > 0.14,
    message:
      normalized > 0.06
        ? `Head tilting to the ${side} — straighten your neck`
        : null,
  };
}

/**
 * PHONE DISTRACTION
 * External signal from an object detector — a visible phone in frame is a
 * distraction. Modeled as a bad (not severe) check so it reduces the score
 * meaningfully without swamping posture signals.
 */
function checkPhoneDistraction({ phoneDetected }) {
  return {
    name: "Phone Detected",
    bad: !!phoneDetected,
    severe: false,
    message: phoneDetected ? "Put the phone away — it’s pulling focus" : null,
  };
}

// ── Confidence gate ───────────────────────────────────────────────────────────

/**
 * Returns false if any key landmark has low visibility, meaning we shouldn't
 * trust this frame's analysis.
 */
function frameIsReliable(lm) {
  const keyIndices = Object.values(LM);
  return keyIndices.every((i) => (lm[i]?.visibility ?? 1) > 0.5);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * analyzePosture(landmarks, context)
 *
 * @param {Array} landmarks - The first element of result.landmarks from
 *   PoseLandmarker.detectForVideo(), i.e. an array of 33 {x, y, z, visibility}
 *   objects.
 * @param {{ phoneDetected?: boolean }} [context] - Optional external signals,
 *   currently just phone-detector output.
 *
 * @returns {{
 *   reliable: boolean,     // false = not enough landmark visibility
 *   score: number,         // 0–100, higher = better posture
 *   issues: string[],      // human-readable messages for bad checks
 *   checks: object[],      // raw results for each individual check
 *   overallBad: boolean,   // true if any check is bad
 * }}
 */
export function analyzePosture(landmarks, context = {}) {
  if (!landmarks || landmarks.length === 0) {
    return { reliable: false, score: 100, issues: [], checks: [], overallBad: false };
  }

  if (!frameIsReliable(landmarks)) {
    return { reliable: false, score: 100, issues: [], checks: [], overallBad: false };
  }

  const checks = [
    checkUnevenShoulders(landmarks),
    checkHeadTilt(landmarks),
    checkPhoneDistraction(context),
  ];

  const issues = checks
    .filter((c) => c.bad && c.message)
    .map((c) => c.message);

  // Score: start at 100, deduct for bad checks (more for severe)
  const deductions = checks.reduce((sum, c) => {
    if (c.severe) return sum + 45;
    if (c.bad) return sum + 25;
    return sum;
  }, 0);

  const score = Math.max(0, 100 - deductions);

  return {
    reliable: true,
    score,
    issues,
    checks,
    overallBad: issues.length > 0,
  };
}