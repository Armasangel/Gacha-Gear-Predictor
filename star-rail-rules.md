# Honkai: Star Rail — Gear Rules

*Fuente primaria: Honkai: Star Rail Wiki (Fandom), sección "Relic/Stats". Verificado 1:1 contra `js/data/profiles/hsr.js` — los valores ya en el motor coinciden exacto con esta tabla.*

## 0. Estructura

```
StarRailRules
│
├── RelicRules      (Head, Hands, Body, Feet — set de 4 piezas)
│
└── OrnamentRules   (Planar Sphere, Link Rope — set de 2 piezas)
```

Reliquias y Ornamentos comparten **el mismo motor de substats, tiers, rolls y fórmulas** (secciones 1–3): es un solo sistema de gear con dos familias de piezas, no dos sistemas distintos. La wiki no describe ninguna diferencia de mecánica de rolls entre ambos — suben de nivel igual, reciben substats igual, se mejoran igual. Lo único que cambia entre familias es qué piezas físicas existen y qué mainstats puede tener cada una (sección 4). Por eso las secciones 1–3 se documentan una sola vez: duplicarlas por familia repetiría la misma tabla dos veces sin ninguna diferencia real, con el único efecto de aumentar el riesgo de que ambas copias diverjan por error de transcripción.

A diferencia de Genshin (4 tiers por stat), HSR usa **3 tiers**.

## 1. Substats y Valores Reales (5★)

Todos los valores son internos. El juego los muestra redondeados a 1 decimal.

| Stat              | Low (T1) | Med (T2) | High (T3) |
|-------------------|----------|----------|-----------|
| CRIT_RATE         | 2.592    | 2.916    | 3.240     |
| CRIT_DMG          | 5.184    | 5.832    | 6.480     |
| SPD               | 2.0      | 2.3      | 2.6       |
| HP_PERCENT        | 3.456    | 3.888    | 4.320     |
| ATK_PERCENT       | 3.456    | 3.888    | 4.320     |
| DEF_PERCENT       | 4.320    | 4.860    | 5.400     |
| BREAK_EFFECT      | 5.184    | 5.832    | 6.480     |
| EFFECT_HIT_RATE   | 3.456    | 3.888    | 4.320     |
| EFFECT_RES        | 3.456    | 3.888    | 4.320     |
| HP_FLAT           | 33.870   | 38.104   | 42.338    |
| ATK_FLAT          | 16.935   | 19.052   | 21.169    |
| DEF_FLAT          | 16.935   | 19.052   | 21.169    |

**Nota de diferencia con Genshin**: en Genshin los stats planos (HP/ATK/DEF/EM) son enteros exactos. En HSR, **todos** los stats — planos incluidos — tienen decimales internos y se redondean a 1 decimal para mostrarse. Esto es relevante para la sección 6 (Casos Imposibles): en HSR el redondeo a 1 decimal aplica sin excepción a cualquier stat, mientras que en Genshin los planos no necesitan esa comparación por redondeo.

### Pesos de selección de substat (suma = 100)

| Stat              | Peso   | Stat            | Peso |
|-------------------|--------|-----------------|------|
| HP/ATK/DEF (flat) | 10 c/u | EFFECT_HIT_RATE | 8    |
| HP%/ATK%/DEF%     | 10 c/u | EFFECT_RES      | 8    |
| SPD               | 4      | BREAK_EFFECT    | 8    |
| CRIT_RATE         | 6      | CRIT_DMG        | 6    |

Estos pesos determinan qué substat es *elegido* al aparecer o mejorar — no afectan qué tier (Low/Med/High) le toca, eso es un sorteo independiente y uniforme entre los 3 tiers.

## 2. Restricciones de Rolls

### Substats iniciales

- Una pieza (Reliquia u Ornamento) puede empezar con 3 o 4 substats.
- Cada substat recibe exactamente 1 roll al aparecer.

### Upgrades

- Nivel máximo: +15. Se agrega o mejora un substat cada 3 niveles (en 3, 6, 9, 12, 15) → exactamente **5 eventos de mejora**.
- Si la pieza empezó con 3 substats, el primer evento de mejora revela el 4to substat. Ese evento sí cuenta como uno de los 5, y el roll que recibe el substat recién revelado sí forma parte del conteo total — no es un roll "extra" fuera del presupuesto de 5.

### Total de rolls por pieza

- 4 substats iniciales: 4 + 5 = **9 rolls totales**.
- 3 substats iniciales: 3 + 1 (revelación) + 4 (resto de upgrades) = **8 rolls totales**.

Esto es *idéntico en cantidad* a Genshin (8 o 9 rolls), aunque el mecanismo temporal sea distinto (cada 3 niveles en vez de cada 4). Confirmado con el propio texto de la wiki: *"a 5-star relic with 4 initial Sub Stats will be able to enhance its Sub Stats up to 5 times"*.

### Rolls por substat

- Mínimo: 1 (solo el roll inicial, ningún upgrade cayó ahí).
- Máximo: no definido por substat individualmente, limitado por el total de la pieza (8 o 9).
- Regla real: suma de rolls de todos los substats == total de rolls de la pieza.

