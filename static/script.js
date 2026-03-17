// CONFIG
const API_URL = "http://127.0.0.1:7860";

// ── ELEMENTS ──────────────────────────────────────────────────────────────────
const fileInput      = document.getElementById('fileInput');
const uploadBox      = document.getElementById('uploadBox');
const selectedFile   = document.getElementById('selectedFile');
const fileNameEl     = document.getElementById('fileName');
const fileSizeEl     = document.getElementById('fileSize');
const analyzeBtn     = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const resultSection  = document.getElementById('resultSection');
const verdictBox     = document.getElementById('verdictBox');
const verdictIcon    = document.getElementById('verdictIcon');
const verdictText    = document.getElementById('verdictText');
const verdictSub     = document.getElementById('verdictSub');
const confidenceBadge = document.getElementById('confidenceBadge');
const scoreBar       = document.getElementById('scoreBar');
const framesCount    = document.getElementById('framesCount');
const fileTypeVal    = document.getElementById('fileTypeVal');
const fileTypeTag    = document.getElementById('fileTypeTag');
const modelUsed      = document.getElementById('modelUsed');
const dummyWarning   = document.getElementById('dummyWarning');
const statusPill     = document.getElementById('statusPill');
const statusText     = document.getElementById('statusText');
const statusDot      = document.getElementById('statusDot');
const gaugeFill      = document.getElementById('gaugeFill');
const gaugeText      = document.getElementById('gaugeText');
const barPctLabel    = document.getElementById('barPctLabel');

let currentFile = null;

// ── VERDICT CONFIG ────────────────────────────────────────────────────────────
const verdictConfig = {
    fake: {
        icon: '🔴',
        label: 'Likely Fake',
        sub: 'High probability of synthetic generation detected',
        cls: 'fake'
    },
    real: {
        icon: '🟢',
        label: 'Likely Authentic',
        sub: 'No significant signs of synthetic manipulation found',
        cls: 'real'
    },
    uncertain: {
        icon: '🟡',
        label: 'Inconclusive',
        sub: 'Insufficient confidence to make a clear determination',
        cls: 'uncertain'
    }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileType(filename) {
    const name = filename.toLowerCase();
    if (['.mp4', '.mov', '.avi'].some(e => name.endsWith(e))) return 'video';
    if (['.mp3', '.wav'].some(e => name.endsWith(e))) return 'audio';
    return null;
}

// ── GAUGE ─────────────────────────────────────────────────────────────────────
function animateGauge(pct, cls) {
    if (!gaugeFill) return;
    const total = 228;
    const offset = total - (pct / 100) * total;

    // Color stops
    const colorMap = {
        fake:      ['#8a1a2f', '#ff3f5e'],
        real:      ['#006644', '#00d48a'],
        uncertain: ['#885500', '#ffb300']
    };

    const [c1, c2] = colorMap[cls] || colorMap.uncertain;
    const gs1 = document.getElementById('gs1');
    const gs2 = document.getElementById('gs2');
    if (gs1) gs1.setAttribute('stop-color', c1);
    if (gs2) gs2.setAttribute('stop-color', c2);

    gaugeFill.style.strokeDashoffset = total; // reset
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            gaugeFill.style.strokeDashoffset = offset;
        });
    });

    if (gaugeText) {
        gaugeText.textContent = pct.toFixed(1) + '%';
        gaugeText.setAttribute('fill', c2);
    }
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(API_URL + '/health');
        const health = await res.json();
        if (health.status === 'ok') {
            statusText.textContent = 'Real AI Model Active';
            statusDot.style.color = '#00d48a';
            statusPill.style.background = 'rgba(0,212,138,0.07)';
            statusPill.style.borderColor = 'rgba(0,212,138,0.18)';
            statusPill.style.color = '#00d48a';
        }
    } catch (e) {
        console.log("Health check failed (normal if backend not running)");
    }

    // Events
    if (fileInput) fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    if (uploadBox) {
        uploadBox.addEventListener('dragover', e => { e.preventDefault(); uploadBox.classList.add('drag-over'); });
        uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('drag-over'));
        uploadBox.addEventListener('drop', e => {
            e.preventDefault(); uploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!currentFile) return;
            const type = getFileType(currentFile.name);
            if (!type) { alert('Unsupported file type. Please use .mp4, .mov, .avi, .mp3, or .wav'); return; }

            const endpoint = `/analyze/${type}`;
            analyzeBtn.disabled = true;
            loadingSection && loadingSection.classList.remove('hidden');
            resultSection  && resultSection.classList.add('hidden');

            const formData = new FormData();
            formData.append('file', currentFile);

            try {
                const fullUrl = API_URL ? API_URL + endpoint : endpoint;
                const response = await fetch(fullUrl, { method: 'POST', body: formData });
                if (!response.ok) {
                    let errMsg = 'Server error';
                    try { const err = await response.json(); errMsg = err.error || errMsg; } catch {}
                    throw new Error(errMsg);
                }
                const data = await response.json();
                showResult(data, type);
            } catch (error) {
                alert('Error: ' + error.message);
                console.error(error);
            } finally {
                loadingSection && loadingSection.classList.add('hidden');
                analyzeBtn.disabled = false;
            }
        });
    }
});

