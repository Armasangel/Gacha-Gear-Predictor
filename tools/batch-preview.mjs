import fs from 'node:fs';
import path from 'node:path';
import { BuildGoal } from '../js/models/BuildGoal.js';
import { mapRecords, analyzeBatch } from '../js/io/batchImport.js';

const args = process.argv.slice(2);
const iterations = Math.max(50, parseInt(args.find(a => /^--iter=\d+$/.test(a))?.slice(7) ?? '4000', 10));
const inputs = args.filter(a => !a.startsWith('--')).map(p => path.resolve(p));
const files = [];

for (const target of inputs) { // Si el target es un directorio, se buscan todos los archivos JSON que empiecen con "parsed-" y no contengan "resultados". Si es un archivo, se agrega directamente a la lista de archivos a procesar.
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

if (!files.length) { // Si no se encontraron archivos para procesar, se muestra un mensaje de uso y se termina la ejecución.
    console.error('Uso: node tools/batch-preview.mjs <parsed-*.json o directorio> [--iter=N]');
    process.exit(1);
}

const records = [];
for (const file of files) { // Para cada archivo JSON, se lee y se parsea el contenido. Se espera que sea un array de registros normalizados. Se agregan todos los registros al array records.
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!Array.isArray(parsed)) throw new Error(`Se esperaba un array en ${file}`);
    console.log(`leyendo ${path.basename(file)}: ${parsed.length} registros`);
    records.push(...parsed);
}

console.log(`total registros: ${records.length} · iteraciones por pieza: ${iterations}\n`);

const { mapped, skipped } = mapRecords(records);

const skipCounts = {};
for (const s of skipped) { // Para cada registro saltado, se cuenta la cantidad de veces que se omitió por cada razón (reason) y se almacena en skipCounts.
    skipCounts[s.reason] = (skipCounts[s.reason] ?? 0) + 1;
}
for (const [reason, count] of Object.entries(skipCounts)) { // Se muestra en consola la cantidad de registros omitidos por cada razón (reason).
    console.log(`omitidos (${reason}): ${count}`);
}

const t0 = performance.now();
const rows = await analyzeBatch(mapped, new BuildGoal([]), { iterations });
const ms = Math.round(performance.now() - t0);
console.log(`analizadas: ${rows.length} en ${ms}ms\n`);

const known = rows.filter(r => r.fourthKnown).length;
const byVerdict = { INVERTIR: 0, CONSIDERAR: 0, DESCARTAR: 0 };
let investSum = 0;
for (const r of rows) { // Para cada fila de resultados, se cuenta la cantidad de veces que se obtuvo cada veredicto (INVERTIR, CONSIDERAR, DESCARTAR) y se suma la probabilidad de invertir para calcular el promedio.
    byVerdict[r.verdict]++;
    investSum += r.investRate;
}

console.log(`4to substat conocido: ${known}/${rows.length}`);
console.log(`veredicto modal → INVERTIR: ${byVerdict.INVERTIR} · CONSIDERAR: ${byVerdict.CONSIDERAR} · DESCARTAR: ${byVerdict.DESCARTAR}`);
console.log(`probabilidad media de INVERTIR: ${(investSum / rows.length).toFixed(1)}%\n`);

console.log('TOP 15 por % de invertir:');
console.log('  %inv  %cons  %desc  CVprom  RVprom  Lvl  Pieza    Nombre');
for (const r of rows.slice(0, 15)) { // Se muestran en consola las 15 filas con mayor probabilidad de invertir, mostrando el porcentaje de invertir, considerar y descartar, el CV promedio, el RV promedio, el nivel, la pieza y el nombre del artefacto. Si se conoce el 4to substat, se marca con un asterisco.
    const name = (r.setName || r.archivo).slice(0, 28).padEnd(28);
    const piece = r.pieceKey.padEnd(8);
    console.log(
        `${String(r.investRate).padStart(5)} ${String(r.considerRate).padStart(6)} ${String(r.discardRate).padStart(6)}` +
        ` ${r.cvAvg.toFixed(1).padStart(6)} ${r.rvAvg.toFixed(1).padStart(6)}%` +
        ` +${String(r.level).padStart(2)} ${piece} ${name}${r.fourthKnown ? ' ★' : ''}`
    );
}

const outPath = path.resolve('batch-resultados.json');
fs.writeFileSync(outPath, JSON.stringify({ // Se genera un archivo JSON con los resultados del análisis de batch, incluyendo la fecha y hora de generación, el comando usado, el total de registros, la cantidad de registros analizados y omitidos, y las filas de resultados.
    generadoCon: `node tools/batch-preview.mjs --iter=${iterations}`,
    totalRegistros: records.length,
    analizadas: rows.length,
    omitidas: skipped,
    filas: rows
}, null, 2));
console.log(`\nresultados completos → ${outPath}`);
