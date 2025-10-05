from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from logica.objetos.hexagono import hexagono, Piso as P
from logica.objetos.punto import Punto

router = APIRouter(prefix="/formas")

class HexPayload(BaseModel):
    centro: list[list[float]]
    radio: float


@router.post("/hex")
def hex(payload: HexPayload):
    centro = Punto(payload.centro)
    return hexagono(centro, payload.radio).matriz_plana()


@router.get("/piso")
def piso_get(radio: float, espesor: float):
    floor_matrix = P(radio, espesor).centros

    return floor_matrix

# ------------------ WS ------------------
class RotateCommand(BaseModel):
    x: int
    y: int
    z: int
    axis: str
    times: int = 1

@router.websocket("/ws/piso")
async def piso_ws(websocket: WebSocket):
    await websocket.accept()

    floor_matrix = P(radio=1.0, espesor=0.1).centros

    try:
        while True:
            data = await websocket.receive_json()
            command_type = data.get("type")

            if command_type == "get_floor":
                # Devolver la matriz completa al cliente
                await websocket.send_json({"type": "floor", "matrix": floor_matrix})

            elif command_type == "rotate_object":
                x = data["x"]
                y = data["y"]
                z = data["z"]
                axis = data["axis"]
                times = data.get("times", 1)

                try:
                    obj = floor_matrix[x][y][z].get("o")
                    if obj is None:
                        await websocket.send_json({"error": "No object at position"})
                        continue

                    for _ in range(times):
                        if axis.lower() == "x":
                            obj.rotar_x()
                        elif axis.lower() == "y":
                            obj.rotar_y()
                        elif axis.lower() == "z":
                            obj.rotar_z()
                        else:
                            await websocket.send_json({"error": "Invalid axis"})
                            continue

                    await websocket.send_json({"status": "rotated", "position": [x, y, z], "axis": axis})

                except IndexError:
                    await websocket.send_json({"error": "Position out of bounds"})

            else:
                await websocket.send_json({"error": "Unknown command type"})

    except WebSocketDisconnect:
        print("Client disconnected")