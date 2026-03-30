import Signup from "./pages/Signup";
import Login from "./pages/Login";

function App() {
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  
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
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}
      <Signup />

      <Login />
    </div>
  );
}

export default App;
