import { populateMainStats, populateSubstatSelects, populateGoalCheckboxes, readForm } from './form.js';
import { displayResults, displayFourthSubstat } from './display.js';
import { simulate } from '../engine/Simulator.js';
import { predictFourthSubstat } from '../engine/GameRules.js';

// Inicializar el form al cargar
document.addEventListener('DOMContentLoaded', () => {
    populateMainStats();
    populateSubstatSelects();

    // Actualizar mainstat cuando cambia la pieza
    document.getElementById('pieceType').addEventListener('change', () => {
        populateMainStats();
    });

    // Actualizar checkboxes del BuildGoal cuando cambia un substat
    document.querySelectorAll('.substat-type').forEach(select => {
        select.addEventListener('change', () => {
            populateGoalCheckboxes();
        });
    });

    // Botón de análisis
    document.getElementById('analyze-btn').addEventListener('click', () => {
        try {
            const { artifact, goal } = readForm();

            console.log('artifact:', artifact);
            console.log('goal:', goal);

            // Limpiar resultados anteriores
            document.getElementById('fourth-substat-block').style.display = 'none';
            document.getElementById('results-section').style.display = 'none';

            // Predecir 4to substat si tiene 3
            if (artifact.getSubstatCount() === 3) {
                const predictions = predictFourthSubstat(artifact, goal);
                displayFourthSubstat(predictions, goal);
            }

            // Simular y mostrar resultados
            const result = simulate(artifact, goal);
            displayResults(artifact, result);

        } catch (e) {
            alert(e.message);
        }
    });
});