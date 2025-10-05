from __future__ import annotations
from typing import Dict, List, Self, Tuple

from logica.objetos.objeto import Objeto


class Nodo:
    def __init__(self, id) -> None:
        self.id = id
        self.objeto = None
        self.preferencia = []
        self.restriccion = []

    def add_objeto(self, objeto: Objeto) -> Self:
        self.objeto = objeto
        return self

    def add_restriccion(self, nodo):
        self.restriccion.append(nodo)
        nodo.restriccion.append(self)
        return self

    def add_preferencia(self, nodo):
        self.preferencia.append(nodo)
        nodo.preferencia.append(nodo)
        return self

    def __eq__(self, other: Nodo):
        if isinstance(other, Nodo):
            return self.id == other.id
        if isinstance(other, str):
            return self.id == other
        return False

    def __hash__(self):
        return hash(self.id)

    def __str__(self) -> str:
        return f"<Nodo ID: {self.id}>"

    def __repr__(self) -> str:
        return self.__str__()


def matriz_adyacencia(rooms: List[Nodo],
                      zero_pairs: List[Tuple[str, str]],
                      prefs: Dict[Tuple[str, str], int],
                      default_weight: int = 1):
    """
    Crea A (NxN) simétrica:
      - default_weight para pares no especificados
      - 0 para pares prohibidos (zero_pairs)
      - pesos personalizados en 'prefs'
    """
    # n = len(rooms)
    # idx = {r: i for i, r in enumerate(rooms)}
    # A = [[default_weight for _ in range(n)] for __ in range(n)]
    # for i in range(n):
    #     A[i][i] = 0  # no nos interesa i~i

    # # pares prohibidos
    # for pair in zero_pairs:
    #     ia, ib = idx[pair[0]], idx[pair[1]]
    #     A[ia][ib] = 0
    #     A[ib][ia] = 0

    # for p in prefs:
    #     pair = p["pair"]  # type: ignore
    #     w = p["weight"]  # type: ignore

    #     ia, ib = idx[pair[0]], idx[pair[1]]
    #     A[ia][ib] = w
    #     A[ib][ia] = w

    # return A, idx
