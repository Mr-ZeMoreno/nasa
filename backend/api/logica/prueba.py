from typing import List
from logica.algoritmo.genetico.backtracking import solve_tsp_max_dp
from logica.objetos.nodo import Nodo, matriz_adyacencia

def mejor_orden(rooms: List[Nodo], planta: int = 1):
    A, idx = matriz_adyacencia(rooms, default_weight=1)

    if planta == 0:
        anchor = "EVA-3 (Airlock) / Suit Donning & Pressurization"  # id/nombre que esté en rooms
    else:
        anchor = rooms[0]  # o rooms[0].id, como prefieras (el solver acepta Nodo/índice/str)

    best_perm, best_score = solve_tsp_max_dp(rooms, A, anchor_room=anchor)
    best_layout = [rooms[i] for i in best_perm]
    return best_layout, best_score, None, A, idx  # 'Stats' ya no aplica aquí


