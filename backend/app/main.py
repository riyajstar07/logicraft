from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routes import router

app = FastAPI(
    title="LogiCraft API",
    version="1.0.0",
    description="Fleet, warehouse, shipment, and public-transit operations.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {
        "name": "LogiCraft",
        "docs": "/docs",
        "health": "/api/health",
        "modules": ["fleet", "warehouse", "shipments", "transit"],
    }
