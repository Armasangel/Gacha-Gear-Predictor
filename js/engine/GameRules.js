import { StatPrediction } from '../models/StatPrediction.js';
import { getProfile } from '../data/profiles/index.js';

function resolveProfile(artifact) {
    return artifact.profile ?? getProfile('genshin');
}

export function getAvailablePool(artifact) {
    const profile = resolveProfile(artifact);
    const excluded = new Set();

    // Excluir substats existentes
    for (const s of artifact.substats) {
        excluded.add(s.type);
    }

    // Excluir el mainstat si tiene equivalente en substat
    const mainAsSubstat = profile.mainstatToSubstat.get(artifact.mainStat);
    if (mainAsSubstat !== undefined) {
        excluded.add(mainAsSubstat);
    }

    // Pool = todos los substats del perfil menos los excluidos
    return Object.values(profile.stat).filter(stat => stat && !excluded.has(stat));
}

export function predictFourthSubstat(artifact, goal) {
    const pool = getAvailablePool(artifact); // Pool de substats disponibles para el 4to substat, según el perfil y los substats existentes

    const totalWeight = pool.reduce((sum, stat) => sum + stat.weight, 0); // Suma de los pesos de todos los substats del pool

    const desired   = [];
    const undesired = [];

    for (const stat of pool) { // Para cada substat del pool, calcula su probabilidad y lo clasifica como deseado o no deseado según el goal
        const prob = (stat.weight * 100.0) / totalWeight; // Probabilidad de que el substat sea el 4to substat, en porcentaje
        const prediction = new StatPrediction(stat, prob); // Crea un objeto StatPrediction con el substat y su probabilidad
        if (goal.isDesired(stat)) { // Si el substat es deseado según el goal, lo agrega a la lista de deseados
            desired.push(prediction);
        } else { // Si el substat no es deseado según el goal, lo agrega a la lista de no deseados
            undesired.push(prediction);
        }
    }

    desired.sort((a, b)   => b.probability - a.probability); // Ordena los substats deseados de mayor a menor probabilidad
    undesired.sort((a, b) => b.probability - a.probability); // Ordena los substats no deseados de mayor a menor probabilidad

    return [...desired, ...undesired]; // Devuelve un array con los substats deseados primero, seguidos de los no deseados, ambos ordenados por probabilidad
}
// Devuelve un array de StatPrediction para cada substat posible como 4to substat, con su probabilidad de ocurrencia según el perfil y los substats existentes. Los deseados según el goal aparecen primero, seguidos de los no deseados, ambos ordenados por probabilidad.
export function predictFourthSubstatDistribution(artifact) { 
    const pool = getAvailablePool(artifact);

    const totalWeight = pool.reduce((sum, stat)=> sum + stat.weight, 0);

    return pool.map(stat =>
        new StatPrediction(stat, (stat.weight * 100.0) / totalWeight)
    ); 
}

export function getMostLikelyFourthSubstat(artifact) { // Devuelve el substat más probable como 4to substat según el perfil y los substats existentes
    const distribution = predictFourthSubstatDistribution(artifact);
    return distribution.reduce((max, p) => p.probability > max.probability ? p: max).stat;
    
}

// Qué tan confiable es asumir "el más probable" como el 4to substat real.
// Si domina claramente sobre el resto (gap grande con el 2do lugar), confianza alta;
// si hay varias opciones casi empatadas, confianza baja.
export function getProjectionConfidence(artifact) {
    const sorted = [...predictFourthSubstatDistribution(artifact)].sort((a, b) => b.probability - a.probability); // Ordena las predicciones de mayor a menor probabilidad
    const top    = sorted[0]; // La predicción más probable (el 4to substat más probable según el perfil y los substats existentes)
    const gap    = top.probability - (sorted[1]?.probability ?? 0); // Diferencia de probabilidad entre el más probable y el segundo más probable (si existe)

    let level; // Nivel de confianza: "alta", "media" o "baja" según el gap
    if (gap >= 15) level = 'alta'; // Si la diferencia es mayor o igual a 15, confianza alta
    else if (gap >= 6) level = 'media'; // Si la diferencia es mayor o igual a 6 pero menor a 15, confianza media
    else level = 'baja'; // Si la diferencia es menor a 6, confianza baja

    return { level, top, gap }; // Devuelve un objeto con el nivel de confianza, la predicción más probable y la diferencia de probabilidad con el segundo lugar
}
