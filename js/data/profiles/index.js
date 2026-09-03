// Selector de perfiles de juego. Cada perfil expone el contrato completo que
// el motor y la UI necesitan: stats, mains, piezas, mapeo main->substat,
// grilla de niveles, número de tiers y umbrales de veredicto.
//
// El perfil "genshin" es el que alimenta la app actual (la búsqueda por defecto
// sin argumentos devuelve Genshin), de modo que la app sigue funcionando igual
// mientras se construyen otros juegos.

import { buildGenshinProfile } from './genshin.js';
import { buildHsrProfile } from './hsr.js';
import { buildZzzProfile } from './zzz.js';

const BUILDERS = Object.freeze({
    genshin: buildGenshinProfile,
    hsr: buildHsrProfile,
    zzz: buildZzzProfile,
});

const CACHE = new Map();

export function getProfile(id = 'genshin') {
    const builder = BUILDERS[id];
    if (!builder) throw new Error(`Perfil desconocido: ${id}`);
    if (!CACHE.has(id)) CACHE.set(id, builder());
    return CACHE.get(id);
}

export function getAvailableProfileIds() {
    return Object.keys(BUILDERS);
}

export function getAllProfiles() {
    return getAvailableProfileIds().map(getProfile);
}
