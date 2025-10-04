from fastapi import FastAPI
from routers.rooms import router as rooms_router

app = FastAPI()

app.include_router(rooms_router)
