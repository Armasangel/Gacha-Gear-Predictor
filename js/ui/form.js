import { getProfile } from '../data/profiles/index.js';
import { Artifact } from '../models/Artifact.js';
import { Substat } from '../models/Substat.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { IconSelect } from './IconSelect.js';
import { PIECE_ICONS, STAT_ICONS } from '../data/Icons.js';
import {t} from '../i18n/i18n.js';

// Perfil de juego activo (por defecto Genshin). Se actualiza al cambiar de juego.
let activeProfile = getProfile('genshin');

export function statLabel(key){ // Devuelve el label traducido de un stat según su key
    return t(`stat.${key}`);
}

export function pieceLabel(key){ // Devuelve el label traducido de una pieza según su key
    return t(`piece.${key}`);
}

// ─── Instancias de los dropdowns con icono ─────────
let pieceSelect = null;
const substatSelects = [];
const substatValueSelects = [];

function getActiveProfile() { // Devuelve el perfil de juego activo (por defecto Genshin)
    return activeProfile;
}

// Cambia el perfil (juego) activo y reconstruye todos los selects.
export function setProfile(profile) {
    activeProfile = profile;
    if (pieceSelect) rebuildSelects();
}

export function getCurrentProfileId() { //| Devuelve el id del perfil de juego activo (por defecto "genshin")|
    return activeProfile.id;
}

function buildPieceOptions() { // Devuelve un array de opciones para el select de pieza según el perfil activo, con value, label e icono
    const p = getActiveProfile();
    return Object.keys(p.piece)
        .filter(key => p.pieceOrder.includes(key))
        .map(key => ({
            value: key,
            label: pieceLabel(key),
            icon: PIECE_ICONS[key],
        }));
}

function buildSubstatOptions() { // Devuelve un array de opciones para el select de substat según el perfil activo, con value, label e icono
    const p = getActiveProfile();
    return [
        { value: '', label: t('form.select.placeholder'), icon: null },
        ...Object.keys(p.stat).map(key => ({
            value: key,
            label: statLabel(key),
            icon: STAT_ICONS[key],
        })),
    ];
}

