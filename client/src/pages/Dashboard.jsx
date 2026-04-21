import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [poseStatus, setPoseStatus] = useState("Initializing pose model...");
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5000/session/${user.uid}`)
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .catch((err) => console.log(err));
  }, [user]);

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

        if (!cancelled) {
          poseLandmarkerRef.current = landmarker;
          setPoseStatus("Model ready — starting camera...");
          startCamera();
        }
      } catch (err) {
        console.error("Model load error:", err);
        if (!cancelled) setPoseStatus("Failed to load pose model.");
      }
    };
    <button style={styles.signOutBtn} onClick={stopEverything}>
      Stop Camera
    </button>

    loadModel();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setPoseStatus("Live — detecting pose...");
          requestAnimationFrame(detectPose);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Camera access denied. Please allow camera permissions.");
    }
  };

  const detectPose = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(ctx);

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      const result = landmarker.detectForVideo(video, performance.now());

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const landmark of result.landmarks) {
        drawingUtils.drawConnectors(
          landmark,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: "#00FF88", lineWidth: 2 }
        );
        drawingUtils.drawLandmarks(landmark, {
          radius: 4,
          color: "#FF4D6D",
          fillColor: "#FFB3C1",
          lineWidth: 1,
        });
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPose);
  };

  const stopEverything = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }

    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close();
      poseLandmarkerRef.current = null;
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>FocusForm Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.emailBadge}>{email}</span>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Live Pose Detection</h2>
        <p style={styles.statusText}>{poseStatus}</p>

        {cameraError ? (
          <p style={styles.errorText}>{cameraError}</p>
        ) : (
          <div style={styles.videoWrapper}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={styles.video}
            />
            <canvas ref={canvasRef} style={styles.canvas} />
          </div>
        )}
      </div>

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

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #355C7D, #6C9BC3, #8EB8DD)",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    color: "white",
    textAlign: "center",
    marginTop: "40px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    color: "white",
    margin: 0,
    fontSize: "1.8rem",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  emailBadge: {
    color: "rgba(255,255,255,0.85)",
    fontSize: "0.9rem",
  },
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
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
  },
  cardTitle: {
    color: "#355C7D",
    marginTop: 0,
    marginBottom: "8px",
  },
  statusText: {
    color: "#666",
    fontSize: "0.9rem",
    marginBottom: "12px",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: "0.9rem",
  },
  videoWrapper: {
    position: "relative",
    display: "inline-block",
    borderRadius: "12px",
    overflow: "hidden",
    transform: "scaleX(-1)", // mirror effect
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    maxWidth: "100%",
  },
  video: {
    display: "block",
    width: "640px",
    maxWidth: "100%",
    height: "auto",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
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
