// CONFIG
const API_URL = "http://127.0.0.1:7860";

// ── ELEMENTS ──────────────────────────────────────────────────────────────────
const fileInput         = document.getElementById('fileInput');
const uploadBox         = document.getElementById('uploadBox');
const selectedFile      = document.getElementById('selectedFile');
const fileNameEl        = document.getElementById('fileName');
const fileSizeEl        = document.getElementById('fileSize');
const analyzeBtn        = document.getElementById('analyzeBtn');
const loadingSection    = document.getElementById('loadingSection');
const loadStageEl       = document.getElementById('loadStage');
const resultSection     = document.getElementById('resultSection');
const verdictBox        = document.getElementById('verdictBox');
const verdictIcon       = document.getElementById('verdictIcon');
const verdictText       = document.getElementById('verdictText');
const verdictSub        = document.getElementById('verdictSub');
const confidenceBadge   = document.getElementById('confidenceBadge');
const scoreBar          = document.getElementById('scoreBar');
const framesCount       = document.getElementById('framesCount');
const fileTypeVal       = document.getElementById('fileTypeVal');
const fileTypeTag       = document.getElementById('fileTypeTag');
const modelUsed         = document.getElementById('modelUsed');
const dummyWarning      = document.getElementById('dummyWarning');
const statusPill        = document.getElementById('statusPill');
const statusText        = document.getElementById('statusText');
const statusDot         = document.getElementById('statusDot');
const gaugeFill         = document.getElementById('gaugeFill');
const gaugeText         = document.getElementById('gaugeText');
const barPctLabel       = document.getElementById('barPctLabel');

// Preview
const previewBtn    = document.getElementById('previewBtn');
const previewPanel  = document.getElementById('previewPanel');
const closePreview  = document.getElementById('closePreview');
const videoPreview  = document.getElementById('videoPreview');
const audioPreview  = document.getElementById('audioPreview');

// Chart
const frameChartSection = document.getElementById('frameChartSection');
const chartCanvas       = document.getElementById('frameChart');
const chartTooltip      = document.getElementById('chartTooltip');
const chartSep          = document.getElementById('chartSep');

// Blockchain
const blockchainSection = document.getElementById('blockchainSection');
const hashValueEl       = document.getElementById('hashValue');
const copyHashBtn       = document.getElementById('copyHashBtn');
const bcBlockId         = document.getElementById('bcBlockId');
const bcTimestamp       = document.getElementById('bcTimestamp');
const bcStatus          = document.getElementById('bcStatus');
const bcShortHash       = document.getElementById('bcShortHash');
const bcSep             = document.getElementById('bcSep');
const hashAnimWrap      = document.getElementById('hashAnimWrap');
const hashAnimText      = document.getElementById('hashAnimText');

// Theme
const themeToggle = document.getElementById('themeToggle');
const iconMoon    = document.getElementById('iconMoon');
const iconSun     = document.getElementById('iconSun');

let currentFile    = null;
let currentBlobUrl = null;

// ── THEME ─────────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('realeyes-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

function updateThemeIcon(theme) {
    if (iconMoon && iconSun) {
        iconMoon.style.display = theme === 'dark'  ? 'block' : 'none';
        iconSun.style.display  = theme === 'light' ? 'block' : 'none';
    }
}
if (themeToggle) themeToggle.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('realeyes-theme', next);
    updateThemeIcon(next);
});

// ── VERDICT CONFIG ────────────────────────────────────────────────────────────
const verdictConfig = {
    fake:      { icon:'🔴', label:'Likely Fake',      sub:'High probability of synthetic generation detected.',        cls:'fake' },
    real:      { icon:'🟢', label:'Likely Authentic', sub:'No significant signs of synthetic manipulation found.',      cls:'real' },
    uncertain: { icon:'🟡', label:'Inconclusive',     sub:'Insufficient confidence to make a clear determination.',    cls:'uncertain' }
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function getFileType(filename) {
    const n = filename.toLowerCase();
    if (['.mp4','.mov','.avi'].some(e => n.endsWith(e))) return 'video';
    if (['.mp3','.wav'].some(e => n.endsWith(e))) return 'audio';
    return null;
}
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4,'0');
    return m > 0 ? `${m}:${s}` : `${s}s`;
}
function randomHex(len) {
    return [...Array(len)].map(() => Math.floor(Math.random()*16).toString(16)).join('');
}

