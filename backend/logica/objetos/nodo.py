from __future__ import annotations
from random import randint

class Adyacencia:
    def __init__(self, m: list[list[Nodo | None]]) -> None:
        self.arriba = m[0][0]
        self.derecha = m[1][0]
        self.abajo = m[2][0]
        self.izquierda = m[3][0]

    def __str__(self) -> str:
        return f"""
\tArriba: {self.arriba}
\tDerecha: {self.derecha}
\tAbajo: {self.abajo}
\tIzquierda: {self.izquierda}
"""

    def set_arriba(self, n: Nodo):
        self.arriba = n

    def set_abajo(self, n: Nodo):
        self.abajo = n

    def set_derecha(self, n: Nodo):
        self.derecha = n

    def set_izquierda(self, n: Nodo):
        self.izquierda = n




class Nodo:
    def __init__(self) -> None:
        self.id = randint(100000, 999999)
        self.adyacencia = Adyacencia([[None]] * 4)

    def set_arriba(self, nodo: Nodo):
        self.adyacencia.set_arriba(nodo)
        nodo.adyacencia.set_abajo(self)
        return self

    def set_abajo(self, nodo: Nodo):
        self.adyacencia.set_abajo(nodo)
        nodo.adyacencia.set_arriba(self)
        return self

    def set_derecha(self, nodo: Nodo):
        self.adyacencia.set_derecha(nodo)
        nodo.adyacencia.set_izquierda(self)
        return self

    def set_izquierda(self, nodo: Nodo):
        self.adyacencia.set_izquierda(nodo)
        nodo.adyacencia.set_derecha(self)
        return self

    def __str__(self) -> str:
        return f"<Nodo ID: {self.id}>"

