const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const { getAllMaterials, getMaterialDensity, addMaterial, deleteMaterial, initDb } = require('./src/db');
const { processCalculation } = require('./src/calculator');
const { exportBatchToExcel, exportPackingToExcel } = require('./src/excel-exporter');

const multer = require('multer');
const { execFile } = require('child_process');

const app = express();

// Ensure temp uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static favicon to prevent 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Read config port
let PORT = process.env.PORT || 3000;
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.port) PORT = config.port;
    } catch (e) {
        console.error("Lỗi đọc config.json:", e.message);
    }
}

// REST API Endpoints

// 0. Parse STEP File Exact B-Rep CAD Metrics (Python CadQuery / OpenCASCADE Backend)
app.post('/api/parse-step', upload.single('step_file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: "Chưa có file STEP được tải lên." });
    }
    const tempPath = req.file.path;
    const pythonScript = path.join(__dirname, 'src', 'parse_step.py');

    execFile('python', [pythonScript, tempPath], (error, stdout, stderr) => {
        // Clean up uploaded file immediately
        fs.unlink(tempPath, () => {});

        if (error) {
            return res.status(500).json({ success: false, error: "Chưa thể chạy Python CadQuery server: " + (stderr || error.message) });
        }

        try {
            const data = JSON.parse(stdout.trim());
            if (data.success) {
                res.json({ success: true, result: data });
            } else {
                res.status(400).json({ success: false, error: data.error });
            }
        } catch (e) {
            res.status(500).json({ success: false, error: "Lỗi đọc dữ liệu JSON từ Python parser." });
        }
    });
});

// 1. Get all materials
app.get('/api/materials', async (req, res) => {
    try {
        const materials = await getAllMaterials();
        res.json({ success: true, materials });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. Add or update material
app.post('/api/materials', async (req, res) => {
    try {
        const { name, density, category, description } = req.body;
        if (!name || density === undefined || density === null) {
            return res.status(400).json({ success: false, error: "Tên vật liệu và khối lượng riêng là bắt buộc." });
        }
        const densityNum = parseFloat(density);
        if (isNaN(densityNum) || densityNum <= 0) {
            return res.status(400).json({ success: false, error: "Khối lượng riêng không hợp lệ." });
        }
        const ok = await addMaterial(name, densityNum, category || "Custom", description || "");
        if (ok) {
            res.json({ success: true, message: `Đã lưu vật liệu '${name}' thành công!` });
        } else {
            res.status(500).json({ success: false, error: "Không thể lưu vật liệu vào cơ sở dữ liệu." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. Delete custom material
app.delete('/api/materials/:name', async (req, res) => {
    try {
        const name = req.params.name;
        const ok = await deleteMaterial(name);
        if (ok) {
            res.json({ success: true, message: `Đã xóa vật liệu '${name}'!` });
        } else {
            res.status(404).json({ success: false, error: `Không tìm thấy vật liệu '${name}' để xóa.` });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 4. Calculate Weight & Shot Weight
app.post('/api/calculate', async (req, res) => {
    try {
        const { volume_cm3, material_name, custom_density, cavities, runner_weight_g } = req.body;
        const vol = parseFloat(volume_cm3);
        if (isNaN(vol) || vol <= 0) {
            return res.status(400).json({ success: false, error: "Thể tích (cm³) phải lớn hơn 0." });
        }

        const result = await processCalculation(vol, material_name, custom_density, cavities, runner_weight_g);
        res.json({ success: true, result });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 5. 3D Bin Packing options
app.post('/api/bin-packing', (req, res) => {
    try {
        const {
            bin_dim,          // [w, h, d] (mm)
            item_dim,         // [w, h, d] (mm)
            item_weight_g,    // float (g)
            max_bin_weight_kg,// float (kg)
            rotation_mode,    // "3d" | "2d" | "none"
            part_padding,     // float (mm)
            bin_liner,        // float (mm)
            remove_corners,   // boolean
            custom_grid       // [nx, ny, nz] or null
        } = req.body;

        if (!bin_dim || bin_dim.length < 3 || !item_dim || item_dim.length < 3) {
            return res.status(400).json({ success: false, error: "Thông số kích thước thùng và sản phẩm không hợp lệ." });
        }

        // Offload heavy calculation to worker thread to prevent event loop lag
        const workerPath = path.join(__dirname, 'src', 'bin-packing-worker.js');
        const worker = new Worker(workerPath, {
            workerData: {
                bin_dim: bin_dim.map(Number),
                item_dim: item_dim.map(Number),
                item_weight_g: parseFloat(item_weight_g) || 0,
                max_bin_weight_kg: parseFloat(max_bin_weight_kg) || 999,
                rotation_mode: rotation_mode || "3d",
                part_padding: parseFloat(part_padding) || 0,
                bin_liner: parseFloat(bin_liner) || 0,
                remove_corners: Boolean(remove_corners),
                custom_grid: custom_grid ? custom_grid.map(Number) : null
            }
        });

        worker.on('message', (msg) => {
            if (msg.success) {
                res.json({ success: true, options: msg.options });
            } else {
                res.status(500).json({ success: false, error: msg.error });
            }
        });

        worker.on('error', (err) => {
            res.status(500).json({ success: false, error: "Lỗi luồng xử lý nền: " + err.message });
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Export Batch Results to Excel
app.post('/api/export-batch-excel', async (req, res) => {
    try {
        const { results } = req.body;
        if (!results || !Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ success: false, error: "Danh sách kết quả tính trống." });
        }

        const buffer = await exportBatchToExcel(results);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Bao_Cao_Khoi_Luong_STEP.xlsx"');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Export Bin Packing to Excel
app.post('/api/export-packing-excel', async (req, res) => {
    try {
        const { packing_result } = req.body;
        if (!packing_result) {
            return res.status(400).json({ success: false, error: "Thông tin kết quả xếp thùng trống." });
        }

        const buffer = await exportPackingToExcel(packing_result);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Bao_Cao_Xep_Thung_3D.xlsx"');
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Init DB & Start Server
initDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`===========================================================`);
        console.log(` 🚀 STEP WEIGHT & PACKAGING WEB SERVER (NODE.JS) IS RUNNING`);
        console.log(` 📍 Local URL:    http://localhost:${PORT}`);
        console.log(` 🌐 Network URL:  http://0.0.0.0:${PORT}`);
        console.log(` ⚡ TV Box Optimized (ARM64, RAM 2GB, ROM 16GB)`);
        console.log(`===========================================================`);
    });
}).catch(err => {
    console.error("Lỗi khởi tạo CSDL SQLite:", err);
});
