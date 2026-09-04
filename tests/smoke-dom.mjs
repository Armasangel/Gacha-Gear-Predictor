import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf-8');
const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:8791/',
    resources: 'usable',
    pretendToBeVisual: true,
});

const { window } = dom;
globalThis.window   = window;
globalThis.document = window.document;

// jsdom no implementa scrollIntoView; IconSelect lo usa al desplegarse.
window.Element.prototype.scrollIntoView = function () {};

await import('../js/ui/main.js');

// En un navegador, window === globalThis, así que `window.showScreen = fn`
// y la referencia bare `showScreen()` dentro del código son la misma cosa.
// En Node+jsdom son dos objetos distintos -- puenteamos las funciones que
// main.js cuelga de window hacia el globalThis real, solo para la prueba.
for (const name of ['showScreen', 'toggleDetails', 'resetAndGoForm']) {
    globalThis[name] = (...args) => window[name](...args);
}

// jsdom dispara su propio DOMContentLoaded de forma asíncrona; si lo
// disparamos nosotros también, main.js corre initCustomSelects() dos veces
// y deja listeners duplicados (bug de prueba, no de la app real -- en un
// navegador real el evento solo ocurre una vez). Esperamos al real en vez
// de forzar uno nuestro.
if (window.document.readyState === 'loading') {
    await new Promise(resolve => {
        window.document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
} else {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// El form ya no usa <input> numérico: tipo y valor son IconSelect con
// opciones .custom-option[data-value="..."] dentro de cada .substat-row.
async function setRow(doc, i, statKey, tierValue) {
    const row = doc.querySelectorAll('.substat-row')[i];

    const typeWrapper = row.querySelector('.substat-type-select');
    typeWrapper.querySelector('.custom-select-trigger').click();
    typeWrapper.querySelector(`.custom-option[data-value="${statKey}"]`).click();
    await wait(20);

    const valueWrapper = row.querySelector('.substat-value-select');
    valueWrapper.querySelector('.custom-select-trigger').click();
    const opt = valueWrapper.querySelector(`.custom-option[data-value="${tierValue}"]`);
    if (!opt) {
        throw new Error(`No existe la opción de valor ${tierValue} para ${statKey} en la fila ${i}`);
    }
    opt.click();
    await wait(20);
}

async function main() { 
    // Esperar a que el módulo main.js cargue y corra DOMContentLoaded
    await wait(500);

    const doc = window.document;

    // ── Paso 1: llenar el form con un artefacto de 3 substats ──
    doc.getElementById('pieceType-select').querySelector('.custom-select-trigger').click();
    doc.querySelector('#pieceType-select .custom-option[data-value="SANDS"]').click();
    await wait(50);

    doc.getElementById('mainStat').value = 'ENERGY_RECHARGE';

    await setRow(doc, 0, 'CRIT_RATE', '2.722');
    await setRow(doc, 1, 'CRIT_DMG', '5.444');
    await setRow(doc, 2, 'HP_FLAT', '209');
    await wait(50);

    doc.getElementById('analyze-btn').click();
    await wait(50);
    console.log('  form-error:', JSON.stringify(doc.getElementById('form-error').textContent));

    const pendingVisible = doc.getElementById('pending-block').style.display !== 'none';
    const verdictVisible = doc.getElementById('verdict-block').style.display !== 'none';
    console.log('PASO 1 (3 substats) -> pending visible:', pendingVisible, '| verdict visible:', verdictVisible);
    if (!pendingVisible || verdictVisible) throw new Error('FALLÓ: debería mostrar pending, no verdict');

    const fourthVisible = doc.getElementById('fourth-substat-block').style.display !== 'none';
    console.log('  4to substat block visible:', fourthVisible);

    // ── Paso 2: click en "Ya se reveló el 4to substat" ──
    doc.getElementById('reveal-cta').click();
    await wait(50);

    const formActive = doc.getElementById('screen-form').classList.contains('active');
    console.log('PASO 2 -> volvió al form:', formActive);
    if (!formActive) throw new Error('FALLÓ: no volvió al form');

    // Verificar que los 3 substats siguen ahí (los selects conservan su selección)
    const selOf = i => {
        const row = doc.querySelectorAll('.substat-row')[i];
        return {
            type:  row.querySelector('.substat-type-select .custom-option.selected')?.dataset.value ?? '',
            value: row.querySelector('.substat-value-select .custom-option.selected')?.dataset.value ?? '',
        };
    };
    const s0 = selOf(0), s1 = selOf(1), s2 = selOf(2), s3 = selOf(3);
    console.log('  fila0:', JSON.stringify(s0), '| fila3 (vacía):', JSON.stringify(s3));
    if (s0.type !== 'CRIT_RATE' || s0.value !== '2.722' ||
        s1.type !== 'CRIT_DMG'  || s1.value !== '5.444' ||
        s2.type !== 'HP_FLAT'   || s2.value !== '209'   ||
        s3.value !== '') {
        throw new Error('FALLÓ: el prefill no conservó los 3 substats originales o no dejó la 4ta vacía');
    }

    // ── Paso 3: completar el 4to substat con lo que "salió" al llegar a +4 ──
    await setRow(doc, 3, 'ATK_PERCENT', '4.083');
    await wait(50);

    doc.getElementById('analyze-btn').click();
    await wait(50);

    const pendingVisible2 = doc.getElementById('pending-block').style.display !== 'none';
    const verdictVisible2 = doc.getElementById('verdict-block').style.display !== 'none';
    const verdictLabel    = doc.getElementById('verdict-label').textContent;
    console.log('PASO 3 (4 substats, real) -> pending visible:', pendingVisible2, '| verdict visible:', verdictVisible2, '| label:', verdictLabel);
    if (pendingVisible2 || !verdictVisible2 || !verdictLabel) {
        throw new Error('FALLÓ: debería mostrar el veredicto final, no pending');
    }

    console.log('\n✅ TODO EL FLUJO FUNCIONA END TO END');
    process.exit(0);
}

main().catch(e => {
    console.error('\n❌', e.message);
    process.exit(1);
});
