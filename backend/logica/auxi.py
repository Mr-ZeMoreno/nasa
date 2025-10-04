from __future__ import annotations
from typing import Self, Literal
import numpy as np

Coord = float

class Punto:
    def __init__(self, x: Coord, y: Coord, z: Coord) -> None:
        # Guardamos internamente como vector numpy (float)
        self._v = np.array([x, y, z], dtype=float)

    @property
    def x(self) -> float: return float(self._v[0])
    @property
    def y(self) -> float: return float(self._v[1])
    @property
    def z(self) -> float: return float(self._v[2])

    def to_np(self) -> np.ndarray:
        """Devuelve una copia (para evitar mutaciones externas)."""
        return self._v.copy()

    def __repr__(self) -> str:
        return f"Punto({self.x}, {self.y}, {self.z})"

    def __eq__(self, other: Self) -> bool:
        return np.allclose(self._v, other._v)


class Objeto:
    def __init__(self) -> None:
        # Matriz N×3 de vértices (cada fila es [x,y,z])
        self.vertices: np.ndarray = np.empty((0, 3), dtype=float)

    def add_vertice(self, p: Punto) -> Self:
        self.vertices = np.vstack([self.vertices, p.to_np()])
        return self

    def remove_vertice(self, p: Punto) -> Self:
        # Buscamos la fila que coincide (con tolerancia numérica)
        objetivo = p.to_np()
        idx = np.where(np.all(np.isclose(self.vertices, objetivo), axis=1))[0]
        if idx.size:
            self.vertices = np.delete(self.vertices, idx[0], axis=0)
        return self

    def matriz(self) -> np.ndarray:
        """Devuelve la matriz (copia) N×3 de vértices."""
        return self.vertices.copy()

    def transformar(
        self,
        M: np.ndarray | list[list[float]] | None = None,
        *,
        modo: Literal["matmul", "dot", "cross"] = "matmul",
        a: int | None = None,
        b: int | None = None
    ) -> "Objeto | float | np.ndarray":
        """
        - modo='matmul': aplica M (3×3 o 4×4) a todos los vértices (devuelve Self).
        - modo='dot'  : devuelve el producto punto entre los vértices a y b (float).
        - modo='cross': devuelve el producto cruz entre los vértices a y b (np.ndarray de 3, un vector).
        """
        if modo == "matmul":
            if M is None:
                raise ValueError("Se requiere una matriz de transformación M para 'matmul'.")
            M = np.asarray(M, dtype=float)

            V = self.vertices  # N×3
            if M.shape == (3, 3):
                # (N×3) @ (3×3)^T  -> N×3   (usamos transpuesta para operar por filas)
                self.vertices = V @ M.T
            elif M.shape == (4, 4):
                # Coordenadas homogéneas
                Vh = np.hstack([V, np.ones((len(V), 1))])  # N×4
                self.vertices = (Vh @ M.T)[:, :3]
            else:
                raise ValueError("La matriz M debe ser 3×3 (lineal) o 4×4 (homogénea).")
            return self

        elif modo == "dot":
            if a is None or b is None:
                raise ValueError("Especifique índices 'a' y 'b' para producto punto.")
            return float(np.dot(self.vertices[a], self.vertices[b]))

        elif modo == "cross":
            if a is None or b is None:
                raise ValueError("Especifique índices 'a' y 'b' para producto cruz.")
            return np.cross(self.vertices[a], self.vertices[b])

        else:
            raise ValueError("Modo inválido. Use 'matmul', 'dot' o 'cross'.")

    def __repr__(self) -> str:
        return f"Objeto(vertices=\n{self.vertices})"


# ---- Matriz de adyacencia como numpy (con etiquetas aparte) -----------------

def matriz_adyacencia(pivote: str, vecinos: list[str], *, no_dirigido: bool = False):
    """
    Crea una matriz de adyacencia donde cada vecino apunta al pivote.
    Si no_dirigido=True, también se conecta pivote <-> vecino (simétrica).
    Devuelve (A, etiquetas) donde A es np.ndarray de 0/1 y etiquetas es la lista de nombres.
    """
    etiquetas = [pivote] + vecinos
    n = len(etiquetas)
    A = np.zeros((n, n), dtype=int)

    for i in range(1, n):
        A[i, 0] = 1            # vecino -> pivote
        if no_dirigido:
            A[0, i] = 1        # pivote -> vecino (opcional)

    return A, etiquetas


# ================== DEMO RÁPIDA ==================
if __name__ == "__main__":
    # Crear puntos y objeto
    p1 = Punto(1, 1, 1)
    p2 = Punto(0, 0, 0)
    o = Objeto().add_vertice(p1).add_vertice(p2)

    print("Vértices iniciales (N×3):\n", o.matriz())

    # Ejemplo: rotación 90° en Z (3×3)
    theta = np.deg2rad(90)
    Rz = np.array([
        [ np.cos(theta), -np.sin(theta), 0.0],
        [ np.sin(theta),  np.cos(theta), 0.0],
        [ 0.0,            0.0,           1.0],
    ])
    o.transformar(Rz, modo="matmul")
    print("\nTras rotar 90° en Z:\n", o.matriz())

    # Producto punto entre v0 y v1
    dot01 = o.transformar(modo="dot", a=0, b=1)
    print("\nProducto punto v0·v1:", dot01)

    # Producto cruz entre v0 y v1
    cross01 = o.transformar(modo="cross", a=0, b=1)
    print("Producto cruz v0×v1:", cross01)

    # Matriz de adyacencia (vecinos -> pivote), con versión no dirigida
    A, etiquetas = matriz_adyacencia("a", ["b", "c", "d", "e", "f", "g"], no_dirigido=True)
    print("\nEtiquetas:", etiquetas)
    print("Matriz de adyacencia (1 = conexión):\n", A)

    # Ejemplo: convertir una "lista de listas" a numpy directamente
    lista = [[1, 0, 0],
             [0, 1, 0],
             [0, 0, 1]]
    ident = np.array(lista, dtype=float)
    print("\nIdentidad 3×3 como numpy:\n", ident)
