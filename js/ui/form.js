import { StatType } from '../data/StatType.js';
import { MainStatType } from '../data/MainStatType.js';
import { PieceType } from '../data/PieceType.js';
import { Artifact } from '../models/Artifact.js';
import { Substat } from '../models/Substat.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { IconSelect } from './IconSelect.js';
import { PIECE_ICONS, PIECE_LABELS, STAT_ICONS } from '../data/Icons.js';

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
    DEF_FLAT:            'DEF Plano',
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

// ─── Instancias de los dropdowns con icono ─────────
let pieceSelect = null;
const substatSelects = [];

// Se llama una sola vez al cargar la página.
export function initCustomSelects() {
    // Dropdown de pieza
    const pieceWrapper = document.getElementById('pieceType-select');
    const pieceOptions = Object.keys(PieceType).map(key => ({
        value: key,
        label: PIECE_LABELS[key] ?? key,
        icon: PIECE_ICONS[key],
    }));
    pieceSelect = new IconSelect(pieceWrapper, {
        options: pieceOptions,
        value: pieceOptions[0].value,
        onChange: () => populateMainStats(),
    });

    // Dropdowns de substats (uno por fila)
    const substatOptions = [
        { value: '', label: '-- Selecciona --', icon: null },
        ...Object.keys(StatType).map(key => ({
            value: key,
            label: STAT_LABELS[key] ?? key,
            icon: STAT_ICONS[key],
        })),
    ];

    document.querySelectorAll('.substat-type-select').forEach(wrapper => {
        const select = new IconSelect(wrapper, {
            options: substatOptions,
            value: '',
            onChange: () => populateGoalCheckboxes(),
        });
        substatSelects.push(select);
    });
}

export function populateMainStats() {
    const pieceKey   = pieceSelect.value;
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

export function populateGoalCheckboxes() {
    const container = document.getElementById('goal-checkboxes');

    // Guardar orden actual antes de limpiar
    const currentOrder = Array.from(
        container.querySelectorAll('.goal-item')
    ).map(item => item.dataset.key);

    const selectedKeys = substatSelects
        .map(s => s.value)
        .filter(v => v !== '' && v !== null);

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
    const pieceKey = pieceSelect.value;
    const mainKey  = document.getElementById('mainStat').value;
    const level    = parseInt(document.getElementById('level').value);

    const piece   = PieceType[pieceKey];
    const mainVal = MainStatType[mainKey];

    // Leer substats
    const substatRows = document.querySelectorAll('.substat-row');
    const substats = [];
    substatRows.forEach((row, i) => {
        const typeKey = substatSelects[i].value;
        const value   = parseFloat(row.querySelector('.substat-value').value);
        if (typeKey && !isNaN(value)) {
            substats.push(new Substat(StatType[typeKey], value));
        }
    });

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

export function resetSubstatSelects() {
    substatSelects.forEach(s => { s.value = ''; });
}
