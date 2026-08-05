const { parentPort, workerData } = require('worker_threads');
const { generatePackingOptions } = require('./bin-packing');

try {
    const {
        bin_dim,
        item_dim,
        item_weight_g,
        max_bin_weight_kg,
        rotation_mode,
        part_padding,
        bin_liner,
        remove_corners,
        custom_grid
    } = workerData;

    const options = generatePackingOptions(
        bin_dim,
        item_dim,
        item_weight_g,
        max_bin_weight_kg,
        rotation_mode,
        part_padding,
        bin_liner,
        remove_corners,
        custom_grid
    );

    // Serialization: Convert PackingBin results into a JSON-safe structure
    const serializedOptions = options.map(opt => ({
        name: opt.name,
        qty: opt.qty,
        orig_qty: opt.orig_qty,
        grid: opt.grid,
        is_uniform: opt.is_uniform,
        orientation: opt.orientation,
        efficiency_pct: opt.bin_result.getEfficiencyPct(),
        total_weight_g: opt.bin_result.getUsedWeight(),
        total_weight_kg: opt.bin_result.getUsedWeight() / 1000.0,
        bin_w: opt.bin_result.real_w,
        bin_h: opt.bin_result.real_h,
        bin_d: opt.bin_result.real_d,
        eff_bin_w: opt.bin_result.w,
        eff_bin_h: opt.bin_result.h,
        eff_bin_d: opt.bin_result.d,
        bin_liner: opt.bin_result.bin_liner,
        part_padding: opt.bin_result.part_padding,
        items: opt.bin_result.items.map(it => ({
            index: it.index,
            x: it.x,
            y: it.y,
            z: it.z,
            pw: it.pw,
            ph: it.ph,
            pd: it.pd,
            weight: it.weight
        }))
    }));

    parentPort.postMessage({ success: true, options: serializedOptions });
} catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
}
