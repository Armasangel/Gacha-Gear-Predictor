import {
    initCustomSelects, populateMainStats, populateLevelOptions,
    resetSubstatSelects, readForm, prefillForm, refreshForm,
    setProfile, getCurrentProfileId
} from './form.js';
import { displayResults, displayFourthSubstat } from './display.js';
import { simulate } from '../engine/Simulator.js';
import { predictFourthSubstat, getMostLikelyFourthSubstat, getProjectionConfidence } from '../engine/GameRules.js';
import { initTooltips } from './tooltip.js';
import { getProfile, getAvailableProfileIds } from '../data/profiles/index.js';
import { initI18n, setLanguage, getLanguage, t } from '../i18n/i18n.js';
import { renderStaticTexts } from './i18nRender.js';
import { initImport, refreshImportTexts } from './importer.js';
import { IconSelect } from './IconSelect.js';

const GAME_STORAGE_KEY = 'gacha-game';

// Snapshot de lo que el usuario ya ingresó, para cuando vuelva a completar
// el 4to substat tras subir el artefacto real a +4. No se recalcula nada
// que el usuario ya escribió, solo se reusa.
function buildSnapshot(artifact, goal) {
    const p = artifact.profile;
    return {
        profileId: p.id,
        pieceKey: p.pieceKeyByRef.get(artifact.pieceType),
        mainKey:  p.mainStatKeyByRef.get(artifact.mainStat),
        level:    artifact.level,
        substats: artifact.substats.map(s => ({ key: p.statKeyByRef.get(s.type), value: s.value })),
        desiredKeys: goal.desiredStats.map(s => p.statKeyByRef.get(s)),
    };
}

// ─── Last analysis data (for re-render on language change) ──
let lastArtifact = null;
let lastResult = null;
let lastProjectedStat = null;
let lastPredictions = null;
let lastGoal = null;
let lastConfidence = null;
let lastIsPending = false;

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
    btn.textContent = open ? t('results.details.show') : t('results.details.hide');
};

window.resetAndGoForm = function() {
    resetSubstatSelects(); // ya limpia type-selects y value-selects
    document.getElementById('goal-checkboxes').innerHTML = '';
    document.getElementById('fourth-substat-block').style.display = 'none';
    document.getElementById('pending-block').style.display = 'none';
    document.getElementById('details-block').style.display = 'none';
    lastArtifact = null;
    lastResult = null;
    lastProjectedStat = null;
    lastPredictions = null;
    lastGoal = null;
    lastConfidence = null;
    showScreen('screen-form');
};

// ─── Selector de juego ────────────────────────────
function initGameSelector() {
    const wrapper = document.getElementById('game-select');
    if (!wrapper) return;

    const options = getAvailableProfileIds().map(id => {
        const p = getProfile(id);
        return { value: p.id, label: p.name, icon: null };
    });

    const selector = new IconSelect(wrapper, {
        options,
        value: getStoredGameId(),
        onChange: (id) => {
            applyGame(id);
        },
    });
    window.__gameSelector = selector;
}

function getStoredGameId() {
    try {
        return localStorage.getItem(GAME_STORAGE_KEY) || 'genshin';
    } catch {
        return 'genshin';
    }
}

function applyGame(id) {
    if (!getAvailableProfileIds().includes(id)) id = 'genshin';
    try { localStorage.setItem(GAME_STORAGE_KEY, id); } catch {}
    setProfile(getProfile(id));
    // Limpiar pantalla de resultados si estamos viendo el análisis de otro juego
    document.getElementById('fourth-substat-block').style.display = 'none';
    document.getElementById('pending-block').style.display = 'none';
    refreshGameLabels();
}

// Muestra el nombre del juego activo en el landing (eyebrow + badge).
function refreshGameLabels() {
    const profile = getProfile(getCurrentProfileId());

    const eyebrow = document.getElementById('landing-eyebrow');
    if (eyebrow) {
        eyebrow.textContent = t(`landing.eyebrow.${profile.id}`) || t('landing.eyebrow');
    }

    const badge = document.getElementById('landing-badge');
    if (badge) {
        badge.textContent = '🎮 ' + profile.name;
    }
}

// ─── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar el juego guardado ANTES de construir los selects del formulario.
    setProfile(getProfile(getStoredGameId()));

    initCustomSelects();
    populateMainStats();
    populateLevelOptions();
    initTooltips();
    initImport();
    initI18n();
    renderStaticTexts();
    refreshGameLabels();

    // Selector de juego (refleja el juego activo)
    initGameSelector();

    document.getElementById('lang-switch').addEventListener('click', () => {
        const next = getLanguage() === 'es' ? 'en' : 'es';
        setLanguage(next);
    });

    window.addEventListener('languagechange', (e) => {
        renderStaticTexts();
        refreshForm();
        refreshImportTexts();
        refreshGameLabels();
        document.querySelector('#lang-switch .lang-code').textContent = e.detail.lang === 'es' ? 'EN' : 'ES';
        // Re-sincronizar las etiquetas del selector de juego
        if (window.__gameSelector) {
            const profileId = getCurrentProfileId();
            const options = getAvailableProfileIds().map(id => ({
                value: id, label: getProfile(id).name, icon: null
            }));
            window.__gameSelector.setOptions(options, profileId);
        }

        // Re-renderizar contenido dinámico si estamos en la pantalla de resultados
        const resultsScreen = document.getElementById('screen-results');
        if (resultsScreen.classList.contains('active') && lastResult) {
            displayResults(lastArtifact, lastResult, lastProjectedStat);
            if (lastIsPending && lastPredictions) {
                displayFourthSubstat(lastPredictions, lastGoal, lastConfidence, lastArtifact.profile);
            }
        }
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
            let predictions = null;
            let confidence = null;
            if (isPending) {
                projectedStat = getMostLikelyFourthSubstat(artifact);
                predictions = predictFourthSubstat(artifact, goal);
                confidence  = getProjectionConfidence(artifact);
                displayFourthSubstat(predictions, goal, confidence, artifact.profile);
                lastSnapshot = buildSnapshot(artifact, goal);
            }

            // Con 3 substats no hay veredicto final: las cards de abajo son
            // referencia con el stat más probable, no el resultado real.
            document.getElementById('pending-block').style.display = isPending ? 'block' : 'none';
            document.getElementById('verdict-block').style.display = isPending ? 'none'  : 'block';

            let result;
            if (!isPending) {
                result = simulate(artifact, goal, null);
                displayResults(artifact, result, null);
            } else {
                // Igual corremos la simulación de referencia para las cards
                // mejor/promedio/peor -- son útiles para decidir si vale la
                // pena llegar a +4, solo que ya no se llaman "veredicto".
                result = simulate(artifact, goal, projectedStat);
                displayResults(artifact, result, projectedStat);
            }

            // Store for re-render on language change
            lastArtifact = artifact;
            lastResult = result;
            lastProjectedStat = projectedStat;
            lastPredictions = predictions;
            lastGoal = goal;
            lastConfidence = confidence;
            lastIsPending = isPending;

            showScreen('screen-results');

        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.style.display = 'block';
        }
    });
});
