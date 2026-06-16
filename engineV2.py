import itertools

# 1. Base de datos de Tiers de tu genshin-rules.md
GAME_TIERS = {
    "CRIT_RATE": [2.722, 3.111, 3.500, 3.889],
    "CRIT_DMG": [5.444, 6.222, 7.000, 7.778],
    "ATK_PERCENT": [4.083, 4.667, 5.250, 5.833],
    "ENERGY_RECHARGE": [4.531, 5.179, 5.826, 6.474],
}

# La función matemática del Spike 1 (Generalizada)
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

# REQUISITO DEL MILESTONE 2: Construir combinaciones globales con filtro de 8/9 rolls
def build_artifact_configurations(artifact_input: dict) -> list:
    stat_names = list(artifact_input.keys())
    combos_per_stat = []
    
    # Paso 1: Obtener listas de combinaciones candidatos para cada stat individual
    for name in stat_names:
        visible_value = artifact_input[name]
        tiers = GAME_TIERS[name]
        combos = find_stat_combinations(visible_value, tiers)
        
        # Si un solo stat da 0 combinaciones, todo el artefacto es inválido (INVALID_VALUE)
        if not combos:
            print(f"❌ Error: El stat '{name}' = {visible_value}% no tiene combinaciones posibles.")
            return []
            
        combos_per_stat.append(combos)
        
    valid_configs = []
    total_evaluated = 0
    
    # Paso 2: Producto cartesiano para mezclar las opciones globales
    for combo_tuple in itertools.product(*combos_per_stat):
        total_evaluated += 1
        
        # Sumamos cuántas tiradas totales gasta esta configuración global
        total_rolls = sum(c["roll_count"] for c in combo_tuple)
        
        # LA REGLA DE ORO CORREGIDA:
        if total_rolls == 9:
            started_with = 4  # Nació con 4 slots ocupados
        elif total_rolls == 8:
            started_with = 3  # Nació con 3 slots ocupados y reveló el 4º en +4
        else:
            # PODA: Si suma 7, 10, o lo que sea, es matemáticamente imposible. Pasamos de largo.
            continue
            
        # Si pasó el filtro de arriba, la reconstrucción de este estado es 100% válida
        config = {
            "stats": {stat_names[i]: combo_tuple[i] for i in range(len(stat_names))},
            "total_rolls": total_rolls,
            "started_with_subs": started_with
        }
        valid_configs.append(config)
        
    print(f"📊 Espacio muestral evaluado: {total_evaluated} combinaciones.")
    print(f"✅ Reconstrucciones válidas encontradas: {len(valid_configs)}")
    return valid_configs

# ==========================================
# PRUEBAS DEL MOTOR CORREGIDO
# ==========================================
if __name__ == "__main__":
    print("=" * 60)
    print("PROBANDO ARTEFACTO PROPUESTO POR CLAUDE")
    print("=" * 60)
    
    claude_artifact = {
        "CRIT_RATE": 10.5,
        "CRIT_DMG": 28.0,
        "ATK_PERCENT": 4.7,
        "ENERGY_RECHARGE": 5.2
    }
    
    configs = build_artifact_configurations(claude_artifact)
    
    # Si encontramos configuraciones, imprimamos las primeras para auditar el resultado
    if configs:
        for idx, cfg in enumerate(configs[:3], 1):
            print(f"\n📦 Reconstrucción de Estado #{idx} (Empezó con {cfg['started_with_subs']} subs):")
            for stat, data in cfg["stats"].items():
                print(f"  {stat:<15} -> Rolls: {data['roll_count']} | Historial: {data['rolls']}")