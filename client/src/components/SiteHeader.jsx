import { Link, useNavigate } from "react-router-dom";
import "../styles/siteNav.css";

const SiteHeader = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="logo-link">
        FocusForm
      </Link>
      <div className="nav-links">
        <a href="/#how-it-works">How it Works</a>
        <a href="/#privacy">Your Privacy</a>
        <Link to="/about">About</Link>
        <Link to="/dashboard">Dashboard</Link>

        <button
          type="button"
          className="nav-text-btn"
          onClick={() => navigate("/signup")}
        >
          Sign up
        </button>
        <button
          type="button"
          className="login-btn"
          onClick={() => navigate("/login")}
        >
          Login
        </button>
      </div>
    </nav>
  );
};

export default SiteHeader;
