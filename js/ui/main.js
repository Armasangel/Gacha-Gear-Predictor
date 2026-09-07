import {
    initCustomSelects, populateMainStats, populateLevelOptions,
    resetSubstatSelects, readForm, prefillForm, refreshForm,
    setProfile
} from './form.js';
import { displayResults, displayFourthSubstat } from './display.js';
import { simulate } from '../engine/Simulator.js';
import { predictFourthSubstat, getMostLikelyFourthSubstat, getProjectionConfidence } from '../engine/GameRules.js';
import { initTooltips } from './tooltip.js';
import { getProfile, getAvailableProfileIds } from '../data/profiles/index.js';
import { initI18n, setLanguage, getLanguage, t } from '../i18n/i18n.js';
import { renderStaticTexts } from './i18nRender.js';
import { initImport, refreshImportTexts } from './importer.js';

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
    // El landing siempre arranca en estado neutro, nunca "recuerda"
    // el último juego previsualizado — eso es justamente lo que
    // dispara el hover/touch, no algo persistente.
    if (id === 'screen-landing') clearGamePreview();
};

window.toggleDetails = function() { // Muestra u oculta el bloque de detalles de la simulación, cambiando el texto del botón según el estado. Se obtiene el bloque y el botón por su id, se verifica si está abierto (display distinto de 'none'), se cambia el display del bloque y se actualiza el texto del botón usando la función t para traducir.
    const block  = document.getElementById('details-block');
    const btn    = document.getElementById('details-toggle');
    const open   = block.style.display !== 'none';
    block.style.display = open ? 'none' : 'block';
    btn.textContent = open ? t('results.details.show') : t('results.details.hide');
};

window.resetAndGoForm = function() { // Resetea el estado del formulario y vuelve a la pantalla de formulario. Se limpian los selects de substats, se ocultan los bloques de goal, 4to substat, pending y detalles, y se resetean las variables de último artefacto, resultado, proyección, predicciones, goal y confianza.
    resetSubstatSelects(); 
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

// ─── Selección de juego en el landing (hover en desktop, touch en mobile) ──
// pointerenter/pointerleave cubren ambos casos con el mismo código: en mouse
// se disparan con el simple hover (sin click), y en touch se disparan al
// tocar y al soltar/arrastrar fuera — que es exactamente "mientras el dedo
// está tocando el botón" que pedimos. El click (que dispara igual en mouse
// y touch al soltar sobre el mismo elemento) confirma y navega.
function previewGame(id) {
    const landing = document.getElementById('screen-landing');
    if (landing) landing.dataset.game = id;
    const eyebrow = document.getElementById('landing-eyebrow');
    if (eyebrow) eyebrow.textContent = t(`landing.eyebrow.${id}`) || t('landing.eyebrow');
}

function clearGamePreview() {
    const landing = document.getElementById('screen-landing');
    if (landing) landing.dataset.game = 'neutral';
    const eyebrow = document.getElementById('landing-eyebrow');
    if (eyebrow) eyebrow.textContent = t('landing.eyebrow.neutral');
}

function initGamePickRow() { // Conecta cada botón de juego del landing a su preview (hover/touch) y a la confirmación (click), que aplica el perfil y navega al form.
    document.querySelectorAll('.game-pick-btn').forEach(btn => {
        const id = btn.dataset.gameId;
        btn.addEventListener('pointerenter', () => previewGame(id));
        btn.addEventListener('pointerleave', () => clearGamePreview());
        btn.addEventListener('pointercancel', () => clearGamePreview());
        btn.addEventListener('click', () => {
            applyGame(id);
            showScreen('screen-form');
        });
    });
    clearGamePreview(); // estado inicial: neutro, nada elegido todavía
}

function getStoredGameId() { // Devuelve el id del juego guardado en localStorage, o 'genshin' si no hay ninguno o hay un error al acceder a localStorage. Se intenta obtener el valor de localStorage con la clave GAME_STORAGE_KEY, y si falla se devuelve 'genshin'.
    try {
        return localStorage.getItem(GAME_STORAGE_KEY) || 'genshin';
    } catch {
        return 'genshin';
    }
}

function applyGame(id) { // Aplica un juego por id, actualizando el perfil activo y guardando el id en localStorage. Si el id no corresponde a un perfil conocido, se usa 'genshin' como fallback. Se obtiene el constructor del perfil, se construye y cachea si es necesario, y se llama a setProfile con el perfil obtenido. Se limpian los bloques de resultados, se aplica el tema visual del juego (para el resto de la app, no para el landing que ya se resetea a neutro al volver).
    if (!getAvailableProfileIds().includes(id)) id = 'genshin';
    try { localStorage.setItem(GAME_STORAGE_KEY, id); } catch {}
    setProfile(getProfile(id));
    applyGameTheme(id);
    // Limpiar pantalla de resultados si estamos viendo el análisis de otro juego
    document.getElementById('fourth-substat-block').style.display = 'none';
    document.getElementById('pending-block').style.display = 'none';
}

// Cambia el tema visual (colores/tipografía/motivos) leyendo data-game en <html>.
// Todo el resto vive en style.css como bloques [data-game="..."]; este switch
// es el único punto de entrada, así que retematizar la app es un solo atributo.
// El landing tiene su PROPIO data-game (ver previewGame/clearGamePreview),
// así que este cambio en <html> no le pega al landing, solo al resto.
function applyGameTheme(id) {
    document.documentElement.dataset.game = id;
}

// Init 
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar el juego guardado ANTES de construir los selects del formulario.
    setProfile(getProfile(getStoredGameId()));
    applyGameTheme(getStoredGameId());

    initCustomSelects();
    populateMainStats();
    populateLevelOptions();
    initTooltips();
    initImport();
    initI18n();
    renderStaticTexts();

    // Fila de selección de juego del landing (hover/touch preview + click confirma)
    initGamePickRow();

    document.getElementById('lang-switch').addEventListener('click', () => {
        const next = getLanguage() === 'es' ? 'en' : 'es';
        setLanguage(next);
    });

    window.addEventListener('languagechange', (e) => { // Cuando cambia el idioma, se re-renderizan los textos estáticos, se refresca el formulario y la importación, se actualiza el texto del switch de idioma y se re-renderiza el contenido dinámico si estamos en la pantalla de resultados.
        renderStaticTexts();
        refreshForm();
        refreshImportTexts();
        clearGamePreview(); // re-traduce el eyebrow neutro del landing
        document.querySelector('#lang-switch .lang-code').textContent = e.detail.lang === 'es' ? 'EN' : 'ES';

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
            if (!isPending) { // Si el artefacto tiene 4 substats, se simula normalmente y se muestra el resultado real
                result = simulate(artifact, goal, null);
                displayResults(artifact, result, null);
            } else { // Si el artefacto tiene 3 substats, se simula usando el 4to substat proyectado y se muestra el resultado con ese stat
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