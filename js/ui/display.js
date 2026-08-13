import { StatType } from '../data/StatType.js';
import { statLabel } from './form.js';
import { t } from '../i18n/i18n.js';
import { STAT_KEY_BY_REF, MAINSTAT_KEY_BY_REF } from '../utils/lookup.js';

const VERDICT_META = {
    'INVERTIR':   { icon: '🔥', color: '#5FCB8A', key: 'invest'   },
    'CONSIDERAR': { icon: '👍', color: '#D5D96B', key: 'consider' },
    'DESCARTAR':  { icon: '🗑️', color: '#D96B6B', key: 'discard'  },
};

function verdictConfig(verdict) {
    const m = VERDICT_META[verdict] ?? VERDICT_META['CONSIDERAR'];
    return {
        icon: m.icon, color: m.color,
        potential: t(`verdict.potential.${m.key === 'invest' ? 'high' : m.key === 'consider' ? 'mid' : 'low'}`),
        headline: t(`verdict.${m.key}.headline`),
        action: t(`verdict.${m.key}.action`),
    };
}

const CONFIDENCE_CONFIG = {
    alta:  { key: 'confidence.high', cls: 'high' },
    media: { key: 'confidence.mid',  cls: 'mid'  },
    baja:  { key: 'confidence.low',  cls: 'low'  },
};

function getStatKey(stat) {
    return STAT_KEY_BY_REF.get(stat);
}

function isCritStat(stat) {
    return stat === StatType.CRIT_RATE || stat === StatType.CRIT_DMG;
}

function mainStatIsCrit(artifact) {
    const key = MAINSTAT_KEY_BY_REF.get(artifact.mainStat);
    return key === 'CRIT_RATE' || key === 'CRIT_DMG';
}

// Traduce los números del resultado a 2-3 frases en lenguaje llano.
// Nunca menciona CV/RV -- esos quedan solo en la sección técnica.
function buildHumanReasons(artifact, result) {
    const reasons = [];
    const critSubstats = artifact.substats.filter(s => isCritStat(s.type)).length;

    if (critSubstats >= 2) {
        reasons.push(t('reason.doubleCrit'));
    } else if (critSubstats === 1 && mainStatIsCrit(artifact)) {
        reasons.push(t('reason.critWithMain'));
    } else if (critSubstats === 1) {
        reasons.push(t('reason.oneCrit'));
    } else if (!mainStatIsCrit(artifact)) {
        reasons.push(t('reason.noCrit'));
    }

    if (result.worstRV >= 60) {
        reasons.push(t('reason.worstOk'));
    } else if (result.worstRV < 35) {
        reasons.push(t('reason.worstBad'));
    }

    if (result.avgRV >= 85) {
        reasons.push(t('reason.avgGreat'));
    }

    return reasons.slice(0, 3);
}

// Barra de probabilidad real de Montecarlo -- reusa las mismas clases
// visuales que ya usa la distribución del 4to substat (good/mid/bad),
// así no depende de CSS nuevo.
function renderProbabilityBar(result) {
    const container = document.getElementById('verdict-probability');
    if (!container) return;
    container.innerHTML = '';

    if (result.successRate == null) return; // resultado sin datos de Montecarlo

    const rows = [
        { label: t('probability.invest'),   value: result.successRate,  cls: 'good' },
        { label: t('probability.consider'), value: result.considerRate, cls: 'mid'  },
        { label: t('probability.discard'),  value: result.discardRate,  cls: 'danger'  },
    ];

    for (const r of rows) {
        const item = document.createElement('div');
        item.className = 'fourth-bar-item';
        item.innerHTML = `
            <span class="fourth-bar-label">${r.label}</span>
            <div class="fourth-bar-track">
                <div class="fourth-bar-fill fourth-bar-fill--${r.cls}"
                     style="width: ${r.value.toFixed(1)}%"></div>
            </div>
            <span class="fourth-bar-pct fourth-bar-pct--${r.cls}">${r.value.toFixed(1)}%</span>
        `;
        container.appendChild(item);
    }

    if (result.iterations) {
        const note = document.createElement('p');
        note.className = 'fourth-assumption-text';
        note.textContent = t('probability.basedOn', { n: result.iterations.toLocaleString() });
        container.appendChild(note);
    }
}

export function displayResults(artifact, result, projectedStat = null) {
    // ─── Veredicto (lenguaje humano primero) ──────
    const cfg = verdictConfig(result.verdict);
    document.getElementById('verdict-icon').textContent  = cfg.icon;
    document.getElementById('verdict-label').textContent = cfg.headline;
    document.getElementById('verdict-label').style.color = cfg.color;
    document.getElementById('verdict-potential-text').textContent = cfg.potential;
    document.getElementById('verdict-action-text').textContent = cfg.action;
    renderProbabilityBar(result); // ← nuevo

    const reasonsList = document.getElementById('verdict-reasons');
    reasonsList.innerHTML = '';
    for (const reason of buildHumanReasons(artifact, result)) {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsList.appendChild(li);
    }

    // ─── Detalles técnicos ────────────────────────
    document.getElementById('verdict-reason-technical').textContent =
        result.iterations != null
            ? t('results.detail.probabilitySummary', {
                  invest:   result.successRate.toFixed(1),
                  consider: result.considerRate.toFixed(1),
                  discard:  result.discardRate.toFixed(1),
                  n:        result.iterations.toLocaleString(),
              })
            : '';
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
        const label       = statLabel(key);
        const value        = caseData[key]?.toFixed(1) ?? '-';
        const isProjected = key === projectedKey;

        const row = document.createElement('div');
        row.className = 'scenario-substat' + (isProjected ? ' scenario-substat--projected' : '');
        row.innerHTML = `
            <span class="scenario-substat-name">${label}${isProjected ? ` <span class="projected-tag">${t('fourth.projected')}</span>` : ''}</span>
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
    const usedLabel = statLabel(usedKey);
    const conf      = CONFIDENCE_CONFIG[confidence.level] ?? CONFIDENCE_CONFIG.media;

    const assumption = document.createElement('div');
    assumption.className = 'fourth-assumption';
    assumption.innerHTML = `
        <p class="fourth-assumption-text">
            ${t('fourth.assumption', { stat: `<strong>${usedLabel}</strong>`, pct: confidence.top.probability.toFixed(1) })}
        </p>
        <span class="confidence-badge confidence-badge--${conf.cls}">${t(conf.key)}</span>
        <button type="button" class="info-tip" data-tip-key="confidence" aria-label="${t('tip.ariaLabel')}">?</button>
    `;
    content.appendChild(assumption);

    // Resumen de probabilidad de que salga algo que el usuario quiere
    const summary = document.createElement('p');
    summary.className = 'fourth-chance';
    const chanceColor = chanceGood >= 25 ? '#5FCB8A' : chanceGood >= 10 ? '#D5D96B' : '#D96B6B';
    summary.innerHTML = `${t('fourth.chance')} 
        <strong style="color:${chanceColor}">${chanceGood.toFixed(1)}%</strong>`;
    content.appendChild(summary);

    // Barras de distribución completa
    for (const p of predictions) {
        const key    = getStatKey(p.stat);
        const label  = statLabel(key);
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