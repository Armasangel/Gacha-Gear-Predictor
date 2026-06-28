# Gacha Gear Predictor
> Motor de análisis y proyección de artefactos para Genshin Impact (5★)

Un jugador promedio de Genshin Impact pasa horas farmeando artefactos sin saber si vale la pena invertir en uno. Este proyecto responde esa pregunta con matemáticas reales del juego.

---

## ¿Qué hace?

Dado un artefacto en cualquier nivel (0, 4, 8, 12, 16 o 20), el motor calcula cómo podría terminar al +20 bajo tres escenarios:

- **Mejor caso** — todos los upgrades caen en el stat que más te importa, con el tier máximo (T4)
- **Peor caso** — todos los upgrades caen en el stat que menos te importa, con el tier mínimo (T1)
- **Caso promedio** — distribución equitativa entre los 4 substats con el valor esperado de tier

Si el artefacto tiene 3 substats, también predice el 4to substat con sus probabilidades reales ponderadas y te dice qué tan probable es obtener algo útil.

---

## Ejemplo de output

```
=======================================================
  CIRCLET | Main: CRIT_RATE | +0
=======================================================
STAT                      MEJOR     PROM     PEOR
-------------------------------------------------------
CRIT_DMG                   45.9     15.3      7.0
ATK_PERCENT                 4.7     10.9      4.7
HP_FLAT                   209.0    526.5   1254.0
ENERGY_RECHARGE             5.2     12.1      5.2
-------------------------------------------------------
CV (substats)              45.9     15.3      7.0
CV (con mainstat)         108.1     77.5     69.2
RV%                       91.2%    83.0%    74.5%
=======================================================
VEREDICTO: INVERTIR
  CV promedio de 77.5 es bueno (>=50).
=======================================================
```

---

## Mecánicas implementadas

Las reglas están basadas en datos extraídos del juego y verificados contra la [Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Artifact/Distribution).

**Substats y tiers (5★)**

Cada substat tiene 4 tiers de valor posibles, con 25% de probabilidad cada uno:

| Stat | T1 | T2 | T3 | T4 |
|------|----|----|----|----|
| CRIT_RATE | 2.722 | 3.111 | 3.500 | 3.889 |
| CRIT_DMG | 5.444 | 6.222 | 7.000 | 7.778 |
| ATK% | 4.083 | 4.667 | 5.250 | 5.833 |
| HP% | 4.083 | 4.667 | 5.250 | 5.833 |
| DEF% | 5.104 | 5.833 | 6.562 | 7.292 |
| Energy Recharge | 4.531 | 5.179 | 5.826 | 6.474 |
| Elemental Mastery | 16 | 19 | 21 | 23 |
| HP Flat | 209 | 239 | 269 | 299 |
| ATK Flat | 14 | 16 | 18 | 19 |
| DEF Flat | 16 | 19 | 21 | 23 |

**Pesos de aparición de substats**

No todos los substats tienen la misma probabilidad de aparecer. Los stats de crítico son los más raros:

| Peso | Stats |
|------|-------|
| 6 | HP Flat, ATK Flat, DEF Flat |
| 4 | HP%, ATK%, DEF%, Energy Recharge, Elemental Mastery |
| 3 | CRIT Rate, CRIT DMG |

**Reglas de upgrades**

- Artefacto con 4 substats iniciales: 5 upgrades al llegar a +20
- Artefacto con 3 substats iniciales: el +4 revela el 4to substat (no es un upgrade de valor), luego 4 upgrades
- Cada upgrade: 25% de probabilidad por cada uno de los 4 slots

**Métricas**

- **CV (Crit Value)** = CRIT_DMG + (CRIT_RATE × 2) — métrica estándar de la comunidad
- **RV% (Roll Value)** = eficiencia de los rolls respecto al máximo teórico posible

---

## Arquitectura

```
Gacha-Gear-Predictor/
├── enums/
│   ├── StatType.java          # Substats con tiers T1-T4 y pesos de aparición
│   ├── MainStatType.java      # Mainstats con valor al +20
│   └── PieceType.java         # Tipos de pieza con mainstats válidos
│
├── models/
│   ├── Substat.java           # Un substat con su tipo y valor actual
│   ├── Artifact.java          # Pieza completa con validaciones en constructor
│   ├── BuildGoal.java         # Stats que el jugador quiere obtener
│   ├── StatPrediction.java    # Predicción de un stat con su probabilidad
│   └── SimulationResult.java  # Resultados de los tres escenarios
│
└── engine/
    ├── GameRules.java         # Pool disponible y predicción del 4to substat
    └── Simulator.java         # Proyección forward: mejor/peor/promedio
```

---

## Cómo usarlo (por ahora)

El proyecto está en fase de motor — sin interfaz gráfica todavía. Para probarlo:

1. Clona el repo
2. Abre en tu IDE favorito (VS Code + Extension Pack for Java recomendado)
3. Edita `Main.java` con tu artefacto:

```java
Artifact artifact = new Artifact(
    PieceType.CIRCLET,
    MainStatType.CRIT_RATE,
    0,
    List.of(
        new Substat(StatType.CRIT_DMG, 7.0),
        new Substat(StatType.ATK_PERCENT, 4.7),
        new Substat(StatType.HP_FLAT, 209.0),
        new Substat(StatType.ENERGY_RECHARGE, 5.2)
    )
);

BuildGoal goal = new BuildGoal(List.of(
    StatType.CRIT_RATE,
    StatType.CRIT_DMG,
    StatType.ATK_PERCENT
));
```

4. Corre `Main.java`

---

## Roadmap

- [x] Motor de proyección forward (mejor/peor/promedio)
- [x] Predicción del 4to substat con probabilidades ponderadas
- [x] Cálculo de CV y RV%
- [x] Soporte para artefactos en niveles intermedios (0, 4, 8, 12, 16, 20)
- [ ] Interfaz gráfica (webapp / app de escritorio)
- [ ] Perfiles de personaje (BuildGoal predefinidos por personaje)
- [ ] Soporte para otros juegos (Honkai: Star Rail, Zenless Zone Zero)

---

## Fuentes

- [Genshin Impact Wiki — Artifact Distribution](https://genshin-impact.fandom.com/wiki/Artifact/Distribution)
- [Genshin Impact Wiki — Artifact Scaling](https://genshin-impact.fandom.com/wiki/Artifact/Scaling)

---

## Autor

**Armasangel** — proyecto personal de un fan de los juegos gacha que se cansó de no entender el RNG y espera ser útil para otros jugadores :D. 
