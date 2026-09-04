#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname, basename, dirname } from 'node:path';
import { StatType } from '../js/data/StatType.js';
import { MainStatType } from '../js/data/MainStatType.js';
import { MAINSTAT_TO_SUBSTAT } from '../js/data/StatMapping.js';

const DEFAULT_IN = 'D:/Angel/Documents/data-artefactos';
const RATIO = 6.666;

const PIECE_PATTERNS = [
  ['FLOWER',  /flor\s+d[eÉ]\s+la\s+vid/i],
  ['PLUME',   /pluma\s+de\s+la\s+muert/i],
  ['SANDS',   /arenas\s+del\s+e/i],
  ['GOBLET',  /c[aá]liz\s+de\s+eo/i],
  ['CIRCLET', /tiara\s+de\s+lo/i]
];

const ELEMENTS = {
  pyro: 'PYRO', hydro: 'HYDRO', cryo: 'CRYO', electro: 'ELECTRO',
  anemo: 'ANEMO', geo: 'GEO', dendro: 'DENDRO', fisico: 'PHYSICAL'
};

const PCT_ONLY_KEYS = new Set([
  'ENERGY_RECHARGE', 'CRIT_RATE', 'CRIT_DMG', 'HEALING_BONUS',
  'PYRO_DMG_BONUS', 'HYDRO_DMG_BONUS', 'CRYO_DMG_BONUS', 'ELECTRO_DMG_BONUS',
  'ANEMO_DMG_BONUS', 'GEO_DMG_BONUS', 'DENDRO_DMG_BONUS', 'PHYSICAL_DMG_BONUS',
  'HP_PERCENT', 'ATK_PERCENT', 'DEF_PERCENT'
]);

const MAIN_V20 = {};
for (const [key, def] of Object.entries(MainStatType)) MAIN_V20[key] = def.value;

const norm = s => s
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function round1(v) { // Redondea un número a 1 decimal, evitando errores de precisión flotante
  return Math.round(v * 10 + 1e-9) / 10;
}

function buildFeasible(tiers) { // Construye un conjunto de valores factibles para un substat dado sus tiers. Se generan todas las combinaciones de 9 rolls distribuidos entre los tiers, sumando los valores y redondeando a 1 decimal. Devuelve un Set con los valores factibles.
  const out = new Set();
  const rec = (i, left, sum) => {
    if (left < 9) out.add(round1(sum));
    if (i === tiers.length || left === 0) return;
    for (let c = 0; c <= left; c++) rec(i + 1, left - c, sum + c * tiers[i]);
  };
  rec(0, 9, 0);
  return out;
}

const FEASIBLE = {};
for (const [key, def] of Object.entries(StatType)) FEASIBLE[key] = buildFeasible(def.tiers);

const SUBSTAT_EQUIV = {};
for (const [mainDef, subDef] of MAINSTAT_TO_SUBSTAT.entries()) { // Construye un mapa de equivalencias entre MainStatType y StatType según MAINSTAT_TO_SUBSTAT. Se busca la clave correspondiente en MainStatType y StatType para cada par de valores, y se almacena en SUBSTAT_EQUIV. Esto permite verificar si un main stat coincide con algún substat.
  const mainKey = Object.keys(MainStatType).find(k => MainStatType[k] === mainDef);
  const subKey = Object.keys(StatType).find(k => StatType[k] === subDef);
  if (mainKey && subKey) SUBSTAT_EQUIV[mainKey] = subKey;
}

function levelTable(mainKey) { // Devuelve una tabla de niveles y valores para un main stat dado, según MAIN_V20 y RATIO. Se calcula el valor base a nivel 0 y se generan los valores para los niveles 0, 4, 8, 12, 16 y 20 usando la fórmula v0 * (RATIO)^(L/20). Si no hay valor definido para el main stat, devuelve un array vacío.
  const v20 = MAIN_V20[mainKey];
  if (!v20) return []; // Si no hay valor definido para el main stat, devuelve un array vacío
  const v0 = v20 / RATIO;
  return [0, 4, 8, 12, 16, 20].map(L => ({ level: L, v: v0 * Math.pow(RATIO, L / 20) }));
}

