import matplotlib.pyplot as plt

import matplotlib as mpl
mpl.rcParams['keymap.quit'] = []
mpl.rcParams['keymap.save'] = []

def proyectar_ortogonal(objeto, plano="xy"):
    puntos = []
    if plano == "xy":
        puntos = [(v.x, v.y) for v in objeto.vertices]
    elif plano == "xz":
        puntos = [(v.x, v.z) for v in objeto.vertices]
    elif plano == "yz":
        puntos = [(v.y, v.z) for v in objeto.vertices]
    return puntos


def dibujar_interactivo(objeto):
    fig, ax = plt.subplots(figsize=(10, 10))
    puntos = [(v.x, v.y) for v in objeto.vertices]
    xs, ys = zip(*puntos)
    sc = ax.scatter(xs, ys, c="blue", s=50)

    ax.set_aspect("equal", adjustable="box")
    ax.axhline(0, color="gray", lw=0.5)
    ax.axvline(0, color="gray", lw=0.5)
    ax.set_xlim(-5, 5)
    ax.set_ylim(-5, 5)

    def on_key(event):
        if event.key == "a":
            objeto.rotar_z(-5)
        elif event.key == "d":
            objeto.rotar_z(5)
        elif event.key == "w":
            objeto.rotar_x(5)
        elif event.key == "s":
            objeto.rotar_x(-5)
        elif event.key == "q":
            objeto.rotar_y(5)
        elif event.key == "e":
            objeto.rotar_y(-5)

        pts = [(v.x, v.y) for v in objeto.vertices]
        xs, ys = zip(*pts)
        sc.set_offsets(list(zip(xs, ys)))
        fig.canvas.draw_idle()

    fig.canvas.mpl_connect("key_press_event", on_key)
    plt.show()
