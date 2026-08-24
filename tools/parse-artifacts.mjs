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

function round1(v) {
  return Math.round(v * 10 + 1e-9) / 10;
}

function buildFeasible(tiers) {
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
for (const [mainDef, subDef] of MAINSTAT_TO_SUBSTAT.entries()) {
  const mainKey = Object.keys(MainStatType).find(k => MainStatType[k] === mainDef);
  const subKey = Object.keys(StatType).find(k => StatType[k] === subDef);
  if (mainKey && subKey) SUBSTAT_EQUIV[mainKey] = subKey;
}

function levelTable(mainKey) {
  const v20 = MAIN_V20[mainKey];
  if (!v20) return [];
  const v0 = v20 / RATIO;
  return [0, 4, 8, 12, 16, 20].map(L => ({ level: L, v: v0 * Math.pow(RATIO, L / 20) }));
}

function inferLevel(mainKey, value) {
  const isFlat = mainKey === 'HP_FLAT' || mainKey === 'ATK_FLAT' || mainKey === 'ELEMENTAL_MASTERY';
  for (const { level, v } of levelTable(mainKey)) {
    const tol = isFlat ? Math.max(4, v * 0.06) : Math.max(0.35, v * 0.03);
    if (Math.abs(value - v) <= tol) return level;
  }
  return null;
}

function detectPiece(text) {
  for (const [piece, re] of PIECE_PATTERNS) {
    const m = text.match(re);
    if (m) return { piece, index: m.index, lineIndex: text.slice(0, m.index).split(/\r?\n/).length - 1 };
  }
  return null;
}

function detectMainName(blockNorm) {
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

function extractPctValue(block) {
  let m = block.match(/(\d{1,2}[.,]\d)\s*%/);
  if (!m) m = block.match(/(\d{1,2}[.,]\d)(?![\d])/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return Number.isFinite(v) && v > 0 && v <= 100 ? round1(v) : null;
}

function extractEmValue(block) {
  const candidates = [...block.matchAll(/(?:^|[^\d.])(\d{2,3})(?:[^\d.]|$)/g)].map(m => +m[1]);
  const ok = candidates.filter(v => v >= 18 && v <= 260);
  if (!ok.length) return null;
  return ok.reduce((best, v) => (Math.abs(v - 28) < Math.abs(best - 28) ? v : best));
}

function extractFlatCandidates(block, min, max) {
  const thou = [...block.matchAll(/\b(\d{1,2})[ \u00a0](\d{3})\b/g)].map(m => +(m[1] + m[2]));
  const plain = [...block.matchAll(/\b(\d{2,4})\b/g)].map(m => +m[1]);
  return [...new Set([...thou, ...plain])].filter(v => v >= min && v <= max);
}

function extractFlatMain(block, mainKey) {
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

function classifyStatName(nameNorm) {
  if (/recarga|energi/.test(nameNorm)) return 'ENERGY_RECHARGE';
  if (/mae|elemental/.test(nameNorm)) return 'ELEMENTAL_MASTERY';
  if (/\bcrit\b/.test(nameNorm)) return /da[nñ]o/.test(nameNorm) ? 'CRIT_DMG' : 'CRIT_RATE';
  if (/\bat[qkc]\b/.test(nameNorm)) return 'ATQ';
  if (/\bvida\b|\bhp\b/.test(nameNorm)) return 'VIDA';
  if (/\bdef\b/.test(nameNorm)) return 'DEF';
  return null;
}

function parseStatLine(line) {
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

function parseEntry(entry, source) {
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

  if (mainKey) {
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
  if (mainKey && mainValue != null) {
    level = inferLevel(mainKey, mainValue);
    if (level != null) levelSource = 'anchor';
  }
  if (level == null && source === 'con' && mainValue != null) {
    push('LEVEL_NO_ANCLA', `${mainKey ?? '(sin nombre)'}=${mainValue} (¿nivel intermedio u otra rareza?)`);
  }
  if (level == null && source === 'sin') {
    level = 0;
    levelSource = 'assumed-batch';
    if (mainValue != null) push('LEVEL_ASSUMED', `valor ${mainValue} no calza con tabla +0`);
  }

  const stats = [];
  for (let i = firstBulletIdx; i < lines.length; i++) {
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
  for (const s of actives) {
    const id = `${s.key}`;
    if (seen.has(id)) push('DUP_SUBSTAT', `${s.key} x${mainValue ?? ''}`);
    seen.add(id);
  }
  if (pendings.length > 1) push('MULTIPLE_PENDING', `${pendings.length} marcados`);

  if (mainKey && SUBSTAT_EQUIV[mainKey]) {
    const clash = actives.find(s => s.key === SUBSTAT_EQUIV[mainKey]);
    if (clash) push('SUBSTAT_IGUAL_AL_MAIN', clash.key);
  }

  for (const s of actives) {
    if (!FEASIBLE[s.key].has(s.value)) {
      push('INVALID_VALUE', `${s.key} = ${s.value}`);
    }
  }

  const activeKeys = new Set(actives.map(s => s.key));
  for (const p of pendings) {
    if (activeKeys.has(p.key)) push('PENDING_DUPLICADO', p.key);
  }

  const expectedActives = source === 'sin' ? [3, 4] : [4];
  if (!expectedActives.includes(actives.length)) {
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

function clusterKey(r) {
  return `${r.piece}/${r.main?.key ?? '(sin nombre)'}`;
}

function buildClusters(records) {
  const groups = new Map();
  for (const r of records) {
    if (r.main?.value == null) continue;
    const k = clusterKey(r);
    if (!groups.has(k)) groups.set(k, new Map());
    const g = groups.get(k);
    g.set(r.main.value, (g.get(r.main.value) ?? 0) + 1);
  }
  const out = {};
  for (const [k, g] of groups) {
    out[k] = Object.fromEntries([...g.entries()].sort((a, b) => a[0] - b[0]));
  }
  return out;
}

function summarize(records) {
  const counts = { total: records.length, ok: 0, partial: 0, failed: 0 };
  const issueCounts = {};
  for (const r of records) {
    counts[r.status]++;
    for (const i of r.issues) issueCounts[i.code] = (issueCounts[i.code] ?? 0) + 1;
  }
  return { counts, issueCounts };
}

function parseArgs(argv) {
  const args = { in: [], out: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in') args.in.push(resolve(argv[++i]));
    else if (argv[i] === '--out') args.out = resolve(argv[++i]);
  }
  if (!args.in.length) args.in.push(resolve(DEFAULT_IN));
  return args;
}

function collectInputFiles(paths) {
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

function sourceOf(filename) {
  return /sin[\-_]?nivel/i.test(filename) ? 'sin' : 'con';
}

function run() {
  const args = parseArgs(process.argv);
  const files = collectInputFiles(args.in);
  if (!files.length) {
    console.error('No se encontraron archivos JSON de entrada.');
    process.exit(1);
  }

  const outDir = args.out ?? join(dirname(files[0]), 'parsed');
  mkdirSync(outDir, { recursive: true });

  const report = { generatedAt: new Date().toISOString(), sources: {}, clusters: {}, failed: [] };

  for (const file of files) {
    const source = sourceOf(basename(file));
    let entries;
    try {
      entries = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`JSON inválido: ${file}`);
      continue;
    }
    if (!Array.isArray(entries)) {
      console.error(`Formato inesperado (se esperaba un array): ${file}`);
      continue;
    }

    const records = entries.map(e => parseEntry(e, source));
    const { counts, issueCounts } = summarize(records);

    const outName = `parsed-${basename(file).replace(/\.json$/i, '')}.json`;
    writeFileSync(join(outDir, outName), JSON.stringify(records, null, 2));

    report.sources[source] = { file: basename(file), ...counts, issueCounts };
    for (const r of records) {
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
  for (const f of report.failed) {
    md.push(`- ${f.archivo} [${f.source}] → ${f.issues.map(i => i.code).join(', ')}`);
  }
  md.push('\n## Clusters de mainstat (para calibrar niveles)');
  for (const [k, vals] of Object.entries(report.clusters)) {
    md.push(`- ${k}: ${Object.entries(vals).map(([v, n]) => `${v}×${n}`).join(', ')}`);
  }
  writeFileSync(join(outDir, 'report.md'), md.join('\n'));

  console.log(`\nSalidas en: ${outDir}`);
  console.log(`  parsed-*.json, report.json, report.md`);
  console.log(`Fallidos totales: ${report.failed.length}`);
}

run();
