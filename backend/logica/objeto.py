from random import randint
from typing import Self

from matplotlib.pylab import cos, radians, sin
from algebra_matrices import producto_punto
from punto import Punto


class Objeto:
    def __init__(self) -> None:
        self.id = randint(100000, 999999)

        self.largo = None
        self.ancho = None
        self.alto = None

        self.vertices: list[Punto] = [Punto([[0], [0], [0]])]

    def actualizar_dimensiones(self) -> Self:
        if len(self.vertices) < 2:
            self.largo = self.ancho = self.alto = 0
            return self

        xs = [v.x for v in self.vertices]
        ys = [v.y for v in self.vertices]
        zs = [v.z for v in self.vertices]

        self.largo = max(xs) - min(xs)
        self.ancho = max(ys) - min(ys)
        self.alto = max(zs) - min(zs)

        return self

    def transformar(self, matriz: list[list[int | float]]):
        nuevos_vertices = []
        for v in self.get_vertices_matrix():
            v_rotado = producto_punto(matriz, v)
            nuevos_vertices.append(Punto(v_rotado))

        self.vertices = nuevos_vertices

        return self.actualizar_dimensiones()

    def escalar(self, fx: float, fy: float, fz: float) -> Self:
        matriz = [
            [fx, 0, 0],
            [0, fy, 0],
            [0, 0, fz]
        ]

        return self.transformar(matriz)

    def rotar_z(self, g_z: int | float) -> Self:
        theta = radians(g_z)
        matriz = [
            [cos(theta), -sin(theta), 0],
            [sin(theta),  cos(theta), 0],
            [0,         0,        1]
        ]

        return self.transformar(matriz)

    def rotar_x(self, g_x: int | float) -> Self:
        theta = radians(g_x)
        matriz = [
            [1, 0, 0],
            [0, cos(theta), -sin(theta)],
            [0, sin(theta),  cos(theta)]
        ]

        return self.transformar(matriz)

    def rotar_y(self, g_y: int | float) -> Self:
        theta = radians(g_y)
        matriz = [
            [cos(theta), 0, sin(theta)],
            [0, 1, 0],
            [-sin(theta), 0,  cos(theta)]
        ]

        return self.transformar(matriz)

    def set_vertices(self, vertices: list[Punto]) -> Self:
        self.vertices = vertices

        return self.actualizar_dimensiones()

    def add_vertice(self, vertice: Punto) -> Self:
        self.vertices.append(vertice)

        return self.actualizar_dimensiones()

    def get_vertices_matrix(self) -> list[list[list[int | float]]]:
        return [[[v.x], [v.y], [v.z]] for v in self.vertices]

    def __str__(self) -> str:
        return "[" + ", ".join(f"({v.x}, {v.y}, {v.z})" for v in self.vertices) + "]"
