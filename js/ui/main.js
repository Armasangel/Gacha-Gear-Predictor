import { initCustomSelects, populateMainStats, resetSubstatSelects, readForm, prefillForm } from './form.js';
import { displayResults, displayFourthSubstat } from './display.js';
import { simulate } from '../engine/Simulator.js';
import { predictFourthSubstat, getMostLikelyFourthSubstat, getProjectionConfidence } from '../engine/GameRules.js';
import { initTooltips } from './tooltip.js';
import { PieceType } from '../data/PieceType.js';
import { MainStatType } from '../data/MainStatType.js';
import { StatType } from '../data/StatType.js';
import { initI18n, setLanguage, getLanguage } from '../i18n/i18n.js';
import { renderStaticTexts } from './i18nRender.js';

function keyOf(dict, value) {
    return Object.keys(dict).find(k => dict[k] === value);
}

// Snapshot de lo que el usuario ya ingresó, para cuando vuelva a completar
// el 4to substat tras subir el artefacto real a +4. No se recalcula nada
// que el usuario ya escribió, solo se reusa.
function buildSnapshot(artifact, goal) {
    return {
        pieceKey: keyOf(PieceType, artifact.pieceType),
        mainKey:  keyOf(MainStatType, artifact.mainStat),
        level:    artifact.level,
        substats: artifact.substats.map(s => ({ key: keyOf(StatType, s.type), value: s.value })),
        desiredKeys: goal.desiredStats.map(s => keyOf(StatType, s)),
    };
}

// ─── Navegación entre pantallas ───────────────────
window.showScreen = function(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    const target = document.getElementById(id);
    target.classList.add('active');
    window.scrollTo(0, 0);
};

window.toggleDetails = function() {
    const block  = document.getElementById('details-block');
    const btn    = document.getElementById('details-toggle');
    const open   = block.style.display !== 'none';
    block.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Ver detalles técnicos ▼' : 'Ocultar detalles técnicos ▲';
};

window.resetAndGoForm = function() {
    resetSubstatSelects(); // ya limpia type-selects y value-selects
    document.getElementById('goal-checkboxes').innerHTML = '';
    document.getElementById('fourth-substat-block').style.display = 'none';
    document.getElementById('pending-block').style.display = 'none';
    document.getElementById('details-block').style.display = 'none';
    showScreen('screen-form');
};

// ─── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
    populateMainStats();
    initTooltips();
    initI18n();
    renderStaticTexts();

    document.getElementById('lang-switch').addEventListener('click', () => {
        const next = getLanguage() === 'es' ? 'en' : 'es';
        setLanguage(next);
    });

    window.addEventListener('languagechange', (e) => {
        renderStaticTexts();
        document.getElementById('lang-switch-label').textContent = e.dtail.lang === 'es' ? 'EN' : 'ES';
        // si ya hay resultados en pantalla, re-renderizarlos en el nuevo idioma
    })

    let lastSnapshot = null;

    document.getElementById('reveal-cta').addEventListener('click', () => {
        if (!lastSnapshot) return;
        prefillForm(lastSnapshot);
        showScreen('screen-form');
    });

    document.getElementById('analyze-btn').addEventListener('click', () => {
        const errorEl = document.getElementById('form-error');
        errorEl.style.display = 'none';

        try {
            const { artifact, goal } = readForm();
            const isPending = artifact.getSubstatCount() === 3;

            // 4to substat: se calcula UNA vez y se reusa tanto para lo que
            // se muestra como para lo que realmente simula el motor, para
            // que nunca queden desincronizados.
            document.getElementById('fourth-substat-block').style.display = 'none';
            let projectedStat = null;
            if (isPending) {
                projectedStat = getMostLikelyFourthSubstat(artifact);
                const predictions = predictFourthSubstat(artifact, goal);
                const confidence  = getProjectionConfidence(artifact);
                displayFourthSubstat(predictions, goal, confidence);
                lastSnapshot = buildSnapshot(artifact, goal);
            }

            // Con 3 substats no hay veredicto final: las cards de abajo son
            // referencia con el stat más probable, no el resultado real.
            document.getElementById('pending-block').style.display = isPending ? 'block' : 'none';
            document.getElementById('verdict-block').style.display = isPending ? 'none'  : 'block';

            if (!isPending) {
                const result = simulate(artifact, goal, null);
                displayResults(artifact, result, null);
            } else {
                // Igual corremos la simulación de referencia para las cards
                // mejor/promedio/peor -- son útiles para decidir si vale la
                // pena llegar a +4, solo que ya no se llaman "veredicto".
                const result = simulate(artifact, goal, projectedStat);
                displayResults(artifact, result, projectedStat);
            }

            showScreen('screen-results');

        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.style.display = 'block';
        }
    });
});