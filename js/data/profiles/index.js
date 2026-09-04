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

const BUILDERS = Object.freeze({ // Mapa de constructores de perfiles
    genshin: buildGenshinProfile,
    hsr: buildHsrProfile,
    zzz: buildZzzProfile,
});

const CACHE = new Map();

export function getProfile(id = 'genshin') { // Devuelve un perfil de juego por id, construyéndolo si es necesario
    const builder = BUILDERS[id];
    if (!builder) throw new Error(`Perfil desconocido: ${id}`); // Tira un error si el id no corresponde a un perfil conocido
    if (!CACHE.has(id)) CACHE.set(id, builder()); // Construye y cachea el perfil si no estaba en caché
    return CACHE.get(id); // Devuelve el perfil de juego desde la caché
}

export function getAvailableProfileIds() {
    return Object.keys(BUILDERS); // Devuelve un array con los ids de todos los perfiles de juego disponibles
}

export function getAllProfiles() {
    return getAvailableProfileIds().map(getProfile); // Devuelve un array con todos los perfiles de juego construidos
}
