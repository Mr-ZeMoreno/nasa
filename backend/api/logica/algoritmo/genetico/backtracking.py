# ----------------------------
# Backtracking con poda (DFS)
# ----------------------------
from typing import List, Optional
from logica.algoritmo.genetico import Stats


def backtrack(stats: Stats,
              slots: list[int],
              pos: int,
              remaining: list[int],
              current_score: int,
              A: list[list[int]],
              n: int,
              zeros_count: list[int],
              best: dict):
    # pos = índice de slot a llenar (1..N-1). Slot 0 ya está fijo (anchor).
    stats.nodes_expanded += 1
    print("ejecutando back")
    stats.depth_expansions[pos] = stats.depth_expansions.get(pos, 0) + 1

    # ¿completamos todos los slots?
    if pos == n:
        last = slots[n-1]
        first = slots[0]
        # Validar cierre del anillo (último con primero)
        if A[last][first] == 0:
            stats.leaves_infeasible += 1
            return
        total = current_score + A[last][first]
        stats.leaves_feasible += 1
        if total > best["score"]:
            best["score"] = total
            best["perm"] = slots.copy()
        return

    prev = slots[pos-1]  # vecino izquierdo ya colocado
    # hijos "lógicos": todas las salas restantes
    stats.children_generated += len(remaining)

    # hijos viables: los que no violan A=0 con el vecino izquierdo
    candidates = [r for r in remaining if A[prev][r] != 0]
    stats.children_pruned_zero += (len(remaining) - len(candidates))

    # Orden de expansión (heurística):
    # 1) mayor A[prev][r] (más score inmediato)
    # 2) más 'ceros' (r es más restrictiva ⇒ la atendemos antes)
    candidates.sort(key=lambda r: (-A[prev][r], -zeros_count[r]))

    for r in candidates:
        # Poda de cierre: si es el último slot, checa también con el anchor (slot 0)
        if pos == n-1 and A[r][slots[0]] == 0:
            continue

        stats.children_valid += 1
        # Colocar r y continuar
        slots[pos] = r
        # sin mutar la lista original
        new_remaining = [x for x in remaining if x != r]
        backtrack(stats, slots, pos+1, new_remaining,
                  current_score + A[prev][r],
                  A, n, zeros_count, best)
        slots[pos] = -1


def solve_backtracking(rooms: List[str],
                       A: List[List[int]],
                       anchor_room: Optional[str] = None):
    """
    - Fija anchor_room en slot 0 para romper simetría.
    - Coloca el resto sala a sala (slots 1..N-1), podando si A=0 con el vecino ya colocado.
    - Heurística:
        * Ordena candidatos por A[prev][r] (ganancia inmediata) y, de tie-breaker,
          por cuántos 'ceros' tiene r (más restrictiva primero).
    """
    n = len(rooms)
    idx = {r: i for i, r in enumerate(rooms)}
    if anchor_room is None:
        anchor_room = rooms[0]
    anchor = idx[anchor_room]

    slots = [-1]*n
    slots[0] = anchor
    remaining = [i for i in range(n) if i != anchor]

    stats = Stats()

    # MRV-ish: cuántos vecinos prohibidos tiene cada sala
    zeros_count = [sum(1 for j in range(n) if A[i][j] == 0) for i in range(n)]

    best = {"score": -10**9, "perm": None}
    backtrack(stats, slots, 1, remaining, 0, A, n, zeros_count, best)
    return best["perm"], best["score"], stats
