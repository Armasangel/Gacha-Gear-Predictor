import itertools

# 1. Reglas oficiales de Genshin Impact (Valores internos)
GAME_TIERS = {
    "CRIT_RATE": [2.722, 3.111, 3.500, 3.889],
    "CRIT_DMG": [5.444, 6.222, 7.000, 7.778],
    "ATK_PERCENT": [4.083, 4.667, 5.250, 5.833],
    "ENERGY_RECHARGE": [4.531, 5.179, 5.826, 6.474],
}

# Mapa para convertir cada float real a su porcentaje de Roll Value (RV) correspondiente
# 2.722 / 3.889 = 70%, 3.111 / 3.889 = 80%, etc.
RV_MAP = {
    2.722: 70, 3.111: 80, 3.500: 90, 3.889: 100,       # Crit Rate
    5.444: 70, 6.222: 80, 7.000: 90, 7.778: 100,       # Crit DMG
    4.083: 70, 4.667: 80, 5.250: 90, 5.833: 100,       # ATK%
    4.531: 70, 5.179: 80, 5.826: 90, 6.474: 100        # Recarga
}

def find_stat_combinations(target_value: float, tiers: list) -> list:
    valid = []
    for r in range(1, 7):
        for combo in itertools.combinations_with_replacement(tiers, r):
            if round(sum(combo), 1) == target_value:
                valid.append({
                    "rolls": list(combo),
                    "roll_count": r,
                    "exact_sum": round(sum(combo), 3)
                })
    return valid

# NUEVA FUNCIÓN: Calcula el Crit Value del artefacto completo (Es trivial pero útil)
def calculate_crit_value(artifact_input: dict) -> float:
    cr = artifact_input.get("CRIT_RATE", 0.0)
    cd = artifact_input.get("CRIT_DMG", 0.0)
    return round(cd + (cr * 2), 1)

# NUEVA FUNCIÓN: Scorear. Toma una configuración global y le calcula su RV acumulado
def score_configuration(config: dict) -> dict:
    earned_rv = 0
    
    # Pasamos por cada stat dentro de la configuración
    for stat_name, stat_data in config["stats"].items():
        # Por cada tiro individual en el historial de ese stat, buscamos su valor de RV (70-100)
        for roll in stat_data["rolls"]:
            # Usamos round(roll, 3) para evitar problemas de precisión de flotantes en el diccionario
            earned_rv += RV_MAP[round(roll, 3)]
            
    # El valor máximo teórico de RV depende de si empezó con 3 stats (800% RV) o 4 stats (900% RV)
    max_rv = config["total_rolls"] * 100
    percent_rv = round((earned_rv / max_rv) * 100, 1)
    
    config["earned_rv"] = earned_rv
    config["max_rv"] = max_rv
    config["percent_rv"] = percent_rv
    return config

def build_artifact_configurations(artifact_input: dict) -> list:
    stat_names = list(artifact_input.keys())
    combos_per_stat = []
    
    for name in stat_names:
        visible_value = artifact_input[name]
        combos = find_stat_combinations(visible_value, GAME_TIERS[name])
        if not combos:
            print(f"❌ Error: El stat '{name}' = {visible_value}% es matemáticamente imposible.")
            return []
        combos_per_stat.append(combos)
        
    valid_configs = []
    
    for combo_tuple in itertools.product(*combos_per_stat):
        total_rolls = sum(c["roll_count"] for c in combo_tuple)
        
        if total_rolls == 9:
            started_with = 4
        elif total_rolls == 8:
            started_with = 3
        else:
            continue
            
        config = {
            "stats": {stat_names[i]: combo_tuple[i] for i in range(len(stat_names))},
            "total_rolls": total_rolls,
            "started_with_subs": started_with
        }
        
        # PUNTUAR: Le inyectamos los datos de RV a la configuración antes de guardarla
        config = score_configuration(config)
        valid_configs.append(config)
        
    return valid_configs

# NUEVA FUNCIÓN: La interfaz limpia para el usuario. Resume todo el caos combinatorio.
def generate_artifact_report(artifact_input: dict):
    print("=" * 65)
    print("      REPORTE DE INGENIERÍA INVERSA - MOTOR DE ARTEFACTOS")
    print("=" * 65)
    
    # 1. Calcular CV general
    cv = calculate_crit_value(artifact_input)
    print(f"🎯 Crit Value (CV) Visual: {cv} pts")
    
    # 2. Obtener configuraciones puntuadas
    configs = build_artifact_configurations(artifact_input)
    
    if not configs:
        print("\n❌ El artefacto analizado no tiene un pasado genético válido.")
        return
        
    # 3. ORDENAR: Las clasificamos de mayor a menor porcentaje de RV
    # Así la "mejor historia posible" siempre estará al inicio.
    configs_sorted = sorted(configs, key=lambda x: x["percent_rv"], reverse=True)
    
    print(f"📦 Historias genéticas coherentes encontradas: {len(configs_sorted)}")
    print("-" * 65)
    
    # 4. Extraer el Best Case (Mejor escenario de suerte)
    best_case = configs_sorted[0]
    print(f"🔥 MEJOR ESCENARIO POSIBLE (Suerte Máxima):")
    print(f"   • Eficiencia Roll Value: {best_case['percent_rv']}% RV ({best_case['earned_rv']}/{best_case['max_rv']})")
    print(f"   • Origen: Empezó con {best_case['started_with_subs']} substats.")
    for stat, data in best_case["stats"].items():
        print(f"     - {stat:<15}: {data['roll_count']} roll(s) -> {data['rolls']}")
        
    print("-" * 65)
    
    # 5. Extraer el Worst Case (Peor escenario de suerte)
    worst_case = configs_sorted[-1]
    print(f"📉 PEOR ESCENARIO POSIBLE (Suerte Mínima):")
    print(f"   • Eficiencia Roll Value: {worst_case['percent_rv']}% RV ({worst_case['earned_rv']}/{worst_case['max_rv']})")
    print(f"   • Origen: Empezó con {worst_case['started_with_subs']} substats.")
    for stat, data in worst_case["stats"].items():
        print(f"     - {stat:<15}: {data['roll_count']} roll(s) -> {data['rolls']}")
    print("=" * 65)

# ==========================================
# EJECUCIÓN CON EL ARTEFACTO DE CLAUDE
# ==========================================
if __name__ == "__main__":
    claude_artifact = {
        "CRIT_RATE": 10.5,
        "CRIT_DMG": 28.0,
        "ATK_PERCENT": 4.7,
        "ENERGY_RECHARGE": 5.2
    }
    
    generate_artifact_report(claude_artifact)