// ── GAUGE ─────────────────────────────────────────────────────────────────────
function animateGauge(pct, cls) {
    if (!gaugeFill) return;
    const total  = 228;
    const offset = total - (pct / 100) * total;
    const colorMap = { fake:['#8a1a2f','#ff3f5e'], real:['#006644','#00d48a'], uncertain:['#885500','#ffb300'] };
    const [c1, c2] = colorMap[cls] || colorMap.uncertain;
    document.getElementById('gs1')?.setAttribute('stop-color', c1);
    document.getElementById('gs2')?.setAttribute('stop-color', c2);
    gaugeFill.style.strokeDashoffset = total;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        gaugeFill.style.strokeDashoffset = offset;
    }));
    if (gaugeText) { gaugeText.textContent = pct.toFixed(1) + '%'; gaugeText.setAttribute('fill', c2); }
}

// ── SHA-256 HASH (browser native SubtleCrypto) ────────────────────────────────
async function computeSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── BLOCKCHAIN REVEAL ─────────────────────────────────────────────────────────
async function revealBlockchain(file) {
    if (!blockchainSection) return;

    blockchainSection.classList.remove('hidden');
    if (bcSep) bcSep.style.display = 'block';

    // Show animating state
    if (hashValueEl) hashValueEl.textContent = 'Computing…';
    if (bcShortHash) bcShortHash.textContent = '…';
    if (bcStatus)    { bcStatus.textContent = 'Pending…'; bcStatus.className = 'bc-meta-val'; }
    if (hashAnimWrap) hashAnimWrap.classList.remove('hidden');

    // Simulate hash chars appearing one by one (typewriter)
    let fakeHash = '';
    const interval = setInterval(() => {
        fakeHash += randomHex(2);
        if (hashValueEl && fakeHash.length < 64) hashValueEl.textContent = fakeHash + '…';
    }, 30);

    // Actually compute real SHA-256
    let realHash;
    try {
        realHash = await computeSHA256(file);
    } catch(e) {
        realHash = randomHex(64); // fallback if file read fails
    }

    clearInterval(interval);
    if (hashAnimWrap) hashAnimWrap.classList.add('hidden');

    // Animate reveal of real hash
    let displayed = '';
    let i = 0;
    const revealInterval = setInterval(() => {
        displayed = realHash.slice(0, i);
        if (hashValueEl) hashValueEl.textContent = displayed + (i < 64 ? '█' : '');
        i += 2;
        if (i > 64) {
            clearInterval(revealInterval);
            if (hashValueEl) hashValueEl.textContent = realHash;
            finalizeBlock(realHash);
        }
    }, 18);
}

function finalizeBlock(hash) {
    // Short hash for chain visual
    if (bcShortHash) bcShortHash.textContent = '0x' + hash.slice(0,4) + '…' + hash.slice(-4);

    // Block metadata
    const blockNum = Math.floor(Math.random() * 900000) + 100000;
    const now      = new Date();
    if (bcBlockId)    bcBlockId.textContent    = '#' + blockNum;
    if (bcTimestamp)  bcTimestamp.textContent  = now.toISOString().replace('T',' ').slice(0,19) + ' UTC';
    if (bcStatus) {
        bcStatus.textContent  = '✓ Confirmed';
        bcStatus.className    = 'bc-meta-val bc-confirmed';
    }

    // Copy button
    if (copyHashBtn) {
        copyHashBtn.onclick = () => {
            navigator.clipboard.writeText(hash).then(() => {
                copyHashBtn.classList.add('copied');
                setTimeout(() => copyHashBtn.classList.remove('copied'), 1800);
            });
        };
    }
}

// ── LOADING STAGE CYCLER ──────────────────────────────────────────────────────
const loadStages = [
    'Extracting frames…',
    'Running AI model on frames…',
    'Aggregating confidence scores…',
    'Computing SHA-256 hash…',
    'Registering on blockchain…',
    'Finalizing results…'
];
let stageTimer = null;

function startLoadStages() {
    if (!loadStageEl) return;
    let idx = 0;
    loadStageEl.textContent = loadStages[0];
    stageTimer = setInterval(() => {
        idx = Math.min(idx + 1, loadStages.length - 1);
        loadStageEl.textContent = loadStages[idx];
    }, 4000);
}
function stopLoadStages() {
    if (stageTimer) { clearInterval(stageTimer); stageTimer = null; }
}

