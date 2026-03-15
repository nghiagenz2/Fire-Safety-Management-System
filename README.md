# PCCC Smart Building System

Hệ thống quản lý an toàn phòng cháy chữa cháy (PCCC) cho tòa nhà cao tầng, triển khai theo mô hình **đa tầng (multi-tier)** và **MVC** cho backend. Mục tiêu là hỗ trợ giám sát thiết bị, mô phỏng cháy, xác định lối thoát hiểm an toàn và thống kê báo cáo trên nền **Web GIS 3D** theo thời gian thực.

## Tóm tắt kiến trúc hệ thống

- **Frontend (Web GIS 3D):** giao diện cho người dùng tòa nhà, nhân viên PCCC, ban quản lý; hiển thị mô hình 3D, thiết bị, lối thoát, cảnh báo realtime.
- **Backend (Application Server):** cung cấp RESTful API, xử lý nghiệp vụ (mô phỏng cháy, tính tuyến thoát hiểm, quản lý thiết bị, báo cáo).
- **GIS Server:** cung cấp dữ liệu/lớp không gian (Scene/Feature Service) cho hiển thị và phân tích GIS.
- **Spatial Database (PostgreSQL/PostGIS):** lưu trữ dữ liệu 2D/3D như `POINTZ`, `LINESTRINGZ`, `POLYGONZ` cho tòa nhà, thiết bị, tuyến thoát hiểm, sự kiện cháy.

## Mô hình backend (MVC mở rộng)

- **Model:** thực thể dữ liệu chính (`Building`, `Floor`, `FireEquipment`, `ExitRoute`, `FireEvent`).
- **Controller:** nhận request HTTP, điều phối xử lý.
- **Service:** chứa logic nghiệp vụ cốt lõi.
- **Repository:** thao tác CRUD với PostgreSQL/PostGIS.
- **Config/Common:** cấu hình DB/GIS và chuẩn hóa phản hồi API.

## Cấu trúc thư mục (đầy đủ)

