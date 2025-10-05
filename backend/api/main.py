from fastapi import FastAPI
from routers.rooms import router as rooms_router
from routers.habitats import router as habitats_router
from routers.formas import router as formas_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Dominios permitidos (puedes ajustar según tu frontend)
origins = [
    "http://localhost:3000",  # tu frontend en React/Next
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # puedes usar ["*"] para permitir todos
    allow_credentials=True,
    allow_methods=["*"],           # permite todos los métodos: GET, POST, etc
    allow_headers=["*"],           # permite todos los headers
)

app.include_router(rooms_router)
app.include_router(habitats_router)
app.include_router(formas_router)
