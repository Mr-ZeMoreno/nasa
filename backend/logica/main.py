
from libreria.plotting import dibujar_interactivo
from objetos.nodo import Nodo
from objetos.objeto import Objeto
from objetos.punto import Punto


piso = Objeto() \
    .add_vertice(Punto([[1], [1], [0]])) \
    .add_vertice(Punto([[0], [0], [0]])) \
    .add_vertice(Punto([[0], [1], [0]])) \
    .add_vertice(Punto([[1], [0], [0]])) \
    .add_vertice(Punto([[1], [1], [1]])) \
    .add_vertice(Punto([[0], [0], [1]])) \
    .add_vertice(Punto([[0], [1], [1]])) \
    .add_vertice(Punto([[1], [0], [1]]))


nodo_piso = Nodo()
print(piso)
print(piso.largo, piso.ancho, piso.alto)
dibujar_interactivo(piso)
