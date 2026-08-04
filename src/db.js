const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

function getDbPath() {
    let dbPath = 'materials.db';
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.db_path) dbPath = config.db_path;
        } catch (e) {
            console.error('Error reading config.json:', e.message);
        }
    }
    return path.isAbsolute(dbPath) ? dbPath : path.join(__dirname, '..', dbPath);
}

const DEFAULT_MATERIALS = [
    // Plastics (Pure & GF composites)
    ["ABS", 1.05, "Plastics", "Acrylonitrile Butadiene Styrene (Unfilled)"],
    ["ABS-GF10", 1.12, "Plastics", "ABS with 10% Glass Fiber"],
    ["ABS-GF20", 1.20, "Plastics", "ABS with 20% Glass Fiber"],
    ["ABS-GF30", 1.28, "Plastics", "ABS with 30% Glass Fiber"],
    
    ["PP", 0.90, "Plastics", "Polypropylene (Unfilled)"],
    ["PP-GF10", 0.97, "Plastics", "PP with 10% Glass Fiber"],
    ["PP-GF20", 1.04, "Plastics", "PP with 20% Glass Fiber"],
    ["PP-GF30", 1.12, "Plastics", "PP with 30% Glass Fiber"],
    
    ["POM", 1.41, "Plastics", "Polyoxymethylene / Acetal (Unfilled)"],
    ["POM-GF25", 1.59, "Plastics", "POM with 25% Glass Fiber"],
    ["POM-GF30", 1.63, "Plastics", "POM with 30% Glass Fiber"],
    
    ["PA6", 1.13, "Plastics", "Nylon 6 (Unfilled)"],
    ["PA6-GF15", 1.23, "Plastics", "PA6 with 15% Glass Fiber"],
    ["PA6-GF30", 1.36, "Plastics", "PA6 with 30% Glass Fiber"],
    ["PA6-GF50", 1.56, "Plastics", "PA6 with 50% Glass Fiber"],
    
    ["PA66", 1.14, "Plastics", "Nylon 66 (Unfilled)"],
    ["PA66-GF15", 1.24, "Plastics", "PA66 with 15% Glass Fiber"],
    ["PA66-GF30", 1.37, "Plastics", "PA66 with 30% Glass Fiber"],
    ["PA66-GF50", 1.58, "Plastics", "PA66 with 50% Glass Fiber"],
    
    ["PBT", 1.31, "Plastics", "Polybutylene Terephthalate (Unfilled)"],
    ["PBT-GF15", 1.43, "Plastics", "PBT with 15% Glass Fiber"],
    ["PBT-GF30", 1.53, "Plastics", "PBT with 30% Glass Fiber"],
    
    ["PC", 1.20, "Plastics", "Polycarbonate (Unfilled)"],
    ["PC-GF10", 1.27, "Plastics", "PC with 10% Glass Fiber"],
    ["PC-GF20", 1.35, "Plastics", "PC with 20% Glass Fiber"],
    ["PC-GF30", 1.43, "Plastics", "PC with 30% Glass Fiber"],
    
    ["PMMA", 1.18, "Plastics", "Acrylic (Polymethyl Methacrylate)"],
    ["PET", 1.37, "Plastics", "Polyethylene Terephthalate"],
    ["PET-GF30", 1.56, "Plastics", "PET with 30% Glass Fiber"],
    ["PVC-Rigid", 1.38, "Plastics", "Rigid Polyvinyl Chloride"],
    ["PVC-Flexible", 1.20, "Plastics", "Flexible Polyvinyl Chloride"],
    
    ["PS", 1.05, "Plastics", "Polystyrene"],
    ["HIPS", 1.04, "Plastics", "High Impact Polystyrene"],
    
    // Metals
    ["Steel (Thép)", 7.85, "Metals", "Carbon Steel (Standard density)"],
    ["Stainless Steel (Inox 304)", 7.93, "Metals", "SUS304 Stainless Steel"],
    ["Stainless Steel (Inox 316)", 8.00, "Metals", "SUS316 Stainless Steel"],
    ["Aluminum (Nhôm)", 2.70, "Metals", "Standard Aluminum density"],
    ["Copper (Đồng đỏ)", 8.96, "Metals", "Pure Copper"],
    ["Brass (Đồng vàng)", 8.50, "Metals", "Standard Brass"]
];

function getDbConnection() {
    const dbPath = getDbPath();
    return new sqlite3.Database(dbPath);
}

function initDb() {
    return new Promise((resolve, reject) => {
        const db = getDbConnection();
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS materials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    density REAL NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT
                )
            `, (err) => {
                if (err) return reject(err);
            });

            db.get("SELECT COUNT(*) as count FROM materials", (err, row) => {
                if (err) return reject(err);
                if (row && row.count === 0) {
                    console.log("Seeding default materials to SQLite database...");
                    const stmt = db.prepare("INSERT INTO materials (name, density, category, description) VALUES (?, ?, ?, ?)");
                    DEFAULT_MATERIALS.forEach(mat => stmt.run(mat));
                    stmt.finalize(() => {
                        db.close();
                        resolve();
                    });
                } else {
                    db.close();
                    resolve();
                }
            });
        });
    });
}

function getAllMaterials() {
    return new Promise(async (resolve, reject) => {
        await initDb();
        const db = getDbConnection();
        db.all("SELECT name, density, category, description FROM materials ORDER BY category, name", (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function getMaterialDensity(name) {
    return new Promise(async (resolve, reject) => {
        await initDb();
        const db = getDbConnection();
        db.get("SELECT density FROM materials WHERE LOWER(name) = LOWER(?)", [name], (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row ? row.density : null);
        });
    });
}

function addMaterial(name, density, category = "Custom", description = "") {
    return new Promise(async (resolve, reject) => {
        await initDb();
        const db = getDbConnection();
        const sql = `
            INSERT INTO materials (name, density, category, description)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                density=excluded.density,
                category=excluded.category,
                description=excluded.description
        `;
        db.run(sql, [name, density, category, description], function(err) {
            db.close();
            if (err) reject(err);
            else resolve(true);
        });
    });
}

function deleteMaterial(name) {
    return new Promise(async (resolve, reject) => {
        await initDb();
        const db = getDbConnection();
        db.run("DELETE FROM materials WHERE LOWER(name) = LOWER(?)", [name], function(err) {
            db.close();
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

module.exports = {
    getAllMaterials,
    getMaterialDensity,
    addMaterial,
    deleteMaterial,
    getDbPath,
    initDb
};
