import { t } from '../i18n/i18n.js';
import { getProfile } from '../data/profiles/index.js';
import { statLabel } from './form.js';

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

function profileOf(artifact) {
    return artifact?.profile ?? getProfile('genshin');
}

function getStatKey(profile, stat) {
    return profile.statKeyByRef.get(stat);
}

function isCritStat(profile, stat) {
    return stat === profile.stat.CRIT_RATE || stat === profile.stat.CRIT_DMG;
}

function mainStatIsCrit(profile, artifact) {
    const key = profile.mainStatKeyByRef.get(artifact.mainStat);
    return key === 'CRIT_RATE' || key === 'CRIT_DMG';
}

// Traduce los números del resultado a 2-3 frases en lenguaje llano.
// Nunca menciona CV/RV -- esos quedan solo en la sección técnica.
function buildHumanReasons(profile, artifact, result) {
    const reasons = [];
    const critSubstats = artifact.substats.filter(s => isCritStat(profile, s.type)).length;

    if (critSubstats >= 2) {
        reasons.push(t('reason.doubleCrit'));
    } else if (critSubstats === 1 && mainStatIsCrit(profile, artifact)) {
        reasons.push(t('reason.critWithMain'));
    } else if (critSubstats === 1) {
        reasons.push(t('reason.oneCrit'));
    } else if (!mainStatIsCrit(profile, artifact)) {
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

    for (const r of rows) { // Para cada fila de probabilidad, se crea un div con la barra de progreso y el porcentaje, usando las clases visuales correspondientes (good/mid/bad)
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

    if (result.iterations) { // Si hay datos de Montecarlo, se agrega un texto que indica cuántas iteraciones se usaron para calcular las probabilidades
        const note = document.createElement('p');
        note.className = 'fourth-assumption-text';
        note.textContent = t('probability.basedOn', { n: result.iterations.toLocaleString() });
        container.appendChild(note);
    }
}

export function displayResults(artifact, result, projectedStat = null) {
    const profile = profileOf(artifact);

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
    for (const reason of buildHumanReasons(profile, artifact, result)) { // Para cada razón humana, se crea un elemento de lista y se agrega a la lista de razones del veredicto
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
    const projectedKey = projectedStat ? getStatKey(profile, projectedStat) : null;
    renderScenario('best-substats',  result.bestCase,  projectedKey);
    renderScenario('avg-substats',   result.avgCase,   projectedKey);
    renderScenario('worst-substats', result.worstCase, projectedKey);
}

function renderScenario(containerId, caseData, projectedKey) { // Renderiza un escenario de substats (best, avg, worst) en el contenedor dado, mostrando cada substat con su label y valor, y resaltando el substat proyectado si aplica
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    for (const key of Object.keys(caseData)) { // Para cada substat del escenario, se obtiene su label y valor, y se crea un div con la información. Si el substat es el proyectado, se le agrega una clase especial y un tag de "proyectado".
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

export function displayFourthSubstat(predictions, goal, confidence, profile = null) { //
    const block   = document.getElementById('fourth-substat-block');
    const content = document.getElementById('fourth-substat-content');
    block.style.display = 'block';
    content.innerHTML   = '';

    const chanceGood = predictions
        .filter(p => goal.isDesired(p.stat))
        .reduce((sum, p) => sum + p.probability, 0);

    // El perfil del artifact de origen (stats compartidos por referencia).
    const p = profile ?? profileFromStats(predictions);
    const usedKey   = getStatKey(p, confidence.top.stat);
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
    for (const pred of predictions) {// Para cada predicción de substat, se obtiene su label, probabilidad y si es deseado según el goal. Se crea un div con la barra de progreso y el porcentaje, usando las clases visuales correspondientes (good/mid/bad).
        const key    = getStatKey(p, pred.stat);
        const label  = statLabel(key);
        const isGood = goal.isDesired(pred.stat);
        const isMid  = pred.probability >= 15;

        const barClass = isGood ? 'good' : isMid ? 'mid' : 'bad';

        const item = document.createElement('div');
        item.className = 'fourth-bar-item';
        item.innerHTML = `
            <span class="fourth-bar-label">${label}</span>
            <div class="fourth-bar-track">
                <div class="fourth-bar-fill fourth-bar-fill--${barClass}"
                     style="width: ${pred.probability.toFixed(1)}%"></div>
            </div>
            <span class="fourth-bar-pct fourth-bar-pct--${barClass}">${pred.probability.toFixed(1)}%</span>
        `;
        content.appendChild(item);
    }
}

function profileFromStats(predictions) { // Dado un array de StatPrediction, devuelve el perfil de juego que contiene los stats referenciados por las predicciones. Si no se encuentra ninguno, devuelve el perfil "genshin" por defecto.
    if (!predictions?.length) return getProfile('genshin');
    const first = predictions[0].stat;
    // Buscamos el perfil cuyo statKeyByRef contiene `first` como ref (stats
    // compartidos por referencia entre perfil y predicciones).
    for (const id of ['genshin', 'hsr', 'zzz']) {
        const p = getProfile(id);
        if (p.statKeyByRef.has(first)) return p;
    }
    return getProfile('genshin');
}
