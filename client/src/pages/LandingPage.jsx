import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-wrapper">
      <SiteHeader />

      {/* main landing */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Productivity Powered by Smart Tracking</h1>
            <p>
              FocusForm uses real-time webcam tracking to help you maintain 
              perfect posture while working.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="cta-button"
                onClick={() => navigate("/signup")}
              >
                Start your session now
              </button>
              <button
                type="button"
                className="cta-button-secondary"
                onClick={() => {
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See how it works
              </button>
              <button
                type="button"
                className="cta-button-tertiary"
                onClick={() => navigate("/about")}
              >
                About the project
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src="https://images.unsplash.com/photo-1616400619175-5beda3a17896?q=80&w=1548&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="FocusForm in action" />
          </div>
        </div>
      </section>  

      {/* how it works */}
      <section id="how-it-works" className="how-it-works-visual">
        <div className="section-header">
          <h2>Your Personal Focus Coach</h2>
          <p>Using MediaPipe AI to bridge the gap between wellness and productivity.</p>
        </div>

        <div className="features-container">
          <div className="feature-card">
            <div className="icon-circle">📸</div>
            <h3>Local Calibration</h3>
            <p>Sync your camera in seconds. Our AI maps 33 skeletal landmarks to understand your unique "Power Posture."</p>
          </div>

          <div className="feature-card">
            <div className="icon-circle">🧠</div>
            <h3>Real-Time Analysis</h3>
            <p>MediaPipe Pose runs directly in your browser, calculating alignment instantly.</p>
          </div>

          <div className="feature-card">
            <div className="icon-circle">📉</div>
            <h3>Habit Building</h3>
            <p>View daily graphs of your focus sessions to identify when you're most prone to fatigue.</p>
          </div>
        </div>

        <div className="section-cta">
          <button
            type="button"
            className="section-cta-button"
            onClick={() => navigate("/signup")}
          >
            Get started
          </button>
          <button
            type="button"
            className="section-cta-button section-cta-button--outline"
            onClick={() => navigate("/about")}
          >
            Read our mission
          </button>
        </div>
      </section>

      {/* privacy */}
      <section id="privacy" className="privacy-expanded">
        <div className="privacy-content">
          <div className="privacy-text-wrapper">
            <h2>Privacy by Design</h2>
            <p className="privacy-subtitle">We believe your workspace is a private sanctuary. Here is our promise:</p>
            
            <div className="privacy-grid">
              <div className="privacy-item">
                <h4>Zero Server Uploads</h4>
                <p>Unlike other AI tools, FocusForm never sends your video feed to the cloud. The "eyes" of our AI live and die inside your browser tab.</p>
              </div>
              <div className="privacy-item">
                <h4>No Recording, Ever</h4>
                <p>Our code is designed to process individual frames for math calculations (landmarks) and then instantly discard them. We don't even have a "Save Video" button.</p>
              </div>
              <div className="privacy-item">
                <h4>Browser Transparency</h4>
                <p>We rely on standard Web APIs. You will always see the green "Camera in Use" indicator on your browser, giving you total control over when we're active.</p>
              </div>
              <div className="privacy-item">
                <h4>Encrypted Stats</h4>
                <p>Only your numerical data (like "Minutes Focused") is saved to our database. This is encrypted and used only to build your personal dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;