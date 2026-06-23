from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, employees

app = FastAPI(
    title='HMA IEMS API',
    version='1.0.0',
    docs_url='/docs' if settings.ENVIRONMENT == 'development' else None,
    redoc_url='/redoc' if settings.ENVIRONMENT == 'development' else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(employees.router)


@app.get('/health')
def health():
    return {'status': 'ok'}
