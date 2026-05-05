import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import SiteHeader from "../components/SiteHeader";
import {
  PoseLandmarker,
  ObjectDetector,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import { analyzePosture } from "../postureAnalyzer";

const SMOOTHING_WINDOW = 20;

const Dashboard = () => {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [poseStatus, setPoseStatus] = useState(
    "Initializing pose model..."
  );
  const [cameraError, setCameraError] = useState(null);
  const [postureResult, setPostureResult] = useState(null);

  const [cameraOn, setCameraOn] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // ── Refs ──────────────────────────────────────────────
  const cameraOnRef = useRef(true);
  const showLandmarksRef = useRef(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const poseLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);

  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  const scoreHistoryRef = useRef([]);
  const lastPhoneDetectTsRef = useRef(0);
  const phoneStateRef = useRef({
    detections: [],
    until: 0,
  });

  // ── Auth Listener ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Load Previous Sessions ───────────────────────────
  useEffect(() => {
    if (!user) return;

    fetch(`http://localhost:5000/sessions/${user.uid}`)
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .catch((err) => console.log(err));
  }, [user]);
// ── Start session once user is ready ─────────────────
useEffect(() => {
  if (user) {
    startSession();
  }
}, [user]);
  // ── Load Models ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const pose = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        const detector = await ObjectDetector.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            scoreThreshold: 0.5,
            categoryAllowlist: ["cell phone"],
            maxResults: 3,
          }
        );

        if (!cancelled) {
          poseLandmarkerRef.current = pose;
          objectDetectorRef.current = detector;

          setPoseStatus("Model ready — starting camera...");
          startCamera();
        }
      } catch (err) {
        console.error(err);
        setPoseStatus("Failed to load models.");
      }
    };

    loadModels();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, []);

  // ── Start Session ────────────────────────────────────
  const startSession = async () => {
    if (!user?.uid) return;

    try {
      const res = await fetch(
        "http://localhost:5000/session/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        }
      );

      const data = await res.json();
      setCurrentSessionId(data.session._id);
      console.log("Session started:", data);
    } catch (err) {
      console.log(err);
    }
  };

  // ── End Session ──────────────────────────────────────
  const endSession = async () => {
    if (!currentSessionId) return;

    try {
      await fetch("http://localhost:5000/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          focusScore: 0,
          postureScore: postureResult?.score || 0,
          distractions: 0,
          breaks: 0,
        }),
      });

      setCurrentSessionId(null);
    } catch (err) {
      console.log(err);
    }
  };

  // ── Camera ───────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
          audio: false,
        });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadeddata = async () => {
          setPoseStatus(null);
          requestAnimationFrame(detectPose);
          await startSession();
        };
      }
    } catch (err) {
      console.error(err);
      setCameraError(
        "Camera access denied. Please allow permissions."
      );
    }
  };

  // ── Camera Toggle ────────────────────────────────────
  const handleToggleCamera = async () => {
    const next = !cameraOnRef.current;

    cameraOnRef.current = next;
    setCameraOn(next);

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject
        .getTracks()
        .forEach((track) => {
          track.enabled = next;
        });
    }

    if (!next) {
      await endSession();

      if (canvasRef.current) {
        const ctx =
          canvasRef.current.getContext("2d");

        ctx.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }

      setPostureResult(null);
      scoreHistoryRef.current = [];
      phoneStateRef.current = {
        detections: [],
        until: 0,
      };
    } else {
      await startSession();
    }
  };

  // ── Landmark Toggle ──────────────────────────────────
  const handleToggleLandmarks = () => {
    const next = !showLandmarksRef.current;

    showLandmarksRef.current = next;
    setShowLandmarks(next);

    if (!next && canvasRef.current) {
      const ctx =
        canvasRef.current.getContext("2d");

      ctx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  };

  // ── Pose Detection Loop ──────────────────────────────
  const detectPose = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker =
      poseLandmarkerRef.current;

    if (
      !video ||
      !canvas ||
      !landmarker ||
      video.readyState < 2
    ) {
      animationFrameRef.current =
        requestAnimationFrame(detectPose);
      return;
    }

    if (!cameraOnRef.current) {
      animationFrameRef.current =
        requestAnimationFrame(detectPose);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    const drawingUtils =
      new DrawingUtils(ctx);

    if (
      video.currentTime !==
      lastVideoTimeRef.current
    ) {
      lastVideoTimeRef.current =
        video.currentTime;

      const nowTs = performance.now();

      const result =
        landmarker.detectForVideo(
          video,
          nowTs
        );

      // phone detection
      if (
        objectDetectorRef.current &&
        nowTs -
          lastPhoneDetectTsRef.current >
          300
      ) {
        lastPhoneDetectTsRef.current =
          nowTs;

        const obj =
          objectDetectorRef.current.detectForVideo(
            video,
            nowTs
          );

        phoneStateRef.current = {
          detections:
            obj.detections ?? [],
          until: nowTs + 600,
        };
      }

      const phoneActive =
        performance.now() <
          phoneStateRef.current.until &&
        phoneStateRef.current
          .detections.length > 0;

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      if (
        result.landmarks.length > 0
      ) {
        const landmarks =
          result.landmarks[0];

        if (
          showLandmarksRef.current
        ) {
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            {
              color: "#00FF88",
              lineWidth: 2,
            }
          );

          drawingUtils.drawLandmarks(
            landmarks,
            {
              radius: 4,
              color: "#FF4D6D",
              fillColor: "#FFB3C1",
            }
          );
        }

        const analysis =
          analyzePosture(
            landmarks,
            {
              phoneDetected:
                phoneActive,
            }
          );

        if (analysis.reliable) {
          const history =
            scoreHistoryRef.current;

          history.push(
            analysis.score
          );

          if (
            history.length >
            SMOOTHING_WINDOW
          ) {
            history.shift();
          }

          const smoothed =
            Math.round(
              history.reduce(
                (a, b) => a + b,
                0
              ) / history.length
            );

          setPostureResult({
            ...analysis,
            score: smoothed,
          });
        }
      }

      // draw phone box
      if (phoneActive) {
        ctx.strokeStyle =
          "#E53E3E";
        ctx.lineWidth = 3;
        ctx.fillStyle =
          "#E53E3E";
        ctx.font =
          "14px Arial";

        for (const d of phoneStateRef.current
          .detections) {
          const {
            originX,
            originY,
            width,
            height,
          } = d.boundingBox;

          ctx.strokeRect(
            originX,
            originY,
            width,
            height
          );

          const score =
            d.categories?.[0]
              ?.score ?? 0;

          ctx.fillText(
            `Phone ${Math.round(
              score * 100
            )}%`,
            originX + 4,
            originY - 6
          );
        }
      }
    }

    animationFrameRef.current =
      requestAnimationFrame(detectPose);
  };

  // ── Cleanup ──────────────────────────────────────────
  const stopEverything = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );
    }

    if (
      videoRef.current?.srcObject
    ) {
      videoRef.current.srcObject
        .getTracks()
        .forEach((t) => t.stop());
    }

    if (
      poseLandmarkerRef.current
    ) {
      poseLandmarkerRef.current.close();
      poseLandmarkerRef.current =
        null;
    }

    if (
      objectDetectorRef.current
    ) {
      objectDetectorRef.current.close();
      objectDetectorRef.current =
        null;
    }
  };

  // ── Sign Out ─────────────────────────────────────────
  const handleSignOut =
    async () => {
      try {
        await endSession();
        stopEverything();
        await signOut(auth);

        navigate("/login", {
          replace: true,
        });
      } catch (error) {
        alert(error.message);
      }
    };

  // ── Guards ───────────────────────────────────────────
  if (loading)
    return (
      <p style={styles.loading}>
        Loading dashboard...
      </p>
    );

  if (!user)
    return (
      <Navigate
        to="/login"
        replace
      />
    );

  const scoreColor =
    !postureResult
      ? "#888"
      : postureResult.score >= 80
      ? "#38a169"
      : postureResult.score >= 50
      ? "#d69e2e"
      : "#e53e3e";

  return (
    <div style={styles.page}>
      <SiteHeader />

      <div style={styles.contentWrap}>
        <div style={styles.dashboardActions}>
          <button
            style={styles.dashboardSignOutBtn}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>

        <div style={styles.mainGrid}>
          {/* Camera Card */}
          <div style={styles.card}>
            <h2
              style={
                styles.cardTitle
              }
            >
              Live Pose Detection
            </h2>

            <div
              style={
                styles.toggleRow
              }
            >
              <button
                style={
                  cameraOn
                    ? styles.toggleBtnOn
                    : styles.toggleBtnOff
                }
                onClick={
                  handleToggleCamera
                }
              >
                {cameraOn
                  ? "📷 Camera On"
                  : "📷 Camera Off"}
              </button>

              <button
                style={
                  showLandmarks
                    ? styles.toggleBtnOn
                    : styles.toggleBtnOff
                }
                onClick={
                  handleToggleLandmarks
                }
              >
                {showLandmarks
                  ? "🦴 Skeleton On"
                  : "🦴 Skeleton Off"}
              </button>
            </div>

            {poseStatus && (
              <p
                style={
                  styles.statusText
                }
              >
                {poseStatus}
              </p>
            )}

            {cameraError ? (
              <p
                style={
                  styles.errorText
                }
              >
                {cameraError}
              </p>
            ) : (
              <div
                style={{
                  ...styles.videoWrapper,
                  opacity:
                    cameraOn
                      ? 1
                      : 0.35,
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={640}
                  height={480}
                  style={
                    styles.video
                  }
                />

                <canvas
                  ref={canvasRef}
                  style={
                    styles.canvas
                  }
                />
              </div>
            )}
          </div>

          {/* Posture Card */}
          <div style={styles.card}>
            <h2
              style={
                styles.cardTitle
              }
            >
              Posture Analysis
            </h2>

            {!postureResult ? (
              <p
                style={
                  styles.statusText
                }
              >
                Waiting for reliable
                detection...
              </p>
            ) : (
              <>
                <h1
                  style={{
                    color:
                      scoreColor,
                  }}
                >
                  {
                    postureResult.score
                  }
                  /100
                </h1>

                <p>
                  {postureResult.score >=
                  80
                    ? "Good posture 👍"
                    : postureResult.score >=
                      50
                    ? "Needs attention ⚠️"
                    : "Poor posture 🔴"}
                </p>

                {postureResult.issues.map(
                  (
                    issue,
                    i
                  ) => (
                    <p key={i}>
                      • {issue}
                    </p>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg,#355C7D,#6C9BC3,#8EB8DD)",
    fontFamily:
      "Arial, sans-serif",
  },

  contentWrap: {
    padding: "0 24px 24px",
  },

  loading: {
    color: "white",
    textAlign: "center",
    marginTop: "40px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "20px",
    marginTop: "16px",
  },

  dashboardActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "16px",
  },

  dashboardSignOutBtn: {
    background:
      "rgba(255,255,255,.15)",
    color: "white",
    border:
      "1px solid rgba(255,255,255,.4)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  card: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow:
      "0 8px 30px rgba(0,0,0,.15)",
  },

  cardTitle: {
    color: "#355C7D",
    marginTop: 0,
  },

  toggleRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  },

  toggleBtnOn: {
    background: "#355C7D",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  toggleBtnOff: {
    background: "#e2e8f0",
    color: "#444",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  statusText: {
    color: "#666",
  },

  errorText: {
    color: "#e53e3e",
  },

  videoWrapper: {
    position: "relative",
    display: "inline-block",
    overflow: "hidden",
    borderRadius: "12px",
    transform:
      "scaleX(-1)",
  },

  video: {
    width: "100%",
    display: "block",
  },

  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
};

export default Dashboard;