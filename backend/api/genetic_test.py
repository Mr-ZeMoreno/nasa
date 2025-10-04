import json

# Usa tus funciones
from logica.algoritmo.genetico.backtracking import solve_backtracking
from logica.objetos.nodo import Nodo, matriz_adyacencia

if __name__ == "__main__":
    with open("restricciones.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    floor = 1

    rooms = []

    zero_pairs_all = data["zero_pairs"]

    for a, b in zero_pairs_all:
        n1 = next((n for n in rooms if n == a), None)
        if not n1:
            n1 = Nodo(a)
            rooms.append(n1)

        n2 = next((n for n in rooms if n == b), None)
        if not n2:
            n2 = Nodo(b)
            rooms.append(n2)

        n1.add_restriccion(n2)

    prefs_all = data["preferences"]

    for pref in prefs_all:
        a, b = pref["pair"]

        n1 = next((n for n in rooms if n == a), None)
        if not n1:
            n1 = Nodo(a)
            rooms.append(n1)

        n2 = next((n for n in rooms if n == b), None)
        if not n2:
            n2 = Nodo(b)
            rooms.append(n2)

        n1.add_preferencia(n2)

    for nodo in rooms:
        print(f"\nNodo: {nodo}")
        print(f"Restriccion: {nodo.restriccion}")
        print(f"Preferencia: {nodo.preferencia}\n")

    # # 3) Filtra restricciones/preferencias para que solo consideren estas 6 rooms
    # zero_pairs = filtrar_zero_pairs(zero_pairs_all, rooms)
    # prefs = filtrar_prefs(prefs_all, rooms)

    # # 4) Construye la matriz de adyacencia (por defecto, donde no hay preferencia explícita = 1)
    # A, idx = matriz_adyacencia(rooms, zero_pairs, prefs, default_weight=1)

    # # 5) Ejecuta el backtracking con "Mantención" fija en el slot 0 solo planta baja
    # if floor == 0:
    #     best_perm, best_score, stats = solve_backtracking(
    #         rooms, A, anchor_room="EVA-3 (Airlock) / Suit Donning & Pressurization")
    # else:
    #     best_perm, best_score, stats = solve_backtracking(
    #         rooms, A, anchor_room=rooms[0])

    # print(best_perm)

    # # 6) Resultados
    # best_layout = [rooms[i] for i in best_perm]
    # print("\n>>> Mejor layout:", best_layout)
    # print(">>> Puntaje total:", best_score)

    # print("\n--- Estadísticas de la búsqueda ---")
    # print("Nodos expandidos:", stats.nodes_expanded)
    # print("Hijos lógicos generados:", stats.children_generated)
    # print("Hijos válidos (explorados):", stats.children_valid)
    # print("Hijos podados por A=0:", stats.children_pruned_zero)
    # print("Layouts completos válidos:", stats.leaves_feasible)
    # print("Layouts completos inválidos (cierre anillo):", stats.leaves_infeasible)
    # print("Expansiones por profundidad (slot):", dict(
    #     sorted(stats.depth_expansions.items())))

    # # 7) Explicación del mejor layout
    # explicar_layout(rooms, A, best_perm)
