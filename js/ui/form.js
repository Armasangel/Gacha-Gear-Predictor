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
        select.value = current;
    }
}

export function populateGoalCheckboxes() {
    const container = document.getElementById('goal-checkboxes');
    const selects   = document.querySelectorAll('.substat-type');

    // Guardar orden actual antes de limpiar
    const currentOrder = Array.from(
        container.querySelectorAll('.goal-item')
    ).map(item => item.dataset.key);

    const selectedKeys = Array.from(selects)
        .map(s => s.value)
        .filter(v => v !== '');

    container.innerHTML = '';

    // Respetar orden previo, agregar nuevos al final
    const ordered = [
        ...currentOrder.filter(k => selectedKeys.includes(k)),
        ...selectedKeys.filter(k => !currentOrder.includes(k))
    ];

    for (const key of ordered) {
        const item = document.createElement('div');
        item.className   = 'goal-item';
        item.dataset.key = key;
        item.innerHTML = `
            <input type="checkbox" value="${key}" checked>
            <span>${STAT_LABELS[key] ?? key}</span>
            <button class="move-up"   title="Mayor prioridad">▲</button>
            <button class="move-down" title="Menor prioridad">▼</button>
        `;
        container.appendChild(item);
    }

    container.onclick = (e) => {
        const item = e.target.closest('.goal-item');
        if (!item) return;
        if (e.target.classList.contains('move-up') && item.previousElementSibling) {
            container.insertBefore(item, item.previousElementSibling);
        }
        if (e.target.classList.contains('move-down') && item.nextElementSibling) {
            container.insertBefore(item.nextElementSibling, item);
        }
    };
}

export function readForm() {
    const pieceKey = document.getElementById('pieceType').value;
    const mainKey  = document.getElementById('mainStat').value;
    const level    = parseInt(document.getElementById('level').value);

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

    // Leer BuildGoal EN ORDEN DE PRIORIDAD
    const items = document.querySelectorAll('#goal-checkboxes .goal-item');
    const desiredStats = [];
    for (const item of items) {
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb.checked) {
            desiredStats.push(StatType[item.dataset.key]);
        }
    }

    const artifact = new Artifact(piece, mainVal, level, substats);
    const goal     = new BuildGoal(desiredStats);

    return { artifact, goal };
}