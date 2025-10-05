import math
from typing import Any, List, Tuple

from logica.objetos.nodo import Nodo
from logica.objetos.objeto import Objeto
from logica.objetos.punto import Punto
from logica.libreria.algebra import punto_medio


def f_x(x, radio, lado):
    return x + radio * math.cos(2 * math.pi * lado / 6)


def f_y(y, radio, lado):
    return y + radio * math.sin(2 * math.pi * lado / 6)



def _to_xyz(c: Any) -> Tuple[float, float, float]:
    # Caso Punto
    if hasattr(c, "x") and hasattr(c, "y") and hasattr(c, "z"):
        return float(c.x), float(c.y), float(c.z)

    # Caso dict
    if isinstance(c, dict) and all(k in c for k in ("x", "y", "z")):
        return float(c["x"]), float(c["y"]), float(c["z"])

    # Caso lista/tupla
    if isinstance(c, (list, tuple)) and len(c) == 3:
        # [x, y, z]
        if all(not isinstance(v, (list, tuple)) for v in c):
            return float(c[0]), float(c[1]), float(c[2])
        # [[x], [y], [z]]
        if all(isinstance(v, (list, tuple)) and len(v) == 1 for v in c):
            return float(c[0][0]), float(c[1][0]), float(c[2][0])

    raise ValueError("Formato de centro no soportado. Usa Punto, [x,y,z], [[x],[y],[z]] o {'x','y','z'}.")


def _mk_punto(x: float, y: float, z: float):
    return Punto([[x], [y], [z]])


def hexagono(centro: Any, radio: float):
    cx, cy, cz = _to_xyz(centro)

    o = Objeto()

    # 6 vértices en el plano base (z=0)
    for i in range(6):
        x = f_x(cx, float(radio), i)
        y = f_y(cy, float(radio), i)
        o.add_vertice(_mk_punto(x, y, 0.0))

    # 6 vértices a la altura del centro (z=cz) -> útil si quieres una "tapa" o extrusión manual
    for i in range(6):
        x = f_x(cx, float(radio), i)
        y = f_y(cy, float(radio), i)
        o.add_vertice(_mk_punto(x, y, cz))

    return o


class Piso:
    def __init__(self, radio: float, espesor: float, layout: List[Nodo]):
        self.radio = float(radio)
        self.espesor = float(espesor)

        if not layout:
            raise ValueError("layout vacío: necesito al menos 1 Nodo para el hex central.")

        self.central_hex = hexagono(Punto([[0.0], [0.0], [self.espesor]]), self.radio)

        verts = self.central_hex.vertices
        if len(verts) >= 12 and verts[0] == verts[6]:
            verts = verts[:6]

        neighbor_positions: List[Tuple[float, float, float]] = []
        for i in range(6):
            v1 = verts[i]
            v2 = verts[(i + 1) % 6]
            mx, my = punto_medio(v1, v2)
            neighbor_positions.append((2.0 * mx, 2.0 * my, 0.0))

        central_nodo = layout[0]
        vecinos = layout[1:7] 

        self._centros_con_nodo: List[Tuple[Nodo, List[float]]] = []
        self._centros_con_nodo.append( (central_nodo, [0.0, 0.0, 0.0]) )

        for i, nodo in enumerate(vecinos):
            x, y, z = neighbor_positions[i]
            self._centros_con_nodo.append( (nodo, [x, y, z]) )

        self.centros: List[List[float]] = [c for (_n, c) in self._centros_con_nodo]
        self.nombres: list[str] =  [ nodo.id for nodo in layout]

    @property
    def centros_con_nodo(self) -> List[Tuple[Nodo, List[float]]]:
        return self._centros_con_nodo

    def hexagonos(self, plano: bool = True):
        if plano:
            return [hexagono(c, self.radio).matriz_plana() for c in self.centros]
        else:
            return [hexagono(c, self.radio) for c in self.centros]

    def centros_json(self) -> List[List[float]]:
        return self.centros
    
    def nombres_json(self) ->list[str]:
        return self.nombres
