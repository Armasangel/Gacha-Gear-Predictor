# Drive Disc Analysis — Spec V1 (Zenless Zone Zero)

*Adaptado de `artifact-analysis-spec.md` (Genshin) según las reglas documentadas en `zenless-rules.md`. Léase junto con la sección 0 de ese documento antes de implementar — la diferencia estructural (sin variancia de roll) cambia el significado práctico de varios campos que en Genshin/HSR son directos.*

## 1. Input

ArtifactInput {
  game:     Game          // "ZZZ"
  level:    number        // 0–15. El análisis completo aplica a nivel 15.
  substats: SubstatInput[]
}

SubstatInput {
  type:  StatType         // ej. "CRIT_RATE", "ANOMALY_MASTERY"
  value: number           // valor visible en pantalla, ej. 9.6
}

Restricciones del input:

- Entre 3 y 4 substats (no más, no menos).
- No puede haber dos substats del mismo tipo.
- Los valores son los visibles en pantalla, redondeados a 1 decimal para porcentuales, enteros para planos (HP_FLAT, ATK_FLAT, DEF_FLAT).

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
  status:       "OK" | "INVALID_VALUE" | "NO_COMBINATIONS" | "UNVERIFIED_SOURCE_VALUE"
  combinations: RollCombination[]   // ver nota de "combinación única" en Definiciones
}

RollCombination {
  rolls:    Roll[]          // en ZZZ, todos los Roll de una misma combinación tienen el mismo `value`
  rollCount: number         // cuántos rolls (1–6) cayeron en este stat
}

Roll {
  tier:  1                   // ZZZ no tiene tiers reales; se fija en 1 para reusar el motor existente (ver zenless-rules.md §0: array de un solo valor, maxTierIndex 0)
  value: number               // valor fijo del stat (ej. 4.8 para CRIT_DMG)
  rv:    number                 // siempre 100 — no hay "peor roll" dentro de un mismo stat en ZZZ
}

ArtifactConfiguration {
  statCombinations: { [StatType]: RollCombination }
  startedWith:      3|4   // inferencia del estado inicial del disco
  totalRolls:       number // 8 si empezó con 3, 9 si empezó con 4
  earnedRV:         number  // en la práctica, totalRolls *100 siempre que la config sea válida (ver Definiciones)
  maxRV:            number  // totalRolls* 100
  percentRV:        number  // en la práctica, siempre 100 (ver Definiciones — no usar este campo para juzgar calidad)
  cv:               number | null
}

ArtifactSummary {
  totalConfigurations: number
  confidence:          "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW"
  // En ZZZ, "HIGH" (1 configuración) va a ser el resultado dominante casi siempre —
  // ver Definiciones, "Ambigüedad en ZZZ". Un valor MEDIUM/LOW no debe interpretarse
  // como "análisis normal" sino como señal de revisar los valores de stat involucrados.

  bestConfigurations:  ArtifactConfiguration[] // ver nota "Nota de producto" abajo — no confiar en earnedRV para esto
  worstConfigurations: ArtifactConfiguration[]
  cvDisplay:           number | null
}

## 3. Definiciones

### ¿Qué es un roll?

Un roll es una única asignación de un substat, siempre del mismo valor fijo para ese stat (ver `zenless-rules.md` sección 1). El primer roll de un substat ocurre cuando aparece; los siguientes ocurren en cada uno de los 5 eventos de mejora donde ese substat es elegido. A diferencia de Genshin/HSR, el roll **no tiene magnitud variable** — lo único aleatorio es si ese stat fue el elegido en cada evento, no cuánto aportó.

### ¿Qué es RV (Roll Value) en ZZZ?

```
RV_roll = (valor_del_roll / valor_fijo_del_stat) * 100 = 100  (siempre)
```

Como no hay un valor "peor" con el que comparar dentro del mismo stat, todo roll individual vale 100. Consecuencia directa: `earnedRV = totalRolls * 100 = maxRV`, y `percentRV = 100` en **cualquier** disco válido. Esto es correcto y esperado — no es un bug del pipeline. **`percentRV` no distingue calidad en ZZZ** y no debería usarse para ordenar `bestConfigurations`/`worstConfigurations` (ver Nota de producto).

### ¿Qué es CV (Crit Value)?

```
CV = CRIT_DMG + (CRIT_RATE * 2)
```

Igual fórmula universal. En ZZZ es la métrica correcta para distinguir calidad entre configuraciones, ya que RV no discrimina. CV_max teórico por disco ≈ 33.6 (ver `zenless-rules.md` sección 3). Benchmark de comunidad (marcado como experiencia de jugador, no dato de wiki): 20–30 ya es muy bueno, 25+ es "god roll".

### Combinación única por stat (a diferencia de Genshin/HSR)

