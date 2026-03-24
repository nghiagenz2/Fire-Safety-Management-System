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

## Quy tắc làm việc (Git Branch)
- `main`: nhánh chính, dùng để lưu phiên bản ổn định/sản phẩm cuối cùng.
- `dev`: nhánh phát triển chung của cả team (tích hợp các task đã hoàn thành).
- Mỗi thành viên **không code trực tiếp trên `dev`**; tạo nhánh mới từ `dev` cho từng task.

### Quy tắc đặt tên nhánh task
- Frontend: `feature/frontend-<ten-task>`
- Backend: `feature/backend-<ten-task>`
- Fix bug: `fix/<ten-loi>`

Ví dụ:
- Làm trang Home: `feature/frontend-home`
- Làm trang Login: `feature/frontend-login`
- Làm API thiết bị: `feature/backend-equipment-api`

### Quy trình làm việc đề xuất
1. Cập nhật nhánh `dev` mới nhất.
2. Tạo nhánh task từ `dev`.
3. Code + commit theo task.
4. Tạo Pull Request vào `dev` để review.
5. Sau khi nhiều task ổn định trên `dev`, mới merge/release vào `main`.
