import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./LandingPage.css";
import "./About.css";

const ABOUT_COPY =
  "Many students and remote workers lose productivity due to fatigue, stress, and bad posture during long work sessions. Most productivity apps rely on timers or self-reporting, which doesn't reflect real-time physical indicators of attention and stress. Our goal is to build a web app that detects posture and motion patterns using a webcam (with user consent) to track posture and movement patterns and suggest breaks or adjustments when focus seems to drop.";

const About = () => {
  return (
    <div className="landing-wrapper about-view">
      <SiteHeader />
      <main className="about-main">
        <h1 className="about-title">About FocusForm</h1>
        <p className="about-body">{ABOUT_COPY}</p>
        <div className="about-actions">
          <Link to="/" className="about-primary-link">
            Back to home
          </Link>
          <a href="/#how-it-works" className="about-secondary-link">
            How it works
          </a>
        </div>
      </main>
    </div>
  );
};

export default About;
