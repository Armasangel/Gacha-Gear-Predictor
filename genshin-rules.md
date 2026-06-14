# Genshin Impact — Artifact Rules

## 1. Substats y Valores Reales (5★)

Todos los valores son internos. El juego los muestra redondeados a 1 decimal.

| Stat             | T1     | T2     | T3     | T4     |
|------------------|--------|--------|--------|--------|
| CRIT_RATE        | 2.722  | 3.111  | 3.500  | 3.889  |
| CRIT_DMG         | 5.444  | 6.222  | 7.000  | 7.778  |
| ATK_PERCENT      | 4.083  | 4.667  | 5.250  | 5.833  |
| HP_PERCENT       | 4.083  | 4.667  | 5.250  | 5.833  |
| DEF_PERCENT      | 5.104  | 5.833  | 6.562  | 7.292  |
| ENERGY_RECHARGE  | 4.531  | 5.179  | 5.826  | 6.474  |
| ELEMENTAL_MASTERY| 16     | 19     | 21     | 23     |
| HP_FLAT          | 209    | 239    | 269    | 299    |
| ATK_FLAT         | 14     | 16     | 18     | 19     |
| DEF_FLAT         | 16     | 19     | 21     | 23     |

Nota: Stats planos (HP, ATK, DEF, EM) son enteros exactos.
Stats porcentuales tienen hasta 3 decimales internos.

## 2. Restricciones de Rolls

### Substats iniciales
- Un artefacto puede empezar con 3 o 4 substats.
- Cada substat recibe exactamente 1 roll al aparecer.

### Upgrades
- Un artefacto +20 recibe exactamente 5 upgrades.
- Cada upgrade añade 1 roll a cualquier substat existente.

### Total de rolls por artefacto
- 4 substats iniciales: 4 + 5 = 9 rolls totales
- 3 substats iniciales: 3 + 5 = 8 rolls totales

### Rolls por substat
- Mínimo: 1 (solo el roll inicial, ningún upgrade cayó aquí)
- Máximo: no definido por substat, pero limitado por el total del artefacto
- El límite real es: suma de rolls de todos los substats == total de rolls del artefacto

## 3. Fórmulas

### Crit Value (CV)
CV = CRIT_DMG + (CRIT_RATE * 2)

Referencia de calidad (comunidad):
- CV > 50  → Bueno
- CV > 60  → Muy bueno
- CV > 70  → Excelente
- CV > 80  → Top tier

Nota: CV solo se calcula si el artefacto tiene al menos uno de CRIT_RATE o CRIT_DMG.

### Roll Value (RV) por roll
RV_roll = (valor_del_roll / T4_del_stat) * 100

Los tiers producen exactamente:
- T1 = 70%
- T2 = 80%
- T3 = 90%
- T4 = 100%

### Roll Value total del artefacto
earnedRV  = suma de RV_roll de todos los rolls de todos los substats
maxRV     = total_rolls * 100
percentRV = earnedRV / maxRV * 100

Ejemplo:
- Artefacto de 4 substats iniciales, todos los rolls en T4:
  earnedRV = 900, maxRV = 900, percentRV = 100%
- Artefacto de 3 substats iniciales, todos los rolls en T1:
  earnedRV = 560, maxRV = 800, percentRV = 70%

## 4. Casos Ambiguos

Un valor observado puede tener múltiples reconstrucciones válidas.

Ejemplo: CRIT_RATE = 10.5
Combinaciones posibles (round a 1 decimal == 10.5):
- [3.889, 3.889, 2.722] → suma interna = 10.500
- [3.889, 3.500, 3.111] → suma interna = 10.500
- [3.500, 3.500, 3.500] → suma interna = 10.500
(puede haber más)

Esto es esperado y no es un error. El sistema debe reportar
todas las combinaciones válidas y calcular confianza según cuántas existen.

## 5. Casos Imposibles

Un valor observado es imposible si ninguna combinación de los
valores T1-T4 produce, al redondearse a 1 decimal, el valor observado.

Toda operación de coincidencia visual debe aplicar Round Half Up de manera maetmática estricta a 1 decimal antes de comparar con el valor del usuario.

Ejemplo: CRIT_RATE = 10.6
No existe ninguna suma de valores de CRIT_RATE que redondeada
a 1 decimal dé 10.6. Este valor no puede existir en el juego.

El sistema debe marcarlo como INVALID_VALUE y detener el análisis
de ese substat, reportándolo en warnings[].

Un artefacto también es imposible a nivel global si todas las
combinaciones de rolls de sus substats suman más rolls de los
que el artefacto puede tener.