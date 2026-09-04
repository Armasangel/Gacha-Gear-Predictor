# Relic Analysis — Spec V1 (Honkai: Star Rail)

*Adaptado de `artifact-analysis-spec.md` (Genshin) según las reglas documentadas en `star-rail-rules.md`. Cubre Reliquias **y** Ornamentos por igual — ver nota en sección 1.*

## 1. Input

ArtifactInput {
  game:     Game          // "STARRAIL"
  level:    number        // 0–15. El análisis completo aplica a nivel 15 (no 20 — máximo de HSR es +15).
  substats: SubstatInput[]
}

SubstatInput {
  type:  StatType         // ej. "CRIT_RATE", "BREAK_EFFECT", "SPD"
  value: number           // valor visible en pantalla, ej. 10.5
}

Restricciones del input:

- Entre 3 y 4 substats (no más, no menos).
- No puede haber dos substats del mismo tipo.
- Los valores son los visibles en pantalla (redondeados a 1 decimal para porcentuales y para SPD; SPD y stats planos también llevan decimales internos en HSR, a diferencia de Genshin).

**Nota — Reliquias vs. Ornamentos:** este spec no distingue entre Relic y Ornament. El mainstat (que sí depende de la pieza — ver `star-rail-rules.md` sección 4) no forma parte de `ArtifactInput`; el análisis de rolls opera exclusivamente sobre substats, que siguen reglas idénticas en ambas familias. Si en el futuro se necesita validar que un substat no coincide con el mainstat de la pieza, eso requeriría agregar `piece` y `mainstat` al input — fuera del alcance de V1.

## 2. Output

ArtifactAnalysis {
  isValid:        boolean
  warnings:       Warning[]
  perStat:        StatAnalysis[]
  configurations: ArtifactConfiguration[]
  summary:        ArtifactSummary
}

StatAnalysis {
  type:         StatType
  observedValue: number
  status:       "OK" | "INVALID_VALUE" | "NO_COMBINATIONS"
  combinations: RollCombination[]   // todas las combinaciones válidas para este stat
}

RollCombination {
  rolls:    Roll[]          // lista de rolls individuales que forman la combinación
  rollCount: number         // cuántos rolls cayeron en este stat
}

Roll {
  tier:  1 | 2 | 3           // Low | Med | High — HSR tiene 3 tiers, no 4 como Genshin
  value: number              // valor interno (ej. 3.888)
  rv:    number               // RV de este roll individual (80 | 90 | 100 — no existe el 70 de Genshin)
}

ArtifactConfiguration {
  // Una configuración es una selección de 1 combinación por stat
  // que resulta en una pieza globalmente válida.
  statCombinations: { [StatType]: RollCombination }
  startedWith:      3|4   // inferencia del estado inicial de la pieza
  totalRolls:       number // 8 si empezó con 3, 9 si empezó con 4
  earnedRV:         number
  maxRV:            number
  percentRV:        number
  cv:               number | null
}

ArtifactSummary {
  totalConfigurations: number
  confidence:          "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW"
  // HIGH:     1 configuración
  // MEDIUM:   2–20 configuraciones
  // LOW:      21–100 configuraciones
  // VERY_LOW: 101+ configuraciones

  bestConfigurations:  ArtifactConfiguration[] // Soporta empates de RV máximo
  worstConfigurations: ArtifactConfiguration[] // Soporta empates de RV mínimo
  cvDisplay:           number | null
}

## 3. Definiciones

### ¿Qué es un roll?

Un roll es una única asignación de valor a un substat. Cada roll tiene un tier (1–3, no 1–4) que determina su valor exacto según la tabla de valores de HSR (`star-rail-rules.md`, sección 1). El primer roll de un substat ocurre cuando ese substat aparece en la pieza. Los rolls siguientes ocurren en cada uno de los 5 eventos de mejora (cada 3 niveles) donde ese substat es seleccionado, incluyendo el evento que revela el 4to substat si la pieza empezó con 3.

### ¿Qué es RV (Roll Value)?

RV mide la calidad de un roll como porcentaje de su valor máximo posible (tier High).

```
RV = (valor_del_roll / valor_High_del_stat) * 100
```

- Tier 1 (Low)  → RV = 80
- Tier 2 (Med)  → RV = 90
- Tier 3 (High) → RV = 100

**A diferencia de Genshin, no existe un piso de 70.** El peor caso posible en HSR ya es 80% de RV — esto cambia el rango de `percentRV` esperado en un análisis: el mínimo teórico de una pieza HSR es 80%, no 70% como en Genshin.

El RV total de una pieza suma todos los RV individuales (ver fórmulas en `star-rail-rules.md` sección 3).

### ¿Qué es CV (Crit Value)?

```
CV = CRIT_DMG + (CRIT_RATE * 2)
```

Métrica popular de la comunidad para evaluar piezas con stats de crítico. Se calcula sobre los valores observados (display), no internos. Solo aplica si la pieza tiene CRIT_RATE o CRIT_DMG. **No hay umbrales de calidad de comunidad confirmados para HSR** (ver `star-rail-rules.md` sección 3) — cualquier UI que muestre un juicio cualitativo ("bueno"/"excelente") sobre el CV de HSR debe tratarse como pendiente hasta tener esa referencia.

### ¿Qué hace que una pieza sea imposible?

Igual que en Genshin, una pieza es imposible si:

a) Algún substat tiene un valor observado que no puede ser producido por ninguna combinación de rolls tier 1–3 (INVALID_VALUE). Recordar que en HSR el redondeo a 1 decimal aplica también a los stats planos (HP_FLAT, ATK_FLAT, DEF_FLAT), a diferencia de Genshin donde los planos son enteros exactos y no necesitan esa comparación.

b) Todas las combinaciones posibles de rolls entre los substats requieren más rolls de los que la pieza puede tener (9 u 8).

### ¿Qué hace que una configuración sea válida?

Idéntico a Genshin, con el ajuste de totales:

1. Cada substat tiene exactamente 1 RollCombination seleccionada.
2. Esa combinación produce, al redondearse a 1 decimal, el valor observado de ese substat.
3. La suma de rollCount de todos los substats es igual a totalRolls de la pieza (8 o 9).
4. Cada substat tiene al menos 1 roll (rollCount >= 1).

## 4. Pipeline de análisis

1. **validateInput()**
   Verificar estructura del input. 3–4 substats, sin duplicados.

2. **findStatCombinations()**
   Para cada substat, encontrar todas las RollCombinations válidas usando los valores internos de HSR (3 tiers) y matching con tolerancia: `round(suma_interna, 1) == valor_observado`.

3. **buildArtifactConfigurations()**
   Backtracking con poda de ramas, filtrado por totalRolls válido (8 o 9) — mismo algoritmo que Genshin, sin cambios de lógica, solo cambian los totales objetivo y los tiers de origen.

4. **scoreConfigurations()**
   Para cada ArtifactConfiguration calcular earnedRV, maxRV, percentRV (usando la escala 80/90/100), y cv.

5. **buildSummary()**
   Seleccionar bestCase, worstCase, calcular confidence, y armar el ArtifactSummary final.

6. **collectWarnings()**
   Reportar cualquier INVALID_VALUE, combinaciones descartadas, o pieza completamente imposible.
