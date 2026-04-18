# Auth Service
FastAPI — JWT login, role management, token refresh.
**Port:** 8001

## Start
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT tokens |
| POST | /auth/refresh | Refresh access token |
| GET  | /auth/me | Get current user |
| PATCH| /auth/me | Update profile |
| GET  | /auth/users | List all users (verifier/advocate) |
