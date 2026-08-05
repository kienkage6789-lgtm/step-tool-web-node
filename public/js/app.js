/**
 * Main Web Application Controller (DEZEN STEP Weight & Packaging Tool)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Global Application State
    const AppState = {
        materials: [],
        currentSingleResult: null,
        batchFiles: [],
        batchResults: [],
        batchSelectedMaterials: [],
        currentPackingOptions: [],
        selectedPackingOption: null
    };

    // DOM Elements
    const elements = {
        // Navigation & Theme
        navItems: document.querySelectorAll('.nav-item'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        themeToggle: document.getElementById('theme-toggle'),

        // Tab Single
        dropzoneSingle: document.getElementById('dropzone-single'),
        fileInputSingle: document.getElementById('file-input-single'),
        fileInfoBar: document.getElementById('file-info-bar'),
        fileNameText: document.getElementById('file-name-text'),
        btnRemoveFile: document.getElementById('btn-remove-file'),
        materialSelect: document.getElementById('material-select'),
        customDensity: document.getElementById('custom-density'),
        inputCavities: document.getElementById('input-cavities'),
        inputRunner: document.getElementById('input-runner'),
        btnCalculateSingle: document.getElementById('btn-calculate-single'),
        loadingSpinnerSingle: document.getElementById('loading-spinner-single'),
        resultPlaceholder: document.getElementById('result-placeholder'),
        resultDetails: document.getElementById('result-details'),
        resWeightPrimary: document.getElementById('res-weight-primary'),
        resWeightSecondary: document.getElementById('res-weight-secondary'),
        resVolume: document.getElementById('res-volume'),
        resMaterial: document.getElementById('res-material'),
        resBbox: document.getElementById('res-bbox'),
        resArea: document.getElementById('res-area'),
        resShotWeight: document.getElementById('res-shot-weight'),
        resShotDetails: document.getElementById('res-shot-details'),
        btnCopyResult: document.getElementById('btn-copy-result'),
        btnSendToPacking: document.getElementById('btn-send-to-packing'),

        // Tab Batch
        dropzoneBatch: document.getElementById('dropzone-batch'),
        fileInputBatch: document.getElementById('file-input-batch'),
        batchMaterialSelect: document.getElementById('batch-material-select'),
        btnRunBatch: document.getElementById('btn-run-batch'),
        btnClearBatch: document.getElementById('btn-clear-batch'),
        btnExportBatchExcel: document.getElementById('btn-export-batch-excel'),
        batchTbody: document.getElementById('batch-tbody'),
        batchTfoot: document.getElementById('batch-tfoot'),
        totalBatchVolume: document.getElementById('total-batch-volume'),
        totalBatchWeight: document.getElementById('total-batch-weight'),

        // Tab Packing 3D
        chkUseSingleData: document.getElementById('chk-use-single-data'),
        viewBtns: document.querySelectorAll('.view-btn'),
        binW: document.getElementById('bin-w'),
        binH: document.getElementById('bin-h'),
        binD: document.getElementById('bin-d'),
        binMaxWeight: document.getElementById('bin-max-weight'),
        itemW: document.getElementById('item-w'),
        itemH: document.getElementById('item-h'),
        itemD: document.getElementById('item-d'),
        itemWeight: document.getElementById('item-weight'),
        partPadding: document.getElementById('part-padding'),
        binLiner: document.getElementById('bin-liner'),
        rotationMode: document.getElementById('rotation-mode'),
        chkRemoveCorners: document.getElementById('chk-remove-corners'),
        btnRunPacking: document.getElementById('btn-run-packing'),
        loadingSpinnerPacking: document.getElementById('loading-spinner-packing'),
        btnExportPackingExcel: document.getElementById('btn-export-packing-excel'),
        optionSelectBar: document.getElementById('option-select-bar'),
        packingOptionDropdown: document.getElementById('packing-option-dropdown'),
        packingSummary: document.getElementById('packing-summary'),
        packQty: document.getElementById('pack-qty'),
        packEfficiency: document.getElementById('pack-efficiency'),
        packGridInfo: document.getElementById('pack-grid-info'),
        packTotalWeight: document.getElementById('pack-total-weight'),
        packWeightLimit: document.getElementById('pack-weight-limit'),

        // Tab Materials
        materialsLockScreen: document.getElementById('materials-lock-screen'),
        materialsContent: document.getElementById('materials-content'),
        materialPasswordInput: document.getElementById('material-password-input'),
        btnUnlockMaterials: document.getElementById('btn-unlock-materials'),
        btnLockMaterials: document.getElementById('btn-lock-materials'),
        unlockErrorMsg: document.getElementById('unlock-error-msg'),
        materialsTbody: document.getElementById('materials-tbody'),
        materialSearchInput: document.getElementById('material-search-input'),
        btnOpenAddMaterial: document.getElementById('btn-open-add-material'),
        modalMaterial: document.getElementById('modal-material'),
        modalTitle: document.getElementById('modal-title'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        btnCancelMaterial: document.getElementById('btn-cancel-material'),
        btnSaveMaterial: document.getElementById('btn-save-material'),
        matInputName: document.getElementById('mat-input-name'),
        matInputDensity: document.getElementById('mat-input-density'),
        matInputCategory: document.getElementById('mat-input-category'),
        matInputDesc: document.getElementById('mat-input-desc')
    };

    // Initialize App
    initNavigation();
    initThemeToggle();
    fetchMaterials();
    initSingleTabEvents();
    initBatchTabEvents();
    initPackingTabEvents();
    initMaterialsTabEvents();
    initWasmParser();

    // 1. Navigation Tabs
    function initNavigation() {
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');

                elements.navItems.forEach(nav => nav.classList.remove('active'));
                elements.tabPanels.forEach(panel => panel.classList.remove('active'));

                item.classList.add('active');
                document.getElementById(targetTab).classList.add('active');

                // If switching to packing tab, initialize Three.js canvas & sync single STEP data if checked
                if (targetTab === 'tab-packing') {
                    if (elements.chkUseSingleData && elements.chkUseSingleData.checked && AppState.currentSingleResult) {
                        syncSingleDataToPacking(false);
                    }
                    setTimeout(() => {
                        window.BinVisualizer3D.init('three-canvas-container');
                        if (AppState.selectedPackingOption) {
                            window.BinVisualizer3D.renderBin(AppState.selectedPackingOption);
                        }
                    }, 50);
                }
            });
        });
    }

    // 2. Theme Toggle (Dark / Light)
    function initThemeToggle() {
        let isLight = false;
        elements.themeToggle.addEventListener('click', () => {
            isLight = !isLight;
            document.body.setAttribute('data-theme', isLight ? 'light' : 'dark');
            elements.themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });
    }

    // 3. Fetch Materials from SQLite Backend API
    async function fetchMaterials() {
        try {
            const res = await fetch('/api/materials');
            const data = await res.json();
            if (data.success) {
                AppState.materials = data.materials;
                populateMaterialDropdowns();
                renderMaterialsTable(AppState.materials);
            }
        } catch (err) {
            console.error("Lỗi kết nối CSDL vật liệu:", err);
        }
    }

    function populateMaterialDropdowns() {
        const optionsHtml = AppState.materials.map(m =>
            `<option value="${m.name}">${m.name} (${m.density} g/cm³) - ${m.category}</option>`
        ).join('');

        elements.materialSelect.innerHTML = `<option value="">-- Chọn Vật Liệu Từ CSDL --</option>` + optionsHtml;
        elements.batchMaterialSelect.innerHTML = `<option value="">-- Chọn Vật Liệu Áp Dụng Cho Cả Batch --</option>` + optionsHtml;

        // Default to ABS
        elements.materialSelect.value = "ABS";
        elements.batchMaterialSelect.value = "ABS";
    }

    // 4. WebAssembly STEP Parser Initialization
    function initWasmParser() {
        if (window.StepParserWasm) {
            window.StepParserWasm.init().catch(err => {
                // Silently handle startup Wasm CDN notice
            });
        }
    }

    // 5. Single File Calculation Logic
    let selectedSingleFile = null;
    let singleParsedInfo = null;

    function initSingleTabEvents() {
        // Dropzone single events
        elements.dropzoneSingle.addEventListener('click', () => elements.fileInputSingle.click());
        elements.fileInputSingle.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleSingleFileSelect(e.target.files[0]);
        });

        elements.dropzoneSingle.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropzoneSingle.classList.add('dragover');
        });
        elements.dropzoneSingle.addEventListener('dragleave', () => elements.dropzoneSingle.classList.remove('dragover'));
        elements.dropzoneSingle.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.dropzoneSingle.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleSingleFileSelect(e.dataTransfer.files[0]);
        });

        elements.btnRemoveFile.addEventListener('click', () => {
            selectedSingleFile = null;
            singleParsedInfo = null;
            elements.fileInfoBar.classList.add('hidden');
            elements.dropzoneSingle.classList.remove('hidden');
            elements.resultDetails.classList.add('hidden');
            elements.resultPlaceholder.classList.remove('hidden');
        });

        elements.btnCalculateSingle.addEventListener('click', runSingleCalculation);

        elements.btnCopyResult.addEventListener('click', () => {
            if (!AppState.currentSingleResult) return;
            const res = AppState.currentSingleResult;
            const text = `Vật liệu: ${res.material_name} (${res.density_g_cm3} g/cm³)\nThể tích: ${res.volume_cm3.toFixed(3)} cm³\nTrọng lượng: ${res.part_weight_g.toFixed(2)} g (${res.part_weight_kg.toFixed(4)} kg)\nBounding Box: ${res.bbox_x.toFixed(1)} x ${res.bbox_y.toFixed(1)} x ${res.bbox_z.toFixed(1)} mm\nShot Weight (${res.cavities} cav + ${res.runner_weight_g}g runner): ${res.total_shot_weight_g.toFixed(2)} g`;
            navigator.clipboard.writeText(text);
            alert("Đã copy kết quả tính toán vào Clipboard!");
        });

        elements.btnSendToPacking.addEventListener('click', () => {
            if (!AppState.currentSingleResult) return;
            const res = AppState.currentSingleResult;
            elements.itemW.value = Math.round(res.bbox_x);
            elements.itemH.value = Math.round(res.bbox_y);
            elements.itemD.value = Math.round(res.bbox_z);
            elements.itemWeight.value = Math.round(res.part_weight_g);

            // Switch to packing tab
            document.querySelector('[data-tab="tab-packing"]').click();
        });
    }

    function handleSingleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.step') && !file.name.toLowerCase().endsWith('.stp')) {
            alert("Vui lòng chọn đúng file có đuôi mở rộng .step hoặc .stp!");
            return;
        }
        selectedSingleFile = file;
        elements.fileNameText.textContent = file.name;
        elements.dropzoneSingle.classList.add('hidden');
        elements.fileInfoBar.classList.remove('hidden');
    }

    async function runSingleCalculation() {
        const manualVolInput = document.getElementById('manual-volume');
        const manualVol = manualVolInput ? parseFloat(manualVolInput.value) : NaN;

        if (!selectedSingleFile && (isNaN(manualVol) || manualVol <= 0)) {
            alert("Vui lòng chọn file STEP hoặc nhập Thể tích thủ công (cm³) trước khi bấm tính toán!");
            return;
        }

        elements.loadingSpinnerSingle.classList.remove('hidden');
        elements.resultPlaceholder.classList.add('hidden');
        elements.resultDetails.classList.add('hidden');

        try {
            let volumeCm3 = 0;
            let bboxX = 0, bboxY = 0, bboxZ = 0, areaCm2 = 0;

            if (!isNaN(manualVol) && manualVol > 0) {
                volumeCm3 = manualVol;
                // Estimate cube bbox if no STEP file
                const sideMm = Math.cbrt(volumeCm3 * 1000.0);
                bboxX = bboxY = bboxZ = sideMm;
                areaCm2 = (6 * sideMm * sideMm) / 100.0;
            } else if (selectedSingleFile) {
                if (!singleParsedInfo || singleParsedInfo.file_name !== selectedSingleFile.name) {
                    singleParsedInfo = await window.StepParserWasm.parseStepFile(selectedSingleFile);
                }
                volumeCm3 = singleParsedInfo.total_volume_cm3;
                bboxX = singleParsedInfo.bbox_x;
                bboxY = singleParsedInfo.bbox_y;
                bboxZ = singleParsedInfo.bbox_z;
                areaCm2 = singleParsedInfo.total_area_cm2;
            }

            const materialName = elements.materialSelect.value;
            const customDensity = elements.customDensity.value;
            const cavities = elements.inputCavities.value;
            const runnerWeightG = elements.inputRunner.value;

            // Call Backend API to compute weight and shot weight
            const apiRes = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    volume_cm3: volumeCm3,
                    material_name: materialName,
                    custom_density: customDensity,
                    cavities: cavities,
                    runner_weight_g: runnerWeightG
                })
            });

            const data = await apiRes.json();
            if (!data.success) throw new Error(data.error);

            const calcRes = data.result;
            calcRes.file_name = selectedSingleFile ? selectedSingleFile.name : `Nhập thủ công (${volumeCm3.toFixed(2)} cm³)`;
            calcRes.bbox_x = bboxX;
            calcRes.bbox_y = bboxY;
            calcRes.bbox_z = bboxZ;
            calcRes.total_area_cm2 = areaCm2;

            AppState.currentSingleResult = calcRes;
            displaySingleResult(calcRes);

        } catch (err) {
            alert("Lỗi tính toán: " + err.message);
            elements.resultPlaceholder.classList.remove('hidden');
        } finally {
            elements.loadingSpinnerSingle.classList.add('hidden');
        }
    }

    function displaySingleResult(res) {
        elements.resWeightPrimary.textContent = res.part_weight_g >= 1000 ? `${res.part_weight_kg.toFixed(4)} kg` : `${res.part_weight_g.toFixed(2)} g`;
        elements.resWeightSecondary.textContent = `(${res.part_weight_g.toFixed(2)} g / ${res.part_weight_kg.toFixed(4)} kg)`;
        elements.resVolume.textContent = `${res.volume_cm3.toFixed(3)} cm³`;
        elements.resMaterial.textContent = `${res.material_name} (${res.density_g_cm3.toFixed(3)} g/cm³)`;
        elements.resBbox.textContent = `${res.bbox_x.toFixed(1)} × ${res.bbox_y.toFixed(1)} × ${res.bbox_z.toFixed(1)} mm`;
        elements.resArea.textContent = `${res.total_area_cm2.toFixed(2)} cm²`;

        elements.resShotWeight.textContent = `${res.total_shot_weight_g.toFixed(2)} g (${res.total_shot_weight_kg.toFixed(4)} kg)`;
        elements.resShotDetails.textContent = `Công thức: (${res.part_weight_g.toFixed(1)}g × ${res.cavities} cav) + ${res.runner_weight_g}g cuống phun`;

        elements.resultDetails.classList.remove('hidden');

        // Auto sync to packing tab if checked
        if (elements.chkUseSingleData && elements.chkUseSingleData.checked) {
            elements.itemW.value = Math.round(res.bbox_x);
            elements.itemH.value = Math.round(res.bbox_y);
            elements.itemD.value = Math.round(res.bbox_z);
            elements.itemWeight.value = Math.round(res.part_weight_g);
        }
    }

    // 6. Batch Calculation Logic
    function initBatchTabEvents() {
        elements.dropzoneBatch.addEventListener('click', () => elements.fileInputBatch.click());
        elements.fileInputBatch.addEventListener('change', (e) => {
            if (e.target.files.length > 0) addBatchFiles(Array.from(e.target.files));
        });

        elements.dropzoneBatch.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.dropzoneBatch.classList.add('dragover');
        });
        elements.dropzoneBatch.addEventListener('dragleave', () => elements.dropzoneBatch.classList.remove('dragover'));
        elements.dropzoneBatch.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.dropzoneBatch.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) addBatchFiles(Array.from(e.dataTransfer.files));
        });

        elements.btnRunBatch.addEventListener('click', runBatchCalculation);
        elements.btnClearBatch.addEventListener('click', clearBatch);
        elements.btnExportBatchExcel.addEventListener('click', exportBatchExcel);

        // General material change applies to all files
        elements.batchMaterialSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                AppState.batchSelectedMaterials = AppState.batchSelectedMaterials.map(() => val);
                AppState.batchResults = new Array(AppState.batchFiles.length).fill(null);
                renderBatchTable();
            }
        });

        // Individual material dropdown change updates specific row
        elements.batchTbody.addEventListener('change', (e) => {
            if (e.target && e.target.classList.contains('table-select')) {
                const index = parseInt(e.target.dataset.index);
                const newVal = e.target.value;
                if (!isNaN(index) && index >= 0 && index < AppState.batchSelectedMaterials.length) {
                    AppState.batchSelectedMaterials[index] = newVal;
                    AppState.batchResults[index] = null;
                    renderBatchTable();
                }
            }
        });
    }

    function addBatchFiles(files) {
        const validFiles = files.filter(f => f.name.toLowerCase().endsWith('.step') || f.name.toLowerCase().endsWith('.stp'));
        if (validFiles.length === 0) return;

        AppState.batchFiles = [...AppState.batchFiles, ...validFiles];
        const defaultMaterial = elements.batchMaterialSelect.value || "ABS";
        for (let i = 0; i < validFiles.length; i++) {
            AppState.batchSelectedMaterials.push(defaultMaterial);
        }

        renderBatchTable();
        elements.btnRunBatch.disabled = false;
    }

    function clearBatch() {
        AppState.batchFiles = [];
        AppState.batchResults = [];
        AppState.batchSelectedMaterials = [];
        renderBatchTable();
        elements.btnRunBatch.disabled = true;
        elements.btnExportBatchExcel.disabled = true;
    }

    function renderBatchTable() {
        if (AppState.batchFiles.length === 0) {
            elements.batchTbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Chưa có file nào được thêm vào danh sách.</td></tr>`;
            elements.batchTfoot.classList.add('hidden');
            return;
        }

        elements.batchTbody.innerHTML = AppState.batchFiles.map((file, i) => {
            const res = AppState.batchResults[i];
            const hasError = res && res.error;
            
            // Build dropdown options for each file's material select
            const isDisabledAttr = elements.btnRunBatch.disabled ? 'disabled' : '';
            let materialSelectHtml = '';
            if (AppState.materials && AppState.materials.length > 0) {
                const selectedMat = AppState.batchSelectedMaterials[i] || 'ABS';
                const matOptionsHtml = AppState.materials.map(m => {
                    const isSelected = m.name === selectedMat ? 'selected' : '';
                    return `<option value="${m.name}" ${isSelected}>${m.name} (${m.density} g/cm³)</option>`;
                }).join('');
                materialSelectHtml = `<select class="table-select" data-index="${i}" ${isDisabledAttr}>${matOptionsHtml}</select>`;
            } else {
                materialSelectHtml = `<select class="table-select" data-index="${i}" ${isDisabledAttr}><option value="ABS" selected>ABS (1.050 g/cm³)</option></select>`;
            }

            const densityStr = (res && !hasError) ? res.density_g_cm3.toFixed(3) : '-';
            const volumeStr = (res && !hasError) ? res.total_volume_cm3.toFixed(3) : '-';
            const bboxStr = (res && !hasError) ? `${res.bbox_x.toFixed(1)} × ${res.bbox_y.toFixed(1)} × ${res.bbox_z.toFixed(1)}` : '-';
            const weightStr = (res && !hasError) ? `${res.total_weight_g.toFixed(2)} g` : '-';
            const statusStr = res 
                ? (hasError 
                    ? `<span class="text-danger" title="${res.error}"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi</span>`
                    : `<span class="text-success"><i class="fa-solid fa-check"></i> Hoàn thành</span>`)
                : `<span class="text-muted">Chờ tính...</span>`;

            return `
                <tr>
                    <td class="text-center">${i + 1}</td>
                    <td><strong>${file.name}</strong></td>
                    <td>${materialSelectHtml}</td>
                    <td class="text-right">${densityStr}</td>
                    <td class="text-right">${volumeStr}</td>
                    <td class="text-center">${bboxStr}</td>
                    <td class="text-right">${weightStr}</td>
                    <td class="text-center">${statusStr}</td>
                </tr>
            `;
        }).join('');
    }

    async function runBatchCalculation() {
        if (AppState.batchFiles.length === 0) return;
        elements.btnRunBatch.disabled = true;
        AppState.batchResults = new Array(AppState.batchFiles.length).fill(null);

        let totalVol = 0;
        let totalWeight = 0;

        for (let i = 0; i < AppState.batchFiles.length; i++) {
            const file = AppState.batchFiles[i];
            try {
                const stepInfo = await window.StepParserWasm.parseStepFile(file);
                const matName = AppState.batchSelectedMaterials[i] || "ABS";

                const apiRes = await fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        volume_cm3: stepInfo.total_volume_cm3,
                        material_name: matName
                    })
                });

                const data = await apiRes.json();
                if (data.success) {
                    const r = data.result;
                    r.file_name = file.name;
                    r.bbox_x = stepInfo.bbox_x;
                    r.bbox_y = stepInfo.bbox_y;
                    r.bbox_z = stepInfo.bbox_z;
                    r.total_volume_cm3 = r.volume_cm3;
                    r.total_weight_g = r.part_weight_g;

                    AppState.batchResults[i] = r;
                    totalVol += r.total_volume_cm3;
                    totalWeight += r.total_weight_g;
                } else {
                    AppState.batchResults[i] = { file_name: file.name, error: data.error || "Lỗi API" };
                }
            } catch (err) {
                console.error(`Lỗi parse file ${file.name}:`, err);
                AppState.batchResults[i] = { file_name: file.name, error: err.message || "Lỗi xử lý file" };
            }
            renderBatchTable();
        }

        elements.totalBatchVolume.textContent = `${totalVol.toFixed(2)} cm³`;
        elements.totalBatchWeight.textContent = `${totalWeight.toFixed(2)} g (${(totalWeight / 1000).toFixed(4)} kg)`;
        elements.batchTfoot.classList.remove('hidden');
        elements.btnExportBatchExcel.disabled = false;
        elements.btnRunBatch.disabled = false;
        renderBatchTable();
    }

    async function exportBatchExcel() {
        if (AppState.batchResults.length === 0) return;
        try {
            const response = await fetch('/api/export-batch-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: AppState.batchResults })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bao_Cao_Khoi_Luong_STEP_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert("Lỗi xuất file Excel: " + err.message);
        }
    }

    function syncSingleDataToPacking(showAlert = true) {
        if (AppState.currentSingleResult) {
            const res = AppState.currentSingleResult;
            elements.itemW.value = Math.round(res.bbox_x);
            elements.itemH.value = Math.round(res.bbox_y);
            elements.itemD.value = Math.round(res.bbox_z);
            elements.itemWeight.value = Math.round(res.part_weight_g);
            if (showAlert) {
                alert(`Đã cập nhật dữ liệu từ file '${res.file_name || 'STEP'}':\n- Dài × Rộng × Cao: ${Math.round(res.bbox_x)} × ${Math.round(res.bbox_y)} × ${Math.round(res.bbox_z)} mm\n- Trọng lượng 1 chi tiết: ${Math.round(res.part_weight_g)} g`);
            }
        } else if (showAlert) {
            alert("Chưa có kết quả tính STEP đơn lẻ nào. Hãy tải file STEP và bấm tính toán ở Tab 'Tính STEP Đơn Lẻ' trước!");
        }
    }

    // 7. 3D Bin Packing Events & Calculation
    function initPackingTabEvents() {
        elements.btnRunPacking.addEventListener('click', runPackingCalculation);
        elements.packingOptionDropdown.addEventListener('change', (e) => {
            const idx = parseInt(e.target.value);
            if (AppState.currentPackingOptions[idx]) {
                selectPackingOption(AppState.currentPackingOptions[idx]);
            }
        });
        elements.btnExportPackingExcel.addEventListener('click', exportPackingExcel);

        // Sync single STEP data button
        const btnSync = document.getElementById('btn-sync-single-data');
        if (btnSync) {
            btnSync.addEventListener('click', () => syncSingleDataToPacking(true));
        }

        // Checkbox auto-sync single STEP data
        if (elements.chkUseSingleData) {
            elements.chkUseSingleData.addEventListener('change', () => {
                if (elements.chkUseSingleData.checked) {
                    syncSingleDataToPacking(true);
                }
            });
        }

        // 3 Projection Views Control Buttons
        elements.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const viewMode = btn.getAttribute('data-view');
                window.BinVisualizer3D.setViewMode(viewMode);
            });
        });
    }

    async function runPackingCalculation() {
        const binW = parseFloat(elements.binW.value);
        const binH = parseFloat(elements.binH.value);
        const binD = parseFloat(elements.binD.value);
        const itemW = parseFloat(elements.itemW.value);
        const itemH = parseFloat(elements.itemH.value);
        const itemD = parseFloat(elements.itemD.value);

        if (isNaN(binW) || binW <= 0 || isNaN(binH) || binH <= 0 || isNaN(binD) || binD <= 0 ||
            isNaN(itemW) || itemW <= 0 || isNaN(itemH) || itemH <= 0 || isNaN(itemD) || itemD <= 0) {
            alert("Vui lòng nhập đầy đủ các thông số kích thước thùng và sản phẩm (lớn hơn 0)!");
            return;
        }

        const payload = {
            bin_dim: [binW, binH, binD],
            item_dim: [itemW, itemH, itemD],
            item_weight_g: parseFloat(elements.itemWeight.value) || 0,
            max_bin_weight_kg: parseFloat(elements.binMaxWeight.value) || 999,
            rotation_mode: elements.rotationMode.value || "3d",
            part_padding: parseFloat(elements.partPadding.value) || 0,
            bin_liner: parseFloat(elements.binLiner.value) || 0,
            remove_corners: elements.chkRemoveCorners ? elements.chkRemoveCorners.checked : false
        };

        // Show loading spinner and disable button
        elements.btnRunPacking.disabled = true;
        elements.btnRunPacking.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tính toán...';
        if (elements.loadingSpinnerPacking) {
            elements.loadingSpinnerPacking.classList.remove('hidden');
        }

        try {
            const response = await fetch('/api/bin-packing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            AppState.currentPackingOptions = data.options;
            if (data.options.length > 0) {
                populatePackingOptionDropdown(data.options);
                selectPackingOption(data.options[0]);
                elements.btnExportPackingExcel.disabled = false;
            } else {
                alert("Kích thước chi tiết sản phẩm lớn hơn kích thước thùng carton hoặc không vừa!");
            }
        } catch (err) {
            alert("Lỗi tính toán xếp thùng: " + err.message);
        } finally {
            elements.btnRunPacking.disabled = false;
            elements.btnRunPacking.innerHTML = '<i class="fa-solid fa-cubes"></i> TÍNH TOÁN PHƯƠNG ÁN XẾP THÙNG';
            if (elements.loadingSpinnerPacking) {
                elements.loadingSpinnerPacking.classList.add('hidden');
            }
        }
    }

    function populatePackingOptionDropdown(options) {
        elements.packingOptionDropdown.innerHTML = options.map((opt, i) =>
            `<option value="${i}">${opt.name} - ${opt.qty} chi tiết (${opt.efficiency_pct.toFixed(1)}%)</option>`
        ).join('');
        elements.optionSelectBar.classList.remove('hidden');
    }

    function selectPackingOption(option) {
        AppState.selectedPackingOption = option;

        // Update Summary Badges first
        elements.packQty.textContent = option.qty;
        elements.packEfficiency.textContent = `${option.efficiency_pct.toFixed(1)}%`;
        elements.packGridInfo.textContent = option.grid ? `Lưới: ${option.grid[0]}x${option.grid[1]} | ${option.grid[2]} cao` : 'Hỗn hợp hướng';
        elements.packTotalWeight.textContent = `${option.total_weight_kg.toFixed(2)} kg`;
        elements.packWeightLimit.textContent = `Hạn mức: ${elements.binMaxWeight.value} kg`;
        elements.packingSummary.classList.remove('hidden');

        // Render 3D/2D Visualizer
        try {
            if (window.BinVisualizer3D) {
                window.BinVisualizer3D.renderBin(option);
            }
        } catch (err) {
            console.warn("⚠️ Không thể render 3D canvas visualizer:", err.message);
        }
    }

    async function exportPackingExcel() {
        if (!AppState.selectedPackingOption) return;
        try {
            const opt = AppState.selectedPackingOption;
            
            // Capture 3D WebGL render canvas
            const threeCanvas = document.querySelector('#three-canvas-container canvas');
            const img3d = (threeCanvas && typeof THREE !== 'undefined') ? threeCanvas.toDataURL('image/png') : null;

            // Capture 2D projections canvases
            const canvasTop = document.getElementById('canvas-proj-top');
            const imgTop = canvasTop ? canvasTop.toDataURL('image/png') : null;

            const canvasFront = document.getElementById('canvas-proj-front');
            const imgFront = canvasFront ? canvasFront.toDataURL('image/png') : null;

            const canvasSide = document.getElementById('canvas-proj-side');
            const imgSide = canvasSide ? canvasSide.toDataURL('image/png') : null;

            const packingResult = {
                option_name: opt.name,
                bin_w: elements.binW.value,
                bin_h: elements.binH.value,
                bin_d: elements.binD.value,
                max_weight_kg: elements.binMaxWeight.value,
                item_w: elements.itemW.value,
                item_h: elements.itemH.value,
                item_d: elements.itemD.value,
                item_weight_g: elements.itemWeight.value,
                total_qty: opt.qty,
                efficiency_pct: opt.efficiency_pct,
                total_weight_g: opt.total_weight_g,
                items: opt.items,
                image_3d: img3d,
                image_top: imgTop,
                image_front: imgFront,
                image_side: imgSide
            };

            const response = await fetch('/api/export-packing-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packing_result: packingResult })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bao_Cao_Xep_Thung_3D_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert("Lỗi xuất file Excel xếp thùng: " + err.message);
        }
    }

    // 8. Materials Management Events & Table
    function initMaterialsTabEvents() {
        // Unlock button event
        elements.btnUnlockMaterials.addEventListener('click', attemptUnlock);

        // Enter key press in password input
        elements.materialPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                attemptUnlock();
            }
        });

        // Lock button event
        elements.btnLockMaterials.addEventListener('click', () => {
            elements.materialsContent.classList.add('hidden');
            elements.materialsLockScreen.classList.remove('hidden');
            elements.materialPasswordInput.value = "";
            elements.unlockErrorMsg.classList.add('hidden');
        });

        function attemptUnlock() {
            const password = elements.materialPasswordInput.value;
            if (password === 'admin123') {
                elements.materialsLockScreen.classList.add('hidden');
                elements.materialsContent.classList.remove('hidden');
                elements.unlockErrorMsg.classList.add('hidden');
            } else {
                elements.unlockErrorMsg.classList.remove('hidden');
            }
        }

        elements.materialSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = AppState.materials.filter(m =>
                m.name.toLowerCase().includes(query) ||
                m.category.toLowerCase().includes(query) ||
                (m.description && m.description.toLowerCase().includes(query))
            );
            renderMaterialsTable(filtered);
        });

        elements.btnOpenAddMaterial.addEventListener('click', () => {
            elements.modalTitle.textContent = "Thêm Vật Liệu Mới";
            elements.matInputName.value = "";
            elements.matInputDensity.value = "";
            elements.matInputCategory.value = "Plastics";
            elements.matInputDesc.value = "";
            elements.modalMaterial.classList.remove('hidden');
        });

        elements.btnCloseModal.addEventListener('click', closeModal);
        elements.btnCancelMaterial.addEventListener('click', closeModal);
        elements.btnSaveMaterial.addEventListener('click', saveMaterial);
    }

    function closeModal() {
        elements.modalMaterial.classList.add('hidden');
    }

    async function saveMaterial() {
        const name = elements.matInputName.value.trim();
        const density = parseFloat(elements.matInputDensity.value);
        const category = elements.matInputCategory.value;
        const description = elements.matInputDesc.value.trim();

        if (!name || isNaN(density) || density <= 0) {
            alert("Vui lòng nhập tên vật liệu và tỉ trọng (density) hợp lệ!");
            return;
        }

        try {
            const res = await fetch('/api/materials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, density, category, description })
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message);
                closeModal();
                fetchMaterials();
            } else {
                alert("Lỗi: " + data.error);
            }
        } catch (err) {
            alert("Lỗi lưu vật liệu: " + err.message);
        }
    }

    function renderMaterialsTable(materials) {
        if (materials.length === 0) {
            elements.materialsTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Không tìm thấy vật liệu nào.</td></tr>`;
            return;
        }

        elements.materialsTbody.innerHTML = materials.map((m, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${m.name}</strong></td>
                <td><strong class="text-accent">${m.density.toFixed(3)}</strong> g/cm³</td>
                <td><span class="badge">${m.category}</span></td>
                <td class="text-muted">${m.description || '-'}</td>
                <td>
                    <button class="btn-text text-danger btn-delete-mat" data-name="${m.name}" title="Xóa vật liệu">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach delete events
        document.querySelectorAll('.btn-delete-mat').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                if (confirm(`Bạn có chắc chắn muốn xóa vật liệu '${name}' khỏi CSDL?`)) {
                    try {
                        const res = await fetch(`/api/materials/${encodeURIComponent(name)}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            fetchMaterials();
                        } else {
                            alert("Lỗi xóa: " + data.error);
                        }
                    } catch (err) {
                        alert("Lỗi kết nối xóa vật liệu.");
                    }
                }
            });
        });
    }
});
