import { STAT_LABELS } from './form.js';
import { StatType } from '../data/StatType.js';

const VERDICT_CONFIG = {
    'INVERTIR':   { icon: '✅', color: '#5FCB8A', potential: 'Alto' },
    'CONSIDERAR': { icon: '⚖️', color: '#D5D96B', potential: 'Medio' },
    'DESCARTAR':  { icon: '❌', color: '#D96B6B', potential: 'Bajo' },
};

function getStatKey(stat) {
    return Object.keys(StatType).find(k => StatType[k] === stat);
}

export function displayResults(artifact, result) {
    // ─── Veredicto ───────────────────────────────
    const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG['CONSIDERAR'];
    document.getElementById('verdict-icon').textContent  = cfg.icon;
    document.getElementById('verdict-label').textContent = result.verdict;
    document.getElementById('verdict-label').style.color = cfg.color;
    document.getElementById('verdict-potential-text').textContent = cfg.potential;
    document.getElementById('verdict-reason').textContent = result.verdictReason;

    // ─── Detalles técnicos ────────────────────────
    document.getElementById('d-best-cv-sub').textContent  = result.bestCVSub.toFixed(1);
    document.getElementById('d-avg-cv-sub').textContent   = result.avgCVSub.toFixed(1);
    document.getElementById('d-worst-cv-sub').textContent = result.worstCVSub.toFixed(1);
    document.getElementById('d-best-cv').textContent      = result.bestCV.toFixed(1);
    document.getElementById('d-avg-cv').textContent       = result.avgCV.toFixed(1);
    document.getElementById('d-worst-cv').textContent     = result.worstCV.toFixed(1);
    document.getElementById('d-best-rv').textContent      = result.bestRV.toFixed(1) + '%';
    document.getElementById('d-avg-rv').textContent       = result.avgRV.toFixed(1) + '%';
    document.getElementById('d-worst-rv').textContent     = result.worstRV.toFixed(1) + '%';

    // ─── Cards de escenarios ──────────────────────
    renderScenario('best-substats',  artifact, result.bestCase);
    renderScenario('avg-substats',   artifact, result.avgCase);
    renderScenario('worst-substats', artifact, result.worstCase);
}

function renderScenario(containerId, artifact, caseData) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const substat of artifact.substats) {
        const key   = getStatKey(substat.type);
        const label = STAT_LABELS[key] ?? key;
        const value = caseData[key]?.toFixed(1) ?? '-';

        const row = document.createElement('div');
        row.className = 'scenario-substat';
        row.innerHTML = `
            <span class="scenario-substat-name">${label}</span>
            <span class="scenario-substat-value">${value}</span>
        `;
        container.appendChild(row);
    }
}

export function displayFourthSubstat(predictions, goal) {
    const block   = document.getElementById('fourth-substat-block');
    const content = document.getElementById('fourth-substat-content');
    block.style.display = 'block';
    content.innerHTML   = '';

    const chanceGood = predictions
        .filter(p => goal.isDesired(p.stat))
        .reduce((sum, p) => sum + p.probability, 0);

    // Resumen de probabilidad
    const summary = document.createElement('p');
    summary.className = 'fourth-chance';
    const chanceColor = chanceGood >= 25 ? '#5FCB8A' : chanceGood >= 10 ? '#D5D96B' : '#D96B6B';
    summary.innerHTML = `Probabilidad de obtener algo útil: 
        <strong style="color:${chanceColor}">${chanceGood.toFixed(1)}%</strong>`;
    content.appendChild(summary);

    // Barras
    for (const p of predictions) {
        const key    = getStatKey(p.stat);
        const label  = STAT_LABELS[key] ?? key;
        const isGood = goal.isDesired(p.stat);
        const isMid  = p.probability >= 15;

        const barClass = isGood ? 'good' : isMid ? 'mid' : 'bad';

        const item = document.createElement('div');
        item.className = 'fourth-bar-item';
        item.innerHTML = `
            <span class="fourth-bar-label">${label}</span>
            <div class="fourth-bar-track">
                <div class="fourth-bar-fill fourth-bar-fill--${barClass}"
                     style="width: ${p.probability.toFixed(1)}%"></div>
            </div>
            <span class="fourth-bar-pct fourth-bar-pct--${barClass}">${p.probability.toFixed(1)}%</span>
        `;
        content.appendChild(item);
    }
}