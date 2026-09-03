import { getProfile } from '../data/profiles/index.js';
import { t } from '../i18n/i18n.js';

export class Artifact {
    // profile: perfil de juego opcional (js/data/profiles). Por defecto Genshin.
    constructor(pieceType, mainStat, level, substats, profile = null) {
        const p = profile ?? getProfile('genshin');

        if (substats.length < 3 || substats.length > 4)
            throw new Error(t('error.substatCount'));
        if (!pieceType.validMainStats.includes(mainStat))
            throw new Error(t('error.invalidMain'));
        if (!p.upgradeLevels.includes(level) && level !== 0)
            throw new Error(t('error.invalidLevel', {
                level,
                levels: [0, ...p.upgradeLevels].join(', ')
            }));

        const seen = new Set();
        for (const s of substats) {
            if (seen.has(s.type))
                throw new Error(t('error.duplicateSub'));
            seen.add(s.type);
        }

        const mainAsSubstat = p.mainstatToSubstat.get(mainStat);
        if (mainAsSubstat !== undefined && seen.has(mainAsSubstat))
            throw new Error(t('error.mainMatchesSub'));

        this.profile = p;
        this.pieceType = pieceType;
        this.mainStat  = mainStat;
        this.level     = level;
        this.substats  = [...substats];
    }

    getSubstatCount() { return this.substats.length; }

    addSubstat(substat) {
        if (this.substats.length >= 4)
            throw new Error(t('error.maxSubstats'));
        if (this.substats.some(s => s.type === substat.type))
            throw new Error(t('error.duplicateSub'));
        this.substats.push(substat);
    }
}
