# routers/rooms.py
from enum import Enum
from typing import Optional, List
from fastapi import APIRouter
from pydantic import BaseModel, Field, conlist

from logica.objetos.hexagono import Piso

PREFIX = "/rooms"
router = APIRouter(prefix=PREFIX, tags=["Rooms"])

class Habitats(str, Enum):
    luna = "luna"
    marte = "marte"

class Cilindro(BaseModel):
    longitud: float = Field(gt=0)
    diametro: float = Field(gt=0)

class Domo(BaseModel):
    diametro: float = Field(gt=0)

class TipoGeom(str, Enum):
    cilindro = "cilindro"
    domo = "domo"  # <- corregido

class Geom(BaseModel):
    cilindro: Optional[Cilindro] = None
    domo: Optional[Domo] = None

class Formulario(BaseModel):
    nombre: str
    habitat: Habitats
    tripulantes: int = Field(ge=1)
    tipo_geometria: TipoGeom
    geometria: Geom
    prioridad: list[str]  # lista de strings
    mantenimiento: bool
    soporte_vital: bool
    notas: str

@router.post("/")
def obtener_piso(payload: Formulario):
    # TODO: usa payload para parametrizar (radio/espesor) si quieres
    matriz = Piso(1, 0.25).hexagonos()
    # Asegúrate de que 'matriz' sea JSON-serializable (listas/nums)
    return matriz

@router.get("/{id}")
def obtener_room_data(id: str):
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
            "Shaving",
        ],
    }
