// Umbrales del veredicto, centralizados y nombrados. Única fuente de verdad
// para las reglas de negocio de INVERTIR / CONSIDERAR / DESCARTAR.
export const VERDICT_THRESHOLDS = Object.freeze({
    // Piezas de mainstat fijo (Flor, Pluma): el CV se basa solo en substats.
    FIXED_MAIN: Object.freeze({
        cvSub: Object.freeze({ INVEST: 30, CONSIDER: 15 }),
        rv:    Object.freeze({ INVEST: 85, CONSIDER: 70 }),
    }),
    // Piezas de mainstat variable (Reloj, Copa, Corona): CV incluye el mainstat.
    VARIABLE_MAIN: Object.freeze({
        cv:    Object.freeze({ INVEST: 50, CONSIDER: 35 }),
        rv:    Object.freeze({ INVEST: 85, CONSIDER: 70 }),
    }),
});
