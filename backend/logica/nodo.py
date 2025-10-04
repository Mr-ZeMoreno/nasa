from typing import Self


coordenada = int | float

class Punto:
    def __init__(self, x: coordenada, y: coordenada, z: coordenada) -> None:
        self.x = x
        self.y = y
        self.z = z
    
    def vector(self)-> list[coordenada]:
        return [self.x, self.y, self.z]
    
    def __str__(self) -> str:
        return f"{[self.x, self.y, self.z]}"
    
    def __repr__(self) -> str:
        return f"{[self.x, self.y, self.z]}"

    def __eq__(self, value: Self) -> bool:
        return self.vector() == value.vector()

class Objeto:
    def __init__(self) -> None:
        self.vertices: list[Punto] = []
    
    def add_vertice(self, punto: Punto) -> Self:
        self.vertices.append(punto)
        return self
    
    def remove_vertice(self, punto: Punto)->Self:
        self.vertices.remove(punto)
        return self
    
    def matriz(self) -> list[Punto]:
        return [v for v in self.vertices]
    
    def transformar(self, matriz: list[int | float]) -> Self:
        
        return self
    
    def __str__(self) -> str:
        return f"{self.matriz()}"

p1 = Punto(1,1,1)
p2 = Punto(0,0,0)

o = Objeto().add_vertice(p1).add_vertice(p2)

print(o)

o.remove_vertice(p2)

print(o)

class Nodo:
    def __init__(self):
        self.peso = None
        self.nombre = None
        self.objeto = None
        

def adyacencia(nodo_pivote: Nodo):
    pass
# Un nodo se puede unir con máximo 6 nodos
# La adyacencia debe mostrarse como matriz
# ejemplo : 
# b -> a
# c -> a
# d -> a
# e -> a
# f -> a
# g -> a
# 
# adyacencia = [
# [a, 1, 1, 1, 1, 1, 1],
# [1, b, 0, 0, 0, 0, 0], 
# [1, 0, c, 0, 0, 0, 0], 
# [1, 0, 0, d, 0, 0, 0], 
# [1, 0, 0, 0, e, 0, 0], 
# [1, 0, 0, 0, 0, f, 0], 
# [1, 0, 0, 0, 0, 0, g]
#]