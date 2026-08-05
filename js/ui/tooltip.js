import { t } from '../i18n/i18n.js'

//microexplicaciones (?) - Fase 3: Educacion
function tipText(key){
    return t(`tip.${key}`);
}

export function infoTip(key) {
    return `<button type="button" class="info-tip" data-tip-key="${key}" aria-label="${t('tip.ariaLabel')}">?</button>`;
}

// Un solo listener delegado para todos los (?) del documento, incluyendo
// los que se generan dinámicamente en display.js (fourth-substat, etc).
export function initTooltips() {
    document.addEventListener('click', (e) => {
        const existing = document.querySelector('.tooltip-bubble');
        const btn      = e.target.closest('.info-tip');

        if (existing) {
            const owner = existing.parentElement;
            existing.remove();
            if (owner === btn) return; // click en el mismo botón que ya estaba abierto: solo cerrar
        }

        if (!btn) return;
        const text = tipText(btn.dataset.tipKey);
        if (!text) return;

        const bubble = document.createElement('div');
        bubble.className = 'tooltip-bubble';
        bubble.textContent = text;
        bubble.addEventListener('click', (ev) => ev.stopPropagation());

        btn.style.position = 'relative';
        btn.appendChild(bubble);
        e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const existing = document.querySelector('.tooltip-bubble');
            if (existing) existing.remove();
        }
    });
}
