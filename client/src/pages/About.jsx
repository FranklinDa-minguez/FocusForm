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

      <section className="about-hero">
        <div className="about-hero-inner">
          <h1>About FocusForm</h1>
          <p className="about-hero-subtitle">
            Wellness and productivity, tracked in real time.
          </p>
        </div>
      </section>

      <section className="about-content">
        <div className="about-card">
          <div className="about-card-accent" aria-hidden="true" />
          <p className="about-body">{ABOUT_COPY}</p>
        </div>
      </section>

      <section className="about-cta">
        <div className="about-cta-inner">
          <h2>Explore FocusForm</h2>
          <p className="about-cta-subtitle">
            See how it works or head back to the home page.
          </p>
          <div className="about-actions">
            <Link to="/" className="about-btn about-btn--primary">
              Back to home
            </Link>
            <a href="/#how-it-works" className="about-btn about-btn--secondary">
              How it works
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
