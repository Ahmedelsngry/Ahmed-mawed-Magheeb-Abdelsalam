import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp } from 'firebase-admin/app';
import { setupFirestoreTriggers } from './server/triggers';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
// In AI Studio, we can often rely on default credentials if signed in, 
// but for robustness we'll use simple initialization.
initializeApp({
  projectId: "gen-lang-client-0683847856",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log all requests
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // Start Firestore Triggers Simulation
  try {
    setupFirestoreTriggers();
  } catch (err) {
    console.error("[SERVER] Failed to setup Firestore triggers", err);
  }

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mock Email Endpoint
  app.post("/api/send-email", (req, res) => {
    const { to, subject, data } = req.body;
    console.log(`[MAIL MOCK] Sending email to ${to}`);
    console.log(`[MAIL MOCK] Subject: ${subject}`);
    console.log(`[MAIL MOCK] Payload:`, data);
    // In production, integrate SendGrid or Firebase extensions here
    res.json({ success: true, message: "Email triggered to " + to });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server", err);
  process.exit(1);
});
