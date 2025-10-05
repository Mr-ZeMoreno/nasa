from matplotlib import pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# tu módulo (asumo que cada hex tiene .vertices con .x .y .z)
from logica.objetos.hexagono import piso

def extruir_prisma(vertices_xyz, alto):
    """
    Recibe: lista [(x,y,z), ...] del polígono base (en orden CCW).
    Devuelve: lista de caras (cada cara es lista de vértices 3D).
    Caras = [tapa_superior, tapa_inferior, caras_laterales...]
    """
    # base inferior (z original)
    base = [(x, y, z) for (x, y, z) in vertices_xyz]
    # base superior (z + alto)
    top  = [(x, y, z + alto) for (x, y, z) in vertices_xyz]

    # tapa superior (mismo orden), tapa inferior (orden inverso para normales)
    faces = [top, base[::-1]]

    # caras laterales
    n = len(vertices_xyz)
    for i in range(n):
        j = (i + 1) % n
        v0b, v1b = base[i], base[j]
        v1t, v0t = top[j], top[i]
        faces.append([v0b, v1b, v1t, v0t])

    return faces

def set_axes_equal(ax):
    """Ajusta las escalas para que x, y, z usen la misma métrica (aspect 'equal' real en 3D)."""
    import numpy as np
    x_limits = ax.get_xlim3d()
    y_limits = ax.get_ylim3d()
    z_limits = ax.get_zlim3d()
    x_range = abs(x_limits[1] - x_limits[0])
    y_range = abs(y_limits[1] - y_limits[0])
    z_range = abs(z_limits[1] - z_limits[0])
    max_range = max([x_range, y_range, z_range])
    x_middle = sum(x_limits) * 0.5
    y_middle = sum(y_limits) * 0.5
    z_middle = sum(z_limits) * 0.5
    ax.set_xlim3d([x_middle - max_range/2, x_middle + max_range/2])
    ax.set_ylim3d([y_middle - max_range/2, y_middle + max_range/2])
    ax.set_zlim3d([z_middle - max_range/2, z_middle + max_range/2])

if __name__ == "__main__":
    # Parámetros
    radio = 1.0         # controla "ancho/largo" (circunradio del hex)
    separacion = 0.25   # separación entre celdas en tu 'piso'
    alto = 0.4          # <<--- AHORA el alto del prisma (Z)

    # Genera hexágonos (en XY, z≈0 si así los entrega tu clase)
    hexagonos = piso(radio, separacion)

    # Prepara figura 3D
    fig = plt.figure()
    ax = fig.add_subplot(111, projection="3d")

    # Dibuja cada hex como prisma 3D
    for h in hexagonos:
        # Si tus objetos tienen método de rotación propio y lo quieres usar en 3D:
        # h_rot = h.rotar_z(0).rotar_x(0)  # puedes ajustar si quieres, o dejar 0
        h_rot = h  # sin rotación geométrica; la vista la controlamos con la cámara

        # Lista (x,y,z) del polígono base
        base_xyz = [(v.x, v.y, v.z) for v in h_rot.vertices]

        # Construye caras del prisma
        caras = extruir_prisma(base_xyz, alto)

        # Crea la colección y añádela
        poly = Poly3DCollection(
            caras,
            facecolors="lightblue",
            edgecolors="black",
            linewidths=0.8,
            alpha=0.75
        )
        ax.add_collection3d(poly)

    # Límites de escena (ajústalo a tu grid)
    ax.set_xlim(-3, 3)
    ax.set_ylim(-3, 3)
    ax.set_zlim(0, 1.5)  # visible el espesor

    set_axes_equal(ax)         # aspecto uniforme
    ax.view_init(elev=30, azim=35)  # “cámara” (ángulos de vista)
    ax.set_axis_off()          # sin ejes
    plt.show()
