"""AI Buddy API.

Phase 1 keeps this deliberately small: accounts and Buddy profiles are read and written directly from the
app through Supabase with row-level security. This service is the home for server-side features in
later phases (AI conversations, memory approval, proactive behaviour) and already verifies user tokens.
"""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import CurrentUser, current_user
from .config import get_settings

app = FastAPI(title="AI Buddy API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": app.version}


@app.get("/v1/me")
def me(user: CurrentUser = Depends(current_user)) -> dict:
    return {"id": user.id, "email": user.email}
