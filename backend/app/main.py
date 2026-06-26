from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.middleware import LoggingMiddleware, RequestIDMiddleware
from app.exceptions.handlers import register_exception_handlers
from app.routers.api import api_router


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
)

# Allow browser-based clients to call the API during development and deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach request IDs before logging so every request log can be correlated.
app.add_middleware(RequestIDMiddleware)
app.add_middleware(LoggingMiddleware)

# Register global exception handlers before exposing versioned API routes.
register_exception_handlers(app)
app.include_router(api_router)
