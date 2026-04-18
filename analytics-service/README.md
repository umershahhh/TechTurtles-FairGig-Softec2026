# Analytics Service
Node.js Express — advocate KPI aggregation.
**Port:** 8005

## Start
```bash
npm install
npm start
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /analytics/overview | High-level KPIs |
| GET | /analytics/commission-trends | Platform rates over time |
| GET | /analytics/income-distribution | By city & category |
| GET | /analytics/vulnerability-flags | Workers with >20% income drop |
| GET | /analytics/top-complaints | Complaint categories this week |
| GET | /analytics/worker/:id | Per-worker analytics |
