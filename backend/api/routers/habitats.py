from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import math
import copy

# =========================
# Modelos
# =========================

class Habitat(BaseModel):
    id: str
    name: str
    slots: float
    tags: List[str]
    priority: int
    description: Optional[str] = None

router = APIRouter(prefix="/habitat", tags=["Habitats"])

# =========================
# Catálogo base (plantillas)
# Nota: usa SIEMPRE deepcopy al clonar
# =========================

catalog: Dict[str, Habitat] = {
    "sleep":           Habitat(id="sleep",            name="Sleep Pod",       slots=1, tags=["sleep"],     priority=1),
    "galley":          Habitat(id="galley",           name="Galley",          slots=1, tags=["galley"],    priority=1),
    "food_storage":    Habitat(id="food_storage",     name="Food Storage",    slots=1, tags=["stowage"],   priority=1),  # <-- unificamos en 'stowage'
    "hygiene":         Habitat(id="hygiene",          name="Hygiene Module",  slots=1, tags=["hygiene"],   priority=1),
    "eclss":           Habitat(id="eclss",            name="ECLSS Rack",      slots=1, tags=["eclss"],     priority=1),
    "o2":              Habitat(id="o2",               name="O2 Generator",    slots=1, tags=["eclss"],     priority=1),
    "treadmill":       Habitat(id="treadmill",        name="Treadmill",       slots=1, tags=["exercise"],  priority=1),
    "bike":            Habitat(id="bike",             name="Exercise Bike",   slots=1, tags=["exercise"],  priority=1),
    "medical_station": Habitat(id="medical_station",  name="Medical Station", slots=1, tags=["medical"],   priority=1),
    "medical_storage": Habitat(id="medical_storage",  name="Medical Storage", slots=1, tags=["medical"],   priority=1),
    "storage_rack":    Habitat(id="storage_rack",     name="Storage Rack",    slots=1, tags=["stowage"],   priority=1),
    "command":         Habitat(id="command",          name="Command Console", slots=1, tags=["command"],   priority=1),
}

# =========================
# Helpers
# =========================

def clone_with_suffix(base: Habitat, suffix: Optional[str] = None) -> Habitat:
    obj = copy.deepcopy(base)
    if suffix:
        obj.id = f"{obj.id}-{suffix}"
    return obj

def ensure_known_functions(funcs: List[str]) -> None:
    known = {"sleep", "galley", "hygiene", "eclss", "exercise", "medical", "stowage", "command"}
    unknown = [f for f in funcs if f not in known]
    if unknown:
        raise HTTPException(status_code=422, detail={"error": "Unknown functions", "unknown": unknown})

# =========================
# Rutas
# =========================

@router.get("/", response_model=List[Habitat])
def get_catalog() -> List[Habitat]:
    # Devuelve el catálogo base (plantillas) sin clonar
    return list(catalog.values())

@router.get("/objects", response_model=List[Habitat])
def get_objects_for_functions(
    functions: List[str] = Query(..., description="Funciones necesarias. Repite ?functions=... para varias."),
    crew: int = Query(..., gt=0, description="Número de tripulantes (>0)")
):
    # Normaliza y valida
    functions = [f.strip().lower() for f in functions if f and f.strip()]
    ensure_known_functions(functions)

    objects: List[Habitat] = []

    for func in functions:
        if func == "sleep":
            # Un pod por tripulante
            for i in range(crew):
                objects.append(clone_with_suffix(catalog["sleep"], str(i)))

        elif func == "galley":
            # Cocina + bodega de comida
            objects.append(clone_with_suffix(catalog["galley"], None))
            objects.append(clone_with_suffix(catalog["food_storage"], None))

        elif func == "hygiene":
            objects.append(clone_with_suffix(catalog["hygiene"], None))

        elif func == "eclss":
            # Soporte vital básico: rack ECLSS + generador de O2
            objects.append(clone_with_suffix(catalog["eclss"], None))
            objects.append(clone_with_suffix(catalog["o2"], None))

        elif func == "exercise":
            objects.append(clone_with_suffix(catalog["treadmill"], None))
            objects.append(clone_with_suffix(catalog["bike"], None))

        elif func == "medical":
            objects.append(clone_with_suffix(catalog["medical_station"], None))
            objects.append(clone_with_suffix(catalog["medical_storage"], None))

        elif func == "stowage":
            # 1 rack cada 2 tripulantes, redondeado hacia arriba
            storage_count = math.ceil(crew / 2)
            for i in range(storage_count):
                objects.append(clone_with_suffix(catalog["storage_rack"], str(i)))

        elif func == "command":
            objects.append(clone_with_suffix(catalog["command"], None))

    return objects
