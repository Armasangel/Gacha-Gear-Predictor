import fs from 'node:fs';
import path from 'node:path';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { mapRecords, analyzeBatch } from '../js/io/batchImport.js';

const args = process.argv.slice(2);
const iterations = Math.max(50, parseInt(args.find(a => /^--iter=\d+$/.test(a))?.slice(7) ?? '4000', 10));
const inputs = args.filter(a => !a.startsWith('--')).map(p => path.resolve(p));
const files = [];

for (const target of inputs) {
    if (fs.statSync(target).isDirectory()) {
        for (const f of fs.readdirSync(target)) {
            if (/^parsed-.*\.json$/.test(f) && !f.includes('resultados')) {
                files.push(path.join(target, f));
            }
        }
    } else {
        files.push(target);
    }
}

if (!files.length) {
    console.error('Uso: node tools/batch-preview.mjs <parsed-*.json o directorio> [--iter=N]');
    process.exit(1);
}

const records = [];
for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!Array.isArray(parsed)) throw new Error(`Se esperaba un array en ${file}`);
    console.log(`leyendo ${path.basename(file)}: ${parsed.length} registros`);
    records.push(...parsed);
}

console.log(`total registros: ${records.length} · iteraciones por pieza: ${iterations}\n`);

const { mapped, skipped } = mapRecords(records);

const skipCounts = {};
for (const s of skipped) {
    skipCounts[s.reason] = (skipCounts[s.reason] ?? 0) + 1;
}
for (const [reason, count] of Object.entries(skipCounts)) {
    console.log(`omitidos (${reason}): ${count}`);
}

const t0 = performance.now();
const rows = await analyzeBatch(mapped, new BuildGoal([]), { iterations });
const ms = Math.round(performance.now() - t0);
console.log(`analizadas: ${rows.length} en ${ms}ms\n`);

const known = rows.filter(r => r.fourthKnown).length;
const byVerdict = { INVERTIR: 0, CONSIDERAR: 0, DESCARTAR: 0 };
let investSum = 0;
for (const r of rows) {
    byVerdict[r.verdict]++;
    investSum += r.investRate;
}

console.log(`4to substat conocido: ${known}/${rows.length}`);
console.log(`veredicto modal → INVERTIR: ${byVerdict.INVERTIR} · CONSIDERAR: ${byVerdict.CONSIDERAR} · DESCARTAR: ${byVerdict.DESCARTAR}`);
console.log(`probabilidad media de INVERTIR: ${(investSum / rows.length).toFixed(1)}%\n`);

console.log('TOP 15 por % de invertir:');
console.log('  %inv  %cons  %desc  CVprom  RVprom  Lvl  Pieza    Nombre');
for (const r of rows.slice(0, 15)) {
    const name = (r.setName || r.archivo).slice(0, 28).padEnd(28);
    const piece = r.pieceKey.padEnd(8);
    console.log(
        `${String(r.investRate).padStart(5)} ${String(r.considerRate).padStart(6)} ${String(r.discardRate).padStart(6)}` +
        ` ${r.cvAvg.toFixed(1).padStart(6)} ${r.rvAvg.toFixed(1).padStart(6)}%` +
        ` +${String(r.level).padStart(2)} ${piece} ${name}${r.fourthKnown ? ' ★' : ''}`
    );
}

const outPath = path.resolve('batch-resultados.json');
fs.writeFileSync(outPath, JSON.stringify({
    generadoCon: `node tools/batch-preview.mjs --iter=${iterations}`,
    totalRegistros: records.length,
    analizadas: rows.length,
    omitidas: skipped,
    filas: rows
}, null, 2));
console.log(`\nresultados completos → ${outPath}`);
