/**
 * Module thuật toán 3D Bin Packing tuân thủ Packing Strategy Specification:
 * 1. Bottom First (Z từ thấp đến cao, phải có bề mặt đỡ bên dưới)
 * 2. Center-Out Placement (Xếp từ tâm (centerX, centerY) lan ra ngoài)
 * 3. Leave Empty Margins (Tự động để khoảng chừa đều 4 phía thành thùng)
 * 4. Layer Completion (Lấp đầy tầng Z trước khi lên tầng Z+1)
 * 5. Collision & Weight checks (Không đè/chồng lấn, kiểm tra hạn mức tải trọng)
 */

class PackedItem {
    constructor(index, w, h, d, weight) {
        this.index = index;
        this.w = w; // mm (kích thước ban đầu)
        this.h = h;
        this.d = d;
        this.weight = weight; // g

        this.x = 0; // Tọa độ trong thùng (mm)
        this.y = 0;
        this.z = 0;

        this.pw = w; // Kích thước sau xoay (mm)
        this.ph = h;
        this.pd = d;
    }
}

class PackingBin {
    constructor(w, h, d, max_weight_g, real_w = null, real_h = null, real_d = null, part_padding = 0, bin_liner = 0) {
        this.w = w; // Kích thước hiệu dụng thùng (mm)
        this.h = h;
        this.d = d;
        this.max_weight = max_weight_g;
        this.real_w = real_w !== null ? real_w : w;
        this.real_h = real_h !== null ? real_h : h;
        this.real_d = real_d !== null ? real_d : d;
        this.part_padding = part_padding;
        this.bin_liner = bin_liner;
        this.items = [];
    }

    getUsedWeight() {
        return this.items.reduce((sum, item) => sum + item.weight, 0);
    }

    getUsedVolume() {
        return this.items.reduce((sum, item) => sum + (item.pw * item.ph * item.pd), 0);
    }

    getTotalVolume() {
        return this.w * this.h * this.d;
    }

    getEfficiencyPct() {
        const total = this.getTotalVolume();
        if (total === 0) return 0;
        return (this.getUsedVolume() / total) * 100.0;
    }

    canFit(item, x, y, z, pw, ph, pd) {
        // Rule 5: Boundary check
        if (x + pw > this.w + 1e-4 || y + ph > this.h + 1e-4 || z + pd > this.d + 1e-4) {
            return false;
        }

        // Weight limit check
        if (this.getUsedWeight() + item.weight > this.max_weight) {
            return false;
        }

        // No 3D Overlap check
        for (const other of this.items) {
            if (
                x < other.x + other.pw - 1e-4 && x + pw > other.x + 1e-4 &&
                y < other.y + other.ph - 1e-4 && y + ph > other.y + 1e-4 &&
                z < other.z + other.pd - 1e-4 && z + pd > other.z + 1e-4
            ) {
                return false;
            }
        }

        // Rule 1 & Rule 5: Sufficient support underneath for z > 0
        if (z > 1e-4) {
            if (!this.hasSupportUnderneath(x, y, z, pw, ph)) {
                return false;
            }
        }

        return true;
    }

    hasSupportUnderneath(x, y, z, pw, ph) {
        if (z <= 1e-4) return true; // Ground floor support

        let supportedArea = 0;
        const requiredArea = pw * ph * 0.6; // Ít nhất 60% diện tích đáy được đỡ

        for (const other of this.items) {
            // Check if top of 'other' matches 'z'
            if (Math.abs((other.z + other.pd) - z) < 1e-3) {
                const overlapX = Math.max(0, Math.min(x + pw, other.x + other.pw) - Math.max(x, other.x));
                const overlapY = Math.max(0, Math.min(y + ph, other.y + other.ph) - Math.max(y, other.y));
                supportedArea += (overlapX * overlapY);
            }
        }

        return supportedArea >= requiredArea;
    }
}

/**
 * Thuật toán xếp tự do / tối ưu không gian (Mixed Orientation Greedy Packer)
 * Tuân thủ tuyệt đối 5 quy tắc: Bottom-first, Center-out, Empty Margins, Layer Completion, Support/Collision.
 */