function inferLevel(mainKey, value) { // Infiera el nivel de un main stat dado su valor y la tabla de niveles correspondiente. Se calcula la tolerancia para cada nivel según si es flat o no, y se devuelve el nivel cuyo valor esté dentro de la tolerancia. Si no se encuentra ningún nivel válido, devuelve null.
  const isFlat = mainKey === 'HP_FLAT' || mainKey === 'ATK_FLAT' || mainKey === 'ELEMENTAL_MASTERY';
  for (const { level, v } of levelTable(mainKey)) { // Para cada nivel, calcula la tolerancia según si es flat o no, y verifica si el valor dado está dentro de la tolerancia. Si es así, devuelve el nivel correspondiente.
    const tol = isFlat ? Math.max(4, v * 0.06) : Math.max(0.35, v * 0.03);
    if (Math.abs(value - v) <= tol) return level; // Devuelve el nivel si el valor está dentro de la tolerancia
  }
  return null;
}

function detectPiece(text) { // Detecta la pieza de artefacto en un texto dado, buscando coincidencias con los patrones definidos en PIECE_PATTERNS. Devuelve un objeto con la pieza detectada, el índice de la coincidencia y el índice de línea correspondiente. Si no se encuentra ninguna coincidencia, devuelve null.
  for (const [piece, re] of PIECE_PATTERNS) {
    const m = text.match(re);
    if (m) return { piece, index: m.index, lineIndex: text.slice(0, m.index).split(/\r?\n/).length - 1 };
  }
  return null;
}

function detectMainName(blockNorm) { // Detecta el nombre del main stat en un bloque de texto normalizado, buscando coincidencias con patrones específicos para cada tipo de main stat. Devuelve un objeto con la clave del main stat detectado y, si es un bono de daño elemental, la clave del elemento correspondiente. Si no se encuentra ninguna coincidencia, devuelve { key: null }.
  let m;
  if (/bono de curaci/.test(blockNorm)) return { key: 'HEALING_BONUS' };
  if ((m = blockNorm.match(/bono de da[nñ]o\s+([a-z]+)/))) {
    const el = ELEMENTS[m[1]];
    if (el) return { key: `${el}_DMG_BONUS` };
    return { key: null, note: 'DMG_BONUS_ILEGIBLE' };
  }
  if (/recarga|energi/.test(blockNorm)) return { key: 'ENERGY_RECHARGE' };
  if (/mae|elemental/.test(blockNorm)) return { key: 'ELEMENTAL_MASTERY' };
  if (/\bcrit\b/.test(blockNorm)) {
    return /da[nñ]o/.test(blockNorm) ? { key: 'CRIT_DMG' } : { key: 'CRIT_RATE' };
  }
  if (/\bdef\b/.test(blockNorm)) return { key: 'DEF_PERCENT' };
  if (/\bat[qkc]\b/.test(blockNorm)) return { key: 'ATK_PERCENT' };
  if (/\bvida\b|\bhp\b/.test(blockNorm)) return { key: 'HP_PERCENT' };
  return { key: null };
}

