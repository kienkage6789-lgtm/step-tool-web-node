/**
 * Three.js 3D Visualizer for 3D Bin Packing.
 * Renders interactive 3D box packing & 2D Orthographic Projections (Top, Front, Side).
 */

window.BinVisualizer3D = (function() {
    let scene, camera, renderer, controls;
    let containerEl = null;
    let boxGroup = null;
    let currentResult = null;

    // Palette of vibrant colors for 3D items
    const COLOR_PALETTE = [
        0x7c3aed, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444,
        0xec4899, 0x8b5cf6, 0x3b82f6, 0x14b8a6, 0x84cc16
    ];

    const COLOR_PALETTE_CSS = [
        '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
        '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#84cc16'
    ];

    function init(containerId) {
        containerEl = document.getElementById(containerId);
        if (!containerEl) return;

        if (typeof THREE === 'undefined') {
            containerEl.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;text-align:center;padding:20px;">
                    <div>
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:32px;color:#f59e0b;margin-bottom:10px;"></i>
                        <p style="margin:0;font-size:14px;">Chưa tải thư viện 3D Three.js từ CDN (Mạng chậm hoặc offline).<br>Bạn vẫn có thể xem đầy đủ Bảng Thông Số và 3 Hình Chiếu 2D bên dưới!</p>
                    </div>
                </div>`;
            return;
        }

        const width = containerEl.clientWidth || 600;
        const height = containerEl.clientHeight || 420;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0c12);

        // Camera
        camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
        camera.position.set(1200, 1000, 1200);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;

        containerEl.innerHTML = '';
        containerEl.appendChild(renderer.domElement);

        // OrbitControls
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight1.position.set(1000, 2000, 1000);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x7c3aed, 0.4);
        dirLight2.position.set(-1000, -1000, -1000);
        scene.add(dirLight2);

        // Grid helper at bottom
        const gridHelper = new THREE.GridHelper(2000, 20, 0x2e3448, 0x1e2230);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        boxGroup = new THREE.Group();
        scene.add(boxGroup);

        // Resize handler
        window.addEventListener('resize', onWindowResize);

        animate();
    }

    function onWindowResize() {
        if (!containerEl || !renderer || !camera) return;
        const width = containerEl.clientWidth;
        const height = containerEl.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function renderBin(packingResult) {
        currentResult = packingResult;

        if (typeof THREE === 'undefined') {
            init('three-canvas-container');
            render2DProjections(packingResult);
            return;
        }

        if (!scene || !boxGroup) {
            init('three-canvas-container');
        }
        if (!scene || !boxGroup) return;

        const binW = packingResult.bin_w || 600;
        const binH = packingResult.bin_h || 400;
        const binD = packingResult.bin_d || 400;

        // Clear previous meshes
        while (boxGroup.children.length > 0) {
            const child = boxGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
            boxGroup.remove(child);
        }

        // Draw Outer Bin Box Wireframe
        const binGeo = new THREE.BoxGeometry(binW, binD, binH); // Y is height, Z is depth
        const binEdges = new THREE.EdgesGeometry(binGeo);
        const binMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
        const binWireframe = new THREE.LineSegments(binEdges, binMat);

        binWireframe.position.set(binW / 2, binD / 2, binH / 2);
        boxGroup.add(binWireframe);

        // Semi-transparent bin walls
        const binWallMat = new THREE.MeshPhongMaterial({
            color: 0x161922,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const binMesh = new THREE.Mesh(binGeo, binWallMat);
        binMesh.position.set(binW / 2, binD / 2, binH / 2);
        boxGroup.add(binMesh);

        // Draw Packed Items inside bin
        const items = packingResult.items || [];
        items.forEach((item, idx) => {
            const pw = item.pw;
            const ph = item.ph;
            const pd = item.pd;

            const itemGeo = new THREE.BoxGeometry(pw - 1, pd - 1, ph - 1);
            const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

            const itemMat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.3,
                metalness: 0.1,
                transparent: true,
                opacity: 0.85
            });

            const mesh = new THREE.Mesh(itemGeo, itemMat);

            mesh.position.set(
                (packingResult.bin_liner || 0) + item.x + pw / 2,
                (packingResult.bin_liner || 0) + item.z + pd / 2,
                (packingResult.bin_liner || 0) + item.y + ph / 2
            );

            const edges = new THREE.EdgesGeometry(itemGeo);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 });
            const lineSegments = new THREE.LineSegments(edges, lineMat);
            mesh.add(lineSegments);

            boxGroup.add(mesh);
        });

        // Set Default 3D View
        setViewMode('3d');

        // Render 2D Orthographic Projections
        render2DProjections(packingResult);
    }

    function setViewMode(mode) {
        if (!currentResult || !camera) return;
        const binW = currentResult.bin_w || 600;
        const binH = currentResult.bin_h || 400;
        const binD = currentResult.bin_d || 400;

        if (mode === 'top') {
            camera.position.set(binW / 2, binD * 3.5, binH / 2 + 0.001);
            if (controls) controls.target.set(binW / 2, binD / 2, binH / 2);
        } else if (mode === 'front') {
            camera.position.set(binW / 2, binD / 2, binH * 3.5);
            if (controls) controls.target.set(binW / 2, binD / 2, binH / 2);
        } else if (mode === 'side') {
            camera.position.set(binW * 3.5, binD / 2, binH / 2);
            if (controls) controls.target.set(binW / 2, binD / 2, binH / 2);
        } else {
            camera.position.set(binW * 1.8, binD * 2.2, binH * 2.5);
            if (controls) controls.target.set(binW / 2, binD / 2, binH / 2);
        }

        if (controls) controls.update();
    }

    function render2DProjections(res) {
        const binW = res.bin_w || 600;
        const binH = res.bin_h || 400;
        const binD = res.bin_d || 400;
        const binLiner = res.bin_liner || 0;
        const items = res.items || [];

        // 1. Top View (X-Y Plane)
        drawProjCanvas('canvas-proj-top', binW, binH, items, (it) => ({
            x: binLiner + it.x, y: binLiner + it.y, w: it.pw, h: it.ph
        }));

        // 2. Front View (X-Z Plane)
        drawProjCanvas('canvas-proj-front', binW, binD, items, (it) => ({
            x: binLiner + it.x, y: binLiner + it.z, w: it.pw, h: it.pd
        }));

        // 3. Side View (Y-Z Plane)
        drawProjCanvas('canvas-proj-side', binH, binD, items, (it) => ({
            x: binLiner + it.y, y: binLiner + it.z, w: it.ph, h: it.pd
        }));

        const panel = document.getElementById('projections-panel');
        if (panel) panel.classList.remove('hidden');
    }

    function drawProjCanvas(canvasId, totalW, totalH, items, coordExtractor) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const cW = canvas.width;
        const cH = canvas.height;

        ctx.clearRect(0, 0, cW, cH);
        if (!totalW || totalW <= 0 || !totalH || totalH <= 0) return;

        const padding = 20;
        const scaleX = (cW - 2 * padding) / totalW;
        const scaleY = (cH - 2 * padding) / totalH;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (cW - totalW * scale) / 2;
        const offsetY = (cH - totalH * scale) / 2;

        // Draw Bin Outer Boundary
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, totalW * scale, totalH * scale);

        let minItemX = Infinity, maxItemX = -Infinity;
        let minItemY = Infinity, maxItemY = -Infinity;

        // Draw items
        items.forEach((item, idx) => {
            const { x, y, w, h } = coordExtractor(item);
            const drawX = offsetX + x * scale;
            const drawY = offsetY + y * scale;
            const drawW = w * scale;
            const drawH = h * scale;

            if (x < minItemX) minItemX = x;
            if (x + w > maxItemX) maxItemX = x + w;
            if (y < minItemY) minItemY = y;
            if (y + h > maxItemY) maxItemY = y + h;

            ctx.fillStyle = COLOR_PALETTE_CSS[idx % COLOR_PALETTE_CSS.length];
            ctx.globalAlpha = 0.75;
            ctx.fillRect(drawX, drawY, drawW, drawH);

            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(drawX, drawY, drawW, drawH);
        });

        // Draw Dashed Bounding Envelope & Show 4-side Excess Gaps
        if (items.length > 0 && minItemX !== Infinity) {
            const blockX = offsetX + minItemX * scale;
            const blockY = offsetY + minItemY * scale;
            const blockW = (maxItemX - minItemX) * scale;
            const blockH = (maxItemY - minItemY) * scale;

            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(blockX, blockY, blockW, blockH);
            ctx.setLineDash([]); // reset

            // Excess gaps in mm
            const gapLeft = Math.round(minItemX);
            const gapRight = Math.round(totalW - maxItemX);
            const gapTop = Math.round(minItemY);
            const gapBottom = Math.round(totalH - maxItemY);

            ctx.fillStyle = '#f59e0b';
            ctx.font = '9px Segoe UI, sans-serif';
            ctx.textAlign = 'center';

            ctx.fillText(`L:${gapLeft}mm | R:${gapRight}mm`, cW / 2, cH - 4);
            if (gapTop > 0 || gapBottom > 0) {
                ctx.fillText(`T:${gapTop}mm | B:${gapBottom}mm`, cW / 2, 12);
            }
        }
    }

    return {
        init: init,
        renderBin: renderBin,
        setViewMode: setViewMode
    };
})();
