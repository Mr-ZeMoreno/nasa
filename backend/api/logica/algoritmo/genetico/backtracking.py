# ----------------------------
# TSP máximo exacto (Held-Karp DP)
# ----------------------------
from typing import List, Optional, Tuple
from math import inf
from logica.objetos.nodo import Nodo

NEG_INF = -10**12  # para prohibidas

def _validate_matrix_square(A: List[List[int]]) -> int:
    n = len(A)
    if n == 0:
        raise ValueError("La matriz de adyacencia A está vacía.")
    for i, row in enumerate(A):
        if len(row) != n:
            raise ValueError(f"A no es cuadrada: fila {i} tiene len={len(row)} != {n}.")
    return n

def solve_tsp_max_dp(
    rooms: List[Nodo],
    A: List[List[int]],
    anchor_room: Optional[Nodo | int | str] = None,
) -> Tuple[List[int], int]:
    """
    Devuelve (best_perm_indices, best_score) para el ciclo máximo.
    - rooms: lista de Nodo en el mismo orden de A
    - A: pesos simétricos; A[i][j] == 0 (i != j) se trata como ARISTA PROHIBIDA
    - anchor_room: Nodo, índice o id/str. Si None, usa rooms[0].
    """
    n = _validate_matrix_square(A)
    if len(rooms) != n:
        raise ValueError("rooms y A desalineados.")

    # resolver índice del ancla
    if anchor_room is None:
        anchor = 0
    elif isinstance(anchor_room, int):
        anchor = anchor_room
    elif isinstance(anchor_room, Nodo):
        try:
            anchor = rooms.index(anchor_room)
        except ValueError:
            raise ValueError("anchor_room (Nodo) no está en rooms.")
    else:
        # str/id
        ids = [r.id if hasattr(r, "id") else getattr(r, "nombre", None) for r in rooms]
        if anchor_room not in ids:
            raise ValueError(f"anchor_room '{anchor_room}' no está en rooms.")
        anchor = ids.index(anchor_room)

    # preprocesar: convertir prohibidas a NEG_INF (excepto diagonal)
    W = [[0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                W[i][j] = NEG_INF  # evitar lazo
            else:
                w = A[i][j]
                W[i][j] = (NEG_INF if w == 0 else w)

    # DP[mask][j] = mejor peso del camino que empieza en anchor y termina en j visitando 'mask'
    # 'mask' SIEMPRE incluye anchor y j. Representamos con entero bitmask.
    size = 1 << n
    DP = [[NEG_INF] * n for _ in range(size)]
    parent = [[-1] * n for _ in range(size)]

    start_mask = 1 << anchor
    # transiciones base: anchor -> j
    for j in range(n):
        if j == anchor:
            continue
        if W[anchor][j] == NEG_INF:
            continue
        m = start_mask | (1 << j)
        DP[m][j] = W[anchor][j]
        parent[m][j] = anchor

    # recorrer máscaras que incluyen anchor
    for mask in range(size):
        if (mask & start_mask) == 0:
            continue
        # para cada extremo j en mask
        for j in range(n):
            if j == anchor or DP[mask][j] == NEG_INF:
                continue
            # intentar extender a k no visitado
            rem = (~mask) & (size - 1)
            k = rem
            while k:
                lsb = k & -k
                idx = (lsb.bit_length() - 1)
                k ^= lsb
                if W[j][idx] == NEG_INF:
                    continue
                m2 = mask | (1 << idx)
                val = DP[mask][j] + W[j][idx]
                if val > DP[m2][idx]:
                    DP[m2][idx] = val
                    parent[m2][idx] = j

    full = (1 << n) - 1
    # cerrar ciclo: sumar arista j->anchor
    best_score = NEG_INF
    best_end = -1
    for j in range(n):
        if j == anchor:
            continue
        if DP[full][j] == NEG_INF or W[j][anchor] == NEG_INF:
            continue
        total = DP[full][j] + W[j][anchor]
        if total > best_score:
            best_score = total
            best_end = j

    if best_end == -1:
        raise RuntimeError("No existe ciclo factible con las restricciones actuales.")

    # reconstruir permutación
    perm = [anchor] * n
    mask = full
    j = best_end
    for pos in range(n - 1, 0, -1):
        perm[pos] = j
        pj = parent[mask][j]
        mask ^= (1 << j)
        j = pj
    perm[0] = anchor

    return perm, best_score
