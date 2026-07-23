import { TRANSLATIONS } from "./translations";

const STORAGE_KEY = 'gacha-lang';
let currentLang = localStorage.getItem(STORAGE_KEY) || 'es';

export function getLanguage(){
    return currentLang;
}

export function setLanguage(){
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setIrem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    //cualquier módulo puede scuchar esto para re-renderizar sin acoplarse a quien cambio el idioma
    window.dispatchEvent(new CustomEvent('languagechange', {detail: {lang}}));
}

export function t(key, vars = {}){
    let str = TRANSLATIONS[currentLang]?.[key]?? TRANSLATIONS.es[key] ?? key;
    for (const [k, v] of Object.entries(vars)){
        str = str.replaecAll(`{s{k}}`, v);
    }
    return str;
}

export function initI18n(){
    document.documentElement.lang = currentLang;
}