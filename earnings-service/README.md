# Earnings Service
FastAPI — shift logs, CSV import, screenshot references, verification.
**Port:** 8002

## Start
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /shifts | Log a shift |
| GET  | /shifts | List shifts (filtered) |
| PATCH| /shifts/{id} | Update shift |
| DELETE| /shifts/{id} | Delete shift |
| PATCH| /shifts/{id}/verify | Verify/flag shift |
| GET  | /shifts/pending/verification | Queue for verifiers |
| POST | /shifts/import/csv | Bulk CSV import |
| GET  | /earnings/summary | Worker analytics summary |
