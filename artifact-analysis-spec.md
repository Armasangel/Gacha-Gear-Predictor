# Artifact Analysis — Spec V1

## 1. Input

ArtifactInput {
  game:     Game          // "GENSHIN" | (futuro: "STARRAIL" | "ZZZ")
  level:    number        // 0–20. El análisis completo aplica a nivel 20.
  substats: SubstatInput[]
}

SubstatInput {
  type:  StatType         // ej. "CRIT_RATE", "ATK_PERCENT"
  value: number           // valor visible en pantalla, ej. 10.5
}

Restricciones del input:
- Entre 3 y 4 substats (no más, no menos).
- No puede haber dos substats del mismo tipo.
- Los valores son los visibles en pantalla (redondeados a 1 decimal
  para porcentuales, enteros para planos).

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
  tier:  1 | 2 | 3 | 4
  value: number             // valor interno (ej. 3.889)
  rv:    number             // RV de este roll individual (70 | 80 | 90 | 100)
}

ArtifactConfiguration {
  // Una configuración es una selección de 1 combinación por stat
  // que resulta en un artefacto globalmente válido.
  statCombinations: { [StatType]: RollCombination }
  startedWith:      3|4 //inferencia del estado inicial del artefacto
  totalRolls:       number //8 siempezó con 3, 9 si empezó con 4
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
Un roll es una única asignación de valor a un substat.
Cada roll tiene un tier (1–4) que determina su valor exacto según
la tabla de valores del juego.
El primer roll de un substat ocurre cuando ese substat aparece en el artefacto.
Los rolls siguientes ocurren en cada upgrade donde ese substat es seleccionado.

### ¿Qué es RV (Roll Value)?
RV mide la calidad de un roll como porcentaje de su valor máximo posible.
RV = (valor_del_roll / valor_T4_del_stat) * 100
Un roll perfecto (T4) tiene RV = 100.
Un roll mínimo (T1) tiene RV = 70.
El RV total de un artefacto suma todos los RV individuales.

### ¿Qué es CV (Crit Value)?
CV = CRIT_DMG + (CRIT_RATE * 2)
Métrica popular de la comunidad para evaluar artefactos con stats de crítico.
Se calcula sobre los valores observados (display), no internos.
Solo aplica si el artefacto tiene CRIT_RATE o CRIT_DMG.

### ¿Qué hace que un artefacto sea imposible?
Un artefacto es imposible si no existe ninguna ArtifactConfiguration válida.
Esto ocurre cuando:
  a) Algún substat tiene un valor observado que no puede ser
     producido por ninguna combinación de rolls (INVALID_VALUE).
  b) Todas las combinaciones posibles de rolls entre los substats
     requieren más rolls de los que el artefacto puede tener (9 o 8).

### ¿Qué hace que una configuración sea válida?
Una ArtifactConfiguration es válida si:
  1. Cada substat tiene exactamente 1 RollCombination seleccionada.
  2. Esa combinación produce, al redondearse a 1 decimal,
     el valor observado de ese substat.
  3. La suma de rollCount de todos los substats es igual a
     totalRolls del artefacto (8 o 9).
  4. Cada substat tiene al menos 1 roll (rollCount >= 1).

## 4. Pipeline de análisis

1. validateInput()
   Verificar estructura del input. 3–4 substats, sin duplicados.

2. findStatCombinations()
   Para cada substat, encontrar todas las RollCombinations válidas
   usando los valores internos del juego y matching con tolerancia:
   round(suma_interna, 1) == valor_observado

3. buildArtifactConfigurations()
   La generación de configuracioes utilizará Backtracking con poda de ramas,
   filtrado por totalRolls válido (8 o 9).

4. scoreConfigurations()
   Para cada ArtifactConfiguration calcular earnedRV, maxRV,
   percentRV, y cv.

5. buildSummary()
   Seleccionar bestCase, worstCase, calcular confidence,
   y armar el ArtifactSummary final.

6. collectWarnings()
   Reportar cualquier INVALID_VALUE, combinaciones descartadas,
   o artefacto completamente imposible.