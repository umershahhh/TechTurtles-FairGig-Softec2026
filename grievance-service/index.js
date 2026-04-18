/**
 * FairGig Grievance Service — Node.js Express
 * Complaint CRUD, tagging, clustering, escalation workflow.
 * Port: 8004
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const PORT = process.env.PORT || 8004;

const supaHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── Helpers ──────────────────────────────
async function supaGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function supaPost(path, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: supaHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function supaPatch(path, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: supaHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function supaDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: supaHeaders,
  });
  if (!res.ok) throw new Error(await res.text());
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Missing token" });
  }
  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ detail: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ detail: "Insufficient permissions" });
    }
    next();
  };
}

/**
 * Naive keyword clustering — groups complaints by platform + shared keywords.
 * Returns a cluster_id string.
 */
function computeClusterId(platform, category, description) {
  const keywords = [
    "deactivat", "commission", "rate", "payment", "ban", "suspend",
    "no reason", "unfair", "increase", "cut", "overcharg", "block",
  ];
  const text = `${description} ${category}`.toLowerCase();
  const matchedKeywords = keywords.filter((k) => text.includes(k));
  if (matchedKeywords.length === 0) return `${platform.toLowerCase()}-general`;
  return `${platform.toLowerCase()}-${matchedKeywords[0]}`;
}

// ── Routes ───────────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok", service: "grievance" }));

// POST /grievances — create a complaint
app.post("/grievances", authMiddleware, async (req, res) => {
  try {
    const { platform, category, description, is_anonymous = true, tags = [] } = req.body;
    if (!platform || !category || !description) {
      return res.status(400).json({ detail: "platform, category, description required" });
    }

    const cluster_id = computeClusterId(platform, category, description);
    const record = {
      id: uuidv4(),
      worker_id: req.user.sub,
      platform,
      category,
      description,
      is_anonymous,
      tags,
      cluster_id,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await supaPost("grievances", record);
    res.status(201).json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /grievances — list (workers see own; advocates see all)
app.get("/grievances", authMiddleware, async (req, res) => {
  try {
    const { status, platform, cluster_id, category } = req.query;
    let q;

    if (req.user.role === "worker") {
      q = `grievances?worker_id=eq.${req.user.sub}&order=created_at.desc`;
    } else {
      q = "grievances?order=created_at.desc";
    }

    if (status) q += `&status=eq.${status}`;
    if (platform) q += `&platform=eq.${platform}`;
    if (cluster_id) q += `&cluster_id=eq.${cluster_id}`;
    if (category) q += `&category=eq.${category}`;

    const data = await supaGet(q);
    res.json(data);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /grievances/:id
app.get("/grievances/:id", authMiddleware, async (req, res) => {
  try {
    const rows = await supaGet(`grievances?id=eq.${req.params.id}&select=*`);
    if (!rows.length) return res.status(404).json({ detail: "Not found" });
    const g = rows[0];
    if (req.user.role === "worker" && g.worker_id !== req.user.sub) {
      return res.status(403).json({ detail: "Not your grievance" });
    }
    res.json(g);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /grievances/:id/tags — advocates add tags
app.patch("/grievances/:id/tags", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ detail: "tags must be array" });
    const result = await supaPatch(`grievances?id=eq.${req.params.id}`, {
      tags,
      updated_at: new Date().toISOString(),
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /grievances/:id/escalate
app.patch("/grievances/:id/escalate", authMiddleware, requireRole("advocate"), async (req, res) => {
  try {
    const { advocate_note } = req.body;
    const result = await supaPatch(`grievances?id=eq.${req.params.id}`, {
      status: "escalated",
      escalated_by: req.user.sub,
      escalated_at: new Date().toISOString(),
      advocate_note,
      updated_at: new Date().toISOString(),
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /grievances/:id/resolve
app.patch("/grievances/:id/resolve", authMiddleware, requireRole("advocate"), async (req, res) => {
  try {
    const { advocate_note } = req.body;
    const result = await supaPatch(`grievances?id=eq.${req.params.id}`, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      advocate_note,
      updated_at: new Date().toISOString(),
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// PATCH /grievances/:id/close
app.patch("/grievances/:id/close", authMiddleware, async (req, res) => {
  try {
    const rows = await supaGet(`grievances?id=eq.${req.params.id}&select=worker_id`);
    if (!rows.length) return res.status(404).json({ detail: "Not found" });
    if (req.user.role === "worker" && rows[0].worker_id !== req.user.sub) {
      return res.status(403).json({ detail: "Not your grievance" });
    }
    const result = await supaPatch(`grievances?id=eq.${req.params.id}`, {
      status: "closed",
      updated_at: new Date().toISOString(),
    });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// DELETE /grievances/:id
app.delete("/grievances/:id", authMiddleware, async (req, res) => {
  try {
    const rows = await supaGet(`grievances?id=eq.${req.params.id}&select=worker_id`);
    if (!rows.length) return res.status(404).json({ detail: "Not found" });
    if (req.user.role === "worker" && rows[0].worker_id !== req.user.sub) {
      return res.status(403).json({ detail: "Not your grievance" });
    }
    await supaDelete(`grievances?id=eq.${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// GET /grievances/clusters/summary — cluster overview for advocates
app.get("/clusters/summary", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const grievances = await supaGet("grievances?select=cluster_id,platform,category,status");
    const clusters = {};
    for (const g of grievances) {
      const key = g.cluster_id || "uncategorized";
      if (!clusters[key]) {
        clusters[key] = { cluster_id: key, platform: g.platform, count: 0, statuses: {} };
      }
      clusters[key].count++;
      clusters[key].statuses[g.status] = (clusters[key].statuses[g.status] || 0) + 1;
    }
    res.json(Object.values(clusters).sort((a, b) => b.count - a.count));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Grievance Service running on http://localhost:${PORT}`);
});
