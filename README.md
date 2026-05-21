# FocusForm

Camera-assisted focus and posture coach for students and remote workers.

For project overview, features, tech stack, and team info, see [client/README.md](client/README.md).

## Run locally

You need **two terminals**: one for the API (`server`) and one for the React app (`client`).

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- npm (included with Node.js)
- A modern browser (Chrome or Edge recommended for webcam / MediaPipe on the dashboard)

### 1. Clone the repository

```bash
git clone https://github.com/FranklinDa-minguez/FocusForm.git
cd FocusForm
```

### 2. Configure MongoDB (required for sessions)

The API needs a MongoDB Atlas connection string. Credentials are **not** stored in the repo.

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `MONGODB_URI` to your team’s Atlas URI (from [MongoDB Atlas](https://cloud.mongodb.com/) → your cluster → **Connect** → **Drivers**).

Ask a teammate for the URI, or create a database user in Atlas (**Database Access**) and use that username/password in the string. If the password has special characters, [URL-encode](https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-connection-uri) them.

### 3. Start the backend (port 5000)

```bash
cd server
npm install
npm start
```

You should see `MongoDB connected` and `Server running on port 5000`.  
Quick check: open [http://localhost:5000](http://localhost:5000) — it should respond with `Backend works`.

**`bad auth : authentication failed`?** The username/password in `MONGODB_URI` does not match Atlas. Reset the database user password in Atlas, update `.env`, and restart the server. Also confirm your IP is allowed under **Network Access** (use `0.0.0.0/0` for local dev only if your team allows it).

### 4. Start the frontend (port 3000)

In a **new** terminal:

```bash
cd client
npm install
npm start
```

The app opens at [http://localhost:3000](http://localhost:3000).

### What runs where

| Service   | Folder   | URL                      |
|----------|----------|--------------------------|
| Frontend | `client` | http://localhost:3000    |
| Backend  | `server` | http://localhost:5000    |

The dashboard calls the API on port 5000 for session data. If the backend is not running, login and the UI may still work, but session history and related API features will fail.

Authentication uses Firebase (config in `client/src/firebase.js`). No extra env setup is required for the committed config.

### Production build (optional)

```bash
cd client
npm run build
```

Serve the `client/build` folder with any static host; point the client at your deployed API URL if it is not `http://localhost:5000`.
