import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = process.argv[2] ?? 'http://127.0.0.1:8123/';
const SAMPLE = process.argv[3] ?? 'D:/Angel/Documents/data-artefactos/parsed/parsed-resultado-sin-nivel.json';

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const issues = [];
page.on('pageerror', e => issues.push(`[pageerror] ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) issues.push(`[console] ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await page.evaluate(() => window.showScreen('screen-form'));
await new Promise(r => setTimeout(r, 300));

async function coordClick(sel) { // Hace click en el centro del elemento dado por el selector, desplazando la página si es necesario. Espera 150ms después de hacer scroll para que la animación termine.
    const el = await page.$(sel);
    if (!el) throw new Error(`no existe: ${sel}`);
    await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 150));
    const box = await el.boundingBox();
    if (!box) throw new Error(`sin geometría: ${sel}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

// ── Form completo con mouse ──
await coordClick('#pieceType-select .custom-select-trigger');
await new Promise(r => setTimeout(r, 300));
await coordClick('#pieceType-select .custom-option[data-value="SANDS"]');
await new Promise(r => setTimeout(r, 350));

await page.select('#mainStat', 'ENERGY_RECHARGE');

const row = '.substat-row:nth-child(1)';
await coordClick(`${row} .substat-type-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row} .substat-type-select .custom-option[data-value="CRIT_RATE"]`);
await new Promise(r => setTimeout(r, 300));
await coordClick(`${row} .substat-value-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row} .substat-value-select .custom-option[data-value="2.722"]`);

const row2 = '.substat-row:nth-child(2)';
await coordClick(`${row2} .substat-type-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row2} .substat-type-select .custom-option[data-value="CRIT_DMG"]`);
await new Promise(r => setTimeout(r, 300));
await coordClick(`${row2} .substat-value-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row2} .substat-value-select .custom-option[data-value="5.444"]`);

const row3 = '.substat-row:nth-child(3)';
await coordClick(`${row3} .substat-type-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row3} .substat-type-select .custom-option[data-value="HP_FLAT"]`);
await new Promise(r => setTimeout(r, 300));
await coordClick(`${row3} .substat-value-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row3} .substat-value-select .custom-option[data-value="209"]`);

const formState = await page.evaluate(() => ({ // Se obtiene el estado actual del form, incluyendo la pieza seleccionada y los substats y valores seleccionados.
    pieza: document.querySelector('#pieceType-select .custom-select-trigger').textContent.trim(),
    sub0: document.querySelector('.substat-row:nth-child(1) .substat-type-select .custom-option.selected')?.dataset.value,
    val0: document.querySelector('.substat-row:nth-child(1) .substat-value-select .custom-option.selected')?.dataset.value,
}));
console.log('FORM:', JSON.stringify(formState));

await page.click('#analyze-btn');
await new Promise(r => setTimeout(r, 1500));
const paso1 = await page.evaluate(() => ({
    pending: document.getElementById('pending-block').style.display !== 'none',
}));
console.log('ANÁLISIS 3 SUBSTATS:', JSON.stringify(paso1), paso1.pending ? '✓' : '✗ FALLO');
if (!paso1.pending) issues.push('no mostró pending con 3 substats');

// ── Reveal → prefill → 4to substat → veredicto ──
await page.click('#reveal-cta');
await new Promise(r => setTimeout(r, 500));
const row4 = '.substat-row:nth-child(4)';
await coordClick(`${row4} .substat-type-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row4} .substat-type-select .custom-option[data-value="ATK_PERCENT"]`);
await new Promise(r => setTimeout(r, 300));
await coordClick(`${row4} .substat-value-select .custom-select-trigger`);
await new Promise(r => setTimeout(r, 250));
await coordClick(`${row4} .substat-value-select .custom-option[data-value="4.083"]`);

await page.click('#analyze-btn');
await new Promise(r => setTimeout(r, 1500));
const paso2 = await page.evaluate(() => ({
    verdict: document.getElementById('verdict-block').style.display !== 'none',
    label: document.getElementById('verdict-label').textContent,
}));
console.log('VEREDICTO FINAL:', JSON.stringify(paso2), paso2.verdict ? '✓' : '✗ FALLO');
if (!paso2.verdict) issues.push('no mostró veredicto final');

// ── IMPORTADOR con archivo real ──
await page.evaluate(() => window.showScreen('screen-import'));
await new Promise(r => setTimeout(r, 300));

const input = await page.$('#import-file');
await input.uploadFile(SAMPLE);
await new Promise(r => setTimeout(r, 800));

await page.click('#import-analyze-btn');

// esperar al resultado (hasta 60s)
let done = false;
for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    done = await page.evaluate(() =>
        document.getElementById('import-results').style.display !== 'none');
    if (done) break;
}
if (!done) issues.push('el importador no terminó en 60s');

const importResult = await page.evaluate(() => ({
    resumen: document.getElementById('import-summary').textContent,
    filas: document.querySelectorAll('#import-table-body tr').length,
    primeraFila: document.querySelector('#import-table-body tr')?.textContent.trim().slice(0, 80),
}));
console.log('IMPORTADOR:', JSON.stringify(importResult, null, 2));
if (importResult.filas === 0) issues.push('tabla de resultados vacía');

console.log(issues.length ? '\nPROBLEMAS:' : '\n✅ FLUJO COMPLETO OK (form + reveal + importador)');
for (const i of issues) console.log(' ', i);

await browser.close();
process.exit(issues.length ? 1 : 0);
