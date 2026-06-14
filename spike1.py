import itertools

# 1. Valores internos reales (Genshin Impact 5★)
# Usamos tu tabla exacta del spec.md
CRIT_RATE_TIERS = [2.722, 3.111, 3.500, 3.889]

def find_stat_combinations(target_value: float) -> list:
    valid_combinations = []
    
    # Un substat puede tener desde 1 roll (inicial) hasta un máximo de 6 rolls 
    # (1 inicial + 5 upgrades si todos cayeran en el mismo stat).
    for r in range(1, 7):
        # itertools.combinations_with_replacement nos genera todas las mezclas posibles 
        # de los tiers permitiendo que se repitan (ej: [3.5, 3.5, 3.5])
        for combo in itertools.combinations_with_replacement(CRIT_RATE_TIERS, r):
            internal_sum = sum(combo)
            
            # ¡La regla de oro del Round Half Up de tu spec!
            # Python nativo a veces hace cosas raras con round(), pero para este spike
            # un formateo de string o un redondeo estándar nos sirve para validar.
            if round(internal_sum, 1) == target_value:
                valid_combinations.append({
                    "rolls": list(combo),
                    "roll_count": r,
                    "exact_sum": round(internal_sum, 3)
                })
                
    return valid_combinations

# ==========================================
# PRUEBAS DEL SPIKE
# ==========================================
if __name__ == "__main__":
    # Test 1: El famoso 10.5% de nuestra conversación
    test_value = 10.5
    print(f"--- Buscando combinaciones para CRIT RATE: {test_value}% ---")
    results = find_stat_combinations(test_value)
    
    print(f"Se encontraron {len(results)} combinaciones válidas:\n")
    for idx, res in enumerate(results, 1):
        print(f"Configuración #{idx}:")
        print(f"  Rolls: {res['rolls']}")
        print(f"  Cantidad de rolls: {res['roll_count']}")
        print(f"  Suma interna real: {res['exact_sum']}%")
        print("-" * 30)

    # Test 2: Prueba un caso imposible para ver si tu validador lo atrapa
    impossible_value = 10.6
    print(f"\n--- Buscando combinaciones para caso IMPOSIBLE: {impossible_value}% ---")
    impossible_results = find_stat_combinations(impossible_value)
    print(f"Se encontraron {len(impossible_results)} combinaciones.")