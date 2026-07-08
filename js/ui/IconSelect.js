let globalCloseBound = false;

export class IconSelect {
    constructor(wrapperEl, { options = [], value = null, onChange = null } = {}) {
        this.wrapper = wrapperEl;
        this.trigger = wrapperEl.querySelector('.custom-select-trigger');
        this.optionsEl = wrapperEl.querySelector('.custom-options');
        this.onChange = onChange;
        this.options = [];
        this._value = null;

        this.trigger.setAttribute('tabindex', '0');
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeOthers();
            this.wrapper.classList.toggle('open');
        });
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.trigger.click();
            }
        });

        this._bindGlobalClose();
        this.setOptions(options, value);
    }

    setOptions(options, value = null) {
        this.options = options;
        this.optionsEl.innerHTML = '';

        for (const opt of options) {
            const el = document.createElement('div');
            el.className = 'custom-option';
            el.dataset.value = opt.value;
            el.innerHTML = opt.icon
                ? `<img src="${opt.icon}" alt="${opt.label}" class="select-icon">${opt.label}`
                : opt.label;
            el.addEventListener('click', () => {
                this._select(opt.value);
                this.wrapper.classList.remove('open');
            });
            this.optionsEl.appendChild(el);
        }

        const initial = value ?? (options[0] ? options[0].value : null);
        if (initial !== null) this._select(initial, /* silent */ true);
    }

    get value() {
        return this._value;
    }

    set value(v) {
        this._select(v, true);
    }

    _select(value, silent = false) {
        this._value = value;
        const opt = this.options.find(o => o.value === value);

        this.optionsEl.querySelectorAll('.custom-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.value === value);
        });

        if (opt) {
            this.trigger.innerHTML = opt.icon
                ? `<img src="${opt.icon}" alt="${opt.label}" class="select-icon"><span>${opt.label}</span>`
                : `<span>${opt.label}</span>`;
        } else {
            this.trigger.innerHTML = `<span>-- Selecciona --</span>`;
        }

        if (!silent && typeof this.onChange === 'function') {
            this.onChange(value);
        }
    }

    _closeOthers() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== this.wrapper) w.classList.remove('open');
        });
    }

    _bindGlobalClose() {
        if (globalCloseBound) return;
        globalCloseBound = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                w.classList.remove('open');
            });
        });
    }
}
