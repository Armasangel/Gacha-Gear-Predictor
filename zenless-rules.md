# Zenless Zone Zero — Drive Disc Rules

*Fuente primaria: Zenless Zone Zero Wiki (Fandom), sección "Stats". Rank de referencia: S-Rank (equivalente al 5★ de Genshin/HSR — el más alto, el que se analiza a nivel máximo).*

## 0. Diferencia estructural crítica frente a Genshin y HSR

**En ZZZ, los substats NO tienen variancia por roll.** Cita textual de la wiki: *"Sub-stats have fixed values, and upgrading a sub-stat will increase it by the same amount."*

En Genshin/HSR, cada roll de un substat cae al azar entre 3–4 valores posibles (tiers) — por eso existe el concepto de "tuviste un roll bueno o malo". **En ZZZ eso no existe.** Cada vez que un Drive Disc mejora un substat ya existente, suma siempre el mismo valor fijo. Lo único que varía por azar es **qué substat es elegido** para mejorar, no cuánto aporta esa mejora.

Esto significa que el motor actual (`randomTierValue()` + `SUBSTAT_TIERS: [low, med, high]`) modela una fuente de RNG que ZZZ no tiene. La forma correcta de representarlo con la arquitectura actual, sin reescribir el motor: un array de **un solo valor** por stat (`[valorFijo]`) con `maxTierIndex: 0`. Así `randomTierValue()` siempre devuelve el mismo número (correcto), y el RV de cada roll individual siempre será 100% (también correcto — en ZZZ no hay "rolls malos" en magnitud, solo en qué stat te tocó). El "Mejor Caso / Peor Caso" en ZZZ pasa a depender *solo* de qué substats terminaste teniendo, no de qué tan bien rolearon — que es exactamente cómo funciona el juego real.

## 1. Substats y Valores Reales (S-Rank, fijos, no tiers)

| Stat                                       | Valor por roll (fijo) | Máximo (6 rolls, pieza con 4 substats iniciales) |
|--------------------------------------------|-----------------------|--------------------------------------------------|
| CRIT_RATE                                  | 2.4                   | 14.4                                             |
| CRIT_DMG                                   | 4.8                   | 28.8                                             |
| HP_PERCENT                                 | 3.0*                  | 18.0*                                            |
| ATK_PERCENT                                | 3.0*                  | 18.0*                                            |
| DEF_PERCENT                                | 4.8                   | 28.8                                             |
| PEN (PEN Ratio)                            | 3.0*                  | 18.0*                                            |
| ANOMALY_MASTERY (Anomaly Proficiency, sub) | 6.0*                  | 36.0*                                            |
| HP_FLAT                                    | 112                   | 672                                              |
| ATK_FLAT                                   | 19                    | 114                                              |
| DEF_FLAT                                   | 15                    | 90                                               |

*Nota: la wiki da HP%/ATK%/PEN como "1–2" y Anomaly Proficiency-substat como "3–6" para **A-Rank**, no S-Rank directamente — la tabla de S-Rank de la wiki solo lista explícito HP, ATK, DEF, HP%, ATK%, DEF%, CRIT Rate%, CRIT DMG%, Anomaly Proficiency y PEN. Los valores marcados con \* están **interpolados** (S-Rank = A-Rank × 1.5, el mismo patrón de escala que se ve en HP/ATK/DEF donde S-Rank explícito ya está dado) — **pendiente de confirmar contra la wiki directamente antes de usarlos en producción**, no los metas al código todavía sin verificar.

Fórmula de máximo por stat: `6 × valor_fijo` (pieza de 4 substats iniciales, los 5 eventos de mejora + el roll inicial caen los 6 en el mismo substat).

## 2. Restricciones de Rolls

### Substats iniciales

- Un Drive Disc S-Rank puede empezar con 3 o 4 substats.
- Cada substat recibe exactamente 1 roll (de valor fijo) al aparecer.

### Upgrades

- Nivel máximo: +15. Se mejora un substat cada 3 niveles → exactamente **5 eventos de mejora** (igual que HSR).
- Si el disco empezó con 3 substats, el primer evento revela el 4to (cuenta como uno de los 5).

### Total de rolls por disco

- 4 substats iniciales: 4 + 5 = **9 rolls totales**.
- 3 substats iniciales: 3 + 1 (revelación) + 4 (resto) = **8 rolls totales**.

Misma cantidad total que Genshin y HSR — parece ser un patrón compartido en los tres juegos de HoYoverse con este sistema de gear, aunque el intervalo (cada 3 o cada 4 niveles) cambie.

### Rolls por substat

- Mínimo: 1. Máximo: limitado por el total del disco (8 o 9), igual que en los otros dos juegos.
- Regla real: suma de rolls de todos los substats == total de rolls del disco.

## 3. Fórmulas