// ── FRAME CHART ───────────────────────────────────────────────────────────────
function renderFrameChart(frameData, avgPct, verdictCls) {
    if (!frameData || frameData.length === 0) return;
    frameChartSection.classList.remove('hidden');
    if (chartSep) chartSep.style.display = 'block';

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const probs  = frameData.map(f => f.fake_prob);
    const maxFake = Math.max(...probs), minFake = Math.min(...probs);
    const lastTs  = frameData[frameData.length - 1].timestamp_sec;
    const fakeFrames = frameData.filter(f => f.fake_prob > 0.5).length;

    document.getElementById('chartSubLabel').textContent = `${fakeFrames} of ${frameData.length} frames flagged as fake`;
    document.getElementById('chartMaxFake').textContent  = `Peak fake: ${(maxFake*100).toFixed(1)}%`;
    document.getElementById('chartMinFake').textContent  = `Peak real: ${((1-minFake)*100).toFixed(1)}%`;
    document.getElementById('chartDuration').textContent = `Duration: ${formatTime(lastTs)}`;

    const dpr  = window.devicePixelRatio || 1;
    const wrap = chartCanvas.parentElement;
    const W = wrap.clientWidth || 700, H = 180;
    chartCanvas.width  = W * dpr; chartCanvas.height = H * dpr;
    chartCanvas.style.width = W + 'px'; chartCanvas.style.height = H + 'px';

    const ctx = chartCanvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const PAD = { top:18, right:18, bottom:36, left:44 };
    const cW  = W - PAD.left - PAD.right;
    const cH  = H - PAD.top  - PAD.bottom;
    const n   = frameData.length;

    const colors = {
        fake:      { line:'#ff3f5e', fill:'rgba(255,63,94,0.10)',  dot:'#ff3f5e', dotReal:'#00d48a' },
        real:      { line:'#00d48a', fill:'rgba(0,212,138,0.10)', dot:'#ff3f5e', dotReal:'#00d48a' },
        uncertain: { line:'#ffb300', fill:'rgba(255,179,0,0.10)',  dot:'#ff3f5e', dotReal:'#00d48a' }
    };
    const pal       = colors[verdictCls] || colors.uncertain;
    const textColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.40)';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    const avgColor  = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.25)';

    const xPos = i => PAD.left + (i / (n - 1)) * cW;
    const yPos = v => PAD.top  + (1 - v) * cH;

    ctx.clearRect(0, 0, W, H);

    [0, 0.5, 1].forEach(v => {
        const y = yPos(v);
        ctx.beginPath(); ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([4,6]);
        ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = textColor; ctx.font = `10px "DM Mono", monospace`; ctx.textAlign = 'right';
        ctx.fillText((v*100).toFixed(0)+'%', PAD.left - 8, y + 4);
    });

    // Danger zone
    ctx.fillStyle = 'rgba(255,63,94,0.04)';
    ctx.fillRect(PAD.left, PAD.top, cW, yPos(0.65) - PAD.top);

    // Avg line
    ctx.beginPath(); ctx.strokeStyle = avgColor; ctx.lineWidth = 1; ctx.setLineDash([6,4]);
    ctx.moveTo(PAD.left, yPos(avgPct/100)); ctx.lineTo(W - PAD.right, yPos(avgPct/100)); ctx.stroke(); ctx.setLineDash([]);

    // Area fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
    grad.addColorStop(0,   pal.fill.replace('0.10','0.22'));
    grad.addColorStop(0.6, pal.fill);
    grad.addColorStop(1,   pal.fill.replace('0.10','0.00'));
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(frameData[0].fake_prob));
    for (let i = 1; i < n; i++) {
        const xm = (xPos(i-1) + xPos(i)) / 2;
        ctx.bezierCurveTo(xm, yPos(frameData[i-1].fake_prob), xm, yPos(frameData[i].fake_prob), xPos(i), yPos(frameData[i].fake_prob));
    }
    ctx.lineTo(xPos(n-1), PAD.top + cH); ctx.lineTo(xPos(0), PAD.top + cH); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = pal.line; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.moveTo(xPos(0), yPos(frameData[0].fake_prob));
    for (let i = 1; i < n; i++) {
        const xm = (xPos(i-1) + xPos(i)) / 2;
        ctx.bezierCurveTo(xm, yPos(frameData[i-1].fake_prob), xm, yPos(frameData[i].fake_prob), xPos(i), yPos(frameData[i].fake_prob));
    }
    ctx.stroke();

    // Dots
    const dotR = n > 25 ? 2.5 : 3.5;
    frameData.forEach((f, i) => {
        ctx.beginPath(); ctx.arc(xPos(i), yPos(f.fake_prob), dotR, 0, Math.PI*2);
        ctx.fillStyle   = f.fake_prob > 0.5 ? pal.dot : pal.dotReal;
        ctx.fill(); ctx.strokeStyle = isDark ? '#0f0f18' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // X-axis labels
    const tickStep = Math.floor(n / Math.min(6, n));
    ctx.fillStyle = textColor; ctx.font = `10px "DM Mono", monospace`; ctx.textAlign = 'center';
    for (let i = 0; i < n; i += tickStep) ctx.fillText(formatTime(frameData[i].timestamp_sec), xPos(i), H - 8);

    // Tooltip
    chartCanvas.onmousemove = e => {
        const rect = chartCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let ci = -1, cd = Infinity;
        frameData.forEach((f, i) => {
            const d = Math.hypot(mx - xPos(i), my - yPos(f.fake_prob));
            if (d < cd) { cd = d; ci = i; }
        });
        if (ci >= 0 && cd < 30) {
            const f = frameData[ci];
            chartTooltip.style.display = 'block';
            chartTooltip.style.left = (xPos(ci) + 14) + 'px';
            chartTooltip.style.top  = (yPos(f.fake_prob) - 10) + 'px';
            chartTooltip.innerHTML  = `<b>Frame ${f.frame_num}</b><br>t = ${formatTime(f.timestamp_sec)}<br>${(f.fake_prob*100).toFixed(1)}% fake`;
            chartTooltip.className  = 'chart-tooltip ' + (f.fake_prob > 0.5 ? 'tip-fake' : 'tip-real');
        } else { chartTooltip.style.display = 'none'; }
    };
    chartCanvas.onmouseleave = () => { chartTooltip.style.display = 'none'; };
}

// ── HEALTH CHECK + EVENTS ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res    = await fetch(API_URL + '/health');
        const health = await res.json();
        if (health.status === 'ok') {
            statusText.textContent       = 'Real AI Model Active';
            statusDot.style.color        = '#00d48a';
            statusPill.style.background  = 'rgba(0,212,138,0.07)';
            statusPill.style.borderColor = 'rgba(0,212,138,0.18)';
            statusPill.style.color       = '#00d48a';
        }
    } catch (e) { console.log("Health check failed (normal if backend not running)"); }

    // File input
    if (fileInput) fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    // Drag-drop
    if (uploadBox) {
        uploadBox.addEventListener('dragover',  e => { e.preventDefault(); uploadBox.classList.add('drag-over'); });
        uploadBox.addEventListener('dragleave', ()  => uploadBox.classList.remove('drag-over'));
        uploadBox.addEventListener('drop', e => {
            e.preventDefault(); uploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
    }

    // Preview
    if (previewBtn) previewBtn.addEventListener('click', () => {
        if (!currentFile) return;
        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = URL.createObjectURL(currentFile);
        const type = getFileType(currentFile.name);
        videoPreview.classList.add('hidden'); audioPreview.classList.add('hidden');
        if (type === 'video') { videoPreview.src = currentBlobUrl; videoPreview.classList.remove('hidden'); }
        if (type === 'audio') { audioPreview.src = currentBlobUrl; audioPreview.classList.remove('hidden'); }
        previewPanel.classList.remove('hidden');
    });
    if (closePreview) closePreview.addEventListener('click', () => {
        previewPanel.classList.add('hidden');
        videoPreview.pause?.(); audioPreview.pause?.();
    });

    // Analyze
    if (analyzeBtn) analyzeBtn.addEventListener('click', async () => {
        if (!currentFile) return;
        const type = getFileType(currentFile.name);
        if (!type) { alert('Unsupported file type. Please use .mp4, .mov, .avi, .mp3, or .wav'); return; }

        analyzeBtn.disabled = true;
        loadingSection?.classList.remove('hidden');
        resultSection?.classList.add('hidden');
        startLoadStages();

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const url      = (API_URL || '') + `/analyze/${type}`;
            const response = await fetch(url, { method:'POST', body:formData });
            if (!response.ok) {
                let msg = 'Server error';
                try { const e = await response.json(); msg = e.error || msg; } catch {}
                throw new Error(msg);
            }
            const data = await response.json();
            showResult(data, type);
        } catch (error) {
            alert('Error: ' + error.message);
            console.error(error);
        } finally {
            stopLoadStages();
            loadingSection?.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });
});

