import itertools

GAME_TIERS = {
    "CRIT_RATE": [2.722, 3.111, 3.500, 3.889],
    "CRIT_DMG": [5.444, 6.222, 7.000, 7.778],
    "ATK_PERCENT": [4.083, 4.667, 5.250, 5.833],
    "ENERGY_RECHARGE": [4.531, 5.179, 5.826, 6.474],
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

def build_artifact_configurations(artifact_input: dict, initial_subs_count=3):
    """
    initial_subs_count: 3 o 4 (si empezó con 3, al llegar a +20 tiene 5 upgrades)
    """
    # Calcular expected_rolls UNA SOLA VEZ al inicio
    if initial_subs_count == 3:
        expected_rolls = 8  # 3 iniciales + 5 upgrades = 8
    elif initial_subs_count == 4:
        expected_rolls = 9  # 4 iniciales + 4 upgrades = 9
    else:
        raise ValueError("initial_subs_count debe ser 3 o 4")
    
    # 1. Obtener combinaciones para cada stat
    stats_combos = {}
    for stat_name, value in artifact_input.items():
        if stat_name not in GAME_TIERS:
            print(f"Stat desconocido: {stat_name}")
            return []
        stats_combos[stat_name] = find_stat_combinations(value, GAME_TIERS[stat_name])
    
    # 2. Verificar que todos los stats tengan al menos 1 combo
    for stat, combos in stats_combos.items():
        if not combos:
            print(f"No hay combinaciones para {stat} con valor {artifact_input[stat]}")
            return []
    
    # 3. Producto cartesiano con itertools.product
    stat_names = list(stats_combos.keys())
    combos_list = [stats_combos[name] for name in stat_names]
    
    total_checked = 0
    valid_configs = []
    
    for combo_tuple in itertools.product(*combos_list):
        total_checked += 1
        # combo_tuple = (dict_CR, dict_CD, dict_ATK, dict_ER)
        total_rolls = sum(c["roll_count"] for c in combo_tuple)
        
        print (f" total_rolls={total_rolls} | expected={expected_rolls} -> ", end="")
        for i, c in enumerate(combo_tuple):
            print(f"{stat_names[i]}: {c['roll_count']} rolls (sum={c['exact_sum']}) | ", end="")
        print()  # Nueva línea al final de cada combo evaluado

        # Filtro principal: suma de rolls debe ser exactamente expected_rolls
        if total_rolls != expected_rolls:
            continue
        
        # Si pasó el filtro, es válida
        config = {
            "stats": {stat_names[i]: combo_tuple[i] for i in range(len(stat_names))},
            "total_rolls": total_rolls,
            "initial_subs": initial_subs_count
        }
        valid_configs.append(config)
    
    print(f"\nTotal combinaciones evaluadas: {total_checked}")
    print(f" Válidas (rolls={expected_rolls}): {len(valid_configs)}")
    
    return valid_configs

# ==========================================
# PRUEBA
# ==========================================
if __name__ == "__main__":
    print("=" * 60)
    print("PRUEBA 1: Artefacto con valores que NO funcionan")
    print("=" * 60)
    mock_artifact_bad = {
        "CRIT_RATE": 10.5,
        "CRIT_DMG": 21.8,
        "ATK_PERCENT": 11.7,
        "ENERGY_RECHARGE": 11.0
    }
    valid = build_artifact_configurations(mock_artifact_bad)  # Detección automática
    
    print("\n" + "=" * 60)
    print("PRUEBA 2: Artefacto con valores que SÍ funcionan")
    print("=" * 60)
    mock_artifact_good = {
        "CRIT_RATE": 10.5,
        "CRIT_DMG": 28.0,
        "ATK_PERCENT": 4.7,
        "ENERGY_RECHARGE": 5.2
    }
    valid = build_artifact_configurations(mock_artifact_good)
    
    if valid:
        print(f"\n🎯 Se encontraron {len(valid)} configuraciones válidas")
        for i, cfg in enumerate(valid[:2]):  # Mostrar primeras 2
            print(f"\n📦 Configuración {i+1}:")
            for stat, data in cfg["stats"].items():
                rolls_str = ' + '.join([f"{r:.3f}" for r in data['rolls']])
                print(f"  {stat}: {data['roll_count']} roll(s) → {rolls_str}")