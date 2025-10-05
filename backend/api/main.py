from fastapi import FastAPI
from routers.rooms import router as rooms_router
from routers.habitats import router as habitats_router
from routers.formas import router as formas_router
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

# Dominios permitidos (puedes ajustar según tu frontend)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # o ["*"] si NO usas credenciales
    allow_credentials=False,         # pon True SOLO si usas cookies/autenticación
    allow_methods=["*"],             # GET, POST, OPTIONS...
    allow_headers=["*"],             # Content-Type, Authorization...
)

app.include_router(rooms_router)
app.include_router(habitats_router)
app.include_router(formas_router)
