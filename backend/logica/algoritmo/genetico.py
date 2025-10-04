from typing import List


def evaluate_perm(perm: List[int], A: List[List[int]]) -> int:
    """Suma de compatibilidades entre vecinos del anillo (circular)."""
    n = len(perm)
    s = 0
    for i in range(n):
        j = (i+1) % n
        s += A[perm[i]][perm[j]]
    return s


