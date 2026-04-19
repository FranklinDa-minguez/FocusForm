import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // 🔐 Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;
      console.log("Firebase UID:", uid);

      alert("Login successful!");

      // 🚀 Call backend to start session
      console.log("CALLING BACKEND...");

      const res = await fetch("http://localhost:5000/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: uid
        })
      });

      console.log("BACKEND CALLED");

      // 🧪 DEBUG OUTPUT
      console.log("FETCH STATUS:", res.status);

      const text = await res.text();
      console.log("RAW RESPONSE:", text);

      // 👉 Navigate to dashboard
      navigate("/dashboard", {
        state: {
          email: userCredential.user.email,
          uid: uid,
        },
      });

    } catch (error) {
      console.log("ERROR:", error);
      alert(error.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        <button type="submit">Login</button>
      </form>

      <p style={{ marginTop: "16px" }}>
        Don't have an account?
      </p>

      <button type="button" onClick={() => navigate("/signup")}>
        Go to Sign Up
      </button>
    </div>
  );
}

export default Login;