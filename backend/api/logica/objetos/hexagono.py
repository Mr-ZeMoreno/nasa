import math

from logica.objetos.objeto import Objeto
from logica.objetos.punto import Punto
from logica.libreria.algebra import punto_medio


def f_x(x, radio, lado):
    return x + radio * math.cos(2 * math.pi * lado / 6)


def f_y(y, radio, lado):
    return y + radio * math.sin(2 * math.pi * lado / 6)


def hexagono(centro: Punto, radio: float):
    o = Objeto()
    for i in range(6):
        x = f_x(centro.x, radio, i)
        y = f_y(centro.y, radio, i)
        o.add_vertice(Punto([[x], [y], [0]]))

    for i in range(6):
        x = f_x(centro.x, radio, i)
        y = f_y(centro.y, radio, i)
        o.add_vertice(Punto([[x], [y], [centro.z]]))

    return o


class Piso:
    def __init__(self, radio: float, espesor: float):
        self.radio = float(radio)
        self.centros = []

        # Centro y hex central
        self.centros.append(Punto([[0.0], [0.0], [0.0]]).vector_plano())
        self.central = hexagono(Punto([[0.0], [0.0], [float(espesor)]]), self.radio)

        # Asegurar que usamos solo 6 vértices únicos
        verts = self.central.vertices
        if len(verts) == 12 and verts[0] == verts[6]:
            verts = verts[:6]  # descarta la repetición

        # calcular 6 centros vecinos usando puntos medios de cada arista
        for i in range(6):
            v1 = verts[i]
            v2 = verts[(i + 1) % 6]
            mx, my = punto_medio(v1, v2)   # devuelve escalares
            self.centros.append(Punto([[2.0 * mx], [2.0 * my], [0.0]]).vector_plano())

    def hexagonos(self):
        return [hexagono(c, self.radio).matriz_plana() for c in self.centros]
