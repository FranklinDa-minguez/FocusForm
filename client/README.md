# FocusForm — Camera-Assisted Focus & Posture Coach

## Group 5
- Makiya
- Katherine
- Franklin
- Tasneem

## Project Overview
FocusForm is a web application designed to help students and remote workers maintain focus and healthy posture during long work sessions.

The app uses a webcam (with user consent) to detect posture and movement patterns. When signs of fatigue or poor posture are detected, the system suggests breaks or posture adjustments.

## Features
- User signup and login (Firebase Authentication)
- Focus session tracking
- Webcam posture detection (planned)
- Break suggestions
- Dashboard with session history

## Tech Stack

**Frontend**
- ReactJS
- HTML / CSS

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB

**Tools**
- Firebase Authentication
- GitHub
- Figma

## How to Run the Project Locally

FocusForm is a monorepo: the React app lives in `client/` and the API in `server/`. Run both for full functionality (especially the dashboard and sessions).

### Prerequisites

- Node.js v18+ and npm
- Modern browser with webcam support (for the dashboard)

### Step 1 — MongoDB environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `MONGODB_URI` to your MongoDB Atlas connection string (get it from a teammate or from Atlas → **Connect** → **Drivers**).

### Step 2 — Backend

```bash
cd server
npm install
npm start
```

Keep this terminal open. The API listens on **http://localhost:5000**.

If you see `bad auth : authentication failed`, the Atlas username/password in `.env` is wrong or outdated—reset the DB user in Atlas and update `MONGODB_URI`.

### Step 3 — Frontend

Open a **second** terminal:

```bash
cd client
npm install
npm start
```

The site opens at **http://localhost:3000**.

### Verify

1. Landing page loads at http://localhost:3000  
2. Backend health check: http://localhost:5000 shows `Backend works`  
3. Sign up / log in, then open the dashboard (allow camera access when prompted)

### Notes

- **Firebase:** Auth is configured in `src/firebase.js`. Use the shared project config as committed, or replace it with your own Firebase web app credentials if your team uses a separate project.
- **API URL:** The dashboard talks to `http://localhost:5000`. Start the server before testing sessions.
- **MongoDB:** Set `MONGODB_URI` in `server/.env` (see `server/.env.example`). Session features need a successful Atlas connection.

For the same steps from the repo root, see the root [README.md](../README.md).

## Team Responsibilities
- Tasneem — Login / Signup system
- Franklin — Dashboard
- Katherine — Landing / Consent pages
- Makiya — Session page (webcam tracking)
