# 📘 BẢN GHI CHÚ TỔNG HỢP TOÀN BỘ DỰ ÁN (FULL PROJECT NOTES)

Dự án: **Tool Tính Khối Lượng STEP & Xếp Thùng 3D (Web App Node.js)**  
Vị trí thư mục dự án: **`D:\thị trường\step-tool-web-node`**  
Môi trường mục tiêu: **TV Box (Ubuntu 25.04 ARM64, RAM 2GB, ROM 16GB)** & Máy local Windows/Linux.

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU

* **Chức năng chính:**
  1. **Tính khối lượng STEP đơn lẻ & Nhập thể tích thủ công ($\text{cm}^3$):** Đọc file STEP 3D hoặc nhập thể tích thủ công trực tiếp khi không có file CAD 3D để tính toán khối lượng nhựa/kim loại & **Shot Weight** khuôn ép nhựa (Số cavities $\times$ Weight + Cuống phun).
  2. **Tính hàng loạt (Batch mode):** Quét nhiều file STEP cùng lúc, tổng hợp bảng BOM và xuất file Excel `.xlsx`.
  3. **Xếp thùng 3D (3D Bin Packing) Căn Giữa Cân Bằng Cực Kỳ Trực Quan:** 
     - Thuật toán xếp **ngay từ mặt đáy thùng lên trên ($z=0$)**.
     - Căn xếp **chính giữa từ tâm thùng ra 4 cạnh** (tính toán bù lề $X_{\text{start}} = \frac{W - \text{usedW}}{2}, Y_{\text{start}} = \frac{H - \text{usedH}}{2}$).
     - Hiển thị khung nét đứt màu cam và **con số khe hở khoảng dư (mm)** ở 4 thành xung quanh thùng carton.
     - Tự động điền dữ liệu từ kết quả STEP đơn lẻ vừa tính + nút bấm `[🔄 Cập nhật ngay]`.
  4. **Mô phỏng 3D trực quan (Three.js WebGL) & 3 Hình Chiếu 2D:** Xoay 360 độ, chuyển đổi 4 hướng nhìn (3D Isometric, Chiếu Bằng Top X-Y, Chiếu Đứng Front X-Z, Chiếu Cạnh Side Y-Z) và 3 ô canvas 2D chiếu mini.
  5. **Báo cáo Excel Tinh Gọn:** File Excel xếp thùng 3D chỉ xuất bảng tổng hợp các thông số cốt lõi (tải trọng, hiệu suất %, kích thước, số lượng) mà không in bảng hàng trăm dòng tọa độ thừa.
  6. **Quản lý CSDL SQLite:** Lưu giữ và tra cứu 40+ loại vật liệu nhựa kỹ thuật (ABS, PP, POM, PA6, PA66...) và kim loại (Thép, Inox 304, Inox 316, Nhôm, Đồng).

---

## 2. BẢNG CẤU TRÚC CODEBASE & VAI TRÒ CÁC FILE

