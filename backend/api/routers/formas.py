from fastapi import APIRouter
from pydantic import BaseModel
from logica.objetos.hexagono import hexagono, piso as p
from logica.objetos.punto import Punto

router = APIRouter(prefix="/formas")

class HexPayload(BaseModel):
    centro: list[list[float]]
    radio: float


@router.post("/hex")
def hex(payload: HexPayload):
    centro = Punto(payload.centro)
    return hexagono(centro, payload.radio).matriz()


@router.get("/piso")
def piso(radio:float, espesor: float):
    return p(radio, espesor)
