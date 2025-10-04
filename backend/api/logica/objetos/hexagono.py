import math

from logica.objetos.objeto import Objeto
from logica.objetos.punto import Punto
from logica.libreria.algebra import punto_medio


def f_x(x, radio, lado):
    return x + radio * math.cos(2 * math.pi * lado / 6)


def f_y(y, radio, lado):
    return y + radio * math.sin(2 * math.pi * lado / 6)


def hexagono(centro: Punto, radio: float, z: float):
    o = Objeto()
    for i in range(6):
        x = f_x(centro.x, radio, i)
        y = f_y(centro.y, radio, i)
        o.add_vertice(Punto([[x], [y], [centro.z]]))
    return o


def piso(radio: float):
    # hexágono central
    centros = [Punto([[0], [0], [0]])]
    central = hexagono(Punto([[0], [0], [0]]), radio, 1)

    # calcular centros vecinos usando puntos medios
    for i in range(6):
        v1 = central.vertices[i]
        v2 = central.vertices[(i + 1) % 6]
        mx, my = punto_medio(v1, v2)
        centros.append(Punto([[2 * mx], [2 * my], [0]]))

    # generar hexágonos a partir de esos centros
    return [hexagono(c, radio, 1) for c in centros]
