"""
artifact_engine_v4.py
=====================
Motor de PROYECCIÓN FORWARD para artefactos de Genshin Impact (5★).

Dado un artefacto en cualquier nivel (0, 4, 8, 12, 16, 20),
proyecta cómo podría terminar al +20 bajo tres escenarios:
  - MEJOR CASO   : cada upgrade cae en el stat que más nos importa, con tier T4
  - PEOR CASO    : cada upgrade cae en el stat que menos nos importa, con tier T1
  - PROMEDIO     : distribución equiprobable de upgrades, valor esperado por tier

Reglas del juego implementadas:
  - Substats iniciales: pesos distintos (HP_FLAT=6, DEF_FLAT=6, HP%=4, ATK%=4,
                        DEF%=4, EM=4, ER=4, CR=3, CD=3)
  - 4to substat aparece en +4 (si se empezó con 3), no sube ningún stat ese nivel
  - Upgrades en +4/+8/+12/+16/+20 → 5 upgrades totales al +20
  - Cuando ya hay 4 substats: cada upgrade distribuye EQUITATIVAMENTE entre ellos
  - Tier del roll: equiprobable entre T1/T2/T3/T4 (25% cada uno)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import itertools

# ─────────────────────────────────────────────
# 1. DATOS DEL JUEGO
# ─────────────────────────────────────────────

# Valores internos por stat (T1, T2, T3, T4)
TIERS: dict[str, list[float]] = {
    "CRIT_RATE":        [2.722, 3.111, 3.500, 3.889],
    "CRIT_DMG":         [5.444, 6.222, 7.000, 7.778],
    "ATK_PERCENT":      [4.083, 4.667, 5.250, 5.833],
    "HP_PERCENT":       [4.083, 4.667, 5.250, 5.833],
    "DEF_PERCENT":      [5.104, 5.833, 6.562, 7.292],
    "ENERGY_RECHARGE":  [4.531, 5.179, 5.826, 6.474],
    "ELEMENTAL_MASTERY":[16,    19,    21,    23   ],
    "HP_FLAT":          [209,   239,   269,   299  ],
    "ATK_FLAT":         [14,    16,    18,    19   ],
    "DEF_FLAT":         [16,    19,    21,    23   ],
}

# Pesos de aparición (aplica al seleccionar substats iniciales / 4to substat)
SUBSTAT_WEIGHTS: dict[str, int] = {
    "HP_FLAT":          6,
    "DEF_FLAT":         6,
    "ATK_PERCENT":      4,
    "HP_PERCENT":       4,
    "DEF_PERCENT":      4,
    "ENERGY_RECHARGE":  4,
    "ELEMENTAL_MASTERY":4,
    "ATK_FLAT":         4,
    "CRIT_RATE":        3,
    "CRIT_DMG":         3,
}

# T4 de cada stat (para calcular RV)
T4: dict[str, float] = {name: tiers[3] for name, tiers in TIERS.items()}

# Valor esperado de un roll (promedio de T1..T4)
EXPECTED_ROLL: dict[str, float] = {
    name: sum(tiers) / 4 for name, tiers in TIERS.items()
}

# Niveles de upgrade en un artefacto 5★
UPGRADE_LEVELS = [4, 8, 12, 16, 20]


# ─────────────────────────────────────────────
# 2. ESTRUCTURAS DE DATOS
# ─────────────────────────────────────────────

@dataclass
class SubstatState:
    """Estado actual de un substat."""
    name: str
    value: float          # valor visible actual (1 decimal para %)

@dataclass
class ArtifactInput:
    """Input del usuario."""
    piece_type: str                    # ej. "Corona", "Flor", "Pluma"…
    main_stat: str                     # ej. "Bono DMG Pyro"
    level: int                         # 0, 4, 8, 12, 16, 20
    substats: list[SubstatState]       # 3 o 4 substats observados
    priority_order: list[str]          # Orden de prioridad del jugador (de mejor a peor)
                                       # Si está vacío, se usa el orden en que vienen los substats

@dataclass
class ProjectedSubstat:
    """Valor proyectado de un substat al +20."""
    name: str
    current_value: float
    best_value: float
    worst_value: float
    avg_value: float
    rolls_remaining_best: int    # cuántos upgrades caerían aquí en best case
    rolls_remaining_worst: int
    rolls_remaining_avg: float   # esperanza matemática de upgrades aquí

@dataclass
class ScenarioResult:
    """Resultado de un escenario (mejor/peor/promedio)."""
    substats: dict[str, float]   # stat_name -> valor al +20
    cv: Optional[float]
    earned_rv: float
    max_rv: float
    percent_rv: float
    total_upgrades_used: int

@dataclass
class FourthSubstatPrediction:
    """Predicción del 4to substat (solo si el artefacto empezó con 3)."""
    stat: str
    probability: float           # porcentaje 0-100
    label: str                   # "Más probable", "Probable", "Menos probable"

@dataclass
class ArtifactProjection:
    """Resultado completo de la proyección."""
    input: ArtifactInput
    started_with: int            # 3 o 4 substats
    upgrades_done: int           # upgrades ya realizados
    upgrades_remaining: int      # upgrades pendientes hasta +20
    fourth_substat_predictions: list[FourthSubstatPrediction]  # vacío si empezó con 4
    best_case: ScenarioResult
    worst_case: ScenarioResult
    average_case: ScenarioResult
    verdict: str                 # "INVERTIR", "CONSIDERAR", "DESCARTAR"
    verdict_reason: str


# ─────────────────────────────────────────────
# 3. LÓGICA CENTRAL
# ─────────────────────────────────────────────

def _upgrades_at_level(level: int, started_with: int) -> int:
    """
    Cuántos upgrades se han realizado al llegar a este nivel.
    Si empezó con 3, el +4 revela el 4to stat (no es un upgrade de valor).
    """
    total = 0
    for lvl in UPGRADE_LEVELS:
        if lvl > level:
            break
        if started_with == 3 and lvl == 4:
            continue   # +4 solo revela, no sube valor
        total += 1
    return total


def _remaining_upgrades(level: int, started_with: int) -> int:
    """Upgrades que faltan desde `level` hasta +20."""
    done = _upgrades_at_level(level, started_with)
    max_upgrades = 5 if started_with == 4 else 4   # 3 substats => +4 no cuenta
    return max_upgrades - done


def _infer_started_with(artifact: ArtifactInput) -> int:
    """
    Infiere si el artefacto empezó con 3 o 4 substats.
    Si al llegar al nivel actual ya tiene 4 substats:
      - Al nivel 0 con 4 → empezó con 4
      - Al nivel 0 con 3 → empezó con 3 (el 4to aparece en +4)
    """
    n = len(artifact.substats)
    if n == 4 and artifact.level == 0:
        return 4
    if n == 3 and artifact.level == 0:
        return 3
    if n == 4 and artifact.level >= 4:
        # Puede haber empezado con 3 (reveló el 4to en +4) o con 4
        # Sin información adicional, asumimos que empezó con 4 (caso más común en análisis)
        return 4
    return 4


def _fourth_substat_probabilities(
    existing_stats: list[str],
    main_stat: str
) -> list[FourthSubstatPrediction]:
    """
    Calcula la probabilidad de cada stat posible como 4to substat.
    Excluye: stats ya presentes y el main stat.
    """
    excluded = set(existing_stats) | {main_stat}
    pool = {
        stat: weight
        for stat, weight in SUBSTAT_WEIGHTS.items()
        if stat not in excluded
    }
    total_weight = sum(pool.values())
    results = []
    for stat, weight in sorted(pool.items(), key=lambda x: -x[1]):
        prob = (weight / total_weight) * 100
        if prob >= 20:
            label = "Más probable"
        elif prob >= 10:
            label = "Probable"
        else:
            label = "Menos probable"
        results.append(FourthSubstatPrediction(stat, round(prob, 1), label))

    return sorted(results, key=lambda x: -x.probability)


def _cv(substats: dict[str, float]) -> Optional[float]:
    cr = substats.get("CRIT_RATE", 0)
    cd = substats.get("CRIT_DMG", 0)
    if cr == 0 and cd == 0:
        return None
    return round(cd + cr * 2, 1)


def _rv(substats: dict[str, float], total_rolls: int) -> tuple[float, float, float]:
    """Retorna (earnedRV, maxRV, percentRV)."""
    earned = 0.0
    for stat_name, value in substats.items():
        t4 = T4[stat_name]
        earned += (value / t4) * 100
    max_rv = total_rolls * 100
    percent = round((earned / max_rv) * 100, 1) if max_rv > 0 else 0.0
    return round(earned, 1), round(max_rv, 1), percent


def _project_best_case(
    artifact: ArtifactInput,
    started_with: int,
    upgrades_remaining: int,
    priority_order: list[str],
) -> ScenarioResult:
    """
    Mejor caso: cada upgrade cae en el stat de mayor prioridad con T4.
    """
    current = {s.name: s.value for s in artifact.substats}
    upgrades_done = _upgrades_at_level(artifact.level, started_with)
    total_rolls_so_far = started_with + upgrades_done

    remaining = upgrades_remaining
    for _ in range(remaining):
        # El upgrade cae siempre en el stat de mayor prioridad disponible
        target = priority_order[0] if priority_order else list(current.keys())[0]
        current[target] = round(current[target] + TIERS[target][3], 3)

    total_rolls = total_rolls_so_far + remaining
    substats_rounded = {k: round(v, 1) for k, v in current.items()}
    earned, max_rv, pct = _rv(substats_rounded, total_rolls)

    return ScenarioResult(
        substats=substats_rounded,
        cv=_cv(substats_rounded),
        earned_rv=earned,
        max_rv=max_rv,
        percent_rv=pct,
        total_upgrades_used=upgrades_done + remaining,
    )


def _project_worst_case(
    artifact: ArtifactInput,
    started_with: int,
    upgrades_remaining: int,
    priority_order: list[str],
) -> ScenarioResult:
    """
    Peor caso: cada upgrade cae en el stat de menor prioridad con T1.
    """
    current = {s.name: s.value for s in artifact.substats}
    upgrades_done = _upgrades_at_level(artifact.level, started_with)
    total_rolls_so_far = started_with + upgrades_done

    # Stat de menor prioridad = el último en la lista de prioridades
    worst_target = priority_order[-1] if priority_order else list(current.keys())[-1]

    for _ in range(upgrades_remaining):
        current[worst_target] = round(current[worst_target] + TIERS[worst_target][0], 3)

    total_rolls = total_rolls_so_far + upgrades_remaining
    substats_rounded = {k: round(v, 1) for k, v in current.items()}
    earned, max_rv, pct = _rv(substats_rounded, total_rolls)

    return ScenarioResult(
        substats=substats_rounded,
        cv=_cv(substats_rounded),
        earned_rv=earned,
        max_rv=max_rv,
        percent_rv=pct,
        total_upgrades_used=upgrades_done + upgrades_remaining,
    )


def _project_average_case(
    artifact: ArtifactInput,
    started_with: int,
    upgrades_remaining: int,
) -> ScenarioResult:
    """
    Caso promedio: cada upgrade distribuye equitativamente entre los 4 substats,
    usando el valor esperado de roll (promedio de T1..T4).
    """
    current = {s.name: s.value for s in artifact.substats}
    upgrades_done = _upgrades_at_level(artifact.level, started_with)
    total_rolls_so_far = started_with + upgrades_done

    n_stats = len(current)
    upgrades_per_stat = upgrades_remaining / n_stats  # puede ser fraccionario para el display

    for stat in current:
        added = upgrades_per_stat * EXPECTED_ROLL[stat]
        current[stat] = round(current[stat] + added, 3)

    total_rolls = total_rolls_so_far + upgrades_remaining
    substats_rounded = {k: round(v, 1) for k, v in current.items()}
    earned, max_rv, pct = _rv(substats_rounded, total_rolls)

    return ScenarioResult(
        substats=substats_rounded,
        cv=_cv(substats_rounded),
        earned_rv=earned,
        max_rv=max_rv,
        percent_rv=pct,
        total_upgrades_used=upgrades_done + upgrades_remaining,
    )


def _verdict(best: ScenarioResult, worst: ScenarioResult, avg: ScenarioResult) -> tuple[str, str]:
    """
    Veredicto simple basado en CV del promedio o en %RV si no hay crit.
    """
    if avg.cv is not None:
        cv = avg.cv
        if cv >= 50:
            return "INVERTIR", f"CV promedio de {cv:.1f} es bueno (≥50)."
        elif cv >= 35:
            return "CONSIDERAR", f"CV promedio de {cv:.1f} es moderado. Invierte si necesitas el slot."
        else:
            return "DESCARTAR", f"CV promedio de {cv:.1f} es bajo (<35). Hay mejores opciones."
    else:
        pct = avg.percent_rv
        if pct >= 85:
            return "INVERTIR", f"RV promedio de {pct:.1f}% es excelente (sin stats de crit)."
        elif pct >= 70:
            return "CONSIDERAR", f"RV promedio de {pct:.1f}% es aceptable."
        else:
            return "DESCARTAR", f"RV promedio de {pct:.1f}% es demasiado bajo."


# ─────────────────────────────────────────────
# 4. FUNCIÓN PRINCIPAL
# ─────────────────────────────────────────────

def project_artifact(artifact: ArtifactInput) -> ArtifactProjection:
    """
    Punto de entrada principal. Toma un ArtifactInput y devuelve
    una ArtifactProjection completa con los tres escenarios.
    """
    started_with = _infer_started_with(artifact)
    upgrades_done = _upgrades_at_level(artifact.level, started_with)
    upgrades_remaining = _remaining_upgrades(artifact.level, started_with)

    # Si empezó con 3, hay un +4 de "reveal" pendiente
    fourth_preds: list[FourthSubstatPrediction] = []
    effective_substats = artifact.substats.copy()

    if started_with == 3 and artifact.level == 0:
        fourth_preds = _fourth_substat_probabilities(
            [s.name for s in artifact.substats],
            artifact.main_stat,
        )
        # Para la proyección usamos el 4to stat más probable como placeholder
        # El usuario puede recalcular una vez que lo vea en +4
        best_fourth = fourth_preds[0].stat
        effective_substats = artifact.substats + [SubstatState(best_fourth, 0.0)]

    # Orden de prioridad: si el usuario no lo especificó, usamos el orden de input
    priority = artifact.priority_order if artifact.priority_order else [s.name for s in effective_substats]

    # Asegurar que todos los substats estén en priority
    stat_names = [s.name for s in effective_substats]
    for sn in stat_names:
        if sn not in priority:
            priority.append(sn)

    # Crear artefacto "efectivo" con los substats correctos
    effective_artifact = ArtifactInput(
        piece_type=artifact.piece_type,
        main_stat=artifact.main_stat,
        level=artifact.level,
        substats=effective_substats,
        priority_order=priority,
    )

    best   = _project_best_case(effective_artifact, started_with, upgrades_remaining, priority)
    worst  = _project_worst_case(effective_artifact, started_with, upgrades_remaining, priority)
    avg    = _project_average_case(effective_artifact, started_with, upgrades_remaining)

    verdict, reason = _verdict(best, worst, avg)

    return ArtifactProjection(
        input=artifact,
        started_with=started_with,
        upgrades_done=upgrades_done,
        upgrades_remaining=upgrades_remaining,
        fourth_substat_predictions=fourth_preds,
        best_case=best,
        worst_case=worst,
        average_case=avg,
        verdict=verdict,
        verdict_reason=reason,
    )


# ─────────────────────────────────────────────
# 5. DISPLAY (NIVEL CASUAL)
# ─────────────────────────────────────────────

VERDICT_EMOJI = {"INVERTIR": "✅", "CONSIDERAR": "🟡", "DESCARTAR": "❌"}

def display_casual(proj: ArtifactProjection):
    """Reporte compacto para el jugador casual."""
    print("=" * 60)
    print(f"  🎴 {proj.input.piece_type.upper()}  |  +{proj.input.level} → +20")
    print(f"  Main stat: {proj.input.main_stat}")
    print("=" * 60)

    if proj.fourth_substat_predictions:
        print("\n🔮 4TO SUBSTAT (aún no revelado):")
        for pred in proj.fourth_substat_predictions[:4]:
            bar = "█" * int(pred.probability / 5)
            print(f"   {pred.label:<18} {pred.stat:<20} {pred.probability:5.1f}%  {bar}")
        print(f"\n   ⚠ Proyección calculada asumiendo: {proj.fourth_substat_predictions[0].stat}")

    print(f"\n📊 PROYECCIÓN AL +20  ({proj.upgrades_remaining} upgrades restantes)")
    print(f"   {'STAT':<22} {'ACTUAL':>8}  {'MEJOR':>8}  {'PROM':>8}  {'PEOR':>8}")
    print("   " + "-" * 54)

    for substat in proj.input.substats:
        name = substat.name
        cur  = substat.value
        best = proj.best_case.substats.get(name, cur)
        avg  = proj.average_case.substats.get(name, cur)
        worst= proj.worst_case.substats.get(name, cur)
        print(f"   {name:<22} {cur:>8.1f}  {best:>8.1f}  {avg:>8.1f}  {worst:>8.1f}")

    # Si hay 4to predicho, mostrarlo
    if proj.fourth_substat_predictions:
        name = proj.fourth_substat_predictions[0].stat
        best = proj.best_case.substats.get(name, 0)
        avg  = proj.average_case.substats.get(name, 0)
        worst= proj.worst_case.substats.get(name, 0)
        # best=0 significa que ningún upgrade cayó en el 4to (todos en el stat top)
        best_str = f"{best:>8.1f}" if best > 0 else "     ~0 "
        print(f"   {name:<22} {'?':>8}  {best_str}  {avg:>8.1f}  {worst:>8.1f}  ← predicho")

    print()
    b, a, w = proj.best_case, proj.average_case, proj.worst_case

    if a.cv is not None:
        print(f"   {'CV':<22} {'-':>8}  {b.cv:>8.1f}  {a.cv:>8.1f}  {w.cv:>8.1f}")

    print(f"   {'RV%':<22} {'-':>8}  {b.percent_rv:>7.1f}%  {a.percent_rv:>7.1f}%  {w.percent_rv:>7.1f}%")

    emoji = VERDICT_EMOJI[proj.verdict]
    print(f"\n{emoji} VEREDICTO: {proj.verdict}")
    print(f"   {proj.verdict_reason}")
    print("=" * 60)


# ─────────────────────────────────────────────
# 6. DISPLAY (NIVEL OBSESIONADO)
# ─────────────────────────────────────────────

def display_detailed(proj: ArtifactProjection):
    """Reporte extendido con detalles estadísticos."""
    display_casual(proj)   # Primero el resumen casual

    print("\n" + "─" * 60)
    print("  📐 ANÁLISIS DETALLADO")
    print("─" * 60)

    print(f"\n  Empezó con: {proj.started_with} substats")
    print(f"  Upgrades realizados al +{proj.input.level}: {proj.upgrades_done}")
    print(f"  Upgrades restantes:  {proj.upgrades_remaining}")

    for label, scenario in [("MEJOR CASO", proj.best_case),
                             ("PROMEDIO",   proj.average_case),
                             ("PEOR CASO",  proj.worst_case)]:
        print(f"\n  [{label}]")
        print(f"    RV Ganado: {scenario.earned_rv:.1f} / {scenario.max_rv:.0f}  ({scenario.percent_rv:.1f}%)")
        if scenario.cv is not None:
            cv = scenario.cv
            quality = (
                "🔥 Top Tier" if cv >= 70 else
                "⭐ Excelente" if cv >= 60 else
                "✅ Muy bueno" if cv >= 50 else
                "🟡 Bueno" if cv >= 40 else
                "⚠ Mediocre"
            )
            print(f"    CV: {cv:.1f}  {quality}")
        print(f"    Substats finales:")
        for stat, val in scenario.substats.items():
            t4v = T4[stat]
            rv_individual = round((val / t4v) * 100, 1)
            print(f"      {stat:<22}: {val:>7.1f}   (RV acumulado: {rv_individual:.0f}%)")

    if proj.fourth_substat_predictions:
        print(f"\n  🎲 DISTRIBUCIÓN COMPLETA DEL 4TO SUBSTAT:")
        for pred in proj.fourth_substat_predictions:
            bar = "█" * int(pred.probability / 2)
            print(f"    {pred.stat:<22} {pred.probability:5.1f}%  {bar}")

    print("\n" + "=" * 60)


# ─────────────────────────────────────────────
# 7. DEMO
# ─────────────────────────────────────────────

if __name__ == "__main__":

    print("\n>>> CASO 1: 4 substats desde nivel 0 <<<\n")
    art1 = ArtifactInput(
        piece_type="Corona",
        main_stat="Bono DMG Pyro",
        level=0,
        substats=[
            SubstatState("CRIT_RATE",       3.5),
            SubstatState("CRIT_DMG",        7.0),
            SubstatState("ATK_PERCENT",     4.7),
            SubstatState("ENERGY_RECHARGE", 5.2),
        ],
        priority_order=["CRIT_RATE", "CRIT_DMG", "ATK_PERCENT", "ENERGY_RECHARGE"],
    )
    proj1 = project_artifact(art1)
    display_casual(proj1)

    print("\n>>> CASO 2: 3 substats desde nivel 0 <<<\n")
    art2 = ArtifactInput(
        piece_type="Corona",
        main_stat="Bono DMG Pyro",
        level=0,
        substats=[
            SubstatState("CRIT_RATE",   3.5),
            SubstatState("CRIT_DMG",    7.0),
            SubstatState("ATK_PERCENT", 4.7),
        ],
        priority_order=["CRIT_RATE", "CRIT_DMG", "ATK_PERCENT"],
    )
    proj2 = project_artifact(art2)
    display_casual(proj2)

    print("\n>>> CASO 3: Artefacto a medio subir (+12), modo detallado <<<\n")
    art3 = ArtifactInput(
        piece_type="Flor",
        main_stat="HP Flat",
        level=12,
        substats=[
            SubstatState("CRIT_RATE",       10.5),
            SubstatState("CRIT_DMG",        14.0),
            SubstatState("ATK_PERCENT",     9.3),
            SubstatState("ENERGY_RECHARGE", 5.2),
        ],
        priority_order=["CRIT_RATE", "CRIT_DMG", "ATK_PERCENT", "ENERGY_RECHARGE"],
    )
    proj3 = project_artifact(art3)
    display_detailed(proj3)