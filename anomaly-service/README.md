# Anomaly Detection Service
FastAPI — statistically flags unusual deductions, income drops, rate spikes.
**Port:** 8003

## Start
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```

## Detection Algorithms
- **unusual_deduction** — Z-score > 2.0 on worker's own deduction history
- **income_drop** — Month-on-month net income drop > 20%
- **rate_spike** — Platform commission rate increased > 15% vs baseline

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /anomaly/analyze | Analyze a payload of shifts |
| POST | /anomaly/check/{worker_id} | Fetch + analyze + persist flags |
| GET  | /anomaly/flags/{worker_id} | Get persisted flags |
| PATCH| /anomaly/flags/{id}/acknowledge | Dismiss a flag |
