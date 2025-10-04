# import json

# # Usa tus funciones
# from algoritmo.genetico.backtracking import solve_backtracking
# from objetos.nodo import matriz_adyacencia


# def filtrar_zero_pairs(zero_pairs, rooms_set):
#     """zero_pairs: lista de pares [roomA, roomB]"""
#     filtrados = []
#     for a, b in zero_pairs:
#         if a in rooms_set and b in rooms_set:
#             filtrados.append([a, b])
#     return filtrados


# def filtrar_prefs(prefs, rooms_set):
#     """
#     prefs: lista de objetos {"pair": [roomA, roomB], "weight": int}
#     Devuelve misma estructura pero solo pares que estén en rooms_set.
#     """
#     filtrados = []
#     for item in prefs:
#         a, b = item["pair"]
#         if a in rooms_set and b in rooms_set:
#             filtrados.append(item)
#     return filtrados


# def explicar_layout(rooms, A, perm):
#     print("\n# Layout ideal (circular):")
#     print(" -> ".join(rooms[i] for i in perm) + " -> " + rooms[perm[0]])
#     print("\n# Desglose de aristas:")
#     total = 0
#     n = len(perm)
#     for i in range(n):
#         j = (i + 1) % n
#         a, b = rooms[perm[i]], rooms[perm[j]]
#         w = A[perm[i]][perm[j]]
#         total += w
#         print(f"  {a} — {b} = {w}")
#     print(f"\nPuntaje total = {total}")


# if __name__ == "__main__":
#     # 1) Carga restricciones completas (todas las rooms posibles)
#     with open("restricciones.json", "r", encoding="utf-8") as f:
#         data = json.load(f)
#     floor=1
#     zero_pairs_all = data["zero_pairs"]
#     prefs_all = data["preferences"]

#     # 2) Define el subconjunto de 6 rooms para la prueba
#     rooms = [
#         "Mantención",  # ancla para romper simetría (ojo con la tilde y el nombre exacto)
#         "Meal Preparation-1 (Food Prep)",
#         "Meal Preparation-2 (Work Surface)",
#         "Medical-3 (Medical Care)",
#         "Human Waste-1 (Waste Collection)",
#         "EVA-3 (Airlock) / Suit Donning & Pressurization"
#     ]
#     rooms_set = set(rooms)

#     # 3) Filtra restricciones/preferencias para que solo consideren estas 6 rooms
#     zero_pairs = filtrar_zero_pairs(zero_pairs_all, rooms_set)
#     prefs = filtrar_prefs(prefs_all, rooms_set)

#     # 4) Construye la matriz de adyacencia (por defecto, donde no hay preferencia explícita = 1)
#     A, idx = matriz_adyacencia(rooms, zero_pairs, prefs, default_weight=1)

#     # 5) Ejecuta el backtracking con "Mantención" fija en el slot 0 solo planta baja
#     if floor==0:
#         best_perm, best_score, stats = solve_backtracking(rooms, A, anchor_room="EVA-3 (Airlock) / Suit Donning & Pressurization")
#     else:
#         best_perm, best_score, stats = solve_backtracking(rooms, A, anchor_room=rooms[0])

#     # 6) Resultados
#     best_layout = [rooms[i] for i in best_perm]
#     print("\n>>> Mejor layout:", best_layout)
#     print(">>> Puntaje total:", best_score)

#     print("\n--- Estadísticas de la búsqueda ---")
#     print("Nodos expandidos:", stats.nodes_expanded)
#     print("Hijos lógicos generados:", stats.children_generated)
#     print("Hijos válidos (explorados):", stats.children_valid)
#     print("Hijos podados por A=0:", stats.children_pruned_zero)
#     print("Layouts completos válidos:", stats.leaves_feasible)
#     print("Layouts completos inválidos (cierre anillo):", stats.leaves_infeasible)
#     print("Expansiones por profundidad (slot):", dict(sorted(stats.depth_expansions.items())))

#     # 7) Explicación del mejor layout
#     explicar_layout(rooms, A, best_perm)