function calculateMaxCapacity(binDim, itemDim, itemWeight, maxBinWeightKg, rotationMode = "3d", partPadding = 0, binLiner = 0) {
    const effBinW = Math.max(0, binDim[0] - 2 * binLiner);
    const effBinH = Math.max(0, binDim[1] - 2 * binLiner);
    const effBinD = Math.max(0, binDim[2] - 2 * binLiner);

    const centerX = effBinW / 2.0;
    const centerY = effBinH / 2.0;

    const effItemW = itemDim[0] + partPadding;
    const effItemH = itemDim[1] + partPadding;
    const effItemD = itemDim[2] + partPadding;

    const binObj = new PackingBin(
        effBinW, effBinH, effBinD,
        maxBinWeightKg * 1000.0,
        binDim[0], binDim[1], binDim[2],
        partPadding, binLiner
    );

    const w = effItemW, h = effItemH, d = effItemD;

    let orientations = [];
    if (rotationMode === "3d") {
        const set = new Set();
        const raw = [
            [w, h, d], [w, d, h],
            [h, w, d], [h, d, w],
            [d, w, h], [d, h, w]
        ];
        for (const o of raw) set.add(o.join(','));
        orientations = Array.from(set).map(s => s.split(',').map(Number));
    } else if (rotationMode === "2d") {
        const set = new Set();
        const raw = [[w, h, d], [h, w, d]];
        for (const o of raw) set.add(o.join(','));
        orientations = Array.from(set).map(s => s.split(',').map(Number));
    } else {
        orientations = [[w, h, d]];
    }

    let pivots = [[0, 0, 0]];
    let idx = 1;
    const maxLimit = 3000;

    while (pivots.length > 0 && idx <= maxLimit) {
        // Rule 1 & Rule 2 Priority sorting:
        // Priority = (Z ascending, distanceFromCenter ascending)
        pivots.sort((a, b) => {
            if (Math.abs(a[2] - b[2]) > 1e-4) {
                return a[2] - b[2]; // Lowest Z first (Rule 1 & Rule 4)
            }
            // Same Z layer -> Center-out distance priority (Rule 2)
            const distA = Math.hypot(a[0] - centerX, a[1] - centerY);
            const distB = Math.hypot(b[0] - centerX, b[1] - centerY);
            return distA - distB;
        });

        let placed = false;

        for (const p of pivots) {
            const [px, py, pz] = p;

            // Generate candidate placement options for all orientations at pivot
            let candidatePlacements = [];

            for (const [ow, oh, od] of orientations) {
                const tempItem = new PackedItem(idx, w, h, d, itemWeight);
                if (binObj.canFit(tempItem, px, py, pz, ow, oh, od)) {
                    const itemCenterX = px + ow / 2.0;
                    const itemCenterY = py + oh / 2.0;
                    const distToCenter = Math.hypot(itemCenterX - centerX, itemCenterY - centerY);

                    candidatePlacements.push({
                        px, py, pz, ow, oh, od,
                        distToCenter
                    });
                }
            }

            if (candidatePlacements.length > 0) {
                // Sort orientations at this pivot by closest to center
                candidatePlacements.sort((a, b) => a.distToCenter - b.distToCenter);
                const best = candidatePlacements[0];

                const placedItem = new PackedItem(idx, w, h, d, itemWeight);
                placedItem.x = best.px;
                placedItem.y = best.py;
                placedItem.z = best.pz;
                placedItem.pw = best.ow;
                placedItem.ph = best.oh;
                placedItem.pd = best.od;

                binObj.items.push(placedItem);

                // Remove current pivot
                pivots = pivots.filter(pt => !(pt[0] === px && pt[1] === py && pt[2] === pz));

                // Generate new pivots around placed item
                pivots.push([best.px + best.ow, best.py, best.pz]);
                pivots.push([best.px, best.py + best.oh, best.pz]);
                pivots.push([best.px, best.py, best.pz + best.od]);

                // Deduplicate and filter out of bounds or inside items
                const pivotMap = new Map();
                for (const pt of pivots) {
                    const key = `${pt[0].toFixed(2)},${pt[1].toFixed(2)},${pt[2].toFixed(2)}`;
                    if (!pivotMap.has(key)) {
                        pivotMap.set(key, pt);
                    }
                }
                pivots = Array.from(pivotMap.values()).filter(pt =>
                    pt[0] < binObj.w && pt[1] < binObj.h && pt[2] < binObj.d
                );

                idx++;
                placed = true;
                break;
            }
        }

        if (!placed) break;
    }

    // Rule 3: Ensure symmetric centered alignment of the overall packed block inside box
    if (binObj.items.length > 0) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        binObj.items.forEach(it => {
            if (it.x < minX) minX = it.x;
            if (it.x + it.pw > maxX) maxX = it.x + it.pw;
            if (it.y < minY) minY = it.y;
            if (it.y + it.ph > maxY) maxY = it.y + it.ph;
        });
        const packedW = maxX - minX;
        const packedH = maxY - minY;
        const shiftX = Math.max(0, (binObj.w - packedW) / 2) - minX;
        const shiftY = Math.max(0, (binObj.h - packedH) / 2) - minY;

        if (Math.abs(shiftX) > 1e-4 || Math.abs(shiftY) > 1e-4) {
            binObj.items.forEach(it => {
                it.x += shiftX;
                it.y += shiftY;
            });
        }
    }

    return binObj;
}

