import math
from typing import Sequence, Union
import numpy as np

from logica.objetos.objeto import Objeto
from logica.objetos.punto import Punto
from logica.libreria.algebra import punto_medio

# ---- Helper para construir Punto con tu firma real ----
def make_punto(x: float, y: float, z: float) -> Punto:
    return Punto([[float(x)], [float(y)], [float(z)]])

# ---- Normalizador de "centro" (acepta Punto, lista o np.array) ----
def _to_punto(centro: Union[Punto, Sequence[float], np.ndarray]) -> Punto:
    if isinstance(centro, Punto):
        return centro
    if isinstance(centro, np.ndarray):
        centro = centro.flatten().tolist()
    if isinstance(centro, (list, tuple)):
        if len(centro) == 3:
            cx, cy, cz = centro
        elif len(centro) == 2:
            cx, cy = centro
            cz = 0.0
        else:
            raise ValueError(f"Centro con longitud inválida: {centro}")
        return make_punto(cx, cy, cz)
    raise TypeError(f"Tipo de centro no soportado: {type(centro)}")

def f_x(x, radio, lado):
    return x + radio * math.cos(2 * math.pi * lado / 6)

def f_y(y, radio, lado):
    return y + radio * math.sin(2 * math.pi * lado / 6)

def hexagono(centro: Union[Punto, Sequence[float], np.ndarray], radio: float) -> Objeto:
    centro = _to_punto(centro)
    o = Objeto()

    # Base (z=0)
    for i in range(6):
        x = f_x(centro.x, radio, i)
        y = f_y(centro.y, radio, i)
        o.add_vertice(make_punto(x, y, 0.0))

    # Tapa (z=centro.z)
    for i in range(6):
        x = f_x(centro.x, radio, i)
        y = f_y(centro.y, radio, i)
        o.add_vertice(make_punto(x, y, centro.z))

    return o

class Piso:
    def __init__(self, radio: float, espesor: float):
        self.radio = float(radio)
        self.centros: list[Punto] = []

        # ✅ Guarda Punto (no vector_plano)
        self.centros.append(make_punto(0.0, 0.0, 0.0))
        self.central = hexagono(make_punto(0.0, 0.0, float(espesor)), self.radio)

        # Toma 6 vértices de la base
        verts = self.central.vertices
        base_verts = verts[:6] if len(verts) >= 6 else verts

        # 6 centros vecinos (tu misma lógica 2*medio)
        for i in range(6):
            v1 = base_verts[i]
            v2 = base_verts[(i + 1) % 6]
            mx, my = punto_medio(v1, v2)  # escalares
            self.centros.append(make_punto(2.0 * mx, 2.0 * my, 0.0))

    def hexagonos(self):
        return [hexagono(c, self.radio).matriz_plana() for c in self.centros]
