from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.routes import auth, clients, audits, tasks, documents
from app.routes import verification_items, brief_parsing, executives
from app.routes import request_list, tally_bridge
from app.routes import audit_trail, tally_hot_sync, bulk_upload, export, risk_summary
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(audits.router)
app.include_router(tasks.router)
app.include_router(documents.router)
app.include_router(verification_items.router, prefix="/api/v1")
app.include_router(brief_parsing.router, prefix="/api/v1")
app.include_router(request_list.router, prefix="/api/v1")
app.include_router(tally_bridge.router, prefix="/api/v1")
app.include_router(executives.router)

# Phase 2 feature routers
app.include_router(audit_trail.router, prefix="/api/v1")
app.include_router(tally_hot_sync.router, prefix="/api/v1")
app.include_router(bulk_upload.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(risk_summary.router, prefix="/api/v1")

def initialize_firebase():
    try:
        import firebase_admin
        from firebase_admin import credentials as firebase_creds

        if firebase_admin._apps:
            return  # Already initialized

        if settings.FIREBASE_SERVICE_ACCOUNT_KEY:
            import json
            try:
                key_data = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_KEY)
                cred = firebase_creds.Certificate(key_data)
            except (json.JSONDecodeError, ValueError):
                cred = firebase_creds.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_KEY)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized with service account credentials")
        elif settings.FIREBASE_PROJECT_ID:
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
            logger.info("Firebase initialized with project ID: %s", settings.FIREBASE_PROJECT_ID)
        else:
            firebase_admin.initialize_app()
            logger.warning("Firebase initialized without credentials (uses ADC)")
    except Exception as e:
        logger.error("Firebase initialization failed: %s", e)


@app.on_event("startup")
async def startup_event():
    initialize_firebase()
    init_db()

@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "CA Audit Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
