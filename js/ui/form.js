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

// Valores de substat legibles para el usuario
export const SUBSTAT_VALUE_LABELS = {


};

// ─── Instancias de los dropdowns con icono ─────────
let pieceSelect = null;
const substatSelects = [];
const substatValueSelects = [];

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

    document.querySelectorAll('.substat-row').forEach((row, i) => {
        const typeWrapper  = row.querySelector('.substat-type-select');
        const valueWrapper = row.querySelector('.substat-value-select');

        // Select de valor: arranca vacío, se llena cuando eligen el tipo
        const valueSelect = new IconSelect(valueWrapper, {
            options: [{ value: '', label: '--', icon: null }],
            value: '',
            onChange: () => populateGoalCheckboxes(),
        });
        substatValueSelects.push(valueSelect);

        // Select de tipo: al cambiar, repuebla el de valor de LA MISMA fila
        const typeSelect = new IconSelect(typeWrapper, {
            options: substatOptions,
            value: '',
            onChange: () => {
                populateValueOptions(i);
                populateGoalCheckboxes();
            },
        });
        substatSelects.push(typeSelect);
    });
}

//Llena el select de valor de la fila i con los tiers reales del stat
function populateValueOptions(rowIndex) {
    const typeKey     = substatSelects[rowIndex].value;
    const valueSelect = substatValueSelects[rowIndex];

    if (!typeKey) {
        valueSelect.setOptions([{ value: '', label: '--', icon: null }]);
        return;
    }

    const { tiers } = StatType[typeKey];
    const options = tiers.map(tier => ({
        value: String(tier),
        label: formatStatValue(typeKey, tier),
    }));

    valueSelect.setOptions(options); // ya selecciona options[0] solo
}

function formatStatValue(typeKey, tier){
    const esPorcentaje = 
        typeKey.endsWith('_PERCENT') || 
        typeKey.endsWith('CRIT_RATE') ||
        typeKey.endsWith('CRIT_DMG') || 
        typeKey === 'ENERGY_RECHARGE' || 
        typeKey === 'HEALING_BONUS';
    return esPorcentaje ? `${tier.toFixed(1)}%` : `${tier}`;
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
        const value = parseFloat(substatValueSelects[i].value);
        if (typeKey && !isNaN(value)){
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
    substatSelects.forEach((s, i) => {
        s.value = '';
        substatValueSelects[i].setOptions([{ value: '', label: '--', icon: null }]);
        substatValueSelects[i].value = '';
    });
}

// Rellena el form con un artefacto que YA se analizó como "3 substats",
// dejando la 4ta fila vacía para que el usuario solo meta lo que se reveló
// al llegar a +4. No inventa nada -- reusa exactamente lo que el usuario
// ya había tecleado, así no tiene que volver a escribir todo desde cero.
export function prefillForm(snapshot) {
    pieceSelect.value = snapshot.pieceKey;
    populateMainStats();
    document.getElementById('mainStat').value = snapshot.mainKey;
    document.getElementById('level').value     = snapshot.level;

    const rows = document.querySelectorAll('.substat-row');
    rows.forEach((row, i) => {
    const entry = snapshot.substats[i];
    substatSelects[i].value = entry ? entry.key : '';
        if (entry) {
            populateValueOptions(i);                          // llena opciones
            substatValueSelects[i].value = String(entry.value); // pisa con el valor real guardado
        }
    });

    populateGoalCheckboxes();

    // Restaurar exactamente qué tenía marcado y en qué orden -- no solo
    // "todo marcado por default", que es lo que populateGoalCheckboxes
    // asume la primera vez que aparecen los checkboxes.
    const container = document.getElementById('goal-checkboxes');
    const items = Array.from(container.querySelectorAll('.goal-item'));
    items.forEach(item => {
        item.querySelector('input[type="checkbox"]').checked =
            snapshot.desiredKeys.includes(item.dataset.key);
    });
    const ordered = [
        ...snapshot.desiredKeys.map(k => items.find(i => i.dataset.key === k)).filter(Boolean),
        ...items.filter(i => !snapshot.desiredKeys.includes(i.dataset.key)),
    ];
    ordered.forEach(item => container.appendChild(item));

    // La 4ta fila es la única que falta -- llevar el foco ahí.
    const fourthSelect = rows[snapshot.substats.length]?.querySelector('.custom-select-trigger');
    fourthSelect?.focus();
}
