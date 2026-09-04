import { t } from '../i18n/i18n.js';
import { BuildGoal } from '../models/BuildGoal.js';
import { mapRecords, analyzeBatch } from '../io/batchImport.js';
import { getCurrentProfileId } from './form.js';

let rawRecords = [];
let lastRows = [];

function escapeHtml(s) { // Escapa los caracteres especiales de HTML para evitar inyección de código. Convierte &, <, > y " a sus entidades HTML correspondientes.
    return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function showError(msg) { // Muestra un mensaje de error en el contenedor de errores. Si msg es vacío, oculta el contenedor.
    const el = document.getElementById('import-error');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

function showProgress(text) { // Muestra un mensaje de progreso en el contenedor de progreso. Si text es vacío, oculta el contenedor.
    const el = document.getElementById('import-progress');
    if (!text) { // Si no hay texto, se oculta el contenedor y se limpia el contenido
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.style.display = 'block';
    el.textContent = text;
}

async function readFiles(fileList) { // Lee un array de archivos JSON y devuelve un array de registros normalizados. Si algún archivo no es válido, se muestra un error y se ignora.
    const records = [];
    for (const file of fileList) { // Para cada archivo, se intenta leer como texto y parsear como JSON. Si es un array, se agregan los registros al array final. Si hay un error, se muestra un mensaje de error con el nombre del archivo.
        try { // Se lee el archivo como texto y se parsea como JSON. Si no es un array, se ignora.
            const parsed = JSON.parse(await file.text());
            if (Array.isArray(parsed)) records.push(...parsed);
        } catch {
            showError(t('import.error.file').replace('{file}', file.name));
        }
    }
    return records;
}

function readPaste() { // Lee el contenido del textarea de pegado y lo parsea como JSON. Si no es un array, devuelve null. Si hay un error de parseo, devuelve null.
    const raw = document.getElementById('import-paste').value.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function verdictClass(verdict) { // Devuelve la clase CSS correspondiente al veredicto (INVERTIR/CONSIDERAR/DESCARTAR) para mostrar el badge de color. Se usa en la tabla de resultados.
    if (verdict === 'INVERTIR') return 'badge--invest';
    if (verdict === 'CONSIDERAR') return 'badge--consider';
    return 'badge--discard';
}

// El motor emite categorías en español (INVERTIR/CONSIDERAR/DESCARTAR)
// pero las keys i18n usan el nombre en inglés.
function verdictKey(verdict) {
    if (verdict === 'INVERTIR') return 'invest';
    if (verdict === 'CONSIDERAR') return 'consider';
    return 'discard';
}

function renderTable(rows) { // Renderiza la tabla de resultados de análisis de batch, con las columnas: nombre, pieza, nivel, cv promedio, rv promedio, invertir %, considerar %, descartar %, veredicto. Se escapan los valores para evitar inyección de código. Se muestran los badges de veredicto con color según la clase CSS.
    const head = document.getElementById('import-table-head');
    const body = document.getElementById('import-table-body');

    const cols = [
        'import.col.set',
        'import.col.piece',
        'import.col.level',
        'import.col.cv',
        'import.col.rv',
        'import.col.invest',
        'import.col.consider',
        'import.col.discard',
        'import.col.verdict'
    ];

    head.innerHTML =
        '<tr>' +
        cols.map(c => `<th>${escapeHtml(t(c))}</th>`).join('') +
        '</tr>';

    body.innerHTML = rows
        .map(r => {
            const name = escapeHtml((r.setName || r.archivo).slice(0, 34));
            const fourthMark = r.fourthKnown
                ? ` <span class="fourth-known" title="${escapeHtml(t('import.fourth.known'))}">★</span>`
                : '';
            const pieceText = escapeHtml(t(`piece.${r.pieceKey}`));
            const verdictText = escapeHtml(t(`probability.${verdictKey(r.verdict)}`));
            return (
                '<tr>' +
                `<td class="cell-name">${name}${fourthMark}</td>` +
                `<td>${pieceText}</td>` +
                `<td>+${r.level}</td>` +
                `<td>${r.cvAvg.toFixed(1)}</td>` +
                `<td>${r.rvAvg.toFixed(1)}%</td>` +
                `<td>${r.investRate}%</td>` +
                `<td>${r.considerRate}%</td>` +
                `<td>${r.discardRate}%</td>` +
                `<td><span class="verdict-badge ${verdictClass(r.verdict)}">${verdictText}</span></td>` +
                '</tr>'
            );
        })
        .join('');
}

function renderSkipped(skipped) { // Renderiza la lista de artefactos saltados durante el mapeo, mostrando el nombre del archivo y la razón (con detalle opcional). Si no hay artefactos saltados, se oculta el contenedor.
    const details = document.getElementById('import-skipped-details');
    const list = document.getElementById('import-skipped-list');

    if (!skipped.length) { // Si no hay artefactos saltados, se oculta el contenedor y se limpia la lista
        details.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    details.style.display = 'block';
    list.innerHTML = skipped
        .map(s => {
            const reasonText = t(`import.skip.${s.reason}`);
            const detail = s.detail ? ` (${escapeHtml(String(s.detail))})` : '';
            return `<li>${escapeHtml(s.archivo)} — ${reasonText}${detail}</li>`;
        })
        .join('');
}

function toCsv(rows) { // Convierte un array de resultados de análisis de batch en un string CSV, con encabezados y valores escapados. Se usa para exportar los resultados a un archivo CSV.
    const headers = [
        'archivo', 'set', 'pieza', 'nivel', 'cuarto_conocido',
        'cv_promedio', 'rv_promedio', 'invertir_%', 'considerar_%', 'descartar_%', 'veredicto'
    ];
    const lines = [headers.join(',')];

    for (const r of rows) { // Para cada resultado, se crea un array de celdas con los valores correspondientes, escapando los caracteres especiales y envolviendo cada celda entre comillas. Se agregan las celdas como una línea CSV al array de líneas.
        const cells = [
            r.archivo,
            r.setName,
            t(`piece.${r.pieceKey}`),
            r.level,
            r.fourthKnown ? 'si' : 'no',
            r.cvAvg,
            r.rvAvg,
            r.investRate,
            r.considerRate,
            r.discardRate,
            r.verdict
        ];
        lines.push(cells.map(c => `"${String(c).replaceAll('"', '""')}"`).join(','));
    }

    return '\ufeff' + lines.join('\n');
}

function downloadCsv(rows) { // Descarga un archivo CSV con los resultados de análisis de batch, usando la función toCsv para generar el contenido. Se crea un blob con el contenido CSV y se genera un enlace temporal para descargarlo.
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gacha-gear-lote.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function setBusy(busy) { // Habilita o deshabilita el botón de analizar y muestra u oculta el mensaje de progreso según el estado de busy. Si busy es true, se deshabilita el botón y se muestra un mensaje de progreso. Si busy es false, se habilita el botón y se oculta el mensaje de progreso.
    document.getElementById('import-analyze-btn').disabled = busy;
    if (!busy) showProgress('');
}

async function analyze() { // Analiza los registros de artefactos mapeados, mostrando el progreso y los resultados en la UI. Si no hay registros, se intenta leer del textarea de pegado. Si todos los registros son inválidos, se muestra un error. Se renderiza la tabla de resultados y la lista de artefactos saltados.
    showError('');

    let records = rawRecords;
    if (!records.length) { // Si no hay registros cargados desde archivos, se intenta leer del textarea de pegado. Si no hay registros válidos, se muestra un error.
        const pasted = readPaste();
        if (pasted === null) {
            showError(t('import.error.parse'));
            return;
        }
        records = pasted;
    }

    if (!records.length) { // Si no hay registros válidos, se muestra un error y se detiene el análisis
        showError(t('import.error.empty'));
        return;
    }

    setBusy(true);

    try { // Se mapean los registros a artefactos según el perfil activo, obteniendo los artefactos válidos y los registros saltados con su razón. Se renderiza la lista de artefactos saltados. Si no hay artefactos válidos, se muestra un error y se detiene el análisis.
        const { mapped, skipped } = mapRecords(records, getCurrentProfileId());

        renderSkipped(skipped);
        document.getElementById('import-results').style.display = 'none';

        if (!mapped.length) { // Si no hay artefactos válidos, se muestra un error y se detiene el análisis
            showError(t('import.error.allSkipped').replace('{n}', String(skipped.length)));
            return;
        }

        const rows = await analyzeBatch(mapped, new BuildGoal([]), {
            iterations: 10000,
            chunkSize: 10,
            onProgress: (done, total) =>
                showProgress(t('import.analyzing').replace('{done}', String(done)).replace('{total}', String(total)))
        });

        lastRows = rows;

        document.getElementById('import-summary').textContent = t('import.summary')
            .replace('{analyzed}', String(rows.length))
            .replace('{skipped}', String(skipped.length));

        renderTable(rows);
        document.getElementById('import-results').style.display = 'block';
    } finally {
        setBusy(false);
    }
}

window.resetImportAndGoLanding = function () { // Resetea el estado de la importación y vuelve a la pantalla de inicio. Se limpia el array de registros crudos y los resultados anteriores, se limpia el valor del input de archivos y del textarea de pegado, se oculta el contenedor de resultados, se limpia el mensaje de progreso y de error, y se muestra la pantalla de inicio.
    rawRecords = [];
    lastRows = [];
    document.getElementById('import-file').value = '';
    document.getElementById('import-paste').value = '';
    document.getElementById('import-results').style.display = 'none';
    showProgress('');
    showError('');
    window.showScreen('screen-landing');
};

export function initImport() { // Inicializa los elementos de la UI de importación, agregando listeners a los botones y al input de archivos. Se maneja el cambio de archivos, el click en el botón de analizar y el click en el botón de exportar. Se muestran errores si hay problemas al leer los archivos o al analizar los registros.
    document.getElementById('import-file').addEventListener('change', async e => {
        showError('');
        const records = await readFiles(e.target.files ?? []);
        rawRecords = records;
    });

    document.getElementById('import-analyze-btn').addEventListener('click', () => {
        analyze().catch(err => {
            setBusy(false);
            showError(err?.message || String(err));
        });
    });

    document.getElementById('import-export-btn').addEventListener('click', () => downloadCsv(lastRows));
}

export function refreshImportTexts() { // Actualiza los textos de la UI de importación según el idioma activo, usando la función t para traducir los textos. Se actualizan los placeholders, los títulos y los labels de los elementos HTML.
    document.getElementById('import-paste').placeholder = t('import.paste.placeholder');
    if (!lastRows.length) return;
    renderTable(lastRows);
}
