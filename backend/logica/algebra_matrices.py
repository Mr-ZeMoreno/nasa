def producto_punto(m1: list[list[float]], m2: list[list[float | int]]) -> list[list[float | int]]:
    """
    Multiplica dos matrices m1 x m2
    """
    filas_m1 = len(m1)
    cols_m1 = len(m1[0])
    filas_m2 = len(m2)
    cols_m2 = len(m2[0])

    if cols_m1 != filas_m2:
        raise ValueError("Dimensiones incompatibles para producto punto")

    resultado = [[0 for _ in range(cols_m2)] for _ in range(filas_m1)]

    for i in range(filas_m1):
        for j in range(cols_m2):
            for k in range(cols_m1):
                resultado[i][j] += m1[i][k] * m2[k][j]  # type: ignore
    return resultado  # type: ignore


def producto_cruz(v1: list[list[float]], v2: list[list[float]]) -> list[list[float]]:
    """
    Producto cruz de dos vectores columna 3x1
    """
    if len(v1) != 3 or len(v2) != 3:
        raise ValueError("Solo se permite producto cruz en vectores 3D")

    x1, y1, z1 = v1[0][0], v1[1][0], v1[2][0]
    x2, y2, z2 = v2[0][0], v2[1][0], v2[2][0]

    return [
        [y1*z2 - z1*y2],
        [z1*x2 - x1*z2],
        [x1*y2 - y1*x2],
    ]