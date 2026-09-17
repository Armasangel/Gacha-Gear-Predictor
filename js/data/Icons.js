// Rutas de iconos por juego.
//
// Cada juego usa su propia nomenclatura de archivos y su propio directorio
// (js/images/<Game>-Icons/), así que hay un catálogo por juego. Los stats sin
// asset dedicado quedan en `null` (solo etiqueta, sin icono) y `IconSelect`
// oculta cualquier img que no cargue (fallback silencioso), de modo que nunca
// aparecen imágenes rotas.

const ASSET_DIR = {
    genshin: 'js/images/Genshin-Icons/',
    hsr:     'js/images/Star-Rail-Icons/',
    zzz:     'js/images/Zenless-Icons/',
};

// Las 6 ranuras de ZZZ (discos) comparten un único icono de Drive Disc.
const ZZZ_DISC = 'Icon_Storage_Drive_Disc.svg';

export const PIECE_ICONS = {
    genshin: {
        FLOWER:  'Icon_Flower_of_Life.svg',
        PLUME:   'Icon_Plume_of_Death.svg',
        SANDS:   'Icon_Sands_of_Eon.svg',
        GOBLET:  'Icon_Goblet_of_Eonothem.svg',
        CIRCLET: 'Icon_Circlet_of_Logos.svg',
    },
    hsr: {
        HEAD:   'Relic_Piece_Head.svg',
        HANDS:  'Relic_Piece_Hands.svg',
        BODY:   'Relic_Piece_Body.svg',
        FEET:   'Relic_Piece_Feet.svg',
        SPHERE: 'Relic_Piece_Planar_Sphere.svg',
        ROPE:   'Relic_Piece_Link_Rope.svg',
    },
    zzz: {
        // Con los discos se repite el mismo icono en todas las ranuras.
        SLOT_1: ZZZ_DISC,
        SLOT_2: ZZZ_DISC,
        SLOT_3: ZZZ_DISC,
        SLOT_4: ZZZ_DISC,
        SLOT_5: ZZZ_DISC,
        SLOT_6: ZZZ_DISC,
    },
};

export const STAT_ICONS = {
    genshin: {
        CRIT_RATE:          'Icon_Attribute_Critical_RATE.svg',
        CRIT_DMG:           'Icon_Attribute_Critical_HIT.svg',
        ATK_PERCENT:        'Icon_Attribute_Attack.svg',
        ATK_FLAT:           'Icon_Attribute_Attack.svg',
        HP_PERCENT:         'Icon_Attribute_Hp.svg',
        HP_FLAT:            'Icon_Attribute_Hp.svg',
        DEF_PERCENT:        'Icon_Attribute_Defense.svg',
        DEF_FLAT:           'Icon_Attribute_Defense.svg',
        ENERGY_RECHARGE:    'Icon_Attribute_Energy_Recharge.svg',
        ELEMENTAL_MASTERY:  'Icon_Attribute_Elemental_Mastery.svg',
        HEALING_BONUS:      'Icon_Attribute_Healing.svg',
        // Bonos de daño -> icono del elemento correspondiente
        PYRO_DMG_BONUS:     'Element_Pyro.svg',
        HYDRO_DMG_BONUS:    'Element_Hydro.svg',
        CRYO_DMG_BONUS:     'Element_Cryo.svg',
        ELECTRO_DMG_BONUS:  'Element_Electro.svg',
        ANEMO_DMG_BONUS:    'Element_Anemo.svg',
        GEO_DMG_BONUS:      'Element_Geo.svg',
        DENDRO_DMG_BONUS:   'Element_Dendro.svg',
        PHYSICAL_DMG_BONUS: null, // sin asset dedicado en este set
    },
    hsr: {
        HP_FLAT:            'Icon_HP.svg',
        ATK_FLAT:           'Icon_ATK.svg',
        DEF_FLAT:           'Icon_DEF.svg',
        HP_PERCENT:         'Icon_HP.svg',
        ATK_PERCENT:        'Icon_ATK.svg',
        DEF_PERCENT:        'Icon_DEF.svg',
        SPD:                'Icon_SPD.svg',
        CRIT_RATE:          'Icon_CRIT_Rate.svg',
        CRIT_DMG:           'Icon_CRIT_DMG.svg',
        EFFECT_HIT_RATE:    'Icon_Effect_Hit_Rate.svg',
        EFFECT_RES:         'Icon_Effect_RES.svg',
        BREAK_EFFECT:       'Icon_Break_Effect.svg',
        ENERGY_REGEN:       'Icon_Energy_Regeneration_Rate.svg',
        // Bonos de daño -> tipo del elemento correspondiente
        PHYSICAL_DMG_BONUS:  'Type_Physical.svg',
        FIRE_DMG_BONUS:      'Type_Fire.svg',
        ICE_DMG_BONUS:       'Type_Ice.svg',
        WIND_DMG_BONUS:      'Type_Wind.svg',
        LIGHTNING_DMG_BONUS: 'Type_Lightning.svg',
        QUANTUM_DMG_BONUS:   'Type_Quantum.svg',
        IMAGINARY_DMG_BONUS: 'Type_Imaginary.svg',
        HEALING_BONUS: null, // sin asset dedicado en este set
    },
    zzz: {
        HP_PERCENT:         'Icon_Stat_HP.svg',
        ATK_PERCENT:        'Icon_Stat_ATK.svg',
        DEF_PERCENT:        'Icon_Stat_DEF.svg',
        HP_FLAT:            'Icon_Stat_HP.svg',
        ATK_FLAT:           'Icon_Stat_ATK.svg',
        DEF_FLAT:           'Icon_Stat_DEF.svg',
        CRIT_RATE:          'Icon_Stat_CRIT_Rate.svg',
        CRIT_DMG:           'Icon_Stat_CRIT_DMG.svg',
        PEN:                'Icon_Stat_PEN_Ratio.svg',
        ANOMALY_MASTERY:    'Icon_Stat_Anomaly_Proficiency.svg',
        ENERGY_REGEN: null, // sin asset dedicado en este set
    },
};

// Devuelve la ruta completa del icono de una pieza, o null si no existe para
// ese juego/llave. `game` es el id del perfil activo ('genshin' | 'hsr' | 'zzz').
export function pieceIcon(game, key) {
    const file = PIECE_ICONS[game]?.[key];
    return file ? ASSET_DIR[game] + file : null;
}

// Devuelve la ruta completa del icono de un stat, o null si no existe para
// ese juego/llave. Sirve tanto para substats como para mainstats (bonos de
// daño incluidos).
export function statIcon(game, key) {
    const file = STAT_ICONS[game]?.[key];
    return file ? ASSET_DIR[game] + file : null;
}