```text
pccc-smart-building-system/
│
├── frontend/                                  # Ứng dụng Web GIS 3D
│   ├── public/                                # Tài nguyên tĩnh
│   ├── src/                                   # Mã nguồn frontend
│   │   ├── components/                        # Component giao diện
│   │   │   ├── Map3D/                         # Hiển thị mô hình bản đồ 3D
│   │   │   ├── FireAlert/                     # Cảnh báo cháy realtime
│   │   │   ├── EquipmentPanel/                # Bảng thông tin thiết bị PCCC
│   │   │   └── ExitRouteViewer/               # Hiển thị lối thoát hiểm
│   │   ├── pages/                             # Các màn hình nghiệp vụ
│   │   │   ├── Dashboard/                     # Trang tổng quan
│   │   │   ├── FireSimulation/                # Mô phỏng cháy theo tầng
│   │   │   ├── EquipmentManagement/           # Quản lý thiết bị PCCC
│   │   │   ├── Reports/                       # Báo cáo và thống kê
│   │   │   ├── Login/                         # Đăng nhập hệ thống (UC13)
│   │   │   ├── UserManagement/                # Quản lý người dùng (UC12)
│   │   │   ├── Maintenance/                   # Bảo trì thiết bị (UC09)
│   │   │   ├── InspectionSchedule/            # Lập lịch/cập nhật kiểm tra (UC10-UC11)
│   │   │   ├── IncidentTracking/              # Theo dõi sự cố thực tế (UC18)
│   │   │   └── FireScenario/                  # Thiết lập kịch bản cháy (UC14)
│   │   ├── services/                          # Gọi REST API
│   │   │   ├── api.js                         # Cấu hình API client dùng chung
│   │   │   ├── fireService.js                 # API liên quan sự kiện/mô phỏng cháy
│   │   │   ├── equipmentService.js            # API quản lý thiết bị
│   │   │   ├── reportService.js               # API thống kê, báo cáo
│   │   │   ├── authService.js                 # API xác thực/đăng nhập
│   │   │   ├── userService.js                 # API quản lý người dùng
│   │   │   ├── maintenanceService.js          # API bảo trì thiết bị
│   │   │   ├── inspectionService.js           # API lịch và kết quả kiểm tra
│   │   │   ├── incidentService.js             # API theo dõi sự cố
│   │   │   └── scenarioService.js             # API kịch bản cháy
│   │   ├── gis/                               # Xử lý scene/layer GIS
│   │   │   ├── sceneLoader.js                 # Nạp scene 3D
│   │   │   ├── buildingLayer.js               # Layer tòa nhà
│   │   │   ├── fireLayer.js                   # Layer vùng cháy/cảnh báo
│   │   │   └── exitRouteLayer.js              # Layer tuyến thoát hiểm
│   │   ├── websocket/                         # Kênh giao tiếp realtime
│   │   │   └── fireAlertSocket.js             # Socket nhận cảnh báo cháy
│   │   └── App.js                             # Root component frontend
│   └── package.json                           # Scripts và dependencies frontend
│
├── backend/                                   # REST API + xử lý nghiệp vụ
│   ├── src/                                   # Mã nguồn backend
│   │   ├── config/                            # Cấu hình hệ thống
│   │   │   ├── database.config.js             # Kết nối PostgreSQL/PostGIS
│   │   │   └── gis.config.js                  # Cấu hình GIS Server
│   │   ├── controllers/                       # Nhận request, trả response
│   │   │   ├── auth.controller.js             # API xác thực
│   │   │   ├── fire.controller.js             # API sự kiện cháy
│   │   │   ├── equipment.controller.js        # API thiết bị PCCC
│   │   │   ├── exitRoute.controller.js        # API lối thoát hiểm
│   │   │   ├── report.controller.js           # API báo cáo
│   │   │   ├── user.controller.js             # API người dùng
│   │   │   ├── maintenance.controller.js      # API bảo trì thiết bị
│   │   │   ├── inspection.controller.js       # API lịch/kết quả kiểm tra
│   │   │   ├── incident.controller.js         # API sự cố thực tế
│   │   │   └── scenario.controller.js         # API kịch bản cháy
│   │   ├── services/                          # Logic nghiệp vụ chính
│   │   │   ├── fireSimulation.service.js      # Mô phỏng cháy
│   │   │   ├── routeCalculation.service.js    # Tính tuyến thoát hiểm an toàn
│   │   │   ├── equipment.service.js           # Quản lý trạng thái thiết bị
│   │   │   ├── report.service.js              # Tổng hợp/xuất báo cáo
│   │   │   ├── auth.service.js                # Xử lý xác thực
│   │   │   ├── user.service.js                # Xử lý nghiệp vụ người dùng
│   │   │   ├── maintenance.service.js         # Xử lý bảo trì
│   │   │   ├── inspection.service.js          # Xử lý lịch/kết quả kiểm tra
│   │   │   ├── incident.service.js            # Xử lý sự cố thực tế
│   │   │   └── scenario.service.js            # Xử lý kịch bản cháy
│   │   ├── repositories/                      # Truy cập dữ liệu DB
│   │   │   ├── fire.repository.js             # Truy vấn dữ liệu cháy
│   │   │   ├── equipment.repository.js        # Truy vấn dữ liệu thiết bị
│   │   │   ├── exitRoute.repository.js        # Truy vấn dữ liệu tuyến thoát
│   │   │   ├── building.repository.js         # Truy vấn dữ liệu tòa nhà/tầng
│   │   │   ├── user.repository.js             # Truy vấn dữ liệu người dùng
│   │   │   ├── maintenance.repository.js      # Truy vấn dữ liệu bảo trì
│   │   │   ├── inspection.repository.js       # Truy vấn dữ liệu kiểm tra
│   │   │   ├── incident.repository.js         # Truy vấn dữ liệu sự cố
│   │   │   └── scenario.repository.js         # Truy vấn dữ liệu kịch bản cháy
│   │   ├── models/                            # Mô hình dữ liệu nghiệp vụ
│   │   │   ├── building.model.js              # Thực thể tòa nhà
│   │   │   ├── floor.model.js                 # Thực thể tầng
│   │   │   ├── fireEquipment.model.js         # Thực thể thiết bị PCCC
│   │   │   ├── exitRoute.model.js             # Thực thể lối thoát hiểm
│   │   │   ├── fireEvent.model.js             # Thực thể sự kiện cháy
│   │   │   ├── user.model.js                  # Thực thể người dùng
│   │   │   ├── maintenanceLog.model.js        # Thực thể nhật ký bảo trì
│   │   │   ├── inspectionSchedule.model.js    # Thực thể lịch kiểm tra
│   │   │   ├── inspectionResult.model.js      # Thực thể kết quả kiểm tra
│   │   │   ├── incident.model.js              # Thực thể sự cố thực tế
│   │   │   ├── scenario.model.js              # Thực thể kịch bản cháy
│   │   │   └── report.model.js                # Thực thể báo cáo
│   │   ├── routes/                            # Định nghĩa endpoint RESTful
│   │   │   ├── auth.routes.js                 # Routes xác thực
│   │   │   ├── fire.routes.js                 # Routes sự kiện cháy
│   │   │   ├── equipment.routes.js            # Routes thiết bị
│   │   │   ├── exitRoute.routes.js            # Routes lối thoát hiểm
│   │   │   ├── report.routes.js               # Routes báo cáo
│   │   │   ├── user.routes.js                 # Routes người dùng
│   │   │   ├── maintenance.routes.js          # Routes bảo trì
│   │   │   ├── inspection.routes.js           # Routes kiểm tra định kỳ
│   │   │   ├── incident.routes.js             # Routes sự cố thực tế
│   │   │   └── scenario.routes.js             # Routes kịch bản cháy
│   │   ├── utils/                             # Hàm tiện ích dùng chung
│   │   │   ├── geometry.util.js               # Tiện ích hình học không gian
│   │   │   ├── pathfinding.util.js            # Tiện ích tìm đường
│   │   │   └── response.util.js               # Chuẩn hóa response API
│   │   └── app.js                             # Entry point backend app
│   └── package.json                           # Scripts và dependencies backend
│
├── database/                                  # Tầng dữ liệu PostGIS
│   ├── schema/                                # Định nghĩa schema/bảng
│   │   ├── buildings.sql                      # Bảng tòa nhà
│   │   ├── floors.sql                         # Bảng tầng
│   │   ├── fire_equipment.sql                 # Bảng thiết bị PCCC (POINTZ)
│   │   ├── exit_routes.sql                    # Bảng tuyến thoát hiểm (LINESTRINGZ)
│   │   ├── fire_events.sql                    # Bảng sự kiện cháy
│   │   ├── users.sql                          # Bảng tài khoản người dùng
│   │   ├── reports.sql                        # Bảng dữ liệu báo cáo
│   │   ├── maintenance_logs.sql               # Bảng lịch sử bảo trì
│   │   ├── inspection_schedules.sql           # Bảng lịch kiểm tra định kỳ
│   │   ├── inspection_results.sql             # Bảng kết quả kiểm tra
│   │   ├── incidents.sql                      # Bảng sự cố thực tế
│   │   └── scenarios.sql                      # Bảng kịch bản cháy giả lập
│   ├── seed/                                  # Dữ liệu mẫu
│   │   └── sample_data.sql                    # Script seed dữ liệu demo
│   └── migrations/                            # Quản lý version schema DB
│
├── gis-server/                                # Cấu hình máy chủ GIS
│   ├── geoserver/                             # Cấu hình GeoServer
│   ├── layers/                                # Định nghĩa lớp dữ liệu GIS
│   └── styles/                                # Style hiển thị bản đồ/layer
│
├── docs/                                      # Tài liệu đồ án
│   ├── architecture/                          # Tài liệu kiến trúc hệ thống
│   ├── diagrams/                              # Các sơ đồ phân tích/thiết kế
│   └── api-spec/                              # Đặc tả API
│
├── docker-compose.yml                         # Cấu hình chạy nhiều dịch vụ bằng Docker
├── README.md                                  # Tài liệu tổng quan dự án
└── .gitignore                                 # Danh sách file bỏ qua khi commit
```

## Ghi chú

- Kiến trúc hỗ trợ mở rộng tích hợp **IoT** (cảm biến khói/nhiệt, báo cháy) qua API hoặc MQTT.
- Dễ mở rộng thêm mobile app hoặc dashboard chuyên sâu nhờ thiết kế RESTful và tách tầng rõ ràng.
