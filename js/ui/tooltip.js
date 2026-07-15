// Microexplicaciones (?) — Fase 3: Educación.
// Deliberadamente cortas (1-3 frases) y con los mismos umbrales que usa
// Simulator.verdict(), para que la ayuda nunca contradiga lo que el motor
// realmente calcula.
const TIPS = {
    'cv-sub':
        'El CV mide qué tan cargado de crítico está el artefacto usando solo sus substats. ' +
        'Referencia: 30+ es bueno, entre 15 y 30 es moderado, menos de 15 es bajo.',
    'cv-main':
        'Igual que el CV de substats, pero sumando también el mainstat cuando puede ser crítico ' +
        '(Reloj, Copa, Corona). Referencia: 50+ es bueno, entre 35 y 50 es moderado, menos de 35 es bajo.',
    'rv':
        'Qué tan bien salieron los rolls comparado con el máximo posible para este artefacto. ' +
        'Referencia: 85%+ es excelente, entre 70% y 85% es aceptable, menos de 70% es flojo.',
    'crit':
        'CRIT Rate y CRIT DMG son los substats más valiosos para hacer daño. Tener dos en el mismo ' +
        'artefacto —o también en el mainstat— se conoce como doble o triple crítico, y es poco común.',
    'fourth':
        'Si el artefacto salió con solo 3 substats, el 4to se revela al llegar a +4 con un valor ' +
        'aleatorio (a esa mejora aleatoria se le llama "roll"). Hasta que sube a +4, no hay forma de ' +
        'saberlo con certeza — solo probabilidades.',
    'confidence':
        'Qué tan clara es la apuesta sobre el 4to substat. Alta: una opción domina claramente al resto. ' +
        'Baja: varias opciones están casi empatadas y el resultado real podría cambiar bastante.',
};

export function infoTip(key) {
    return `<button type="button" class="info-tip" data-tip-key="${key}" aria-label="Más información">?</button>`;
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
        const text = TIPS[btn.dataset.tipKey];
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
