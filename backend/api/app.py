# from matplotlib import pyplot as plt
# from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# from logica.objetos.hexagono import Piso
# from logica.objetos.objeto import Objeto

# def extruir_prisma(vertices_xyz, alto):
#     base = [(x, y, z) for (x, y, z) in vertices_xyz]
#     top  = [(x, y, z + alto) for (x, y, z) in vertices_xyz]

#     faces = [top, base[::-1]]

#     # caras laterales
#     n = len(vertices_xyz)
#     for i in range(n):
#         j = (i + 1) % n
#         v0b, v1b = base[i], base[j]
#         v1t, v0t = top[j], top[i]
#         faces.append([v0b, v1b, v1t, v0t])

#     return faces

# def set_axes_equal(ax):
#     import numpy as np
#     x_limits = ax.get_xlim3d()
#     y_limits = ax.get_ylim3d()
#     z_limits = ax.get_zlim3d()
#     x_range = abs(x_limits[1] - x_limits[0])
#     y_range = abs(y_limits[1] - y_limits[0])
#     z_range = abs(z_limits[1] - z_limits[0])
#     max_range = max([x_range, y_range, z_range])
#     x_middle = sum(x_limits) * 0.5
#     y_middle = sum(y_limits) * 0.5
#     z_middle = sum(z_limits) * 0.5
#     ax.set_xlim3d([x_middle - max_range/2, x_middle + max_range/2])
#     ax.set_ylim3d([y_middle - max_range/2, y_middle + max_range/2])
#     ax.set_zlim3d([z_middle - max_range/2, z_middle + max_range/2])

# if __name__ == "__main__":
#     # Parámetros
#     radio = 1.0         # controla "ancho/largo" (circunradio del hex)
#     separacion = 0.25   # separación entre celdas en tu 'piso'
#     alto = 0.4          # <<--- AHORA el alto del prisma (Z)

#     # Genera hexágonos (en XY, z≈0 si así los entrega tu clase)
#     hexagonos = Piso(radio, separacion).hexagonos(plano=False)

#     # Prepara figura 3D
#     fig = plt.figure()
#     ax = fig.add_subplot(111, projection="3d")

#     for h in hexagonos:
#         h_rot = h 

#         base_xyz = [(v.x, v.y, v.z) for v in h_rot.vertices] # type: ignore

#         caras = extruir_prisma(base_xyz, alto)

#         poly = Poly3DCollection(
#             caras,
#             facecolors="lightblue",
#             edgecolors="black",
#             linewidths=0.8,
#             alpha=0.75
#         )
#         ax.add_collection3d(poly)

#     ax.set_xlim(-3, 3)
#     ax.set_ylim(-3, 3)
#     ax.set_zlim(0, 1.5)  # visible el espesor

#     set_axes_equal(ax)         # aspecto uniforme
#     ax.view_init(elev=30, azim=35)  # “cámara” (ángulos de vista)
#     ax.set_axis_off()          # sin ejes
#     plt.show()
