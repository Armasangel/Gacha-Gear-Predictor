// Rutas de iconos por juego.
//
// Los iconos de Genshin/HSR usan la nomenclatura de la wiki de Genshin Impact;
// los de HSR/ZZZ reutilizan el mismo catálogo SVG cuando el stats coincide, y
// quedan en `null` (solo etiqueta, sin icono) cuando no existe un asset
// dedicado. El componente IconSelect oculta cualquier img que no cargue
// (fallback silencioso), de modo que nunca aparecen imágenes rotas.

export const PIECE_ICONS = {
    // Genshin
    FLOWER:  'js/images/Icon_Flower_of_Life.svg',
    PLUME:   'js/images/Icon_Plume_of_Death.svg',
    SANDS:   'js/images/Icon_Sands_of_Eon.svg',
    GOBLET:  'js/images/Icon_Goblet_of_Eonothem.svg',
    CIRCLET: 'js/images/Icon_Circlet_of_Logos.svg',
    // HSR
    HEAD:   null,
    HANDS:  null,
    BODY:   null,
    FEET:   null,
    SPHERE: null,
    ROPE:   null,
    // ZZZ
    SLOT_1: null,
    SLOT_2: null,
    SLOT_3: null,
    SLOT_4: null,
    SLOT_5: null,
    SLOT_6: null,
};

// Un icono de atributo puede representar varias StatType (ej. ATK_FLAT y ATK_PERCENT
// comparten el mismo icono de "Ataque" en la wiki).
export const STAT_ICONS = {
    CRIT_RATE:          'js/images/Icon_Attribute_Critical_RATE.svg',
    CRIT_DMG:           'js/images/Icon_Attribute_Critical_HIT.svg',
    ATK_PERCENT:        'js/images/Icon_Attribute_Attack.svg',
    ATK_FLAT:           'js/images/Icon_Attribute_Attack.svg',
    HP_PERCENT:         'js/images/Icon_Attribute_Hp.svg',
    HP_FLAT:            'js/images/Icon_Attribute_Hp.svg',
    DEF_PERCENT:        'js/images/Icon_Attribute_Defense.svg',
    DEF_FLAT:           'js/images/Icon_Attribute_Defense.svg',
    ENERGY_RECHARGE:    'js/images/Icon_Attribute_Energy_Recharge.svg',
    ELEMENTAL_MASTERY:  'js/images/Icon_Attribute_Elemental_Mastery.svg',
    HEALING_BONUS:      'js/images/Icon_Attribute_Healing.svg',

    // DMG bonus elementales -> icono del elemento correspondiente
    PYRO_DMG_BONUS:     'js/images/Element_Pyro.svg',
    HYDRO_DMG_BONUS:    'js/images/Element_Hydro.svg',
    CRYO_DMG_BONUS:     'js/images/Element_Cryo.svg',
    ELECTRO_DMG_BONUS:  'js/images/Element_Electro.svg',
    ANEMO_DMG_BONUS:    'js/images/Element_Anemo.svg',
    GEO_DMG_BONUS:      'js/images/Element_Geo.svg',
    DENDRO_DMG_BONUS:   'js/images/Element_Dendro.svg',
    // HSR DMG bonus elementales (mismo catálogo)
    FIRE_DMG_BONUS:     'js/images/Element_Pyro.svg',
    ICE_DMG_BONUS:      'js/images/Element_Cryo.svg',
    WIND_DMG_BONUS:     'js/images/Element_Anemo.svg',
    LIGHTNING_DMG_BONUS:'js/images/Element_Electro.svg',
    QUANTUM_DMG_BONUS:  'js/images/Element_Dendro.svg',
    IMAGINARY_DMG_BONUS:'js/images/Element_Hydro.svg',

    // Físico / HSR / ZZZ sin asset dedicado -> texto sin icono
    PHYSICAL_DMG_BONUS:  null,
    SPD:                null,
    EFFECT_HIT_RATE:    null,
    EFFECT_RES:         null,
    BREAK_EFFECT:       null,
    ENERGY_REGEN:       null,
    PEN:                null,
    ANOMALY_MASTERY:    null,
};
