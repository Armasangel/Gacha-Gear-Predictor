import { STAT_LABELS } from './form.js';
import { StatType } from '../data/StatType.js';

export function displayResults(artifact, result) {
    document.getElementById('results-section').style.display = 'block';

    const tbody = document.getElementById('results-body');
    const tfoot = document.getElementById('results-foot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    // Filas de substats
    for (const substat of artifact.substats) {
        const key  = Object.keys(StatType).find(k => StatType[k] === substat.type);
        const label = STAT_LABELS[key] ?? key;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${label}</td>
            <td>${result.bestCase[substat.type]?.toFixed(1) ?? '-'}</td>
            <td>${result.avgCase[substat.type]?.toFixed(1)  ?? '-'}</td>
            <td>${result.worstCase[substat.type]?.toFixed(1) ?? '-'}</td>
        `;
        tbody.appendChild(tr);
    }

    // Footer: CV y RV
    tfoot.innerHTML = `
        <tr class="separator"><td colspan="4"></td></tr>
        <tr>
            <td>CV (substats)</td>
            <td>${result.bestCVSub.toFixed(1)}</td>
            <td>${result.avgCVSub.toFixed(1)}</td>
            <td>${result.worstCVSub.toFixed(1)}</td>
        </tr>
        <tr>
            <td>CV (con mainstat)</td>
            <td>${result.bestCV.toFixed(1)}</td>
            <td>${result.avgCV.toFixed(1)}</td>
            <td>${result.worstCV.toFixed(1)}</td>
        </tr>
        <tr>
            <td>RV%</td>
            <td>${result.bestRV.toFixed(1)}%</td>
            <td>${result.avgRV.toFixed(1)}%</td>
            <td>${result.worstRV.toFixed(1)}%</td>
        </tr>
    `;

    // Veredicto
    const verdictColors = {
        'INVERTIR':   '#7ec87e',
        'CONSIDERAR': '#f0c040',
        'DESCARTAR':  '#e06060',
    };
    const label = document.getElementById('verdict-label');
    const reason = document.getElementById('verdict-reason');
    label.textContent = result.verdict;
    label.style.color = verdictColors[result.verdict] ?? '#f0c040';
    reason.textContent = result.verdictReason;
}

export function displayFourthSubstat(predictions, goal) {
    const block   = document.getElementById('fourth-substat-block');
    const content = document.getElementById('fourth-substat-content');
    block.style.display = 'block';
    content.innerHTML   = '';

    const chanceGood = predictions
        .filter(p => goal.isDesired(p.stat))
        .reduce((sum, p) => sum + p.probability, 0);

    const summary = document.createElement('p');
    summary.innerHTML = `
        Probabilidad de obtener algo útil: 
        <strong style="color:#7ec87e">${chanceGood.toFixed(1)}%</strong>
    `;
    content.appendChild(summary);

    const list = document.createElement('ul');
    for (const p of predictions) {
        const key   = Object.keys(StatType).find(k => StatType[k] === p.stat);
        const label = STAT_LABELS[key] ?? key;
        const isGood = goal.isDesired(p.stat);
        const li = document.createElement('li');
        li.className = isGood ? 'pred-want' : 'pred-skip';
        li.textContent = `${label}: ${p.probability.toFixed(1)}%`;
        list.appendChild(li);
    }
    content.appendChild(list);
}