/**
 * Tạo danh sách các phương án xếp thùng 3D.
 * Áp dụng nghiêm ngặt các quy tắc:
 * 1. Bottom-First: Đi từ Z=0 lên trên.
 * 2. Center-Out Placement: Trong cùng 1 tầng Z, sắp xếp thứ tự ưu tiên các ô lưới từ tâm (centerX, centerY) lan ra ngoài.
 * 3. Leave Empty Margins: Căn giữa khối xếp tổng thể trên sàn thùng để khoảng hở dư đều 4 phía.
 * 4. Layer Completion: Lấp đầy tầng Z trước khi chuyển lên tầng Z+1.
 * 5. Collision & Support: Đảm bảo không chồng đè, không có vật thể bay lơ lửng.
 */
function generatePackingOptions(binDim, itemDim, itemWeight, maxBinWeightKg, rotationMode = "3d", partPadding = 0, binLiner = 0, removeCorners = false, customGrid = null) {
    const effBinW = Math.max(0, binDim[0] - 2 * binLiner);
    const effBinH = Math.max(0, binDim[1] - 2 * binLiner);
    const effBinD = Math.max(0, binDim[2] - 2 * binLiner);

    const [w, h, d] = itemDim;
    const maxWeightG = maxBinWeightKg * 1000.0;

    let rawOrientations = [];
    if (rotationMode === "3d") {
        const set = new Set();
        const raw = [
            [w, h, d], [w, d, h],
            [h, w, d], [h, d, w],
            [d, w, h], [d, h, w]
        ];
        for (const o of raw) set.add(o.join(','));
        rawOrientations = Array.from(set).map(s => s.split(',').map(Number));
    } else if (rotationMode === "2d") {
        const set = new Set();
        const raw = [[w, h, d], [h, w, d]];
        for (const o of raw) set.add(o.join(','));
        rawOrientations = Array.from(set).map(s => s.split(',').map(Number));
    } else {
        rawOrientations = [[w, h, d]];
    }

    const options = [];
    const centerX = effBinW / 2.0;
    const centerY = effBinH / 2.0;

    for (let idx = 0; idx < rawOrientations.length; idx++) {
        const [ow, oh, od] = rawOrientations[idx];
        const powEff = ow + partPadding;
        const pohEff = oh + partPadding;
        const podEff = od + partPadding;

        let nX = 0, nY = 0, nZ = 0;
        if (customGrid !== null && customGrid !== undefined) {
            [nX, nY, nZ] = customGrid;
            if (nX * powEff - partPadding > effBinW || nY * pohEff - partPadding > effBinH || nZ * podEff - partPadding > effBinD) {
                continue;
            }
        } else {
            nX = powEff > 0 ? Math.floor((effBinW + partPadding) / powEff) : 0;
            nY = pohEff > 0 ? Math.floor((effBinH + partPadding) / pohEff) : 0;
            nZ = podEff > 0 ? Math.floor((effBinD + partPadding) / podEff) : 0;
        }

        const geomCapacity = nX * nY * nZ;
        const weightCapacity = itemWeight > 0 ? Math.floor(maxWeightG / itemWeight) : 999999;

        if (geomCapacity > 0) {
            const binObj = new PackingBin(
                effBinW, effBinH, effBinD, maxWeightG,
                binDim[0], binDim[1], binDim[2],
                partPadding, binLiner
            );

            // Rule 3: Căn giữa khối xếp từ tâm ra 4 cạnh thùng (Leaving empty margins symmetrically)
            const actualUsedW = nX > 0 ? (nX * powEff - partPadding) : 0;
            const actualUsedH = nY > 0 ? (nY * pohEff - partPadding) : 0;
            const startOffsetX = Math.max(0, (effBinW - actualUsedW) / 2);
            const startOffsetY = Math.max(0, (effBinH - actualUsedH) / 2);

            // Rule 2: Tạo danh sách các vị trí ô lưới (xIdx, yIdx) cho 1 tầng Z
            const layerGridCells = [];
            for (let yIdx = 0; yIdx < nY; yIdx++) {
                for (let xIdx = 0; xIdx < nX; xIdx++) {
                    const itemPosX = startOffsetX + xIdx * powEff;
                    const itemPosY = startOffsetY + yIdx * pohEff;
                    const itemCenterX = itemPosX + ow / 2.0;
                    const itemCenterY = itemPosY + oh / 2.0;

                    // Radial distance metric from box center (Rule 2)
                    const distToCenter = Math.hypot(itemCenterX - centerX, itemCenterY - centerY);

                    layerGridCells.push({
                        xIdx,
                        yIdx,
                        distToCenter
                    });
                }
            }

            // Rule 2 & Priority: Sort cells within layer by distance to center ASCENDING
            layerGridCells.sort((a, b) => {
                if (Math.abs(a.distToCenter - b.distToCenter) > 1e-4) {
                    return a.distToCenter - b.distToCenter;
                }
                // Symmetrical tie-breaker: closer to middle indices
                const midX = (nX - 1) / 2.0;
                const midY = (nY - 1) / 2.0;
                const distIdxA = Math.abs(a.xIdx - midX) + Math.abs(a.yIdx - midY);
                const distIdxB = Math.abs(b.xIdx - midX) + Math.abs(b.yIdx - midY);
                if (distIdxA !== distIdxB) return distIdxA - distIdxB;
                return a.xIdx - b.xIdx || a.yIdx - b.yIdx;
            });

            const itemsInGrid = [];
            let count = 0;
            const occupiedMap = new Set(); // Key: "xIdx,yIdx,zIdx"

            // Rule 1 & Rule 4: Fill Layer 0 completely from center outward, then Layer 1, etc.
            for (let zIdx = 0; zIdx < nZ; zIdx++) {
                for (const cell of layerGridCells) {
                    const { xIdx, yIdx } = cell;

                    // Option: remove corner positions
                    if (removeCorners && nX >= 2 && nY >= 2) {
                        if ((xIdx === 0 || xIdx === nX - 1) && (yIdx === 0 || yIdx === nY - 1)) {
                            continue;
                        }
                    }

                    // Weight limit check
                    if (count >= weightCapacity) break;

                    // Rule 1 & Rule 5: Support check for zIdx > 0
                    // In a uniform grid, cell (xIdx, yIdx, zIdx) requires cell underneath (xIdx, yIdx, zIdx - 1) to be placed!
                    if (zIdx > 0 && !occupiedMap.has(`${xIdx},${yIdx},${zIdx - 1}`)) {
                        continue; // No floating parts allowed
                    }

                    const item = new PackedItem(count + 1, w, h, d, itemWeight);
                    item.x = startOffsetX + xIdx * powEff;
                    item.y = startOffsetY + yIdx * pohEff;
                    item.z = zIdx * podEff;
                    item.pw = ow;
                    item.ph = oh;
                    item.pd = od;

                    itemsInGrid.push(item);
                    occupiedMap.add(`${xIdx},${yIdx},${zIdx}`);
                    count++;
                }

                if (count >= weightCapacity) break;
            }

            binObj.items = itemsInGrid;
            const qty = itemsInGrid.length;

            options.push({
                name: `Phương án xếp đồng nhất (${ow.toFixed(0)}x${oh.toFixed(0)}x${od.toFixed(0)} mm)`,
                bin_result: binObj,
                qty: qty,
                orig_qty: geomCapacity,
                grid: [nX, nY, nZ],
                is_uniform: true,
                orientation: [ow, oh, od]
            });
        }
    }

    if (customGrid === null && !removeCorners) {
        const greedyBin = calculateMaxCapacity(binDim, itemDim, itemWeight, maxBinWeightKg, rotationMode, partPadding, binLiner);
        const greedyQty = greedyBin.items.length;

        if (greedyQty > 0) {
            options.push({
                name: "Phương án xếp tối ưu không gian (Hỗn hợp hướng)",
                bin_result: greedyBin,
                qty: greedyQty,
                orig_qty: greedyQty,
                grid: null,
                is_uniform: false,
                orientation: null
            });
        }
    }

    options.sort((a, b) => (b.orig_qty || b.qty) - (a.orig_qty || a.qty));

    options.forEach((opt, i) => {
        if (opt.is_uniform) {
            const [ow, oh, od] = opt.orientation;
            opt.name = `Phương án ${i + 1}: Xếp đồng nhất (${ow.toFixed(0)}x${oh.toFixed(0)}x${od.toFixed(0)} mm)`;
        } else {
            opt.name = `Phương án ${i + 1}: Xếp tối ưu hỗn hợp (Hỗn hợp hướng)`;
        }
    });

    return options;
}

module.exports = {
    PackedItem,
    PackingBin,
    calculateMaxCapacity,
    generatePackingOptions
};

