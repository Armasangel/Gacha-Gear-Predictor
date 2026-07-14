import { STAT_LABELS } from './form.js';
import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';

const VERDICT_CONFIG = {
    'INVERTIR':   { icon: '🔥', color: '#5FCB8A', potential: 'Alto',  headline: 'Excelente inversión', action: 'Vale la pena subirlo hasta +20.' },
    'CONSIDERAR': { icon: '👍', color: '#D5D96B', potential: 'Medio', headline: 'Prometedor',           action: 'Súbelo un poco más y vuelve a evaluar.' },
    'DESCARTAR':  { icon: '🗑️', color: '#D96B6B', potential: 'Bajo',  headline: 'Descártalo',           action: 'Es poco probable que termine siendo bueno.' },
};

const CONFIDENCE_CONFIG = {
    alta:  { label: 'Confianza: Alta',  cls: 'high' },
    media: { label: 'Confianza: Media', cls: 'mid'  },
    baja:  { label: 'Confianza: Baja',  cls: 'low'  },
};

function getStatKey(stat) {
    return Object.keys(StatType).find(k => StatType[k] === stat);
}

function isCritStat(stat) {
    return stat === StatType.CRIT_RATE || stat === StatType.CRIT_DMG;
}

function mainStatIsCrit(artifact) {
    const key = Object.keys(MainStatType).find(k => MainStatType[k] === artifact.mainStat);
    return key === 'CRIT_RATE' || key === 'CRIT_DMG';
}

// Traduce los números del resultado a 2-3 frases en lenguaje llano.
// Nunca menciona CV/RV -- esos quedan solo en la sección técnica.
function buildHumanReasons(artifact, result) {
    const reasons = [];
    const critSubstats = artifact.substats.filter(s => isCritStat(s.type)).length;

    if (critSubstats >= 2) {
        reasons.push('Tiene doble crítico en substats: es poco común y muy valioso.');
    } else if (critSubstats === 1 && mainStatIsCrit(artifact)) {
        reasons.push('Combina un substat crítico con un mainstat crítico.');
    } else if (critSubstats === 1) {
        reasons.push('Tiene un substat crítico, buena base para escalar.');
    } else if (!mainStatIsCrit(artifact)) {
        reasons.push('Todavía no tiene ningún stat crítico.');
    }

    if (result.worstRV >= 60) {
        reasons.push('Incluso en el peor escenario posible, se mantiene decente.');
    } else if (result.worstRV < 35) {
        reasons.push('En el peor escenario, este artefacto se queda corto.');
    }

    if (result.avgRV >= 85) {
        reasons.push('En promedio, apunta a quedar entre los mejores rolls posibles.');
    }

    return reasons.slice(0, 3);
}

export function displayResults(artifact, result, projectedStat = null) {
    // ─── Veredicto (lenguaje humano primero) ──────
    const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG['CONSIDERAR'];
    document.getElementById('verdict-icon').textContent  = cfg.icon;
    document.getElementById('verdict-label').textContent = cfg.headline;
    document.getElementById('verdict-label').style.color = cfg.color;
    document.getElementById('verdict-potential-text').textContent = cfg.potential;
    document.getElementById('verdict-action').textContent = cfg.action;

    const reasonsList = document.getElementById('verdict-reasons');
    reasonsList.innerHTML = '';
    for (const reason of buildHumanReasons(artifact, result)) {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsList.appendChild(li);
    }

    // ─── Detalles técnicos ────────────────────────
    document.getElementById('verdict-reason-technical').textContent = result.verdictReason;
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
    // Iteramos las keys que YA DEVUELVE el motor (result.*Case), no artifact.substats.
    // Así el 4to substat proyectado (cuando aplica) sale en pantalla como cualquier
    // otro, en vez de quedar calculado pero invisible.
    const projectedKey = projectedStat ? getStatKey(projectedStat) : null;
    renderScenario('best-substats',  result.bestCase,  projectedKey);
    renderScenario('avg-substats',   result.avgCase,   projectedKey);
    renderScenario('worst-substats', result.worstCase, projectedKey);
}

function renderScenario(containerId, caseData, projectedKey) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const key of Object.keys(caseData)) {
        const label       = STAT_LABELS[key] ?? key;
        const value        = caseData[key]?.toFixed(1) ?? '-';
        const isProjected = key === projectedKey;

        const row = document.createElement('div');
        row.className = 'scenario-substat' + (isProjected ? ' scenario-substat--projected' : '');
        row.innerHTML = `
            <span class="scenario-substat-name">${label}${isProjected ? ' <span class="projected-tag">supuesto</span>' : ''}</span>
            <span class="scenario-substat-value">${value}</span>
        `;
        container.appendChild(row);
    }
}

export function displayFourthSubstat(predictions, goal, confidence) {
    const block   = document.getElementById('fourth-substat-block');
    const content = document.getElementById('fourth-substat-content');
    block.style.display = 'block';
    content.innerHTML   = '';

    const chanceGood = predictions
        .filter(p => goal.isDesired(p.stat))
        .reduce((sum, p) => sum + p.probability, 0);

    // Qué asumió el simulador para calcular los escenarios de abajo.
    // Esto es lo que conecta esta pantalla con las cards de resultado:
    // el mismo dato, mostrado, no un cálculo aparte.
    const usedKey   = getStatKey(confidence.top.stat);
    const usedLabel = STAT_LABELS[usedKey] ?? usedKey;
    const conf      = CONFIDENCE_CONFIG[confidence.level] ?? CONFIDENCE_CONFIG.media;

    const assumption = document.createElement('div');
    assumption.className = 'fourth-assumption';
    assumption.innerHTML = `
        <p class="fourth-assumption-text">
            Los escenarios de abajo asumen <strong>${usedLabel}</strong>
            (${confidence.top.probability.toFixed(1)}%) como 4to substat — es la opción más probable.
        </p>
        <span class="confidence-badge confidence-badge--${conf.cls}">${conf.label}</span>
    `;
    content.appendChild(assumption);

    // Resumen de probabilidad de que salga algo que el usuario quiere
    const summary = document.createElement('p');
    summary.className = 'fourth-chance';
    const chanceColor = chanceGood >= 25 ? '#5FCB8A' : chanceGood >= 10 ? '#D5D96B' : '#D96B6B';
    summary.innerHTML = `Probabilidad de obtener algo útil: 
        <strong style="color:${chanceColor}">${chanceGood.toFixed(1)}%</strong>`;
    content.appendChild(summary);

    // Barras de distribución completa
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