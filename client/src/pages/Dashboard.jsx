import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { PoseLandmarker, ObjectDetector, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { analyzePosture } from "../postureAnalyzer";

// How many frames to average the posture score over (smooths jitter)
const SMOOTHING_WINDOW = 20;

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [poseStatus, setPoseStatus] = useState("Initializing pose model...");
  const [cameraError, setCameraError] = useState(null);

  // Live posture state updated each frame
  const [postureResult, setPostureResult] = useState(null);

  // Toggle states
  const [cameraOn, setCameraOn] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const cameraOnRef = useRef(true);
  const showLandmarksRef = useRef(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const scoreHistoryRef = useRef([]); // rolling window for smoothing
  const lastPhoneDetectTsRef = useRef(0);
  const phoneStateRef = useRef({ detections: [], until: 0 });

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Fetch sessions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5000/sessions/${user.uid}`)
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .catch((err) => console.log(err));
  }, [user]);

  // ── Load model + camera ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadModel = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        const objectDetector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          scoreThreshold: 0.5,
          categoryAllowlist: ["cell phone"],
          maxResults: 3,
        });

        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          objectDetectorRef.current = objectDetector;
          setPoseStatus("Model ready — starting camera...");
          startCamera();
        }
      } catch (err) {
        console.error("Model load error:", err);
        if (!cancelled) setPoseStatus("Failed to load pose model.");
      }
    };

    loadModel();
    return () => {
      cancelled = true;
      stopEverything();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setPoseStatus(null);
          requestAnimationFrame(detectPose);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  };

  const handleToggleCamera = () => {
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => {
        t.enabled = next;
      });
    }

    // Clear the canvas when turning off so skeleton doesn't freeze on screen
    if (!next && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setPostureResult(null);
      scoreHistoryRef.current = [];
      phoneStateRef.current = { detections: [], until: 0 };
    }
  };

  const handleToggleLandmarks = () => {
    const next = !showLandmarksRef.current;
    showLandmarksRef.current = next;
    setShowLandmarks(next);

    // Immediately clear canvas if hiding
    if (!next && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // ── Per-frame detection + posture analysis ──────────────────────────────────
  const detectPose = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    // Skip detection frames when camera is off but keep the loop alive
    if (!cameraOnRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(ctx);

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      const nowTs = performance.now();
      const result = landmarker.detectForVideo(video, nowTs);

      // ── Object detection (throttled ~3 Hz) ────────────────────────────────
      if (objectDetectorRef.current && nowTs - lastPhoneDetectTsRef.current > 300) {
        lastPhoneDetectTsRef.current = nowTs;
        const objResult = objectDetectorRef.current.detectForVideo(video, nowTs);
        phoneStateRef.current = {
          detections: objResult.detections ?? [],
          until: nowTs + 600, // hold on-screen for ~2 detection cycles
        };
      }
      const phoneActive =
        performance.now() < phoneStateRef.current.until &&
        phoneStateRef.current.detections.length > 0;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        // ── Draw skeleton (only when landmarks are toggled on) ──────────────
        if (showLandmarksRef.current) {
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
            color: "#00FF88",
            lineWidth: 2,
          });
          drawingUtils.drawLandmarks(landmarks, {
            radius: 4,
            color: "#FF4D6D",
            fillColor: "#FFB3C1",
            lineWidth: 1,
          });
        }

        // ── Analyze posture ─────────────────────────────────────────────────
        const analysis = analyzePosture(landmarks, { phoneDetected: phoneActive });

        if (analysis.reliable) {
          // Smooth the score over a rolling window to avoid flickering
          const history = scoreHistoryRef.current;
          history.push(analysis.score);
          if (history.length > SMOOTHING_WINDOW) history.shift();
          const smoothedScore = Math.round(
            history.reduce((a, b) => a + b, 0) / history.length
          );

          setPostureResult({ ...analysis, score: smoothedScore });
        }
      }

      // ── Draw phone bounding box (independent of skeleton toggle) ──────────
      if (phoneActive) {
        ctx.strokeStyle = "#E53E3E";
        ctx.lineWidth = 3;
        ctx.font = "14px Arial";
        ctx.fillStyle = "#E53E3E";
        for (const d of phoneStateRef.current.detections) {
          const { originX, originY, width, height } = d.boundingBox;
          ctx.strokeRect(originX, originY, width, height);
          const score = d.categories?.[0]?.score ?? 0;
          ctx.fillText(`Phone ${Math.round(score * 100)}%`, originX + 4, originY - 6);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  };

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  const stopEverything = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (videoRef.current?.srcObject)
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close();
      poseLandmarkerRef.current = null;
    }
    if (objectDetectorRef.current) {
      objectDetectorRef.current.close();
      objectDetectorRef.current = null;
    }
  };

  const handleSignOut = async () => {
    try {
      stopEverything();
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <p style={styles.loading}>Loading dashboard...</p>;
  if (!user) return <Navigate to="/login" replace />;

  const email = location.state?.email || user?.email;
  const scoreColor = !postureResult
    ? "#888"
    : postureResult.score >= 80
    ? "#38a169"
    : postureResult.score >= 50
    ? "#d69e2e"
    : "#e53e3e";

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <h1 style={styles.title}>FocusForm</h1>
        <div style={styles.headerRight}>
          <span style={styles.emailBadge}>{email}</span>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* ── Video panel ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Live Pose Detection</h2>
            <div style={styles.toggleRow}>
              <button style={cameraOn ? styles.toggleBtnOn : styles.toggleBtnOff} onClick={handleToggleCamera}>
                {cameraOn ? "📷 Camera On" : "📷 Camera Off"}
              </button>
              <button style={showLandmarks ? styles.toggleBtnOn : styles.toggleBtnOff} onClick={handleToggleLandmarks}>
                {showLandmarks ? "🦴 Skeleton On" : "🦴 Skeleton Off"}
              </button>
            </div>
          </div>
          {poseStatus && <p style={styles.statusText}>{poseStatus}</p>}
          {cameraError ? (
            <p style={styles.errorText}>{cameraError}</p>
          ) : (
            <div style={{ ...styles.videoWrapper, opacity: cameraOn ? 1 : 0.35 }}>
              <video ref={videoRef} autoPlay playsInline muted width={640} height={480} style={styles.video} />
              <canvas ref={canvasRef} style={styles.canvas} />
            </div>
          )}
        </div>

        {/* ── Posture panel ── */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Posture Analysis</h2>

          {!postureResult ? (
            <p style={styles.statusText}>Waiting for reliable detection...</p>
          ) : (
            <>
              {/* Score ring */}
              <div style={styles.scoreRing}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - postureResult.score / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
                  />
                  <text x="60" y="56" textAnchor="middle" fontSize="26" fontWeight="bold" fill={scoreColor}>
                    {postureResult.score}
                  </text>
                  <text x="60" y="74" textAnchor="middle" fontSize="11" fill="#888">
                    / 100
                  </text>
                </svg>
                <p style={{ ...styles.scoreLabel, color: scoreColor }}>
                  {postureResult.score >= 80
                    ? "Good posture 👍"
                    : postureResult.score >= 50
                    ? "Needs attention ⚠️"
                    : "Poor posture 🔴"}
                </p>
              </div>

              {/* Individual checks */}
              <div style={styles.checksGrid}>
                {postureResult.checks.map((check) => (
                  <div
                    key={check.name}
                    style={{
                      ...styles.checkItem,
                      borderLeft: `4px solid ${
                        check.severe ? "#e53e3e" : check.bad ? "#d69e2e" : "#38a169"
                      }`,
                    }}
                  >
                    <span style={styles.checkName}>{check.name}</span>
                    <span
                      style={{
                        ...styles.checkStatus,
                        color: check.severe ? "#e53e3e" : check.bad ? "#d69e2e" : "#38a169",
                      }}
                    >
                      {check.severe ? "Severe" : check.bad ? "Bad" : "Good"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Issue messages */}
              {postureResult.issues.length > 0 && (
                <div style={styles.issueBox}>
                  <p style={styles.issueTitle}>Corrections needed:</p>
                  {postureResult.issues.map((msg, i) => (
                    <p key={i} style={styles.issueMsg}>• {msg}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Sessions ── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Recent Sessions</h2>
        {sessions.length === 0 ? (
          <p style={styles.statusText}>No sessions recorded yet.</p>
        ) : (
          <pre style={styles.pre}>{JSON.stringify(sessions, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #355C7D, #6C9BC3, #8EB8DD)",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  loading: { color: "white", textAlign: "center", marginTop: "40px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: { color: "white", margin: 0, fontSize: "1.8rem" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  emailBadge: { color: "rgba(255,255,255,0.85)", fontSize: "0.9rem" },
  signOutBtn: {
    background: "rgba(255,255,255,0.15)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.4)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    width: "auto",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
  },
  cardTitle: { color: "#355C7D", marginTop: 0, marginBottom: "12px" },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  toggleRow: { display: "flex", gap: "8px" },
  toggleBtnOn: {
    background: "#355C7D",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    width: "auto",
    margin: 0,
  },
  toggleBtnOff: {
    background: "#e2e8f0",
    color: "#555",
    border: "none",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    width: "auto",
    margin: 0,
  },
  statusText: { color: "#666", fontSize: "0.9rem" },
  errorText: { color: "#e53e3e", fontSize: "0.9rem" },
  videoWrapper: {
    position: "relative",
    display: "inline-block",
    borderRadius: "12px",
    overflow: "hidden",
    transform: "scaleX(-1)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    maxWidth: "100%",
  },
  video: { display: "block", width: "100%", height: "auto" },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  scoreRing: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "20px",
  },
  scoreLabel: { fontWeight: "bold", fontSize: "1rem", margin: "8px 0 0" },
  checksGrid: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" },
  checkItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#f7fafc",
  },
  checkName: { fontSize: "0.9rem", color: "#333", fontWeight: "500" },
  checkStatus: { fontSize: "0.85rem", fontWeight: "bold" },
  issueBox: {
    background: "#fff5f5",
    borderRadius: "10px",
    padding: "12px 16px",
    border: "1px solid #fed7d7",
  },
  issueTitle: { color: "#c53030", fontWeight: "bold", margin: "0 0 6px", fontSize: "0.9rem" },
  issueMsg: { color: "#742a2a", fontSize: "0.85rem", margin: "4px 0" },
  pre: {
    background: "#f7f7f7",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "0.8rem",
    overflowX: "auto",
    maxHeight: "200px",
  },
};

export default Dashboard;