En Genshin/HSR, un mismo valor observado puede reconstruirse con varias combinaciones de tiers distintos que casualmente suman lo mismo. **En ZZZ esto casi no ocurre**: como todos los rolls de un stat valen exactamente lo mismo, `rollCount = valor_observado / valor_fijo` es una división directa, y con los espaciados actuales (todos ≥ 2.4, muy por encima del margen de redondeo de 0.05 a 1 decimal) no hay dos rollCounts distintos que redondeen al mismo valor mostrado. En la práctica, `combinations` va a tener **como máximo 1 elemento** por stat casi siempre.

*Importante:* esto es una observación derivada de los valores actuales, no una garantía estructural del juego — el pipeline debe seguir calculando combinaciones de forma general (no hardcodear "siempre 1"), porque si algún valor interpolado marcado con \* en `zenless-rules.md` resulta distinto al confirmarse, esta propiedad podría dejar de cumplirse para ese stat puntual.

### Ambigüedad en ZZZ

Dado que cada stat casi siempre tiene un único rollCount posible, la ambigüedad de Genshin/HSR entre *tiers dentro de un stat* prácticamente desaparece. La única ambigüedad real que sobrevive es la de Genshin/HSR entre *stats*: si los rollCounts deducidos de todos los substats suman exactamente 8 o 9, hay como máximo una `ArtifactConfiguration` válida — no hay grados de libertad extra para generar variantes, porque cada rollCount individual ya está forzado por división. Por eso `confidence: HIGH` (o el disco directamente imposible) va a ser el resultado dominante; ver `totalConfigurations` en el Output.

### ¿Qué hace que un disco sea imposible?

a) Algún substat tiene un valor observado que, dividido por el valor fijo de ese stat, no da un entero dentro de tolerancia de redondeo a 1 decimal (INVALID_VALUE). Ejemplo: CRIT_RATE = 3.6 es imposible porque los únicos valores alcanzables son múltiplos de 2.4.

b) La suma de rollCounts deducidos no coincide ni con 8 ni con 9 (NO_COMBINATIONS a nivel global).

c) Un caso nuevo respecto a Genshin/HSR: si el stat involucrado es uno de los marcados con \* en `zenless-rules.md` (HP_PERCENT, ATK_PERCENT, PEN, ANOMALY_MASTERY-substat) y el análisis da INVALID_VALUE, debe reportarse como **`UNVERIFIED_SOURCE_VALUE`** en vez de (o además de) INVALID_VALUE — el valor fijo usado está interpolado y no confirmado 1:1 contra la wiki, así que un "imposible" en esos stats podría ser un falso negativo del dato de entrada, no del disco real.

### ¿Qué hace que una configuración sea válida?

Mismas 4 reglas que Genshin/HSR (ver `artifact-analysis-spec.md` sección 3), sin cambios: 1 combinación por stat, coincidencia de valor redondeado, suma de rollCount == totalRolls (8 o 9), y cada substat con al menos 1 roll.

## 4. Pipeline de análisis

1. **validateInput()**
   Verificar estructura del input. 3–4 substats, sin duplicados.

2. **findStatCombinations()**
   Para cada substat, calcular `rollCount = valor_observado / valor_fijo_del_stat`, redondear internamente y comparar contra `round(rollCount * valor_fijo, 1) == valor_observado`. Si el stat es uno de los marcados \* en `zenless-rules.md`, anotar la combinación (si existe) con una bandera de origen no verificado para uso en `collectWarnings()`.

3. **buildArtifactConfigurations()**
   Igual algoritmo de backtracking que Genshin/HSR (reutilizable sin cambios), aunque en la práctica el espacio de búsqueda por stat es casi siempre de tamaño 1 (ver Definiciones).

4. **scoreConfigurations()**
   earnedRV y maxRV son ambos `totalRolls * 100` (percentRV = 100) en toda configuración válida. Calcular cv de todas formas — es la métrica que sí discrimina calidad en ZZZ.

5. **buildSummary()**
   Calcular confidence según totalConfigurations (mismos umbrales que Genshin/HSR). Para bestConfigurations/worstConfigurations, **no ordenar por percentRV** (siempre empatado en 100) — ver Nota de producto.

6. **collectWarnings()**
   Reportar INVALID_VALUE, UNVERIFIED_SOURCE_VALUE (stats interpolados), o disco completamente imposible.

## 5. Nota de producto

Como `percentRV` siempre da 100% en un disco válido, cualquier UI o lógica que hoy en Genshin/HSR usa `percentRV` para decidir "mejor caso" vs. "peor caso" necesita un criterio distinto en ZZZ — típicamente `cv`, o algún criterio de "¿tiene los substats que quiero?" definido fuera de este spec (por ejemplo, a nivel de build/personaje). Este documento deja `bestConfigurations`/`worstConfigurations` en el schema por consistencia de arquitectura entre los tres juegos, pero recomienda que el criterio real de ordenamiento en ZZZ se decida en la capa de producto, no en este pipeline.
