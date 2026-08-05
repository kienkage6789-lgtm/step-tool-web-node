const ExcelJS = require('exceljs');

async function exportBatchToExcel(resultsList) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'STEP Weight & Packaging Tool (Node.js)';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo Cáo Khối Lượng STEP', {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Color Theme: Deep Purple & Slate
    const HEADER_BG = '4A154B';
    const HEADER_TEXT = 'FFFFFF';
    const STRIPE_BG = 'F8F5F8';
    const TOTAL_BG = 'E8D8E8';

    // Title Block
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO TỔNG HỢP KHỐI LƯỢNG CHI TIẾT TỪ FILE CAD STEP';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: HEADER_BG } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:G2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}`;
    dateCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '666666' } };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.addRow([]); // Blank row 3

    // Header Row 4
    const headers = ['STT', 'Tên File STEP', 'Vật liệu', 'Khối lượng riêng (g/cm³)', 'Thể tích (cm³)', 'Kích thước Bounding Box (mm)', 'Trọng lượng (g)'];
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: HEADER_TEXT } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'medium', color: { argb: HEADER_BG } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
        };
    });

    let startRow = 5;
    let totalWeightG = 0;
    let totalVolumeCm3 = 0;

    resultsList.forEach((res, i) => {
        const rowNum = startRow + i;
        const hasError = res && res.error;
        const isNotCalculated = !res;
        const bboxStr = (res && !hasError && res.bbox_x !== undefined) 
            ? `${res.bbox_x.toFixed(1)} × ${res.bbox_y.toFixed(1)} × ${res.bbox_z.toFixed(1)}` 
            : '-';
        
        let materialDisplay = 'ABS';
        if (hasError) {
            materialDisplay = `Lỗi: ${res.error}`;
        } else if (isNotCalculated) {
            materialDisplay = 'Chưa tính toán';
        } else {
            materialDisplay = res.material_name || 'ABS';
        }

        const rowData = [
            i + 1,
            res ? (res.file_name || `File_${i + 1}`) : `File_${i + 1}`,
            materialDisplay,
            (hasError || isNotCalculated) ? 0 : (res.density_g_cm3 || 1.05),
            (hasError || isNotCalculated) ? 0 : (res.total_volume_cm3 || 0),
            bboxStr,
            (hasError || isNotCalculated) ? 0 : (res.total_weight_g || 0)
        ];

        const row = sheet.addRow(rowData);

        if (res && !hasError && !isNotCalculated) {
            totalVolumeCm3 += (res.total_volume_cm3 || 0);
            totalWeightG += (res.total_weight_g || 0);
        }

        row.eachCell((cell, colIndex) => {
            cell.font = { name: 'Segoe UI', size: 10 };
            cell.border = {
                top: { style: 'thin', color: { argb: 'E0E0E0' } },
                left: { style: 'thin', color: { argb: 'E0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
                right: { style: 'thin', color: { argb: 'E0E0E0' } }
            };

            if (i % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_BG } };
            }

            if (colIndex === 1) cell.alignment = { horizontal: 'center' };
            if (colIndex === 2) cell.alignment = { horizontal: 'left' };
            if (colIndex === 3) cell.alignment = { horizontal: 'left' };
            if (colIndex === 4) {
                cell.alignment = { horizontal: 'right' };
                cell.numFmt = '#,##0.000';
            }
            if (colIndex === 5) {
                cell.alignment = { horizontal: 'right' };
                cell.numFmt = '#,##0.00';
            }
            if (colIndex === 6) cell.alignment = { horizontal: 'center' };
            if (colIndex === 7) {
                cell.alignment = { horizontal: 'right' };
                cell.numFmt = '#,##0.00';
            }
        });
    });

    // Summary Row
    const summaryRow = sheet.addRow([
        'TỔNG CỘNG',
        '',
        '',
        '',
        totalVolumeCm3,
        '',
        totalWeightG
    ]);

    sheet.mergeCells(`A${summaryRow.number}:D${summaryRow.number}`);

    summaryRow.eachCell((cell, colIndex) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: HEADER_BG } };
        cell.border = {
            top: { style: 'double', color: { argb: HEADER_BG } },
            bottom: { style: 'double', color: { argb: HEADER_BG } }
        };
        if (colIndex === 1) cell.alignment = { horizontal: 'center' };
        if (colIndex === 5) {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '#,##0.00';
        }
        if (colIndex === 7) {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '#,##0.00';
        }
    });

    // Column widths
    sheet.columns = [
        { width: 8 },   // STT
        { width: 35 },  // File name
        { width: 22 },  // Material
        { width: 22 },  // Density
        { width: 18 },  // Volume
        { width: 30 },  // Bounding box
        { width: 20 }   // Weight
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

async function exportPackingToExcel(packingResult) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'STEP Packaging Engine (Node.js)';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sơ Đồ Xếp Thùng Chi Tiết', {
        views: [{ showGridLines: true }]
    });

    const COLOR_HEADER = '2E5B88';
    const COLOR_SUBHEADER = '4A7BB0';
    const COLOR_ROW_ALT = 'F0F5FA';
    const COLOR_BORDER = 'CCCCCC';

    // 1. Report Title (Row 1)
    sheet.mergeCells('A1:M1');
    const title = sheet.getCell('A1');
    title.value = 'BÁO CÁO PHÂN TÍCH VÀ MÔ PHỎNG XẾP THÙNG 3D';
    title.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    sheet.getRow(1).height = 42;

    sheet.addRow([]); // Blank row 2

    // 2. Section Headers (Row 4)
    sheet.mergeCells('A4:C4');
    const leftHeader = sheet.getCell('A4');
    leftHeader.value = 'THÔNG SỐ ĐÓNG GÓI CHÍNH';
    leftHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    leftHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    leftHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };

    sheet.mergeCells('E4:M4');
    const rightHeader = sheet.getCell('E4');
    rightHeader.value = 'MÔ PHỎNG PHƯƠNG ÁN XẾP THÙNG 3D';
    rightHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    rightHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    rightHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER } };
    sheet.getRow(4).height = 24;

    // 3. Populate Left Side Parameters (Rows 5 to 12)
    const infoRows = [
        ['Tên phương án', packingResult.option_name || 'Xếp đồng nhất'],
        ['Kích thước thùng W x H x D', `${packingResult.bin_w} x ${packingResult.bin_h} x ${packingResult.bin_d} mm`],
        ['Tải trọng tối đa thùng', `${packingResult.max_weight_kg} kg`],
        ['Kích thước chi tiết w x h x d', `${packingResult.item_w} x ${packingResult.item_h} x ${packingResult.item_d} mm`],
        ['Trọng lượng 1 chi tiết', `${packingResult.item_weight_g} g`],
        ['Tổng số lượng xếp được', `${packingResult.total_qty} chi tiết`],
        ['Hiệu suất thể tích', `${packingResult.efficiency_pct.toFixed(2)} %`],
        ['Tổng trọng lượng sản phẩm', `${(packingResult.total_weight_g / 1000).toFixed(2)} kg`]
    ];

    infoRows.forEach((r, idx) => {
        const rowNum = 5 + idx;
        sheet.mergeCells(`B${rowNum}:C${rowNum}`);
        
        const cellLabel = sheet.getCell(`A${rowNum}`);
        cellLabel.value = r[0];
        cellLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '333333' } };
        cellLabel.alignment = { horizontal: 'left', vertical: 'middle' };
        
        const cellValue = sheet.getCell(`B${rowNum}`);
        cellValue.value = r[1];
        cellValue.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '000000' } };
        cellValue.alignment = { horizontal: 'center', vertical: 'middle' };

        // Border and fills
        const borderStyle = {
            top: { style: 'thin', color: { argb: COLOR_BORDER } },
            left: { style: 'thin', color: { argb: COLOR_BORDER } },
            bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
            right: { style: 'thin', color: { argb: COLOR_BORDER } }
        };

        cellLabel.border = borderStyle;
        cellValue.border = borderStyle;
        sheet.getCell(`C${rowNum}`).border = borderStyle;

        if (idx % 2 === 1) {
            cellLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_ALT } };
            cellValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_ALT } };
            sheet.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ROW_ALT } };
        }
        sheet.getRow(rowNum).height = 24;
    });

    // 4. Insert 3D Render Image (E5:M20)
    if (packingResult.image_3d) {
        try {
            const base64Data = packingResult.image_3d.replace(/^data:image\/png;base64,/, "");
            const imgId = workbook.addImage({
                base64: base64Data,
                extension: 'png'
            });
            sheet.addImage(imgId, 'E5:M20');
        } catch (e) {
            console.error("Lỗi chèn ảnh 3D vào Excel:", e.message);
        }
    }

    // Set height for remaining rows in 3D image zone
    for (let r = 13; r <= 20; r++) {
        sheet.getRow(r).height = 24;
    }

    sheet.getRow(21).height = 15; // Spacer row 21

    // 5. Section Header: 2D Orthographic Projections (Row 22)
    sheet.mergeCells('A22:L22');
    const projectionsHeader = sheet.getCell('A22');
    projectionsHeader.value = 'HÌNH CHIẾU KỸ THUẬT 2D (TOP - FRONT - SIDE)';
    projectionsHeader.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    projectionsHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    projectionsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER } };
    sheet.getRow(22).height = 26;

    // Sublabels for 2D views (Row 23)
    sheet.mergeCells('A23:D23');
    const labelTop = sheet.getCell('A23');
    labelTop.value = 'HÌNH CHIẾU BẰNG (TOP VIEW X-Y)';
    labelTop.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '555555' } };
    labelTop.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('E23:H23');
    const labelFront = sheet.getCell('E23');
    labelFront.value = 'HÌNH CHIẾU ĐỨNG (FRONT VIEW X-Z)';
    labelFront.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '555555' } };
    labelFront.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('I23:L23');
    const labelSide = sheet.getCell('I23');
    labelSide.value = 'HÌNH CHIẾU CẠNH (SIDE VIEW Y-Z)';
    labelSide.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: '555555' } };
    labelSide.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(23).height = 20;

    // 6. Insert 2D Projections (Row 24 to 36)
    if (packingResult.image_top) {
        try {
            const base64Data = packingResult.image_top.replace(/^data:image\/png;base64,/, "");
            const imgId = workbook.addImage({ base64: base64Data, extension: 'png' });
            sheet.addImage(imgId, 'A24:D36');
        } catch (e) { console.error("Lỗi chèn ảnh Top view:", e.message); }
    }

    if (packingResult.image_front) {
        try {
            const base64Data = packingResult.image_front.replace(/^data:image\/png;base64,/, "");
            const imgId = workbook.addImage({ base64: base64Data, extension: 'png' });
            sheet.addImage(imgId, 'E24:H36');
        } catch (e) { console.error("Lỗi chèn ảnh Front view:", e.message); }
    }

    if (packingResult.image_side) {
        try {
            const base64Data = packingResult.image_side.replace(/^data:image\/png;base64,/, "");
            const imgId = workbook.addImage({ base64: base64Data, extension: 'png' });
            sheet.addImage(imgId, 'I24:L36');
        } catch (e) { console.error("Lỗi chèn ảnh Side view:", e.message); }
    }

    // Set height for the 2D image rows (Row 24 to 36)
    for (let r = 24; r <= 36; r++) {
        sheet.getRow(r).height = 20;
    }

    // Set Column Widths for structural layout alignment
    sheet.columns = [
        { width: 26 }, // A: Label
        { width: 14 }, // B: Value L1
        { width: 14 }, // C: Value L2 (merged with B)
        { width: 5 },  // D: Spacer
        { width: 13 }, // E: Top/Front View col 1
        { width: 13 }, // F: Top/Front View col 2
        { width: 13 }, // G: Top/Front View col 3
        { width: 13 }, // H: Top/Front View col 4
        { width: 13 }, // I: Side View col 1
        { width: 13 }, // J: Side View col 2
        { width: 13 }, // K: Side View col 3
        { width: 13 }, // L: Side View col 4
        { width: 13 }  // M: 3D right side helper
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    exportBatchToExcel,
    exportPackingToExcel
};