function extractPctValue(block) { // Extrae un valor porcentual de un bloque de texto, buscando coincidencias con patrones de porcentaje o números decimales. Devuelve el valor como un número redondeado a 1 decimal si es válido (entre
  let m = block.match(/(\d{1,2}[.,]\d)\s*%/);
  if (!m) m = block.match(/(\d{1,2}[.,]\d)(?![\d])/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v <= 100 ? round1(v) : null;
}

function extractEmValue(block) { // Extrae un valor de maestría elemental de un bloque de texto, buscando coincidencias con patrones de números enteros o decimales. Devuelve el valor como un número redondeado a 1 decimal si es válido (entre 1 y 1000). Si no se encuentra ningún valor válido, devuelve null.
  const candidates = [...block.matchAll(/(?:^|[^\d.])(\d{2,3})(?:[^\d.]|$)/g)].map(m => +m[1]);
  const ok = candidates.filter(v => v >= 18 && v <= 260);
  if (!ok.length) return null;
  return ok.reduce((best, v) => (Math.abs(v - 28) < Math.abs(best - 28) ? v : best));
}

function extractFlatCandidates(block, min, max) { // Extrae candidatos a valores flat de un bloque de texto, buscando coincidencias con patrones de miles (1 000) o números enteros de 2 a 4 dígitos. Devuelve un array con los valores únicos que estén dentro del rango [min, max].
  const thou = [...block.matchAll(/\b(\d{1,2})[ \u00a0](\d{3})\b/g)].map(m => +(m[1] + m[2]));
  const plain = [...block.matchAll(/\b(\d{2,4})\b/g)].map(m => +m[1]);
  return [...new Set([...thou, ...plain])].filter(v => v >= min && v <= max);
}

function extractFlatMain(block, mainKey) { // Extrae un valor flat de un bloque de texto para un main stat específico (HP_FLAT o ATK_FLAT), buscando candidatos dentro de un rango definido. Se utiliza la tabla de niveles correspondiente para determinar el valor más cercano al bloque, y se devuelve el valor redondeado a 1 decimal si es válido. Si no se encuentra ningún valor válido, devuelve null.
  const table = levelTable(mainKey);
  let range;
  if (mainKey === 'HP_FLAT') range = [500, 5200];
  else if (mainKey === 'ATK_FLAT') range = [35, 340];
  else return null;
  const cands = extractFlatCandidates(block, range[0], range[1]);
  if (!cands.length) return null;
  let best = null;
  for (const v of cands) {
    const near = table.length ? Math.min(...table.map(e => Math.abs(v - e.v))) : Infinity;
    if (!best || near < best.near) best = { v, near };
  }
  return best.v;
}

function classifyStatName(nameNorm) { // Clasifica un nombre de stat normalizado en una clave de StatType, buscando coincidencias con patrones específicos para cada tipo de stat. Devuelve la clave correspondiente si se encuentra una coincidencia, o null si no se encuentra ninguna coincidencia.
  if (/recarga|energi/.test(nameNorm)) return 'ENERGY_RECHARGE';
  if (/mae|elemental/.test(nameNorm)) return 'ELEMENTAL_MASTERY';
  if (/\bcrit\b/.test(nameNorm)) return /da[nñ]o/.test(nameNorm) ? 'CRIT_DMG' : 'CRIT_RATE';
  if (/\bat[qkc]\b/.test(nameNorm)) return 'ATQ';
  if (/\bvida\b|\bhp\b/.test(nameNorm)) return 'VIDA';
  if (/\bdef\b/.test(nameNorm)) return 'DEF';
  return null;
}

function parseStatLine(line) { // Parsea una línea de texto que representa un substat, extrayendo la clave, el valor y si está pendiente de activación. Devuelve un objeto con la clave del substat, el valor redondeado a 1 decimal y un indicador de si está pendiente. Si no se puede parsear la línea, devuelve { ok: false, line }.
  const hasPending = /\(\s*por\s+activar\s*\)/i.test(line);
  const body = line
    .replace(/^\s*[•*+\-–—]+\s*/, '')
    .replace(/\(\s*por\s+activar\s*\)/i, '')
    .trim();
  const vm = body.match(/\+\s*([0-9][0-9\s.,]{0,9})/);
  if (!vm) return { ok: false, line };
  const value = parseFloat(vm[1].replace(/[\s]/g, '').replace(/,/g, '.'));
  if (!Number.isFinite(value)) return { ok: false, line };
  const nameNorm = norm(body.slice(0, vm.index));
  const cls = classifyStatName(nameNorm);
  if (!cls) return { ok: false, line };
  const hasPct = body.includes('%');
  let key;
  if (cls === 'ENERGY_RECHARGE' || cls === 'CRIT_RATE' || cls === 'CRIT_DMG') key = cls;
  else if (cls === 'ELEMENTAL_MASTERY') key = 'ELEMENTAL_MASTERY';
  else if (cls === 'ATQ') key = hasPct ? 'ATK_PERCENT' : 'ATK_FLAT';
  else if (cls === 'VIDA') key = hasPct ? 'HP_PERCENT' : 'HP_FLAT';
  else key = hasPct ? 'DEF_PERCENT' : 'DEF_FLAT';
  return {
    ok: true,
    stat: { key, value: round1(value), pending: hasPending },
    line
  };
}

function parseEntry(entry, source) { // Parsea un registro de artefacto dado su texto y el origen (con o sin). Devuelve un objeto con la información del artefacto, incluyendo archivo, setName, pieza, main stat, substats, substat pendiente y problemas encontrados. Si no se puede parsear el registro, devuelve un objeto con status 'failed' y los problemas encontrados.
  const raw = entry.texto ?? '';
  const issues = [];
  const push = (code, detail) => issues.push({ code, detail });

  let piece = null;
  let pieceIdx = -1;
  const pieceHit = detectPiece(raw);
  if (pieceHit) {
    piece = pieceHit.piece;
    pieceIdx = pieceHit.lineIndex;
  } else {
    const nRaw = norm(raw);
    if (/bono de dano/.test(nRaw)) { piece = 'GOBLET'; push('PIECE_INFERIDA', 'goblet vía bono-de-daño'); }
    else if (/bono de curaci/.test(nRaw)) { piece = 'CIRCLET'; push('PIECE_INFERIDA', 'circlet vía bono-de-curación'); }
  }
  if (!piece) {
    return {
      archivo: entry.archivo, source, setName: null, piece: null,
      main: null, substats: [], pending: null,
      issues: [{ code: 'NO_PIECE', detail: 'no se reconoció el tipo de pieza' }],
      status: 'failed', raw
    };
  }

  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let firstBulletIdx = lines.length;
  for (let i = pieceIdx + 1; i < lines.length; i++) {
    if (/^[•*+\-–—]\s*\S/.test(lines[i])) { firstBulletIdx = i; break; }
  }

  const setName = (pieceIdx >= 0 ? lines.slice(0, pieceIdx) : lines.slice(0, Math.max(firstBulletIdx - 1, 0)))
    .join(' ')
    .replace(/[:;,.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const mainBlockLines = lines.slice(pieceIdx + 1, firstBulletIdx);
  const mainBlockOrig = mainBlockLines.join(' ');
  const mainBlockNorm = norm(mainBlockOrig);

  const forcedKey = piece === 'FLOWER' ? 'HP_FLAT'
    : piece === 'PLUME' ? 'ATK_FLAT'
    : null;

  const nameInfo = forcedKey ? { key: forcedKey } : detectMainName(mainBlockNorm);
  if (nameInfo.note) push('MAIN_ILEGIBLE', nameInfo.note);
  else if (!nameInfo.key && !forcedKey) push('NO_MAIN_NAME', `bloque: "${mainBlockOrig.slice(0, 60)}"`);

  let mainKey = nameInfo.key ?? null;
  let mainValue = null;

  if (mainKey) { // Si se detectó un main stat, se extrae su valor según el tipo de stat. Si es un stat porcentual, se extrae el valor porcentual; si es maestría elemental, se extrae el valor de EM; si es flat, se extrae el valor flat correspondiente. Si no se encuentra ningún valor válido, se registra un problema.
    if (PCT_ONLY_KEYS.has(mainKey)) mainValue = extractPctValue(mainBlockOrig);
    else if (mainKey === 'ELEMENTAL_MASTERY') mainValue = extractEmValue(mainBlockOrig);
    else mainValue = extractFlatMain(mainBlockOrig, mainKey);
    if (mainValue == null) push('MAIN_VALUE_MISSING', mainKey);
  } else {
    mainValue = extractPctValue(mainBlockOrig);
    if (mainValue != null) push('MAIN_VALUE_SIN_NOMBRE', `valor suelto: ${mainValue}`);
  }

  let level = null;
  let levelSource = 'unknown';
  if (mainKey && mainValue != null) { // Si se detectó un main stat y su valor, se infiere el nivel correspondiente usando la tabla de niveles. Si se encuentra un nivel válido, se registra la fuente como 'anchor'.
    level = inferLevel(mainKey, mainValue);
    if (level != null) levelSource = 'anchor';
  }
  if (level == null && source === 'con' && mainValue != null) { // Si no se pudo inferir el nivel y el origen es 'con', se asume que es un nivel intermedio u otra rareza, y se registra un problema.
    push('LEVEL_NO_ANCLA', `${mainKey ?? '(sin nombre)'}=${mainValue} (¿nivel intermedio u otra rareza?)`);
  }
  if (level == null && source === 'sin') { // Si no se pudo inferir el nivel y el origen es 'sin', se asume que es un nivel +0, y se registra un problema si el valor no calza con la tabla de niveles.
    level = 0;
    levelSource = 'assumed-batch';
    if (mainValue != null) push('LEVEL_ASSUMED', `valor ${mainValue} no calza con tabla +0`);
  }

  const stats = [];
  for (let i = firstBulletIdx; i < lines.length; i++) { // Se recorren las líneas de substats, parseando cada línea y registrando los substats válidos. Si se encuentra un substat pendiente de activación, se marca como pendiente. Si no se puede parsear una línea, se registra un problema.
    const line = lines[i];
    if (/^\(\s*por\s+activar\s*\)$/i.test(line)) {
      if (stats.length) stats[stats.length - 1].pending = true;
      continue;
    }
    const res = parseStatLine(line);
    if (res.ok) stats.push(res.stat);
    else if (/[a-z]/i.test(line) && !/^[•*+\-–—]/.test(line)) continue;
    else push('SUBSTAT_ILEGIBLE', line.slice(0, 50));
  }

  const pendings = stats.filter(s => s.pending);
  const actives = stats.filter(s => !s.pending);

  const seen = new Set();
  for (const s of actives) { // Se verifica si hay substats duplicados entre los activos, y se registra un problema si se encuentra alguno. Se utiliza un Set para llevar un registro de los substats ya vistos.
    const id = `${s.key}`;
    if (seen.has(id)) push('DUP_SUBSTAT', `${s.key} x${mainValue ?? ''}`);
    seen.add(id);
  }
  if (pendings.length > 1) push('MULTIPLE_PENDING', `${pendings.length} marcados`);

  if (mainKey && SUBSTAT_EQUIV[mainKey]) { // Se verifica si hay un substat activo que sea equivalente al main stat, y se registra un problema si se encuentra alguno. Se utiliza SUBSTAT_EQUIV para determinar la equivalencia entre main stat y substat.
    const clash = actives.find(s => s.key === SUBSTAT_EQUIV[mainKey]);
    if (clash) push('SUBSTAT_IGUAL_AL_MAIN', clash.key);
  }

  for (const s of actives) { // Se verifica si los valores de los substats activos son factibles según FEASIBLE, y se registra un problema si se encuentra algún valor inválido. Se utiliza FEASIBLE para determinar los valores válidos para cada substat.
    if (!FEASIBLE[s.key].has(s.value)) {
      push('INVALID_VALUE', `${s.key} = ${s.value}`);
    }
  }

  const activeKeys = new Set(actives.map(s => s.key));
  for (const p of pendings) { // Se verifica si hay substats pendientes que ya estén activos, y se registra un problema si se encuentra alguno. Se utiliza un Set para llevar un registro de los substats activos.
    if (activeKeys.has(p.key)) push('PENDING_DUPLICADO', p.key);
  }

  const expectedActives = source === 'sin' ? [3, 4] : [4];
  if (!expectedActives.includes(actives.length)) { // Se verifica si la cantidad de substats activos es la esperada según el origen, y se registra un problema si no coincide. Se utiliza expectedActives para determinar los valores válidos según el origen.
    push('BAD_COUNT', `${actives.length} substats activos (esperados: ${expectedActives.join('/')})`);
  }
  if (source === 'con' && pendings.length > 0) push('PENDING_EN_SUBIDO', 'marcador por-activar en pieza nivelada');

  const pending = pendings.length ? pendings[pendings.length - 1] : null;

  const usable = piece && (actives.length > 0 || mainValue != null);
  const status = !usable ? 'failed' : (issues.length ? 'partial' : 'ok');

  return {
    archivo: entry.archivo,
    source,
    setName,
    piece,
    main: mainKey || mainValue != null
      ? { key: mainKey, value: mainValue, level, levelSource }
      : null,
    substats: actives.map(({ key, value }) => ({ key, value })),
    pending: pending ? { key: pending.key, value: pending.value } : null,
    issues,
    status,
    raw
  };
}

function clusterKey(r) { // Construye una clave de cluster para un registro de artefacto, combinando la pieza y la clave del main stat. Si no hay main stat, se utiliza '(sin nombre)' como valor por defecto.
  return `${r.piece}/${r.main?.key ?? '(sin nombre)'}`;
}

function buildClusters(records) { // Construye un objeto de clusters a partir de los registros de artefactos, agrupando por pieza y main stat. Se utiliza un Map para agrupar los registros y contar las ocurrencias de cada valor de main stat. Luego se convierte el Map en un objeto con claves de cluster y valores ordenados por valor de main stat.
  const groups = new Map();
  for (const r of records) {
    if (r.main?.value == null) continue;
    const k = clusterKey(r);
    if (!groups.has(k)) groups.set(k, new Map());
    const g = groups.get(k);
    g.set(r.main.value, (g.get(r.main.value) ?? 0) + 1);
  }
  const out = {};
for (const [k, g] of groups) { // Se convierte el Map de cada cluster en un objeto ordenado por valor de main stat, y se asigna al objeto de salida con la clave del cluster correspondiente.
    out[k] = Object.fromEntries([...g.entries()].sort((a, b) => a[0] - b[0]));
  }
  return out;
}

function summarize(records) { // Resume los resultados de los registros de artefactos, contando la cantidad total, ok, parcial y fallido, así como la cantidad de ocurrencias de cada código de issue. Devuelve un objeto con los conteos y los conteos de issues.
  const counts = { total: records.length, ok: 0, partial: 0, failed: 0 };
  const issueCounts = {};
  for (const r of records) {
    counts[r.status]++;
    for (const i of r.issues) issueCounts[i.code] = (issueCounts[i.code] ?? 0) + 1;
  }
  return { counts, issueCounts };
}

function parseArgs(argv) { // Parsea los argumentos de línea de comandos, buscando las opciones --in y --out. Devuelve un objeto con las rutas de entrada y salida resueltas. Si no se especifica ninguna ruta de entrada, se utiliza DEFAULT_IN como valor por defecto.
  const args = { in: [], out: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in') args.in.push(resolve(argv[++i]));
    else if (argv[i] === '--out') args.out = resolve(argv[++i]);
  }
  if (!args.in.length) args.in.push(resolve(DEFAULT_IN));
  return args;
}

function collectInputFiles(paths) { // Recolecta los archivos JSON de entrada a partir de las rutas especificadas, buscando archivos con extensión .json y excluyendo aquellos que comiencen con 'parsed-' o 'report'. Devuelve un array con las rutas completas de los archivos encontrados.
  const files = [];
  for (const p of paths) {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const f of readdirSync(p)) {
        if (/\.json$/i.test(f) && !/^parsed-/i.test(f) && !/^report/i.test(f)) {
          files.push(join(p, f));
        }
      }
    } else files.push(p);
  }
  return files;
}

function sourceOf(filename) { // Determina el origen del archivo de artefactos a partir de su nombre, buscando coincidencias con patrones específicos para 'sin' o 'con'. Devuelve 'sin' si se encuentra una coincidencia con 'sin nivel', o 'con' en caso contrario.
  return /sin[\-_]?nivel/i.test(filename) ? 'sin' : 'con';
}

function run() { // Función principal que ejecuta el proceso de parsing de artefactos. Parsea los argumentos, recolecta los archivos de entrada, crea el directorio de salida y procesa cada archivo, generando un reporte final en formato JSON y Markdown.
  const args = parseArgs(process.argv);
  const files = collectInputFiles(args.in);
  if (!files.length) {
    console.error('No se encontraron archivos JSON de entrada.');
    process.exit(1);
  }

  const outDir = args.out ?? join(dirname(files[0]), 'parsed');
  mkdirSync(outDir, { recursive: true });

  const report = { generatedAt: new Date().toISOString(), sources: {}, clusters: {}, failed: [] };

  for (const file of files) { // Se procesa cada archivo de entrada, parseando los registros de artefactos y generando un reporte parcial. Se maneja la lectura del archivo, el parseo de JSON, la generación de registros y el resumen de resultados. Se escriben los resultados en archivos JSON y se actualiza el reporte final.
    const source = sourceOf(basename(file));
    let entries;
    try {
      entries = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`JSON inválido: ${file}`);
      continue;
    }
    if (!Array.isArray(entries)) { // Se verifica que el contenido del archivo sea un array de registros, y se muestra un error si no lo es.
      console.error(`Formato inesperado (se esperaba un array): ${file}`);
      continue;
    }

    const records = entries.map(e => parseEntry(e, source));
    const { counts, issueCounts } = summarize(records);

    const outName = `parsed-${basename(file).replace(/\.json$/i, '')}.json`;
    writeFileSync(join(outDir, outName), JSON.stringify(records, null, 2));

    report.sources[source] = { file: basename(file), ...counts, issueCounts };
    for (const r of records) { // Se agregan los registros fallidos al reporte final, incluyendo el archivo de origen, el origen y los problemas encontrados.
      if (r.status === 'failed') report.failed.push({ archivo: r.archivo, source, issues: r.issues });
    }

    console.log(`\n== ${basename(file)} (${source}) ==`);
    console.log(`  total: ${counts.total}  ok: ${counts.ok}  parcial: ${counts.partial}  fallido: ${counts.failed}`);
    const issueLines = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
    if (issueLines.length) {
      console.log('  issues: ' + issueLines.map(([c, n]) => `${c}(${n})`).join('  '));
    }

    Object.assign(report.clusters, buildClusters(records));
  }

  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));

  const md = [];
  md.push(`# Reporte de parsing — ${report.generatedAt}\n`);
  for (const [src, s] of Object.entries(report.sources)) {
    md.push(`## ${src} — ${s.file}`);
    md.push(`- total: ${s.total} | ok: ${s.ok} | parcial: ${s.partial} | fallido: ${s.failed}`);
    md.push(`- issues: ${Object.entries(s.issueCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(', ') || 'ninguno'}\n`);
  }
  md.push(`## Fallidos totales: ${report.failed.length}`);
  for (const f of report.failed) { // Se agregan los registros fallidos al reporte en formato Markdown, mostrando el archivo de origen, el origen y los códigos de los problemas encontrados.
    md.push(`- ${f.archivo} [${f.source}] → ${f.issues.map(i => i.code).join(', ')}`);
  }
  md.push('\n## Clusters de mainstat (para calibrar niveles)');
  for (const [k, vals] of Object.entries(report.clusters)) { // Se agregan los clusters de main stat al reporte en formato Markdown, mostrando la pieza y el main stat, así como los valores y sus ocurrencias. Se utiliza Object.entries para recorrer los valores y se formatea la salida.
    md.push(`- ${k}: ${Object.entries(vals).map(([v, n]) => `${v}×${n}`).join(', ')}`);
  }
  writeFileSync(join(outDir, 'report.md'), md.join('\n'));

  console.log(`\nSalidas en: ${outDir}`);
  console.log(`  parsed-*.json, report.json, report.md`);
  console.log(`Fallidos totales: ${report.failed.length}`);
}

run();
