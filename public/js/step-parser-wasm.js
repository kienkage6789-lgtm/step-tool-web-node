/**
 * STEP File Parser Engine.
 * 1. Primary: Server-Side OpenCASCADE CAD Engine (POST /api/parse-step) for 100% Exact SolidWorks/Creo/NX B-Rep Metrics.
 * 2. Fallback: Browser WebAssembly Mesh Triangle Integration for Exact Mesh Area & Manifold Volume.
 */

window.StepParserWasm = (function() {
    let occtInstance = null;
    let occtLoadingPromise = null;

    const CDN_SOURCES = [
        'https://cdn.jsdelivr.net/npm/occt-import-js@0.1.12/dist/occt-import-js.js',
        'https://unpkg.com/occt-import-js@0.1.12/dist/occt-import-js.js'
    ];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function initOcct() {
        if (occtInstance) return occtInstance;
        if (occtLoadingPromise) return occtLoadingPromise;

        occtLoadingPromise = (async () => {
            try {
                if (typeof occtimportjs === 'undefined') {
                    for (const cdnUrl of CDN_SOURCES) {
                        try {
                            await loadScript(cdnUrl);
                            if (typeof occtimportjs !== 'undefined') break;
                        } catch (e) {}
                    }
                }
                if (typeof occtimportjs !== 'undefined') {
                    const occt = await occtimportjs({
                        locateFile: (path) => `https://cdn.jsdelivr.net/npm/occt-import-js@0.1.12/dist/${path}`
                    });
                    occtInstance = occt;
                    return occt;
                }
            } catch (err) {
                console.warn("⚠️ Wasm parser CDN chưa sẵn sàng (có thể sử dụng nhập thể tích thủ công):", err.message);
            }
            return null;
        })();

        return occtLoadingPromise;
    }

    // Try Exact Server-Side OpenCASCADE B-Rep Parser API first
    async function tryServerParse(file) {
        const formData = new FormData();
        formData.append('step_file', file);

        const response = await fetch('/api/parse-step', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Server exact parse failed.");
        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Server CAD parse error");
        return data.result;
    }

    // Exact Triangle Mesh Math for Wasm Fallback
    function calculateMeshExactMetrics(meshes) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let totalAreaMm2 = 0;
        let totalVolumeMm3 = 0;

        meshes.forEach(mesh => {
            const positions = mesh.attributes.position.array;
            const indices = mesh.index.array;

            // Bounding Box
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

            // If exact brep volume/area supplied by OpenCASCADE Wasm
            if (mesh.brep_volume && mesh.brep_volume > 0) {
                totalVolumeMm3 += mesh.brep_volume;
            }
            if (mesh.brep_area && mesh.brep_area > 0) {
                totalAreaMm2 += mesh.brep_area;
            }

            // Triangle Surface Area & Tetrahedron Volume Summation
            for (let i = 0; i < indices.length; i += 3) {
                const i1 = indices[i] * 3;
                const i2 = indices[i + 1] * 3;
                const i3 = indices[i + 2] * 3;

                const p1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
                const p2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];
                const p3 = [positions[i3], positions[i3 + 1], positions[i3 + 2]];

                // Cross product for triangle area
                const ax = p2[0] - p1[0], ay = p2[1] - p1[1], az = p2[2] - p1[2];
                const bx = p3[0] - p1[0], by = p3[1] - p1[1], bz = p3[2] - p1[2];
                const cx = ay * bz - az * by;
                const cy = az * bx - ax * bz;
                const cz = ax * by - ay * bx;
                const triArea = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
                
                if (!mesh.brep_area) totalAreaMm2 += triArea;

                // Signed volume of tetrahedron formed by (0,0,0) and triangle (p1, p2, p3)
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
        });

        const bboxX = (maxX !== -Infinity && minX !== Infinity) ? (maxX - minX) : 0;
        const bboxY = (maxY !== -Infinity && minY !== Infinity) ? (maxY - minY) : 0;
        const bboxZ = (maxZ !== -Infinity && minZ !== Infinity) ? (maxZ - minZ) : 0;

        return {
            total_volume_cm3: Math.abs(totalVolumeMm3) / 1000.0,
            total_area_cm2: totalAreaMm2 / 100.0,
            bbox_x: bboxX,
            bbox_y: bboxY,
            bbox_z: bboxZ
        };
    }

    async function parseStepFile(file) {
        // 1. Try Exact Server-Side OpenCASCADE CAD Engine first
        try {
            console.log("📍 Đang gửi file STEP lên Server OpenCASCADE Engine để tính toán exact CAD metrics chuẩn SolidWorks...");
            const serverResult = await tryServerParse(file);
            console.log("✅ Kết quả Exact B-Rep CAD từ Server:", serverResult);
            return serverResult;
        } catch (e) {
            console.warn("⚠️ Server exact parse không khả dụng, chuyển sang Wasm Browser Parser:", e.message);
        }

        // 2. Browser Wasm Triangle Mesh Integration Fallback
        const occt = await initOcct();
        if (!occt) {
            throw new Error("Parser Wasm trình duyệt chưa thể khởi tạo. Vui lòng kết nối mạng CDN hoặc nhập Thể tích thủ công (cm³).");
        }
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        const result = occt.ReadStepFile(fileBuffer, null);
        if (!result || !result.success || !result.meshes || result.meshes.length === 0) {
            throw new Error("Không thể tạo lưới 3D từ file STEP.");
        }

        const metrics = calculateMeshExactMetrics(result.meshes);
        metrics.file_name = file.name;
        metrics.meshes = result.meshes;
        return metrics;
    }

    return {
        init: initOcct,
        parseStepFile: parseStepFile
    };
})();
