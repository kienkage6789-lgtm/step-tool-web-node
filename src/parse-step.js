const fs = require('fs');
const path = require('path');
const occtimportjs = require('occt-import-js');

/**
 * Phân tích file STEP bằng OpenCASCADE WebAssembly (occt-import-js) trực tiếp trong Node.js.
 * Thay thế 100% cho parse_step.py chạy bằng Python CadQuery trước đây.
 *
 * @param {string} filePath - Đường dẫn tuyệt đối tới file STEP cần phân tích
 * @returns {Promise<Object>} - Đối tượng chứa kết quả phân tích CAD metrics
 */
async function parseStepFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return { success: false, error: `Không tìm thấy file: ${filePath}` };
    }

    try {
        // Khởi tạo engine WASM OCCT
        const occt = await occtimportjs();
        
        // Đọc file sang Uint8Array
        const fileBuffer = fs.readFileSync(filePath);
        const uint8Array = new Uint8Array(fileBuffer);
        
        // Cấu hình chia lưới (Triangulation parameters)
        // linearDeflection kiểm soát khoảng cách tối đa giữa mặt cong thực tế và lưới tam giác (mm)
        // angularDeflection kiểm soát góc lệch tối đa giữa pháp tuyến mặt cong và lưới tam giác (radians)
        const params = {
            linearDeflection: 0.1,
            angularDeflection: 0.5
        };

        // Đọc file STEP
        const result = occt.ReadStepFile(uint8Array, params);
        if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
            return { success: false, error: "Không thể phân tích dữ liệu dạng hình học (mesh) từ file STEP." };
        }

        // Tính toán các thông số hình học
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let totalAreaMm2 = 0;
        let totalVolumeMm3 = 0;

        result.meshes.forEach(mesh => {
            if (!mesh.attributes || !mesh.attributes.position || !mesh.attributes.position.array) {
                return;
            }

            const positions = mesh.attributes.position.array;
            const indices = mesh.index ? mesh.index.array : [];

            // 1. Tính Bounding Box từ tập các đỉnh (vertices)
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            }

            // Nếu mesh có cung cấp sẵn thể tích và diện tích thực tế từ B-Rep OCCT
            if (mesh.brep_volume && mesh.brep_volume > 0) {
                totalVolumeMm3 += mesh.brep_volume;
            }
            if (mesh.brep_area && mesh.brep_area > 0) {
                totalAreaMm2 += mesh.brep_area;
            }

            // 2. Tính diện tích bề mặt (Triangular surface area) & Thể tích hình khối (Signed-Tetrahedron volume)
            // Chỉ tính toán thủ công nếu không có sẵn brep_volume / brep_area từ OpenCASCADE WASM
            if (indices.length > 0 && (!mesh.brep_volume || !mesh.brep_area)) {
                for (let i = 0; i < indices.length; i += 3) {
                    const i1 = indices[i] * 3;
                    const i2 = indices[i + 1] * 3;
                    const i3 = indices[i + 2] * 3;

                    // Tọa độ 3 đỉnh của tam giác mesh
                    const p1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
                    const p2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];
                    const p3 = [positions[i3], positions[i3 + 1], positions[i3 + 2]];

                    // Vector của 2 cạnh tam giác: u = p2 - p1, v = p3 - p1
                    const ax = p2[0] - p1[0], ay = p2[1] - p1[1], az = p2[2] - p1[2];
                    const bx = p3[0] - p1[0], by = p3[1] - p1[1], bz = p3[2] - p1[2];
                    
                    // Cross product (Tích có hướng) để tính vector pháp tuyến và diện tích tam giác
                    const cx = ay * bz - az * by;
                    const cy = az * bx - ax * bz;
                    const cz = ax * by - ay * bx;
                    const triArea = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
                    
                    if (!mesh.brep_area) {
                        totalAreaMm2 += triArea;
                    }

                    // Tính thể tích khối tứ diện (Signed Volume of Tetrahedron) được tạo từ tâm (0,0,0) đến tam giác (p1, p2, p3)
                    // Determinant của ma trận 3x3 chứa 3 đỉnh [p1, p2, p3] chia cho 6
                    if (!mesh.brep_volume) {
                        const v321 = p3[0] * p2[1] * p1[2];
                        const v231 = p2[0] * p3[1] * p1[2];
                        const v312 = p3[0] * p1[1] * p2[2];
                        const v132 = p1[0] * p3[1] * p2[2];
                        const v213 = p2[0] * p1[1] * p3[2];
                        const v123 = p1[0] * p2[1] * p3[2];
                        totalVolumeMm3 += (-v321 + v231 + v312 - v132 - v213 + v123) / 6.0;
                    }
                }
            }
        });

        const bboxX = (maxX !== -Infinity && minX !== Infinity) ? (maxX - minX) : 0;
        const bboxY = (maxY !== -Infinity && minY !== Infinity) ? (maxY - minY) : 0;
        const bboxZ = (maxZ !== -Infinity && minZ !== Infinity) ? (maxZ - minZ) : 0;

        return {
            success: true,
            file_name: path.basename(filePath),
            total_volume_cm3: Math.abs(totalVolumeMm3) / 1000.0, // Đổi từ mm³ sang cm³
            total_area_cm2: totalAreaMm2 / 100.0,             // Đổi từ mm² sang cm²
            bbox_x: bboxX,
            bbox_y: bboxY,
            bbox_z: bboxZ
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { parseStepFile };
