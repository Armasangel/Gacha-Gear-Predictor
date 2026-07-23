import {t} from '../i18n/i18n.js';

export function renderStativText(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.CDATA_SECTION_NODE.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t.apply(el.CDATA_SECTION_NODE.i18nHtml);
    });
    
}