| Đường dẫn File | Vai trò & Nhiệm vụ |
| :--- | :--- |
| [`package.json`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/package.json) | Khai báo các thư viện phụ thuộc: `express`, `sqlite3`, `exceljs`, `cors`, `multer`. |
| [`config.json`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/config.json) | File cấu hình cổng Cổng Web Server (`port: 3000`) và đường dẫn file CSDL (`db_path`). |
| [`server.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/server.js) | Server Express REST API chính, định tuyến các API endpoints và phục vụ file tĩnh Web Frontend. |
| [`src/db.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/src/db.js) | Module quản lý CSDL SQLite (`sqlite3`) tự động khởi tạo 40+ loại vật liệu. |
| [`src/calculator.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/src/calculator.js) | Module tính toán khối lượng ($V \times \text{Density}$) và khối lượng bơm khuôn (Shot Weight). |
| [`src/bin-packing.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/src/bin-packing.js) | Thuật toán 3D Bin Packing ES6 (xếp từ đáy lên trên, từ tâm ra 4 cạnh, căn giữa đối xứng). |
| [`src/excel-exporter.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/src/excel-exporter.js) | Xuất báo cáo khối lượng BOM và báo cáo tổng hợp xếp thùng 3D tinh gọn ra file `.xlsx` bằng `exceljs`. |
| [`src/parse_step.py`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/src/parse_step.py) | Script Python gọi OpenCASCADE C++ Engine tính toán Exact B-Rep CAD metrics chuẩn 100% SolidWorks/Creo/NX. |
| [`public/index.html`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/public/index.html) | Giao diện Web SPA chính tích hợp ô nhập thể tích thủ công, 4 Tab chức năng, responsive và các khung hình chiếu. |
| [`public/css/style.css`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/public/css/style.css) | Styling hệ thống Dark/Light mode hiện đại, card glassmorphism. |
| [`public/js/step-parser-wasm.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/public/js/step-parser-wasm.js) | Engine đọc STEP phía Trình duyệt (Server CAD Engine + WebAssembly OpenCASCADE fallback). |
| [`public/js/bin-visualizer-3d.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/public/js/bin-visualizer-3d.js) | Renderer đồ họa 3D Three.js và bộ vẽ 3 hình chiếu 2D orthographic canvas (có khung nét đứt & thông số khe hở 4 bên). |
| [`public/js/app.js`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/public/js/app.js) | App Controller điều khiển tương tác UI, gọi REST API và hỗ trợ tính toán từ thể tích thủ công. |
| [`NOTE_DU_AN_FULL.md`](file:///D:/th%E1%BB%8B%20tr%C6%B0%E1%BB%9Dng/step-tool-web-node/NOTE_DU_AN_FULL.md) | Bản ghi chú toàn bộ dự án chi tiết. |

---

## 3. ĐẶC ĐIỂM TỐI ƯU HÓA DÀNH CHO TV BOX (RAM 2GB, ROM 16GB)

1. **Bộ nhớ RAM cực nhẹ (~30MB - 60MB):** Sử dụng Node.js (V8 Engine) kết hợp Express.js giúp server chạy cực kỳ tiết kiệm bộ nhớ.
2. **Dung lượng Ổ cứng tối giản (~200MB):** Không phụ thuộc vào các gói cài đặt nặng hàng GB, tiết kiệm hơn 80% dung lượng eMMC 16GB.
3. **Chuyển giao xử lý đồ họa (Client-side Rendering):** Toàn bộ việc dựng mô hình 3D (Three.js WebGL) được thực hiện trên Card đồ họa (GPU) của Máy tính / Điện thoại người dùng truy cập. TV Box **không mất 1% tài nguyên nào cho 3D đồ họa**.
4. **Không lo đơ máy:** Các file upload tạm được tự động xóa ngay sau khi xử lý.

---

## 4. CHI TIẾT CÁC TÍNH NĂNG MỚI NÂNG CẤP THEO YÊU CẦU

1. **Nhập Thể Tích Thủ Công ($\text{cm}^3$) Khi Không Có Bản Vẽ 3D STEP:**
   * Bổ sung ô nhập `Hoặc Nhập Thể Tích Thủ Công (cm³)` tại Tab 1. Cho phép tính toán khối lượng & shot weight ngay lập tức khi chỉ có số liệu thể tích từ bản vẽ 2D / giấy.
2. **Xếp Thùng 3D Căn Giữa Từ Tâm Ra 4 Cạnh (Bottom-Up, Center-Outwards):**
   * Thuật toán xếp từ sàn đáy thùng ($z=0$) lên trên và tự động tính bù lề để đặt khối sản phẩm **nằm chính giữa tâm thùng**.
   * Hiển thị khung nét đứt màu cam và số đo khe hở khoảng dư ($L: \text{xx mm} \mid R: \text{xx mm}$) ở 4 thành xung quanh thùng carton.
3. **Chuyển Đổi Hình Chiếu Kỹ Thuật (Top, Front, Side Views):**
   * Cho phép nhấn các nút bấm `Chiếu Bằng Top X-Y`, `Chiếu Đứng Front X-Z`, `Chiếu Cạnh Side Y-Z` để thay đổi góc nhìn camera của Three.js canvas trực tiếp.
4. **Báo Cáo Excel Tinh Gọn:**
   * Loại bỏ danh sách hàng trăm dòng tọa độ $(X, Y, Z)$ không cần thiết trong file Excel xếp thùng, chỉ tập trung vào bảng tổng hợp các thông số cốt lõi chuyên nghiệp.
5. **Loading Indicator Overlay Trực Quan Cho Xếp Thùng 3D:**
   * Bổ sung màn hình phủ mờ loading spinner (`#loading-spinner-packing`) trong khung 3D visualizer canvas. Nút bấm tính toán tự động chuyển sang trạng thái chờ `⟳ Đang tính toán...` và bị vô hiệu hóa khi đang tính toán, loại bỏ hoàn toàn race condition hay bấm đúp làm đơ ứng dụng.
6. **Xử Lý Ngoại Lệ Wasm & Three.js CDN Tự Động Fallback:**
   * Bọc khởi tạo Wasm dịu nhẹ (`step-parser-wasm.js`), không ném unhandled error console khi khởi chạy trang. Bọc kiểm tra an toàn `typeof THREE !== 'undefined'` trong `bin-visualizer-3d.js` - khi mạng chậm hoặc offline không tải được CDN Three.js 3D, ứng dụng tự động hiển thị thông báo dịu nhẹ và tiếp tục vẽ 3 Hình Chiếu 2D (Top, Front, Side) mượt mà.
7. **Sửa Lỗi Lặp Canvas 2D & Route Favicon 204:**
   * Loại bỏ lệnh gọi lặp `render2DProjections()` 2 lần trong `bin-visualizer-3d.js`. Bổ sung route `/favicon.ico` (204 No Content) và thẻ favicon SVG trong `index.html` loại bỏ triệt để lỗi 404 trên Console trình duyệt.

---

## 5. HƯỚNG DẪN KHỞI CHẠY & BẢO TRÌ

### 🏃 Chạy thử trên máy Local (Windows / Linux):
```bash
# 1. Chuyển vào thư mục dự án
cd "D:\thị trường\step-tool-web-node"

# 2. Khởi chạy ứng dụng
npm start

# 3. Mở trình duyệt truy cập: http://localhost:3000
```
