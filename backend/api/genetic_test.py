import json

from logica.objetos.hexagono import Piso
from logica.objetos.nodo import Nodo
from logica.prueba import mejor_orden

def gen_nodos(data):
    rooms: list[Nodo] = []

    zero_pairs_all = data["zero_pairs"]

    for a, b in zero_pairs_all:
        n1 = next((n for n in rooms if n == a), None)
        if not n1:
            n1 = Nodo(a)
            rooms.append(n1)

        n2 = next((n for n in rooms if n == b), None)
        if not n2:
            n2 = Nodo(b)
            rooms.append(n2)

        n1.add_restriccion(n2)

    prefs_all = data["preferences"]

    for pref in prefs_all:
        a, b = pref["pair"]

        n1 = next((n for n in rooms if n == a), None)
        if not n1:
            n1 = Nodo(a)
            rooms.append(n1)

        n2 = next((n for n in rooms if n == b), None)
        if not n2:
            n2 = Nodo(b)
            rooms.append(n2)

        n1.add_preferencia(n2)

    for nodo in rooms:
        print(f"\nNodo: {nodo}")
        print(f"Restriccion: {nodo.restriccion}")
        print(f"Preferencia: {nodo.preferencia}\n")
    
    return rooms

if __name__ == "__main__":
    with open("restricciones.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    rooms = gen_nodos(data)
    best_layout, _, _, _, _ = mejor_orden(rooms)
    piso = Piso(1, 0.1, best_layout)
    print(piso.centros_json())
