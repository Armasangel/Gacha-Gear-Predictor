import itertools

# 1. El diccionario global con las reglas de Genshin (sacado de tu genshin-rules.md)
# Mantenemos los flotantes exactos de 3 decimales
GAME_TIERS = {
    "CRIT_RATE": [2.722, 3.111, 3.500, 3.889],
    "CRIT_DMG": [5.444, 6.222, 7.000, 7.778],
    "ATK_PERCENT": [4.083, 4.667, 5.250, 5.833],
    "ENERGY_RECHARGE": [4.531, 5.179, 5.826, 6.474],
    # Puedes agregar más adelante DEF_PERCENT, HP_PERCENT, etc.
}

# REQUISITO 1: Generalizar la función para que acepte cualquier lista de tiers
def find_stat_combinations(target_value: float, tiers: list) -> list:
    valid_combinations = []
    
    # Rango de 1 a 6 rolls posibles por substat
    for r in range(1, 7):
        for combo in itertools.combinations_with_replacement(tiers, r):
            internal_sum = sum(combo)
            
            # Validación con redondeo estricto a 1 decimal
            if round(internal_sum, 1) == target_value:
                valid_combinations.append({
                    "rolls": list(combo),
                    "roll_count": r,
                    "exact_sum": round(internal_sum, 3)
                })
    return valid_combinations

# REQUISITO 2: Analizar un artefacto completo (Paso previo a la combinación global)
def analyze_artifact_stats(artifact_input: dict):
    print(f"\n=========================================")
    print(f"ANALIZANDO ARTEFACTO COMPLETO (CONTEO DE RAMAS)")
    print(f"=========================================\n")
    
    total_combinations_spaces = 1
    
    for stat_name, visible_value in artifact_input.items():
        # Verificamos si tenemos las reglas para ese stat
        if stat_name not in GAME_TIERS:
            print(f"❌ Error: El stat '{stat_name}' no está registrado en las reglas del juego.")
            continue
            
        # Ejecutamos nuestra función generalizada
        tiers_to_use = GAME_TIERS[stat_name]
        results = find_stat_combinations(visible_value, tiers_to_use)
        count = len(results)
        
        # Multiplicamos para saber el tamaño del producto cartesiano teórico
        total_combinations_spaces *= count if count > 0 else 1
        
        print(f"📊 Stat: {stat_name:<15} | Valor: {visible_value:<5} -> Se encontraron {count} combinaciones válidas.")
        if count > 0:
            # Mostramos solo la primera para no saturar la consola
            print(f"   Ejemplo combo #1: {results[0]['rolls']} (Rolls: {results[0]['roll_count']})")
        print("-" * 50)
        
    print(f"\n💀 Espacio muestral total (Producto Cartesiano): {total_combinations_spaces} combinaciones globales posibles.")

# ==========================================
# PRUEBA DEL MILESTONE 2
# ==========================================
if __name__ == "__main__":
    # Inventemos un artefacto +20 realista basado en el spec
    # CRIT RATE = 10.5 (ya sabemos que da 3)
    # CRIT DMG = 21.8
    # ATK% = 11.7
    # ENERGY RECHARGE = 11.0
    mock_artifact = {
        "CRIT_RATE": 10.5,
        "CRIT_DMG": 21.8,
        "ATK_PERCENT": 11.7,
        "ENERGY_RECHARGE": 11.0
    }
    
    analyze_artifact_stats(mock_artifact)