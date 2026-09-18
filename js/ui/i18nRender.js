import { getLanguage, t } from '../i18n/i18n.js';
import { TRANSLATIONS } from '../i18n/translations.js';

// Devuelve la key i18n efectiva para un elemento, considerando variantes por
// juego (p. ej. "form.title.hsr"). Si no existe variante para el juego activo,
// usa la key base (p. ej. "form.title").
function resolveKey(baseKey) {
    const game = document.documentElement.dataset.game;
    if (!game) return baseKey;
    const lang = getLanguage();
    const scoped = `${baseKey}.${game}`;
    if (TRANSLATIONS[lang]?.[scoped] !== undefined || TRANSLATIONS.es[scoped] !== undefined) {
        return scoped;
    }
    return baseKey;
}

export function renderStaticTexts() { // Renderiza los textos estáticos de la UI según el idioma y el juego activos, usando los atributos data-i18n y data-i18n-html de los elementos HTML
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(resolveKey(el.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(resolveKey(el.dataset.i18nHtml));
    });
}