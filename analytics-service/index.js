/**
 * FairGig Analytics Service — Node.js Express
 * Aggregate KPIs: commission trends, income distributions,
 * vulnerability flags, top complaint categories.
 * Port: 8005
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173"] }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const PORT = process.env.PORT || 8005;

const supaHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function supaGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ detail: "Missing token" });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
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

function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Routes ───────────────────────────────

app.get("/health", (req, res) => res.json({ status: "ok", service: "analytics" }));

/**
 * GET /analytics/overview
 * High-level KPIs for the advocate dashboard
 */
app.get("/analytics/overview", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const [shifts, grievances, workers, anomalies] = await Promise.all([
      supaGet("shifts?select=net_received,gross_earned,platform_deductions,platform,shift_date,worker_id,city,category"),
      supaGet("grievances?select=status,category,platform,created_at"),
      supaGet("users?role=eq.worker&select=id,city,category"),
      supaGet("anomaly_flags?select=worker_id,flag_type,severity,is_acknowledged"),
    ]);

    const totalWorkers = workers.length;
    const totalShifts = shifts.length;
    const totalGross = shifts.reduce((s, x) => s + (x.gross_earned || 0), 0);
    const totalNet = shifts.reduce((s, x) => s + (x.net_received || 0), 0);
    const totalDeductions = shifts.reduce((s, x) => s + (x.platform_deductions || 0), 0);

    const openGrievances = grievances.filter((g) => g.status === "open").length;
    const escalatedGrievances = grievances.filter((g) => g.status === "escalated").length;
    const unresolvedAnomalies = anomalies.filter((a) => !a.is_acknowledged).length;
    const highSeverityAnomalies = anomalies.filter((a) => a.severity === "high" && !a.is_acknowledged).length;

    res.json({
      total_workers: totalWorkers,
      total_shifts: totalShifts,
      total_gross: Math.round(totalGross),
      total_net: Math.round(totalNet),
      avg_commission_rate: totalGross > 0 ? Math.round((totalDeductions / totalGross) * 10000) / 100 : 0,
      open_grievances: openGrievances,
      escalated_grievances: escalatedGrievances,
      unresolved_anomalies: unresolvedAnomalies,
      high_severity_anomalies: highSeverityAnomalies,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /analytics/commission-trends
 * Commission rates per platform over time
 */
app.get("/analytics/commission-trends", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const shifts = await supaGet("shifts?select=platform,gross_earned,platform_deductions,shift_date");

    // Group by platform + month
    const data = {};
    for (const s of shifts) {
      if (!s.gross_earned || !s.shift_date) continue;
      const key = `${s.platform}|${monthKey(s.shift_date)}`;
      if (!data[key]) data[key] = { platform: s.platform, month: monthKey(s.shift_date), gross: 0, deductions: 0 };
      data[key].gross += s.gross_earned;
      data[key].deductions += s.platform_deductions || 0;
    }

    const result = Object.values(data).map((d) => ({
      platform: d.platform,
      month: d.month,
      commission_rate: d.gross > 0 ? Math.round((d.deductions / d.gross) * 10000) / 100 : 0,
      sample_size: 1,
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json(result);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /analytics/income-distribution
 * Income distribution by city zone and category
 */
app.get("/analytics/income-distribution", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const shifts = await supaGet("shifts?select=net_received,city,category,worker_id,shift_date");

    // Group by city
    const byCity = {};
    for (const s of shifts) {
      const city = s.city || "Unknown";
      if (!byCity[city]) byCity[city] = [];
      byCity[city].push(s.net_received || 0);
    }

    const cityStats = Object.entries(byCity).map(([city, incomes]) => {
      const sorted = incomes.sort((a, b) => a - b);
      const total = incomes.reduce((a, b) => a + b, 0);
      const median = sorted[Math.floor(sorted.length / 2)];
      const mean = total / incomes.length;
      return {
        city,
        count: incomes.length,
        median: Math.round(median),
        mean: Math.round(mean),
        min: Math.round(sorted[0]),
        max: Math.round(sorted[sorted.length - 1]),
      };
    });

    // Group by category
    const byCategory = {};
    for (const s of shifts) {
      const cat = s.category || "Unknown";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s.net_received || 0);
    }

    const categoryStats = Object.entries(byCategory).map(([category, incomes]) => ({
      category,
      count: incomes.length,
      median: Math.round(incomes.sort((a, b) => a - b)[Math.floor(incomes.length / 2)]),
      mean: Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length),
    }));

    res.json({ by_city: cityStats, by_category: categoryStats });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /analytics/vulnerability-flags
 * Workers whose income dropped >20% month-on-month
 */
app.get("/analytics/vulnerability-flags", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const shifts = await supaGet("shifts?select=worker_id,net_received,shift_date");
    const users = await supaGet("users?role=eq.worker&select=id,full_name,email,city,category");
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    // Monthly income per worker
    const workerMonthly = {};
    for (const s of shifts) {
      const key = `${s.worker_id}|${monthKey(s.shift_date)}`;
      workerMonthly[key] = (workerMonthly[key] || 0) + (s.net_received || 0);
    }

    // Find workers with >20% drop
    const workerMonths = {};
    for (const [key, income] of Object.entries(workerMonthly)) {
      const [wid, month] = key.split("|");
      if (!workerMonths[wid]) workerMonths[wid] = {};
      workerMonths[wid][month] = income;
    }

    const flags = [];
    for (const [workerId, months] of Object.entries(workerMonths)) {
      const sorted = Object.keys(months).sort();
      for (let i = 1; i < sorted.length; i++) {
        const prev = months[sorted[i - 1]];
        const curr = months[sorted[i]];
        const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
        if (change <= -20) {
          flags.push({
            worker_id: workerId,
            worker: userMap[workerId] || { id: workerId },
            prev_month: sorted[i - 1],
            curr_month: sorted[i],
            prev_income: Math.round(prev),
            curr_income: Math.round(curr),
            change_pct: Math.round(change),
            severity: change <= -40 ? "high" : "medium",
          });
        }
      }
    }

    res.json(flags.sort((a, b) => a.change_pct - b.change_pct));
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /analytics/top-complaints
 * Top complaint categories this week + all time
 */
app.get("/analytics/top-complaints", authMiddleware, requireRole("advocate", "verifier"), async (req, res) => {
  try {
    const grievances = await supaGet("grievances?select=category,platform,status,created_at,cluster_id");

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisWeek = grievances.filter((g) => g.created_at >= oneWeekAgo);

    const countBy = (arr, key) => {
      const counts = {};
      for (const item of arr) {
        const val = item[key] || "Unknown";
        counts[val] = (counts[val] || 0) + 1;
      }
      return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    };

    res.json({
      this_week: {
        by_category: countBy(thisWeek, "category"),
        by_platform: countBy(thisWeek, "platform"),
        total: thisWeek.length,
      },
      all_time: {
        by_category: countBy(grievances, "category"),
        by_platform: countBy(grievances, "platform"),
        by_cluster: countBy(grievances, "cluster_id"),
        total: grievances.length,
      },
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /analytics/worker/:workerId
 * Per-worker analytics for their own dashboard
 */
app.get("/analytics/worker/:workerId", authMiddleware, async (req, res) => {
  try {
    const { workerId } = req.params;
    if (req.user.role === "worker" && req.user.sub !== workerId) {
      return res.status(403).json({ detail: "Cannot access another worker's analytics" });
    }

    const shifts = await supaGet(
      `shifts?worker_id=eq.${workerId}&select=*&order=shift_date.asc`
    );

    if (!shifts.length) return res.json({ shifts: [], weekly: [], monthly: [], platform_rates: [] });

    // Weekly summary
    const weeklyMap = {};
    for (const s of shifts) {
      const d = new Date(s.shift_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeklyMap[key]) weeklyMap[key] = { week: key, gross: 0, net: 0, hours: 0, shifts: 0 };
      weeklyMap[key].gross += s.gross_earned;
      weeklyMap[key].net += s.net_received;
      weeklyMap[key].hours += s.hours_worked || 0;
      weeklyMap[key].shifts++;
    }
    const weekly = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

    // Monthly summary
    const monthlyMap = {};
    for (const s of shifts) {
      const key = monthKey(s.shift_date);
      if (!monthlyMap[key]) monthlyMap[key] = { month: key, gross: 0, net: 0, deductions: 0, hours: 0, shifts: 0 };
      monthlyMap[key].gross += s.gross_earned;
      monthlyMap[key].net += s.net_received;
      monthlyMap[key].deductions += s.platform_deductions;
      monthlyMap[key].hours += s.hours_worked || 0;
      monthlyMap[key].shifts++;
    }
    const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    // Platform commission rates over time
    const platformRates = {};
    for (const s of shifts) {
      const key = `${s.platform}|${monthKey(s.shift_date)}`;
      if (!platformRates[key]) platformRates[key] = { platform: s.platform, month: monthKey(s.shift_date), gross: 0, deductions: 0 };
      platformRates[key].gross += s.gross_earned;
      platformRates[key].deductions += s.platform_deductions;
    }
    const platform_rates = Object.values(platformRates).map((p) => ({
      platform: p.platform,
      month: p.month,
      rate: p.gross > 0 ? Math.round((p.deductions / p.gross) * 10000) / 100 : 0,
    }));

    // City median comparison (anonymised)
    const allShiftsForCity = await supaGet(
      `shifts?city=eq.${shifts[0]?.city || "Unknown"}&select=net_received`
    );
    const cityIncomes = allShiftsForCity.map((s) => s.net_received).sort((a, b) => a - b);
    const cityMedian = cityIncomes.length
      ? cityIncomes[Math.floor(cityIncomes.length / 2)]
      : null;

    res.json({ weekly, monthly, platform_rates, city_median_net: Math.round(cityMedian) });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Analytics Service running on http://localhost:${PORT}`);
});
