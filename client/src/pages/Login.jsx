import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#7ea9cc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
    },

    card: {
      background: "#ffffff",
      borderRadius: "24px",
      padding: "50px 42px",
      width: "100%",
      maxWidth: "430px",
      boxShadow: "0 10px 35px rgba(28, 58, 88, 0.18)",
    },

    logo: {
      textAlign: "center",
      marginBottom: "10px",
    },

    logoText: {
      fontSize: "38px",
      fontWeight: "700",
      color: "#2f5d7c",
    },

    subtitle: {
      textAlign: "center",
      color: "#5d7285",
      fontSize: "16px",
      marginBottom: "35px",
    },

    label: {
      display: "block",
      color: "#2f5d7c",
      fontSize: "14px",
      fontWeight: "600",
      marginBottom: "8px",
    },

    input: {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "12px",
      border: "1.5px solid #d6e4ef",
      background: "#f8fbfd",
      color: "#1f2937",
      fontSize: "15px",
      outline: "none",
      boxSizing: "border-box",
      marginBottom: "20px",
    },

    button: {
      width: "100%",
      padding: "14px",
      borderRadius: "12px",
      border: "none",
      background: "#2f5d7c",
      color: "#ffffff",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      marginTop: "10px",
    },

    divider: {
      textAlign: "center",
      color: "#5d7285",
      margin: "28px 0 18px",
      fontSize: "14px",
    },

    linkButton: {
      width: "100%",
      padding: "13px",
      borderRadius: "12px",
      border: "2px solid #2f5d7c",
      background: "transparent",
      color: "#2f5d7c",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>FocusForm</span>
        </div>

        <p style={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleLogin}>
          <label style={styles.label}>Email</label>

          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={styles.label}>Password</label>

          <input
            style={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div style={styles.divider}>Don't have an account?</div>

        <button
          style={styles.linkButton}
          type="button"
          onClick={() => navigate("/signup")}
        >
          Go to Sign Up
        </button>
      </div>
    </div>
  );
}

export default Login;