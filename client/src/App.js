import React, { useState } from "react";
import "./App.css";

function App() {
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const handleSignup = (e) => {
    e.preventDefault();
    console.log("Sign up:", signupEmail, signupPassword);
  };
  const handleLogin = (e) => {
    e.preventDefault();
    console.log("Login:", loginEmail, loginPassword);
  };
  return (
    <div className="app-container">
      <div className="auth-card">
        <h1>FocusForm</h1>
        <h2 className="section-title">Sign Up</h2>
        
        
        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Enter email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Enter password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          
          <button type="submit">Login</button>
        </form>
        <div className="divider"></div>
        <h2 className="section-title">Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
      <Signup />

      <Login />
    </div>
  );
}

export default App;
