import { t } from '../i18n/i18n.js';

let globalCloseBound = false;
let uidCounter = 0;

export class IconSelect {
    constructor(wrapperEl, { options = [], value = null, onChange = null } = {}) {
        this.wrapper = wrapperEl;
        this.trigger = wrapperEl.querySelector('.custom-select-trigger');
        this.optionsEl = wrapperEl.querySelector('.custom-options');
        this.onChange = onChange;
        this.options = [];
        this._value = null;
        this._activeIndex = -1;

        const uid = (this.wrapper.id || 'select') + '-' + (++uidCounter);
        this.optionsEl.id = uid + '-listbox';

        // ─── Semántica ARIA (patrón combobox/listbox) ───
        this.trigger.setAttribute('role', 'combobox');
        this.trigger.setAttribute('tabindex', '0');
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.setAttribute('aria-controls', this.optionsEl.id);
        this.optionsEl.setAttribute('role', 'listbox');

        // Sin esto, el mousedown sobre una opción mueve el foco fuera del
        // trigger, dispara su focusout y cierra el dropdown antes de que el
        // click llegue a la opción (rompía la selección con el ratón).
        this.optionsEl.addEventListener('mousedown', (e) => e.preventDefault());

        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._closeOthers();
            this._setOpen(!this._isOpen());
        });

        this.trigger.addEventListener('keydown', (e) => this._onTriggerKeydown(e));

        // Cerrar si el foco se va del widget (p. ej. Tab). No cierra cuando
        // el foco pasa dentro del propio widget.
        this.trigger.addEventListener('focusout', (e) => {
            if (!this.wrapper.contains(e.relatedTarget)) {
                this._setOpen(false);
            }
        });

        this._bindGlobalClose();
        this.setOptions(options, value);
    }

    _isOpen() {
        return this.wrapper.classList.contains('open');
    }

    _setOpen(open) {
        this.wrapper.classList.toggle('open', open);
        this.trigger.setAttribute('aria-expanded', String(open));
        if (open) this._activateSelected();
    }

    _optionEls() {
        return [...this.optionsEl.querySelectorAll('.custom-option')];
    }

    _activateSelected() {
        const opts = this._optionEls();
        const idx = opts.findIndex(o => o.classList.contains('selected'));
        this._setActive(idx >= 0 ? idx : 0);
    }

    _setActive(idx) {
        const opts = this._optionEls();
        if (opts.length === 0) {
            this._activeIndex = -1;
            return;
        }
        this._activeIndex = Math.max(0, Math.min(idx, opts.length - 1));

        opts.forEach((o, i) => {
            const isActive = i === this._activeIndex;
            o.classList.toggle('focused', isActive);
            o.setAttribute('aria-selected', String(o.classList.contains('selected')));
        });

        const active = opts[this._activeIndex];
        if (active) {
            this.trigger.setAttribute('aria-activedescendant', active.id);
            active.scrollIntoView({ block: 'nearest' });
        }
    }

    _moveActive(delta) {
        this._setActive(this._activeIndex + delta);
    }

    _selectActive() {
        const opts = this._optionEls();
        const active = opts[this._activeIndex];
        if (active) active.click();
    }

    _onTriggerKeydown(e) {
        const opts = this._optionEls();

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (this._isOpen()) {
                this._selectActive();
            } else {
                this._closeOthers();
                this._setOpen(true);
            }
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!this._isOpen()) {
                this._closeOthers();
                this._setOpen(true);
            } else {
                this._moveActive(e.key === 'ArrowDown' ? 1 : -1);
            }
            return;
        }

        if (e.key === 'Home') {
            e.preventDefault();
            if (this._isOpen()) this._setActive(0);
            return;
        }

        if (e.key === 'End') {
            e.preventDefault();
            if (this._isOpen()) this._setActive(opts.length - 1);
            return;
        }

        if (e.key === 'Escape') {
            if (this._isOpen()) {
                e.preventDefault();
                this._setOpen(false);
                this.trigger.focus();
            }
        }
    }

    setOptions(options, value = null) {
        this.options = options;
        this.optionsEl.innerHTML = '';
        this._activeIndex = -1;

        for (const opt of options) {
            const el = document.createElement('div');
            el.className = 'custom-option';
            el.dataset.value = opt.value;
            el.setAttribute('role', 'option');
            el.id = `${this.optionsEl.id}-opt-${this.optionsEl.children.length}`;
            el.setAttribute('aria-selected', 'false');
            el.innerHTML = opt.icon
                ? `<img src="${opt.icon}" alt="${opt.label}" class="select-icon">${opt.label}`
                : opt.label;
            el.addEventListener('click', () => {
                this._select(opt.value);
                this._setOpen(false);
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
            const isSelected = el.dataset.value === value;
            el.classList.toggle('selected', isSelected);
            el.setAttribute('aria-selected', String(isSelected));
        });

        if (opt) {
            this.trigger.innerHTML = opt.icon
                ? `<img src="${opt.icon}" alt="${opt.label}" class="select-icon"><span>${opt.label}</span>`
                : `<span>${opt.label}</span>`;
        } else {
            this.trigger.innerHTML = `<span>${t('form.select.placeholder')}</span>`;
        }

        if (!silent && typeof this.onChange === 'function') {
            this.onChange(value);
        }
    }

    static _closeWrapper(wrapper) {
        wrapper.classList.remove('open');
        const trigger = wrapper.querySelector('.custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    _closeOthers() {
        document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
            if (w !== this.wrapper) IconSelect._closeWrapper(w);
        });
    }

    _bindGlobalClose() {
        if (globalCloseBound) return;
        globalCloseBound = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
                IconSelect._closeWrapper(w);
            });
        });
    }
}
