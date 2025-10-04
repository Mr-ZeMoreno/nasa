from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field

# ----------------------------
# Instrumentación de búsqueda
# ----------------------------
@dataclass
class Stats:
    nodes_expanded: int = 0            # nodos (estados parciales) visitados
    children_generated: int = 0        # hijos "lógicos" (antes de podar por A=0)
    children_valid: int = 0            # hijos que pasan filtros y se exploran
    children_pruned_zero: int = 0      # hijos descartados por A=0 (prohibidos)
    leaves_feasible: int = 0           # layouts completos válidos
    leaves_infeasible: int = 0         # layouts completos inválidos (cierre anillo)
    depth_expansions: Dict[int, int] = field(default_factory=dict)  # expansiones por profundidad

# ----------------------------
# Construcción de la matriz A
# ----------------------------
def build_matrix(rooms: List[str],
                 zero_pairs: List[Tuple[str,str]],
                 prefs: Dict[Tuple[str,str], int],
                 default_weight:int=1):
    """
    Crea A (NxN) simétrica:
      - default_weight para pares no especificados
      - 0 para pares prohibidos (zero_pairs)
      - pesos personalizados en 'prefs'
    """
    n = len(rooms)
    idx = {r:i for i,r in enumerate(rooms)}
    A = [[default_weight for _ in range(n)] for __ in range(n)]
    for i in range(n):
        A[i][i] = 0  # no nos interesa i~i

    # pares prohibidos
    for a,b in zero_pairs:
        ia, ib = idx[a], idx[b]
        A[ia][ib] = 0
        A[ib][ia] = 0

    # preferencias
    for (a,b), w in prefs.items():
        ia, ib = idx[a], idx[b]
        A[ia][ib] = w
        A[ib][ia] = w

    return A, idx

def evaluate_perm(perm: List[int], A: List[List[int]]) -> int:
    """Suma de compatibilidades entre vecinos del anillo (circular)."""
    n = len(perm)
    s = 0
    for i in range(n):
        j = (i+1) % n
        s += A[perm[i]][perm[j]]
    return s

# ----------------------------
# Backtracking con poda (DFS)
# ----------------------------
def solve_backtracking(rooms: List[str],
                       A: List[List[int]],
                       anchor_room: Optional[str]=None):
    """
    - Fija anchor_room en slot 0 para romper simetría.
    - Coloca el resto sala a sala (slots 1..N-1), podando si A=0 con el vecino ya colocado.
    - Heurística:
        * Ordena candidatos por A[prev][r] (ganancia inmediata) y, de tie-breaker,
          por cuántos 'ceros' tiene r (más restrictiva primero).
    """
    n = len(rooms)
    idx = {r:i for i,r in enumerate(rooms)}
    if anchor_room is None:
        anchor_room = rooms[0]
    anchor = idx[anchor_room]

    slots = [-1]*n
    slots[0] = anchor
    remaining = [i for i in range(n) if i != anchor]

    best_score = -10**9
    best_perm = None
    stats = Stats()

    # MRV-ish: cuántos vecinos prohibidos tiene cada sala
    zeros_count = [sum(1 for j in range(n) if A[i][j] == 0) for i in range(n)]

    def backtrack(pos: int, current_score: int):
        # pos = índice de slot a llenar (1..N-1). Slot 0 ya está fijo (anchor).
        stats.nodes_expanded += 1
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
            nonlocal best_score, best_perm
            if total > best_score:
                best_score = total
                best_perm = slots.copy()
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
            remaining.remove(r)
            backtrack(pos+1, current_score + A[prev][r])
            # Deshacer
            remaining.append(r)
            slots[pos] = -1

    backtrack(1, 0)
    return best_perm, best_score, stats

# ----------------------------
# DEMO mínima (N=6)
# ----------------------------
if __name__ == "__main__":
    rooms = ["Baño","Cocina","Ejercicio","Recreación","Dormir","Mantención"]

    # Prohibiciones (adyacencia 0)
    zero_pairs = [
        ("Baño","Cocina"),        # no vecinos
        ("Dormir","Ejercicio")    # no vecinos
    ]

    # Preferencias (>1). Por defecto, lo no listado vale 1.
    prefs = {
        ("Mantención","Cocina"): 5,
        ("Mantención","Baño"): 4,
        ("Mantención","Recreación"): 4,
        ("Mantención","Ejercicio"): 3,
        ("Dormir","Recreación"): 3,
        ("Baño","Ejercicio"): 2,
        ("Cocina","Recreación"): 2,
    }

    A, idx = build_matrix(rooms, zero_pairs, prefs, default_weight=1)

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
