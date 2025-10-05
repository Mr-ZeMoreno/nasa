from typing import Optional, List
from fastapi import APIRouter, Query
from pydantic import BaseModel
import math
import copy

class Habitats(BaseModel):
    id: str
    name: str
    slots: float
    tags: List[str]
    priority: int
    description: Optional[str]

router = APIRouter(prefix="/habitat", tags=["Habitats"])

# Ejemplo de catálogo
catalog: List[Habitats] = [
    Habitats(id="sleep", name="Sleep Pod", slots=1, tags=["sleep"], priority=1, description=None),
    Habitats(id="galley", name="Galley", slots=1, tags=["galley"], priority=1, description=None),
    Habitats(id="food_storage", name="Food Storage", slots=1, tags=["storage"], priority=1, description=None),
    Habitats(id="hygiene", name="Hygiene Module", slots=1, tags=["hygiene"], priority=1, description=None),
    Habitats(id="eclss", name="ECLSS Rack", slots=1, tags=["eclss"], priority=1, description=None),
    Habitats(id="o2", name="O2 Generator", slots=1, tags=["eclss"], priority=1, description=None),
    Habitats(id="treadmill", name="Treadmill", slots=1, tags=["exercise"], priority=1, description=None),
    Habitats(id="bike", name="Exercise Bike", slots=1, tags=["exercise"], priority=1, description=None),
    Habitats(id="medical_station", name="Medical Station", slots=1, tags=["medical"], priority=1, description=None),
    Habitats(id="medical_storage", name="Medical Storage", slots=1, tags=["medical"], priority=1, description=None),
    Habitats(id="storage_rack", name="Storage Rack", slots=1, tags=["stowage"], priority=1, description=None),
    Habitats(id="command", name="Command Console", slots=1, tags=["command"], priority=1, description=None),
]

@router.get("/", response_model=List[Habitats])
def get_objects():
    return catalog


@router.get("/objects", response_model=List[Habitats])
def get_objects_for_functions(
    functions: List[str] = Query(..., description="Funciones necesarias"),
    crew: int = Query(..., description="Número de tripulantes")
):
    objects: List[Habitats] = []

    for func in functions:
        if func == "sleep":
            for i in range(crew):
                obj = copy.deepcopy(catalog[0])
                obj.id = f"{obj.id}-{i}"
                objects.append(obj)
        elif func == "galley":
            objects.append(catalog[1])
            objects.append(catalog[2])
        elif func == "hygiene":
            objects.append(catalog[3])
        elif func == "eclss":
            objects.append(catalog[4])
            objects.append(catalog[5])
        elif func == "exercise":
            objects.append(catalog[6])
            objects.append(catalog[7])
        elif func == "medical":
            objects.append(catalog[8])
            objects.append(catalog[9])
        elif func == "stowage":
            storage_count = math.ceil(crew / 2)
            for i in range(storage_count):
                obj = copy.deepcopy(catalog[10])
                obj.id = f"{obj.id}-{i}"
                objects.append(obj)
        elif func == "command":
            objects.append(catalog[11])

    return objects
