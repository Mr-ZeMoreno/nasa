
# from libreria.plotting import dibujar_interactivo
# from objetos.nodo import Nodo
# from objetos.objeto import Objeto
# from objetos.punto import Punto


# piso = Objeto() \
#     .add_vertice(Punto([[1], [1], [0]])) \
#     .add_vertice(Punto([[0], [0], [0]])) \
#     .add_vertice(Punto([[0], [1], [0]])) \
#     .add_vertice(Punto([[1], [0], [0]])) \
#     .add_vertice(Punto([[1], [1], [1]])) \
#     .add_vertice(Punto([[0], [0], [1]])) \
#     .add_vertice(Punto([[0], [1], [1]])) \
#     .add_vertice(Punto([[1], [0], [1]]))


# nodo_piso = Nodo("piso")
# print(piso)
# print(piso.largo, piso.ancho, piso.alto)
# dibujar_interactivo(piso)


from algoritmo.genetico.backtracking import solve_backtracking
from objetos.nodo import matriz_adyacencia

import json


with open("restricciones.json", "r") as f:
    archivo = json.load(f)


if __name__ == "__main__":


    rooms = [
        "Group Social-2 (Table) / Meal Consumption / Mission Planning-1 (Table)",   
      "Human Waste-1 (Waste Collection)",
      "Human Waste-2 (Cleansing) / Hygiene-1 (Cleansing)",
      "Waste Management",
      "Meal Preparation-1 (Food Prep)",
      "Private Habitation-2 (Sleep & Relaxation) / Hygiene-2 (Non-Cleansing)",
      'Meal Preparation-2 (Work Surface)',
      'Exercise-1 (Cycle Ergometer)',
      'Exercise-2 (Treadmill)',
      'Exercise-3 (Resistive Device)',
      'Group Social-1 (Open Area) / Mission Planning-3 (Training)',
      'Maintenance-2 (Work Surface) / Logistics-1 (Work Surface) / EVA-1 (Suit Testing)',
       'Logistics-2 (Temporary Stowage)',
        'Maintenance-1 (Computer) / EVA-2 (EVA Computer/Data)',
        'Mission Planning-2 (Computer/Command) / Spacecraft Monitoring',
        'Medical-1 (Computer)',
        'Medical-3 (Medical Care)',
        'Private Habitation-1 (Work Surface) / Medical-2 (Ambulatory Care)',
        'Mantención'
      ]

    # Prohibiciones (adyacencia 0)
    zero_pairs = archivo["zero_pairs"]

    # Preferencias (>1). Por defecto, lo no listado vale 1.
    prefs = archivo["preferences"]

    A, idx = matriz_adyacencia(rooms, zero_pairs, prefs, default_weight=1)

    # Fijamos "Mantención" en el slot 0 (sala prioritaria / rompe simetría)
    best_perm, best_score, stats = solve_backtracking(rooms, A, anchor_room="Mantención")

    best_layout = [rooms[i] for i in best_perm]
    print("\n>>> Mejor layout:", best_layout)
    print(">>> Puntaje total:", best_score)

    print("\n--- Estadísticas de la búsqueda ---")
    print("Nodos expandidos:", stats.nodes_expanded)
    print("Hijos lógicos generados:", stats.children_generated)
    print("Hijos válidos (explorados):", stats.children_valid)
    print("Hijos podados por A=0:", stats.children_pruned_zero)
    print("Layouts completos válidos:", stats.leaves_feasible)
    print("Layouts completos inválidos (cierre anillo):", stats.leaves_infeasible)
    print("Expansiones por profundidad (slot):", dict(sorted(stats.depth_expansions.items())))

def explicar_layout(rooms, A, perm):
    print("\n# Layout ideal (circular):")
    print(" -> ".join(rooms[i] for i in perm) + " -> " + rooms[perm[0]])
    print("\n# Desglose de aristas:")
    total = 0
    n = len(perm)
    for i in range(n):
        j = (i+1) % n
        a, b = rooms[perm[i]], rooms[perm[j]]
        w = A[perm[i]][perm[j]]
        total += w
        print(f"  {a} — {b} = {w}")
    print(f"\nPuntaje total = {total}")

# Usar así, después de resolver:
explicar_layout(rooms, A, best_perm)