### Restricción de duplicados

- No puede haber dos substats del mismo tipo en la misma pieza.
- Ningún substat puede coincidir con el tipo del mainstat de esa pieza.

## 3. Fórmulas

### Crit Value (CV)

```
CV = CRIT_DMG + (CRIT_RATE * 2)
```

Misma fórmula que Genshin — no cambia entre juegos HoYoverse, solo cambia la escala de los valores que entran.

**Referencia de calidad (comunidad):** *pendiente*. A diferencia de `zenless-rules.md`, no tengo un benchmark de comunidad confiable para HSR (ni de la wiki ni de fuentes verificadas) — no lo voy a inventar por analogía con Genshin. Si tenés un número de referencia real (tipo "CV > X es god roll" de la comunidad de HSR), lo agrego acá.

**CV máximo teórico por pieza — derivado, no copiado:**
Con 4 substats, el máximo de rolls que pueden caer combinados en CRIT_RATE+CRIT_DMG es 7 (1 roll inicial de cada uno + los 5 eventos de mejora, en el escenario de suerte perfecta donde todos caen ahí). Como el juego balancea CRIT_DMG_top = 2 × CRIT_RATE_top (6.48 = 2×3.24), cada roll aporta lo mismo al CV sin importar en cuál de los dos cae:

```
CV_max ≈ 7 rolls × 6.48 = 45.36 ≈ 45
```

(Para referencia, el mismo cálculo en Genshin da 7 × 7.778 ≈ 54.4.)

### Roll Value (RV) por roll

```
RV_roll = (valor_del_roll / High_del_stat) * 100
```

Con solo 3 tiers, normalizado contra el tier más alto real del perfil (`maxTierIndex = 2` para HSR, no 3 como en Genshin):

- Low = 80%
- Med = 90%
- High = 100%

No existe un tier equivalente al 70% de Genshin — el piso de RV individual en HSR es 80%, no 70%.

### Roll Value total de la pieza

```
earnedRV  = suma de RV_roll de todos los rolls de todos los substats
maxRV     = total_rolls * 100
percentRV = earnedRV / maxRV * 100
```

Ejemplo:

- Pieza de 4 substats iniciales, todos los rolls en High: earnedRV = 900, maxRV = 900, percentRV = 100%.
- Pieza de 3 substats iniciales, todos los rolls en Low: earnedRV = 8 × 80 = 640, maxRV = 800, percentRV = **80%** (no 70%, como sí daría el peor caso en Genshin — consecuencia directa de que el piso de tier en HSR es más alto).

## 4. Piezas y Mainstats

### 4.1 RelicRules

Set de 4 piezas:

| Pieza | Mainstat                             |
|-------|--------------------------------------|
| Head  | Fijo — HP_FLAT                       |
| Hands | Fijo — ATK_FLAT                      |
| Body  | Variable (pool de mainstats de Body) |
| Feet  | Variable (pool de mainstats de Feet) |

### 4.2 OrnamentRules

Set de 2 piezas:

| Pieza         | Mainstat                                      |
|---------------|-----------------------------------------------|
| Planar Sphere | Variable (pool de mainstats de Planar Sphere) |
| Link Rope     | Variable (pool de mainstats de Link Rope)     |

**Nota para el análisis de substats (ver `relic-analysis-spec.md`):** el mainstat no forma parte del input del análisis de rolls — solo importan los substats. Por lo tanto, para efectos de ese pipeline, Reliquias y Ornamentos son **indistinguibles**: la separación Relic/Ornament solo importa para lógica de sets y de mainstat, que queda fuera del alcance de este documento y del spec de análisis.

## 5. Casos Ambiguos

Un valor observado puede tener múltiples reconstrucciones válidas — igual que en Genshin, pero acá hay un ejemplo real y no forzado:

Ejemplo: CRIT_RATE = 5.8 (2 rolls)

- [High, Low] → 3.240 + 2.592 = 5.832 → redondea a 5.8
- [Med, Med] → 2.916 + 2.916 = 5.832 → redondea a 5.8

Ambas combinaciones producen el **mismo valor interno exacto** (5.832), no solo el mismo redondeo — coincidencia real de la tabla de valores, no un caso construido. El sistema debe reportar ambas combinaciones y no puede resolver la ambigüedad con más precisión de la que el juego expone.

## 6. Casos Imposibles

Un valor observado es imposible si ninguna combinación de tiers Low/Med/High produce, al redondearse a 1 decimal, el valor observado. Toda comparación debe usar Round Half Up estricto a 1 decimal, igual que en Genshin.

Ejemplo trivial pero siempre válido: cualquier valor de CRIT_RATE por debajo de 2.592 (el roll mínimo posible, Low de 1 solo roll) es imposible sin importar rollCount, porque ni el roll más bajo del juego llega tan bajo.

Una pieza también es imposible a nivel global si todas las combinaciones de rolls de sus substats suman más rolls de los que la pieza puede tener (8 o 9).
