import { initCustomSelects, populateMainStats, resetSubstatSelects, readForm } from './form.js';
import { displayResults, displayFourthSubstat } from './display.js';
import { simulate } from '../engine/Simulator.js';
import { predictFourthSubstat } from '../engine/GameRules.js';

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
    // Limpiar inputs de valor
    document.querySelectorAll('.substat-value').forEach(i => i.value = '');
    resetSubstatSelects();
    document.getElementById('goal-checkboxes').innerHTML = '';
    document.getElementById('fourth-substat-block').style.display = 'none';
    document.getElementById('details-block').style.display = 'none';
    showScreen('screen-form');
};

// ─── Init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
    populateMainStats();

    document.getElementById('analyze-btn').addEventListener('click', () => {
        const errorEl = document.getElementById('form-error');
        errorEl.style.display = 'none';

        try {
            const { artifact, goal } = readForm();

            // 4to substat
            document.getElementById('fourth-substat-block').style.display = 'none';
            if (artifact.getSubstatCount() === 3) {
                const predictions = predictFourthSubstat(artifact, goal);
                displayFourthSubstat(predictions, goal);
            }

            // Simular
            const result = simulate(artifact, goal);
            displayResults(artifact, result);

            showScreen('screen-results');

        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.style.display = 'block';
        }
    });
});