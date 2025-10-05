from __future__ import annotations
from typing import Any, Dict, List, Self, Tuple, Union
from logica.objetos.objeto import Objeto

class Nodo:
    def __init__(self, id) -> None:
        self.id = id
        self.objeto: Objeto | None = None
        # preferencias puede contener (Nodo, peso) o Nodo (sin peso)
        self.preferencia: List[Union["Nodo", Tuple["Nodo", int]]] = []
        self.restriccion: List["Nodo"] = []

    def add_objeto(self, objeto: Objeto) -> Self:
        self.objeto = objeto
        return self

    def add_restriccion(self, nodo: "Nodo", sym: bool = True) -> Self:
        if nodo is self:
            return self
        if nodo not in self.restriccion:
            self.restriccion.append(nodo)
        if sym and self not in nodo.restriccion:
            nodo.restriccion.append(self)
        return self

    def add_preferencia(self, nodo: "Nodo", weight: int = 2, sym: bool = True) -> Self:
        if nodo is self:
            return self
        # guarda como tupla (nodo, peso)
        if not any((isinstance(x, tuple) and x[0] is nodo) or (x is nodo) for x in self.preferencia):
            self.preferencia.append((nodo, int(weight)))
        if sym:
            if not any((isinstance(x, tuple) and x[0] is self) or (x is self) for x in nodo.preferencia):
                nodo.preferencia.append((self, int(weight)))
        return self

    def __eq__(self, other: object):
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
                      default_weight: int = 1,
                      pref_default_weight: int = 2
                      ) -> Tuple[List[List[int]], Dict[str, int]]:
    n = len(rooms)
    idx_by_name: Dict[str, int] = {r.id: i for i, r in enumerate(rooms)}

    # base
    A = [[default_weight for _ in range(n)] for __ in range(n)]
    for i in range(n):
        A[i][i] = 0

    def _id(o: Any) -> str | None:
        if isinstance(o, Nodo): return o.id
        if isinstance(o, str): return o
        return None

    # restricciones -> 0
    for a in rooms:
        ia = idx_by_name[a.id]
        for b_ref in getattr(a, "restriccion", []) or []:
            nb = _id(b_ref)
            if not nb: continue
            ib = idx_by_name.get(nb)
            if ib is None or ib == ia:  # no presente o self
                continue
            A[ia][ib] = 0
            A[ib][ia] = 0  # simétrico

    # preferencias -> peso
    for a in rooms:
        ia = idx_by_name[a.id]
        prefs = getattr(a, "preferencia", []) or []
        for item in prefs:
            if isinstance(item, tuple) and len(item) == 2:
                b_ref, w = item
                nb = _id(b_ref)
                if not nb: continue
                ib = idx_by_name.get(nb)
                if ib is None or ib == ia:  # ignorar si no está o self
                    continue
                A[ia][ib] = int(w)
                A[ib][ia] = int(w)
            else:
                # elemento suelto (Nodo/str) => usa peso por defecto de preferencia
                nb = _id(item)
                if not nb: continue
                ib = idx_by_name.get(nb)
                if ib is None or ib == ia:
                    continue
                A[ia][ib] = pref_default_weight
                A[ib][ia] = pref_default_weight

    return A, idx_by_name