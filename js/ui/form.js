import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { PieceType } from '../data/PieceType.js';
import { Artifact } from '../models/Artifact.js';
import { Substat } from '../models/Substat.js';
import { BuildGoal } from '../models/BuildGoal.js';

// Nombres legibles para el usuario
export const STAT_LABELS = {
    CRIT_RATE:          'Prob. Crítica',
    CRIT_DMG:           'Daño Crítico',
    ATK_PERCENT:        'ATK%',
    HP_PERCENT:         'HP%',
    DEF_PERCENT:        'DEF%',
    ENERGY_RECHARGE:    'Recarga de Energía',
    ELEMENTAL_MASTERY:  'Maestría Elemental',
    HP_FLAT:            'HP Plano',
    ATK_FLAT:           'ATK Plano',
    DEF_FLAT:           'DEF Plano',
    HEALING_BONUS:      'Bono de Curación',
    PYRO_DMG_BONUS:     'Bono DMG Pyro',
    HYDRO_DMG_BONUS:    'Bono DMG Hydro',
    CRYO_DMG_BONUS:     'Bono DMG Cryo',
    ELECTRO_DMG_BONUS:  'Bono DMG Electro',
    ANEMO_DMG_BONUS:    'Bono DMG Anemo',
    GEO_DMG_BONUS:      'Bono DMG Geo',
    DENDRO_DMG_BONUS:   'Bono DMG Dendro',
    PHYSICAL_DMG_BONUS: 'Bono DMG Físico',
};

// Llena el select de mainstat según la pieza seleccionada
export function populateMainStats() {
    const pieceKey   = document.getElementById('pieceType').value;
    const mainSelect = document.getElementById('mainStat');
    const piece      = PieceType[pieceKey];

    mainSelect.innerHTML = '';
    for (const [key, value] of Object.entries(MainStatType)) {
        if (piece.validMainStats.includes(value)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = STAT_LABELS[key] ?? key;
            mainSelect.appendChild(option);
        }
    }
}

// Llena los selects de substats con todos los StatType disponibles
export function populateSubstatSelects() {
    const selects = document.querySelectorAll('.substat-type');
    for (const select of selects) {
        const current = select.value;
        select.innerHTML = '<option value="">-- Selecciona --</option>';
        for (const key of Object.keys(StatType)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = STAT_LABELS[key] ?? key;
            select.appendChild(option);
        }
        select.value = current; // mantener selección previa
    }
}

// Llena los checkboxes del BuildGoal con los substats seleccionados
export function populateGoalCheckboxes() {
    const container = document.getElementById('goal-checkboxes');
    const selects   = document.querySelectorAll('.substat-type');
    container.innerHTML = '';

    for (const select of selects) {
        if (!select.value) continue;
        const key   = select.value;
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${key}" checked>
            ${STAT_LABELS[key] ?? key}
        `;
        container.appendChild(label);
    }
}

// Lee el form y construye Artifact + BuildGoal
export function readForm() {
    const pieceKey   = document.getElementById('pieceType').value;
    const mainKey    = document.getElementById('mainStat').value;
    const level      = parseInt(document.getElementById('level').value);

    const piece   = PieceType[pieceKey];
    const mainVal = MainStatType[mainKey];

    // Leer substats
    const substatRows = document.querySelectorAll('.substat-row');
    const substats = [];
    for (const row of substatRows) {
        const typeKey = row.querySelector('.substat-type').value;
        const value   = parseFloat(row.querySelector('.substat-value').value);
        if (typeKey && !isNaN(value)) {
            substats.push(new Substat(StatType[typeKey], value));
        }
    }

    // Leer BuildGoal
    const checked = document.querySelectorAll('#goal-checkboxes input:checked');
    const desiredStats = Array.from(checked).map(cb => StatType[cb.value]);

    const artifact = new Artifact(piece, mainVal, level, substats);
    const goal     = new BuildGoal(desiredStats);

    return { artifact, goal };
}