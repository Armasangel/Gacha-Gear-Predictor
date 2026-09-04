import { getProfile } from '../data/profiles/index.js';
import { t } from '../i18n/i18n.js';

export class Artifact {
    // profile: perfil de juego opcional (js/data/profiles). Por defecto Genshin.
    constructor(pieceType, mainStat, level, substats, profile = null) {
        const p = profile ?? getProfile('genshin');

        if (substats.length < 3 || substats.length > 4)
            throw new Error(t('error.substatCount'));  //tira un error si tiene menos de 3 o más de 4 substats
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error(t('error.invalidMain'));  //tira un error si el mainStat no es válido para el pieceType
        if (!p.upgradeLevels.includes(level) && level !== 0)
            throw new Error(t('error.invalidLevel', {
                level,
                levels: [0, ...p.upgradeLevels].join(', ')
            })); //tira un error si el level no es válido según el perfil de juego

        const seen = new Set();
        // Verifica que no haya substats duplicados y que el mainStat no coincida con ningún substat
        for (const s of substats) {
            if (seen.has(s.type))
                throw new Error(t('error.duplicateSub'));
            seen.add(s.type);
        }

        const mainAsSubstat = p.mainstatToSubstat.get(mainStat);
        // Verifica que el mainStat no coincida con ningún substat
        if (mainAsSubstat !== undefined && seen.has(mainAsSubstat))
            throw new Error(t('error.mainMatchesSub'));

        this.profile = p;
        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = [...substats];
    }

    getSubstatCount() { return this.substats.length; } // Devuelve la cantidad de substats del artefacto

    addSubstat(substat) {
        if (this.substats.length >= 4)
            throw new Error(t('error.maxSubstats')); //tira un error si ya tiene 4 substats
        if (this.substats.some(s => s.type === substat.type))
            throw new Error(t('error.duplicateSub'));
        this.substats.push(substat); // Agrega un substat al artefacto
    }
}
