from enum import Enum
import json
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from genetic_test import gen_nodos
from logica.objetos.hexagono import Piso
from logica.prueba import mejor_orden

PREFIX = "/rooms"

router = APIRouter(prefix=f"{PREFIX}",
                   tags=["Rooms"])


class Habitats(Enum):
    luna = "luna"
    marte = "marte"


class Cilindro(BaseModel):
    longitud: float
    diametro: float


class Domo(BaseModel):
    diametro: float


class TipoGeom(Enum):
    cilindro = "cilindro"
    esfera = "domo"


class Geom(BaseModel):
    cilindro: Optional[Cilindro]
    domo: Optional[Domo]


class Formulario(BaseModel):
    nombre: str
    habitat: Habitats
    tripulantes: int
    tipo_geometria: TipoGeom
    geometria: Geom
    prioridad: list
    mantenimiento: bool
    soporte_vital: bool
    notas: str


@router.get("/{id}")
def obtener_room_data():
    return {
        "room": "baño-1",
        "contenido": [
            "Changing Volume",
            "Limpieza Facial",
            "Corta uñas",
            "Limpieza de cuerpo completo",
            "Limpieza de manos",
            "Higiene Bucal",
            "PW SA",
            "Shaving"
        ]
    }
