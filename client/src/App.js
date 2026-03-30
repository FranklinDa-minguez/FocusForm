import Signup from "./pages/Signup";
import Login from "./pages/Login";

function App() {
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>FocusForm</h1>

      <Signup />

      <Login />
    </div>
  );
}

export default App;
