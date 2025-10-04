from __future__ import annotations



class Nodo:
    def __init__(self, id) -> None:
        self.id = id
        self.objeto = None
        self.peso = None
        self.adyacencia: list[Nodo | None] = [None]  * 6
        self.index = [i for i in range(7)]

    def add_nodo(self, nodo: Nodo):
        self.adyacencia[self.index.pop()] = nodo

    def eliminar_nodo(self, nodo: Nodo):
        i = self.adyacencia.index(nodo)
        self.adyacencia[i] = None
        self.index.append(i)

    def __eq__(self, value: Nodo) -> bool:
        return self.id == value.id
    
    def __str__(self) -> str:
        return f"<Nodo ID: {self.id}>"



def adyacencia(nodo_pivote: Nodo):
    pass
