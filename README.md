# Fire Safety Management System

## Project Structure
- `frontend/`: giao diện người dùng và bản đồ 3D/realtime
- `backend/`: API, business logic, auth, services
- `database/`: schema PostGIS và dữ liệu mẫu
- `docker-compose.yml`: chạy FE + BE + DB

## Quick Start
### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### Docker Compose
```bash
docker compose up -d
```