// ── FILE SELECTION ────────────────────────────────────────────────────────────
function handleFile(file) {
    currentFile = file;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
    if (selectedFile) selectedFile.classList.remove('hidden');
    if (resultSection) resultSection.classList.add('hidden');
}

// ── SHOW RESULT ───────────────────────────────────────────────────────────────
function showResult(data, fileType) {
    const fakeScore = data.fake_score || 0;
    const pct = parseFloat((data.confidence_percent || fakeScore * 100 || 0).toFixed(1));
    const summary = data.summary || 'Analysis complete';
    const frames  = data.frames_analyzed ?? 'N/A';

    let verdictKey = 'uncertain';
    if (pct > 65) verdictKey = 'fake';
    else if (pct < 35) verdictKey = 'real';

    const cfg = verdictConfig[verdictKey];
    const isRealMode = data.mode === "real_model" || data.status === "success";

    if (dummyWarning) dummyWarning.style.display = isRealMode ? 'none' : 'block';

    verdictBox.className = 'verdict ' + cfg.cls;
    verdictIcon.textContent = cfg.icon;
    verdictText.textContent = cfg.label;
    verdictSub.textContent  = summary;
    confidenceBadge.textContent = pct.toFixed(1);

    // Bar
    scoreBar.className = 'bar-fill ' + cfg.cls;
    if (barPctLabel) barPctLabel.textContent = pct.toFixed(1) + '%';
    setTimeout(() => { scoreBar.style.width = pct + '%'; }, 100);

    // Gauge
    animateGauge(pct, cfg.cls);

    framesCount.textContent = frames;
    fileTypeVal.textContent = fileType === 'video' ? 'Video' : 'Audio';
    fileTypeTag.textContent = fileType.toUpperCase();
    modelUsed.textContent   = data.model_used || 'Real Model';

    resultSection.classList.remove('hidden');
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetUI() {
    currentFile = null;
    if (fileInput)   fileInput.value = '';
    if (scoreBar)    scoreBar.style.width = '0%';
    if (gaugeFill)   gaugeFill.style.strokeDashoffset = '228';
    if (gaugeText)   { gaugeText.textContent = '—'; gaugeText.setAttribute('fill', '#ededf5'); }
    if (barPctLabel) barPctLabel.textContent = '—';
    selectedFile   && selectedFile.classList.add('hidden');
    resultSection  && resultSection.classList.add('hidden');
    loadingSection && loadingSection.classList.add('hidden');
    if (analyzeBtn) analyzeBtn.disabled = false;
}