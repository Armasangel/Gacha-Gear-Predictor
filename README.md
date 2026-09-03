# Gacha Gear Predictor
> Herramienta de análisis y proyección de gear para los juegos de HoYoverse: **Genshin Impact**, **Honkai: Star Rail** y **Zenless Zone Zero**.

Un jugador promedio de HoYoverse pasa horas farmeando artefactos sin saber si vale la pena invertir en uno. Esta herramienta responde esa pregunta con matemáticas reales del juego — sin instalaciones, directo en el navegador.

Selecciona tu juego y la app adapta automáticamente piezas, mainstats, substats, grilla de niveles y umbrales de veredicto a ese específico.

---

## ¿Qué hace?

Dado un artefacto en cualquier nivel (0, 4, 8, 12, 16 o 20), corre una simulación de Monte Carlo (10,000 tiradas) que replica el RNG real del juego, y muestra tres escenarios representativos:

- **Mejor caso** — percentil 90 de las tiradas simuladas
- **Caso promedio** — mediana de las tiradas simuladas
- **Peor caso** — percentil 10 de las tiradas simuladas

Cada escenario es una tirada *completa y coherente* (no se mezclan los mejores rolls individuales de stats distintos como si vinieran del mismo artefacto). Además del veredicto, la app muestra el **% real de probabilidad** de que el artefacto termine siendo INVERTIR / CONSIDERAR / DESCARTAR, calculado sobre las 10,000 corridas.
 
Si el artefacto tiene 3 substats, predice el 4to con probabilidades reales ponderadas y muestra qué tan probable es obtener algo útil para tu build.

---

## Demo