### Crit Value (CV)

```
CV = CRIT_DMG + (CRIT_RATE * 2)
```

Misma fórmula universal. Como cada roll da un valor fijo (no aleatorio), el CV de una pieza con una combinación de substats dada **no varía entre "mejor caso" y "peor caso" salvo por cuáles substats terminaron ahí** — no hay variancia de magnitud dentro del mismo substat.

**CV máximo teórico por pieza — verificado con los datos reales de la wiki:**

```
CV_max = 7 rolls × 4.8 (CRIT_DMG fijo, o CRIT_RATE×2 — son iguales por diseño) = 33.6
```

**Referencia de calidad (comunidad):**

- Fuente principal, verificada por matemática directa de los valores fijos de la wiki: **CV máximo real por pieza ≈ 33.6**.
- **Benchmark de jugador** (marcado explícitamente como experiencia de juego, no dato de wiki, consistente con el máximo teórico calculado): 20–30 CV ya es muy buena, 25+ es "god roll".
- No hay evidencia (ni en la wiki ni en búsquedas) de que la comunidad de ZZZ use un ratio fijo tipo "1:2" como referencia adicional en HSR — más investigación necesaria si se quiere ese dato, no se va a inventar.

### Roll Value (RV) por roll

```
RV_roll = (valor_del_roll / valor_fijo_del_stat) * 100 = 100%  (siempre)
```

No hay tiers, así que no hay piso: todo roll individual vale 100% de RV por definición, porque no existe un valor "peor" con el que compararlo dentro del mismo stat.

### Roll Value total del disco

```
earnedRV  = suma de RV_roll de todos los rolls = totalRolls * 100
maxRV     = totalRolls * 100
percentRV = earnedRV / maxRV * 100 = 100%  (siempre, si el disco es válido)
```

**Esto es la consecuencia directa de la sección 0**: en ZZZ, `percentRV` no sirve para distinguir "mejor caso" de "peor caso" — siempre da 100% en cualquier disco válido. La variable real de calidad en ZZZ es **qué substats terminaste teniendo** (y en qué proporción de rolls cada uno), no qué tan bien rolearon en magnitud. Cualquier lógica de "bestConfiguration/worstConfiguration" basada en RV, heredada tal cual del pipeline de Genshin/HSR, no tiene sentido en ZZZ — hay que juzgar por CV u otro criterio de composición de stats. (Ver `disc-analysis-spec.md`, sección de Definiciones.)

## 4. Casos Ambiguos

A diferencia de Genshin/HSR, la ambigüedad *dentro* de un mismo substat prácticamente no existe en ZZZ: como todos los rolls de un stat valen lo mismo, el número de rolls que cayeron ahí se deduce por división directa (`valor_observado / valor_fijo`), y con los espaciados de esta tabla (todos ≥ 2.4, muy por encima del margen de redondeo de 0.05 a 1 decimal) no hay dos cantidades de rolls distintas que redondeen al mismo valor mostrado.

La ambigüedad que sí puede sobrevivir es la de **Genshin/HSR entre stats**: cómo se reparten los 5 eventos de mejora entre 3 o 4 substats para llegar a un total de 8 o 9 rolls. Si el rollCount de cada substat (deducido por división) ya suma exactamente 8 o 9, hay una única configuración válida; si no suma ninguno de los dos, el disco es imposible.

*Derivado, no copiado — advertencia:* esto asume que los valores fijos de la tabla (sección 1) son correctos, incluyendo los interpolados con \*. Si al confirmarlos contra la wiki alguno resulta más cercano a otro stat en espaciado, esta garantía de "casi nunca hay ambigüedad" podría dejar de cumplirse para ese stat puntual — el pipeline debe seguir implementando el chequeo combinatorio general, no asumir "siempre 1 configuración" como atajo.

## 5. Casos Imposibles

Un valor observado es imposible si no es, dentro de tolerancia de redondeo a 1 decimal, un múltiplo entero del valor fijo del stat (1 a 6 rolls). Ejemplo: CRIT_RATE observado en 3.6 es imposible, porque los únicos valores alcanzables son 2.4, 4.8, 7.2, 9.6, 12.0, 14.4 (múltiplos de 2.4) — 3.6 no es ninguno de ellos.

Un disco también es imposible a nivel global si la suma de rollCounts deducidos de sus substats no coincide con 8 ni con 9.

**Recordatorio de la sección 1:** cualquier análisis sobre HP%, ATK%, PEN o Anomaly Proficiency (substat) usa valores interpolados no confirmados directamente contra la wiki. Un `INVALID_VALUE` o `NO_COMBINATIONS` reportado sobre esos stats específicos debe tratarse con más cautela que el resto — podría ser un falso negativo del valor interpolado, no necesariamente un disco imposible de verdad.
