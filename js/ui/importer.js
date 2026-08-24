import { t } from '../i18n/i18n.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { mapRecords, analyzeBatch } from '../io/batchImport.js';

let rawRecords = [];
let lastRows = [];

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function showError(msg) {
    const el = document.getElementById('import-error');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

function showProgress(text) {
    const el = document.getElementById('import-progress');
    if (!text) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.style.display = 'block';
    el.textContent = text;
}

async function readFiles(fileList) {
    const records = [];
    for (const file of fileList) {
        try {
            const parsed = JSON.parse(await file.text());
            if (Array.isArray(parsed)) records.push(...parsed);
        } catch {
            showError(t('import.error.file').replace('{file}', file.name));
        }
    }
    return records;
}

function readPaste() {
    const raw = document.getElementById('import-paste').value.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function verdictClass(verdict) {
    if (verdict === 'INVERTIR') return 'badge--invest';
    if (verdict === 'CONSIDERAR') return 'badge--consider';
    return 'badge--discard';
}

// El motor emite categorías en español (INVERTIR/CONSIDERAR/DESCARTAR)
// pero las keys i18n usan el nombre en inglés.
function verdictKey(verdict) {
    if (verdict === 'INVERTIR') return 'invest';
    if (verdict === 'CONSIDERAR') return 'consider';
    return 'discard';
}

function renderTable(rows) {
    const head = document.getElementById('import-table-head');
    const body = document.getElementById('import-table-body');

    const cols = [
        'import.col.set',
        'import.col.piece',
        'import.col.level',
        'import.col.cv',
        'import.col.rv',
        'import.col.invest',
        'import.col.consider',
        'import.col.discard',
        'import.col.verdict'
    ];

    head.innerHTML =
        '<tr>' +
        cols.map(c => `<th>${escapeHtml(t(c))}</th>`).join('') +
        '</tr>';

    body.innerHTML = rows
        .map(r => {
            const name = escapeHtml((r.setName || r.archivo).slice(0, 34));
            const fourthMark = r.fourthKnown
                ? ` <span class="fourth-known" title="${escapeHtml(t('import.fourth.known'))}">★</span>`
                : '';
            const pieceText = escapeHtml(t(`piece.${r.pieceKey}`));
            const verdictText = escapeHtml(t(`probability.${verdictKey(r.verdict)}`));
            return (
                '<tr>' +
                `<td class="cell-name">${name}${fourthMark}</td>` +
                `<td>${pieceText}</td>` +
                `<td>+${r.level}</td>` +
                `<td>${r.cvAvg.toFixed(1)}</td>` +
                `<td>${r.rvAvg.toFixed(1)}%</td>` +
                `<td>${r.investRate}%</td>` +
                `<td>${r.considerRate}%</td>` +
                `<td>${r.discardRate}%</td>` +
                `<td><span class="verdict-badge ${verdictClass(r.verdict)}">${verdictText}</span></td>` +
                '</tr>'
            );
        })
        .join('');
}

function renderSkipped(skipped) {
    const details = document.getElementById('import-skipped-details');
    const list = document.getElementById('import-skipped-list');

    if (!skipped.length) {
        details.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    details.style.display = 'block';
    list.innerHTML = skipped
        .map(s => {
            const reasonText = t(`import.skip.${s.reason}`);
            const detail = s.detail ? ` (${escapeHtml(String(s.detail))})` : '';
            return `<li>${escapeHtml(s.archivo)} — ${reasonText}${detail}</li>`;
        })
        .join('');
}

function toCsv(rows) {
    const headers = [
        'archivo', 'set', 'pieza', 'nivel', 'cuarto_conocido',
        'cv_promedio', 'rv_promedio', 'invertir_%', 'considerar_%', 'descartar_%', 'veredicto'
    ];
    const lines = [headers.join(',')];

    for (const r of rows) {
        const cells = [
            r.archivo,
            r.setName,
            t(`piece.${r.pieceKey}`),
            r.level,
            r.fourthKnown ? 'si' : 'no',
            r.cvAvg,
            r.rvAvg,
            r.investRate,
            r.considerRate,
            r.discardRate,
            r.verdict
        ];
        lines.push(cells.map(c => `"${String(c).replaceAll('"', '""')}"`).join(','));
    }

    return '\ufeff' + lines.join('\n');
}

function downloadCsv(rows) {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gacha-gear-lote.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function setBusy(busy) {
    document.getElementById('import-analyze-btn').disabled = busy;
    if (!busy) showProgress('');
}

async function analyze() {
    showError('');

    let records = rawRecords;
    if (!records.length) {
        const pasted = readPaste();
        if (pasted === null) {
            showError(t('import.error.parse'));
            return;
        }
        records = pasted;
    }

    if (!records.length) {
        showError(t('import.error.empty'));
        return;
    }

    setBusy(true);

    try {
        const { mapped, skipped } = mapRecords(records);

        renderSkipped(skipped);
        document.getElementById('import-results').style.display = 'none';

        if (!mapped.length) {
            showError(t('import.error.allSkipped').replace('{n}', String(skipped.length)));
            return;
        }

        const rows = await analyzeBatch(mapped, new BuildGoal([]), {
            iterations: 10000,
            chunkSize: 10,
            onProgress: (done, total) =>
                showProgress(t('import.analyzing').replace('{done}', String(done)).replace('{total}', String(total)))
        });

        lastRows = rows;

        document.getElementById('import-summary').textContent = t('import.summary')
            .replace('{analyzed}', String(rows.length))
            .replace('{skipped}', String(skipped.length));

        renderTable(rows);
        document.getElementById('import-results').style.display = 'block';
    } finally {
        setBusy(false);
    }
}

window.resetImportAndGoLanding = function () {
    rawRecords = [];
    lastRows = [];
    document.getElementById('import-file').value = '';
    document.getElementById('import-paste').value = '';
    document.getElementById('import-results').style.display = 'none';
    showProgress('');
    showError('');
    window.showScreen('screen-landing');
};

export function initImport() {
    document.getElementById('import-file').addEventListener('change', async e => {
        showError('');
        const records = await readFiles(e.target.files ?? []);
        rawRecords = records;
    });

    document.getElementById('import-analyze-btn').addEventListener('click', () => {
        analyze().catch(err => {
            setBusy(false);
            showError(err?.message || String(err));
        });
    });

    document.getElementById('import-export-btn').addEventListener('click', () => downloadCsv(lastRows));
}

export function refreshImportTexts() {
    document.getElementById('import-paste').placeholder = t('import.paste.placeholder');
    if (!lastRows.length) return;
    renderTable(lastRows);
}
