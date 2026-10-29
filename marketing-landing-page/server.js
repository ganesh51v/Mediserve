import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const SUBMISSIONS_FILE = path.join(__dirname, "submissions.json");

// Middleware
app.use(express.json());

// Ensure local JSON storage file exists
function ensureStorageFile() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

// Read existing submissions
function readSubmissions() {
  try {
    ensureStorageFile();
    const data = fs.readFileSync(SUBMISSIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read submissions.json, initializing empty array:", err.message);
    return [];
  }
}

// Append new submission
function appendSubmission(record) {
  const all = readSubmissions();
  all.push(record);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(all, null, 2), "utf8");
}

// ─── API Endpoints ────────────────────────────────────────────────────────────

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// View stored submissions (transparent inspection)
app.get("/api/submissions", (req, res) => {
  const submissions = readSubmissions();
  res.json({
    count: submissions.length,
    storageLocation: SUBMISSIONS_FILE,
    submissions,
  });
});

// Primary Lead Capture Endpoint
app.post("/api/subscribe", (req, res) => {
  const { email } = req.body || {};

  // Server-side validation
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email address is required." });
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  // Create submission record
  const newSubmission = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: trimmedEmail,
    submittedAt: new Date().toISOString(),
    userAgent: req.headers["user-agent"] || "unknown",
    ip: req.ip || req.socket.remoteAddress || "127.0.0.1",
  };

  // Persist to local JSON file
  appendSubmission(newSubmission);

  // Log to standard output for transparent auditing
  console.log(`[LEAD CAPTURED] ID: ${newSubmission.id} | Email: ${newSubmission.email} | Time: ${newSubmission.submittedAt}`);

  // Respond with confirmation
  return res.status(201).json({
    success: true,
    message: `Thank you! Access reserved for ${trimmedEmail}. We will send your onboarding details shortly.`,
    leadId: newSubmission.id,
  });
});

// ─── Static Files & SPA Fallback ──────────────────────────────────────────────
const distPath = path.join(__dirname, "dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>PulseCore Server</title></head>
        <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; line-height: 1.6;">
          <h2>PulseCore Backend Server Running on Port ${PORT}</h2>
          <p>Client build not detected in <code>dist/</code>.</p>
          <p>To view the full application:</p>
          <ol>
            <li>Run <code>npm run build</code> to generate the client bundle.</li>
            <li>Or in development mode, run <code>npm run dev</code> for hot-reloading on port 5173.</li>
          </ol>
          <p>Check API health at: <a href="/api/health">/api/health</a></p>
          <p>View captured leads at: <a href="/api/submissions">/api/submissions</a></p>
        </body>
      </html>
    `);
  });
}

// ─── Start Server ─────────────────────────────────────────────────────────────
ensureStorageFile();

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` PulseCore Marketing Server running on: http://localhost:${PORT}`);
  console.log(` - Lead submissions stored in: ${SUBMISSIONS_FILE}`);
  console.log(` - API endpoints: POST /api/subscribe | GET /api/submissions`);
  console.log(`=======================================================`);
});
