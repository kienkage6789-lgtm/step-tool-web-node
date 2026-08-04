# STEP Weight & 3D Packaging Web Tool (Node.js)

Hệ thống Web App tính toán trọng lượng chi tiết từ file CAD STEP, tính Shot Weight khuôn nhựa và mô phỏng xếp thùng 3D (3D Bin Packing). 

Được thiết kế **tối ưu đặc biệt siêu nhẹ** cho **TV Box (Ubuntu 25.04 ARM64, RAM 2GB, ROM 16GB)**.

---

## ⚡ Các Điểm Nổi Bật Về Hiệu Năng (Tối Ưu Cho TV Box 2GB RAM)

1. **Browser-side WebAssembly STEP Parsing:**
   * Sử dụng `occt-import-js` (OpenCASCADE Wasm).
   * Phân tích file CAD `.step` ngay trên Trình duyệt Client (Máy tính / Điện thoại của người dùng).
   * **TV Box không ngốn 1MB RAM nào để parse file STEP!**
2. **Siêu Nhẹ & Nhanh (Node.js + Express.js):**
   * Server Node.js chỉ chiếm **~30MB - 60MB RAM** trạng thái tĩnh.
   * Dung lượng cài đặt toàn bộ chỉ khoảng **~150MB - 200MB** (tiết kiệm hơn 80% so với Python CadQuery).
3. **Mô phỏng Đồ Họa 3D Tương Tác (Three.js):**
   * Hiển thị sơ đồ xếp thùng 3D tương tác 360 độ trực quan, cho phép người dùng xoay, thu phóng và chọn nhiều phương án đóng gói.
4. **Xuất Báo Cáo Excel Chuyên Nghiệp:**
   * Xuất báo cáo khối lượng hàng loạt và báo cáo tọa độ chi tiết xếp thùng ra file `.xlsx` với định dạng màu sắc đẹp mắt.

---

## 🚀 Hướng Dẫn Chạy Trên Máy Local (Windows / Linux)

### 1. Cài Đặt Dependencies
Mở Terminal tại thư mục `D:\thị trường\step-tool-web-node`:
```bash
npm install
```

### 2. Chạy Ứng Dụng
```bash
npm start
```
Truy cập trên trình duyệt web tại địa chỉ: `http://localhost:3000`

---

## 📺 Hướng Dẫn Deploy Lên TV Box (Ubuntu 25.04 ARM64)

### Bước 1: Cài đặt Node.js trên TV Box
```bash
sudo apt update
sudo apt install -y nodejs npm
```

### Bước 2: Copy Code và Cài đặt
```bash
# Copy thư mục step-tool-web-node vào TV Box (ví dụ: /home/ubuntu/step-tool-web-node)
cd /home/ubuntu/step-tool-web-node
npm install --production
```

### Bước 3: Cấu hình PM2 Quản lý Chạy Ngầm & Tự Bật Khi Cắm Điện
```bash
sudo npm install -g pm2
pm2 start server.js --name "step-tool-web"
pm2 startup
pm2 save
```

Bây giờ bạn có thể truy cập Web App từ bất kỳ máy tính/điện thoại nào trong cùng mạng WiFi/LAN thông qua địa chỉ IP của TV Box:
`http://<IP-TV-BOX>:3000` (ví dụ `http://192.168.1.15:3000`).
