import { TRANSLATIONS } from './translations.js';

const STORAGE_KEY = 'gacha-lang';
const hasStorage = typeof localStorage !== 'undefined';
let currentLang = hasStorage ? (localStorage.getItem(STORAGE_KEY) || 'es') : 'es';

export function getLanguage() {
    return currentLang;
}

export function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    if (hasStorage) localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    // Cualquier módulo puede escuchar esto para re-renderizar sin
    // acoplarse directamente a quién cambió el idioma.
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

// t('probability.basedOn', { n: 10000 }) -> "Basado en 10000 simulaciones."
export function t(key, vars = {}) {
    let str = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.es[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v);
    }
    return str;
}

export function initI18n() {
    document.documentElement.lang = currentLang;
}