🔗 **[Abrir Gacha Gear Predictor](https://armasangel.github.io/Gacha-Gear-Predictor/)**

---

## Ejemplo de output

```
Corona | Main: Prob. Crítica | +0

STAT               MEJOR    PROM    PEOR
─────────────────────────────────────────
Daño Crítico        45.9    15.3     7.0
ATK%                 4.7    10.9     4.7
HP Plano           209.0   526.5  1254.0
Recarga de Energía   5.2    12.1     5.2

CV (substats)       45.9    15.3     7.0
CV (con mainstat)  108.1    77.5    69.2
RV%                91.2%   83.0%   74.5%

✅ INVERTIR — CV promedio de 77.5 es bueno (>=50).
```

---

## Mecánicas implementadas

Basadas en datos extraídos del juego y verificados contra la [Genshin Impact Wiki](https://genshin-impact.fandom.com/wiki/Artifact/Distribution).

**Substats y tiers (5★)**

Cada substat tiene 4 tiers de valor con 25% de probabilidad cada uno:

| Stat | T1 | T2 | T3 | T4 |
|------|----|----|----|----|
| CRIT Rate | 2.722 | 3.111 | 3.500 | 3.889 |
| CRIT DMG | 5.444 | 6.222 | 7.000 | 7.778 |
| ATK% | 4.083 | 4.667 | 5.250 | 5.833 |
| HP% | 4.083 | 4.667 | 5.250 | 5.833 |
| DEF% | 5.104 | 5.833 | 6.562 | 7.292 |
| Energy Recharge | 4.531 | 5.179 | 5.826 | 6.474 |
| Elemental Mastery | 16 | 19 | 21 | 23 |
| HP Flat | 209 | 239 | 269 | 299 |
| ATK Flat | 14 | 16 | 18 | 19 |
| DEF Flat | 16 | 19 | 21 | 23 |

**Pesos de aparición**

| Peso | Stats |
|------|-------|
| 6 | HP Flat, ATK Flat, DEF Flat |
| 4 | HP%, ATK%, DEF%, Energy Recharge, Elemental Mastery |
| 3 | CRIT Rate, CRIT DMG |

**Reglas de upgrades**

- 4 substats iniciales → 5 upgrades al +20
- 3 substats iniciales → +4 revela el 4to (sin upgrade de valor), luego 4 upgrades
- Cada upgrade sube un substat elegido al azar entre los existentes (equiprobable), con un tier también al azar (25% cada uno) — igual que en el juego real

**Simulación**

El motor (`Simulator.js`) usa **Monte Carlo** en vez de fórmulas cerradas: en cada corrida, simula la secuencia real de upgrades del artefacto (substat al azar → tier al azar, repetido tantas veces como upgrades falten). Por defecto corre 10,000 iteraciones. De ahí salen tanto los tres escenarios (percentiles 10/50/90) como el % de probabilidad de cada veredicto.

**Métricas**

- **CV** = CRIT_DMG + (CRIT_RATE × 2)
- **RV%** = eficiencia de rolls respecto al máximo teórico

---

## Arquitectura

```
Gacha-Gear-Predictor/
│
├── index.html
├── style.css
│
└── js/
    ├── data/
    │   ├── profiles/
    │   │   ├── index.js          # Registro de juegos (getProfile)
    │   │   ├── genshin.js        # Perfil Genshin Impact
    │   │   ├── hsr.js            # Perfil Honkai: Star Rail
    │   │   └── zzz.js            # Perfil Zenless Zone Zero
    │   ├── StatType.js           # Substats Genshin (tiers + pesos)
    │   ├── MainStatType.js       # Mainstats Genshin
    │   ├── PieceType.js          # Piezas Genshin
    │   ├── StatMapping.js        # main <-> substat (Genshin)
    │   └── Icons.js              # Iconos SVG por stat/pieza
    │
    ├── models/
    │   ├── Substat.js
    │   ├── Artifact.js           # Consume un perfil para validar
    │   ├── BuildGoal.js
    │   ├── StatPrediction.js
    │   └── SimulationResult.js
    │
    ├── engine/
    │   ├── GameRules.js          # Pool + predicción 4to substat (perfil-aware)
    │   └── Simulator.js          # Monte Carlo (perfil-aware)
    │
    ├── i18n/                     # ES / EN
    │
    └── ui/
        ├── form.js               # Form dinámico según el perfil activo
        ├── display.js            # Renderiza resultados perfil-aware
        ├── IconSelect.js         # Dropdown accesible con iconos
        └── main.js               # Orquesta todo + selector de juego
```

---

## Cómo usarlo

1. Abre la herramienta en el navegador
2. Selecciona el juego (Genshin Impact / Honkai: Star Rail / Zenless Zone Zero)
3. Selecciona el tipo de pieza y el main stat
4. Ingresa tus substats y sus valores
5. Marca qué substats te importan y ordénalos por prioridad (▲▼)
6. Haz clic en **Analizar**

La selección de juego se guarda y se recuerda entre visitas.

---

## Roadmap

- [x] Motor de proyección forward (mejor/peor/promedio)
- [x] Predicción del 4to substat con probabilidades ponderadas
- [x] BuildGoal con prioridades ordenables por el usuario
- [x] CV doble (substats + mainstat) y RV%
- [x] Soporte para niveles intermedios (0, 4, 8, 12, 16, 20)
- [x] Webapp desplegable en GitHub Pages
- [x] Diseño visual pulido
- [x] Soporte multi-juego (Star Rail, ZZZ)
- [x] Selector de juego con perfiles configurables (Genshin / Star Rail / ZZZ)
- [x] Iconos SVG por juego

---

## Fuentes

- [Genshin Impact Wiki — Artifact Distribution](https://genshin-impact.fandom.com/wiki/Artifact/Distribution)
- [Genshin Impact Wiki — Artifact Scaling](https://genshin-impact.fandom.com/wiki/Artifact/Scaling)

---

## Autor

**Armasangel** — proyecto personal de un fan de los juegos gacha que se cansó de no entender el RNG.

---

## Licencia y aviso legal

Código bajo licencia [MIT](LICENSE).

> **Fan project no oficial.** Este proyecto no está afiliado, respaldado ni patrocinado por HoYoverse / miHoYo. "Genshin Impact" y los assets visuales usados son propiedad de sus respectivos dueños y se usan aquí con fines informativos/educativos.
