# Grievance Service
Node.js Express — complaint CRUD, tagging, clustering, escalation.
**Port:** 8004

## Start
```bash
npm install
npm start
```

## Clustering
Complaints are auto-clustered on creation using keyword matching against
the description + category. Similar complaints surface together in the
advocate dashboard's cluster summary view.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /grievances | Create complaint |
| GET  | /grievances | List (filtered) |
| GET  | /grievances/:id | Single complaint |
| PATCH| /grievances/:id/tags | Add tags |
| PATCH| /grievances/:id/escalate | Escalate |
| PATCH| /grievances/:id/resolve | Resolve |
| PATCH| /grievances/:id/close | Close |
| DELETE| /grievances/:id | Delete |
| GET  | /clusters/summary | Cluster overview |