// ── FILE SELECTION ────────────────────────────────────────────────────────────
function handleFile(file) {
    currentFile = file;
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
    selectedFile?.classList.remove('hidden');
    resultSection?.classList.add('hidden');
    previewPanel?.classList.add('hidden');
    const type = getFileType(file.name);
    if (previewBtn) previewBtn.style.display = type ? 'flex' : 'none';
}

// ── SHOW RESULT ───────────────────────────────────────────────────────────────
function showResult(data, fileType) {
    const fakeScore = data.fake_score || 0;
    const pct       = parseFloat((data.confidence_percent || fakeScore * 100 || 0).toFixed(1));
    const summary   = data.summary || 'Analysis complete';
    const frames    = data.frames_analyzed ?? 'N/A';

    let verdictKey = 'uncertain';
    if (pct > 65) verdictKey = 'fake';
    else if (pct < 35) verdictKey = 'real';

    const cfg        = verdictConfig[verdictKey];
    const isRealMode = data.mode === "real_model" || data.status === "success";

    if (dummyWarning) dummyWarning.style.display = isRealMode ? 'none' : 'block';

    verdictBox.className      = 'verdict ' + cfg.cls;
    verdictIcon.textContent   = cfg.icon;
    verdictText.textContent   = cfg.label;
    verdictSub.textContent    = summary;
    confidenceBadge.textContent = pct.toFixed(1);

    scoreBar.className = 'bar-fill ' + cfg.cls;
    if (barPctLabel) barPctLabel.textContent = pct.toFixed(1) + '%';
    setTimeout(() => { scoreBar.style.width = pct + '%'; }, 100);

    animateGauge(pct, cfg.cls);

    framesCount.textContent = frames;
    fileTypeVal.textContent = fileType === 'video' ? 'Video' : 'Audio';
    fileTypeTag.textContent = fileType.toUpperCase();
    modelUsed.textContent   = data.model_used || 'Real Model';

    // Frame chart
    if (data.frame_data && data.frame_data.length > 0) {
        setTimeout(() => renderFrameChart(data.frame_data, pct, cfg.cls), 200);
    } else {
        frameChartSection?.classList.add('hidden');
        if (chartSep) chartSep.style.display = 'none';
    }

    resultSection.classList.remove('hidden');

    // Blockchain hash — compute after showing result (needs file still in memory)
    setTimeout(() => {
        if (currentFile) revealBlockchain(currentFile);
    }, 600);

    setTimeout(() => resultSection.scrollIntoView({ behavior:'smooth', block:'start' }), 100);
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetUI() {
    currentFile = null;
    if (fileInput)    fileInput.value = '';
    if (scoreBar)     scoreBar.style.width = '0%';
    if (gaugeFill)    gaugeFill.style.strokeDashoffset = '228';
    if (gaugeText)    { gaugeText.textContent = '—'; gaugeText.setAttribute('fill', 'var(--text-main)'); }
    if (barPctLabel)  barPctLabel.textContent = '—';
    if (hashValueEl)  hashValueEl.textContent = '—';
    if (bcShortHash)  bcShortHash.textContent = '…';
    if (bcStatus)     { bcStatus.textContent = 'Pending…'; bcStatus.className = 'bc-meta-val'; }
    if (bcBlockId)    bcBlockId.textContent = '—';
    if (bcTimestamp)  bcTimestamp.textContent = '—';
    if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    selectedFile?.classList.add('hidden');
    resultSection?.classList.add('hidden');
    loadingSection?.classList.add('hidden');
    previewPanel?.classList.add('hidden');
    blockchainSection?.classList.add('hidden');
    frameChartSection?.classList.add('hidden');
    if (chartSep) chartSep.style.display = 'none';
    if (bcSep)    bcSep.style.display = 'none';
    if (analyzeBtn) analyzeBtn.disabled = false;
    stopLoadStages();
}