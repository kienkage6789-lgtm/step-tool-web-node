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
        const bboxStr = `${res.bbox_x ? res.bbox_x.toFixed(1) : 0} × ${res.bbox_y ? res.bbox_y.toFixed(1) : 0} × ${res.bbox_z ? res.bbox_z.toFixed(1) : 0}`;
        const rowData = [
            i + 1,
            res.file_name || `File_${i + 1}`,
            res.material_name || 'ABS',
            res.density_g_cm3 || 1.05,
            res.total_volume_cm3 || 0,
            bboxStr,
            res.total_weight_g || 0
        ];

        const row = sheet.addRow(rowData);

        totalVolumeCm3 += (res.total_volume_cm3 || 0);
        totalWeightG += (res.total_weight_g || 0);

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

    const sheet = workbook.addWorksheet('Sơ Đồ Xếp Thùng Chi Tiết');

    const HEADER_BG = '2E5B88';
    const HEADER_TEXT = 'FFFFFF';

    sheet.mergeCells('A1:F1');
    const title = sheet.getCell('A1');
    title.value = 'BÁO CÁO CHI TIẾT SƠ ĐỒ XẾP SẢN PHẨM VÀO THÙNG 3D';
    title.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: HEADER_BG } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.addRow([]);

    // Packing Info
    const infoRows = [
        ['Tên phương án:', packingResult.option_name || 'Xếp đồng nhất'],
        ['Kích thước thùng (W x H x D):', `${packingResult.bin_w} x ${packingResult.bin_h} x ${packingResult.bin_d} mm`],
        ['Tải trọng tối đa thùng:', `${packingResult.max_weight_kg} kg`],
        ['Kích thước chi tiết (w x h x d):', `${packingResult.item_w} x ${packingResult.item_h} x ${packingResult.item_d} mm`],
        ['Trọng lượng 1 chi tiết:', `${packingResult.item_weight_g} g`],
        ['Tổng số lượng xếp được:', `${packingResult.total_qty} chi tiết`],
        ['Hiệu suất thể tích:', `${packingResult.efficiency_pct.toFixed(2)} %`],
        ['Tổng trọng lượng sản phẩm:', `${(packingResult.total_weight_g / 1000).toFixed(2)} kg`]
    ];

    infoRows.forEach(r => {
        const row = sheet.addRow([r[0], r[1]]);
        row.getCell(1).font = { name: 'Segoe UI', bold: true, color: { argb: '333333' } };
        row.getCell(2).font = { name: 'Segoe UI', bold: true, color: { argb: '000000' } };
        row.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'E0E0E0' } } };
        row.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'E0E0E0' } } };
    });

    sheet.columns = [
        { width: 35 },
        { width: 35 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    exportBatchToExcel,
    exportPackingToExcel
};
