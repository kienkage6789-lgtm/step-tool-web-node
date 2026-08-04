const { getMaterialDensity, getAllMaterials } = require('./db');

function calculateWeight(volumeCm3, densityGCm3) {
    return volumeCm3 * densityGCm3;
}

async function processCalculation(volumeCm3, materialName = null, customDensity = null, cavities = 1, runnerWeightG = 0) {
    let density = null;
    let source = "Custom";
    let finalMaterialName = materialName;

    if (customDensity !== null && customDensity !== undefined && customDensity !== '') {
        density = parseFloat(customDensity);
        if (isNaN(density) || density <= 0) {
            throw new Error(`Kích thước/khối lượng riêng không hợp lệ: ${customDensity}`);
        }
        finalMaterialName = `Custom (${density.toFixed(3)} g/cm³)`;
    } else if (materialName) {
        density = await getMaterialDensity(materialName);
        if (density === null) {
            const allMats = await getAllMaterials();
            const matched = allMats.find(m => m.name.toLowerCase() === materialName.toLowerCase());
            if (matched) {
                finalMaterialName = matched.name;
                density = matched.density;
                source = "Database";
            } else {
                throw new Error(`Vật liệu '${materialName}' không có trong cơ sở dữ liệu.`);
            }
        } else {
            source = "Database";
        }
    } else {
        finalMaterialName = "ABS";
        density = (await getMaterialDensity("ABS")) || 1.05;
        source = "Default Fallback";
    }

    const partWeightG = calculateWeight(volumeCm3, density);
    const numCavities = Math.max(1, parseInt(cavities) || 1);
    const runnerG = Math.max(0, parseFloat(runnerWeightG) || 0);

    const totalShotWeightG = (partWeightG * numCavities) + runnerG;

    return {
        material_name: finalMaterialName,
        density_g_cm3: density,
        density_source: source,
        volume_cm3: volumeCm3,
        part_weight_g: partWeightG,
        part_weight_kg: partWeightG / 1000.0,
        cavities: numCavities,
        runner_weight_g: runnerG,
        total_shot_weight_g: totalShotWeightG,
        total_shot_weight_kg: totalShotWeightG / 1000.0
    };
}

module.exports = {
    calculateWeight,
    processCalculation
};
