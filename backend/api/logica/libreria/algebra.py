
from logica.objetos.punto import Punto


def punto_medio(c1: Punto, c2: Punto):
    x1, y1 = c1.x, c1.y
    x2, y2 = c2.x, c2.y
    return ((x1 + x2)/2, (y1 + y2)/2)