export function initCustomSelects() { // Inicializa los selects de pieza y substats con icono, y los eventos de cambio para repoblar los selects dependientes (mainstat, valor, checkboxes)
    // Dropdown de pieza
    const pieceWrapper = document.getElementById('pieceType-select');
    const pieceOptions = buildPieceOptions();
    pieceSelect = new IconSelect(pieceWrapper, {
        options: pieceOptions,
        value: pieceOptions[0]?.value ?? '',
        onChange: () => populateMainStats(),
    });

    // Dropdowns de substats (uno por fila)
    const substatOptions = buildSubstatOptions();

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

// Reconstruye opciones de pieza/substats preservando selecciones válidas.
// Se usa al cambiar de idioma o de juego.
function rebuildSelects() {
    const pieceOptions = buildPieceOptions();
    const previousPiece = pieceSelect?.value;
    const keepPiece = pieceOptions.some(o => o.value === previousPiece) ? previousPiece : (pieceOptions[0]?.value ?? '');
    pieceSelect.setOptions(pieceOptions, keepPiece);

    const substatOptions = buildSubstatOptions();
    substatSelects.forEach((s) => {
        const prev = s.value;
        const keep = substatOptions.some(o => o.value === prev) ? prev : '';
        s.setOptions(substatOptions, keep);
    });

    // Repoblar las opciones de valor de cada fila según el tipo conservado
    substatSelects.forEach((s, i) => {
        if (s.value) populateValueOptions(i);
        else substatValueSelects[i].setOptions([{ value: '', label: '--', icon: null }]);
    });

    populateMainStats();
    populateLevelOptions();
    populateGoalCheckboxes();
}

// Llena el select de nivel con la grilla del perfil activo (+0, +3, ...).
// Se llama al iniciar y cada vez que cambia de juego.
export function populateLevelOptions() {
    const p = getActiveProfile();
    const levelSelect = document.getElementById('level');
    const prev = levelSelect.value;
    const levels = [0, ...p.upgradeLevels];

    // Preserva el nivel previo si sigue siendo válido para este juego; en el
    // primer render (o si el previo ya no existe) cae a +0.
    const hasPrev = levels.some(lv => String(lv) === prev);

    levelSelect.innerHTML = levels.map(lv => {
        const sel = (hasPrev && String(lv) === prev) || (!hasPrev && lv === 0);
        return `<option value="${lv}" ${sel ? 'selected' : ''}>+${lv}</option>`;
    }).join('');
}

//Llena el select de valor de la fila i con los tiers reales del stat
function populateValueOptions(rowIndex) {
    const p = getActiveProfile();
    const typeKey     = substatSelects[rowIndex].value;
    const valueSelect = substatValueSelects[rowIndex];

    if (!typeKey) { // Si no hay tipo seleccionado, vacía el select de valor
        valueSelect.setOptions([{ value: '', label: '--', icon: null }]);
        return;
    }

    const { tiers } = p.stat[typeKey];
    const options = tiers.map(tier => ({
        value: String(tier),
        label: formatStatValue(typeKey, tier),
    }));

    valueSelect.setOptions(options); // ya selecciona options[0] solo
}

function formatStatValue(typeKey, tier){ // Devuelve el label del valor de un substat según su tipo y tier, con % si corresponde
    const esPorcentaje = 
        typeKey.endsWith('_PERCENT') || 
        typeKey.endsWith('CRIT_RATE') ||
        typeKey.endsWith('CRIT_DMG') || 
        typeKey === 'ENERGY_RECHARGE' || 
        typeKey === 'HEALING_BONUS' ||
        typeKey === 'ENERGY_REGEN' ||
        typeKey === 'EFFECT_HIT_RATE' || 
        typeKey === 'EFFECT_RES' ||
        typeKey === 'BREAK_EFFECT' ||
        typeKey === 'PEN';
    return esPorcentaje ? `${tier.toFixed(1)}%` : `${tier}`;
}

export function populateMainStats() { // Llena el select de mainstat según la pieza elegida y el perfil activo. Se llama al iniciar y cada vez que cambia de pieza o de juego.
    const p = getActiveProfile();
    const pieceKey   = pieceSelect.value;
    const mainSelect = document.getElementById('mainStat');
    const piece      = p.piece[pieceKey];

    mainSelect.innerHTML = '';
    if (!piece) return; // Si no hay pieza seleccionada, vacía el select de mainstat
    for (const [key, value] of Object.entries(p.mainStat)) { // Para cada mainstat del perfil, si es válido para la pieza elegida, se agrega como opción al select de mainstat
        if (piece.validMainStats.includes(value)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = statLabel(key);
            mainSelect.appendChild(option);
        }
    }
}

export function populateGoalCheckboxes() { // Llena los checkboxes de substats deseados según los substats elegidos en el form y el perfil activo. Se llama al iniciar y cada vez que cambia un substat o de juego.
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

    for (const key of ordered) { // Para cada substat seleccionado, se crea un div con un checkbox, el label del stat y botones para moverlo arriba/abajo. Se agrega al contenedor de checkboxes.
        const item = document.createElement('div');
        item.className   = 'goal-item';
        item.dataset.key = key;
        item.innerHTML = `
            <input type="checkbox" value="${key}" checked>
            <span>${statLabel(key)}</span>
            <button class="move-up"   title="${t('form.priority.high')}">▲</button>
            <button class="move-down" title="${t('form.priority.low')}">▼</button>
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

export function readForm() { // Lee el form y devuelve un objeto {artifact, goal} según lo que eligió el usuario, usando el perfil activo. Lanza errores si hay datos inválidos.
    const p = getActiveProfile();
    const pieceKey = pieceSelect.value;
    const mainKey  = document.getElementById('mainStat').value;
    const level    = parseInt(document.getElementById('level').value);

    const piece   = p.piece[pieceKey];
    const mainVal = p.mainStat[mainKey];

    // Leer substats
    const substatRows = document.querySelectorAll('.substat-row');
    const substats = [];
    substatRows.forEach((row, i) => {
        const typeKey = substatSelects[i].value;
        const value = parseFloat(substatValueSelects[i].value);
        if (typeKey && !isNaN(value)){
            substats.push(new Substat(p.stat[typeKey], value));
        }
    });

    // Leer BuildGoal EN ORDEN DE PRIORIDAD
    const items = document.querySelectorAll('#goal-checkboxes .goal-item');
    const desiredStats = [];
    for (const item of items) {
        const cb = item.querySelector('input[type="checkbox"]');
        if (cb.checked) {
            desiredStats.push(p.stat[item.dataset.key]);
        }
    }

    const artifact = new Artifact(piece, mainVal, level, substats, p);
    const goal     = new BuildGoal(desiredStats);

    return { artifact, goal };
}

// Re-renderiza los labels del form al idioma activo SIN tocar lo que ya
// eligió el usuario: reconstruye options y triggers, preserva la selección
// de pieza/substats/mainstat y solo actualiza los nombres de los checkboxes.
export function refreshForm() {
    rebuildSelects();

    const mainSelect = document.getElementById('mainStat');
    const mainValue  = mainSelect.value;
    // rebuildSelects ya llama populateMainStats; re-seleccionamos si sigue válido
    const validMain = [...mainSelect.options].some(o => o.value === mainValue);
    if (validMain) mainSelect.value = mainValue;

    document.querySelectorAll('#goal-checkboxes .goal-item').forEach(item => {
        item.querySelector('span').textContent = statLabel(item.dataset.key);
    });
}

export function resetSubstatSelects() { // Vacia los selects de substat y valor, dejando la 4ta fila vacía. Se llama al cambiar de juego o al resetear el form.
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