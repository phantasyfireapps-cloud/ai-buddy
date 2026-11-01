import time

import jwt
import pytest
from fastapi.testclient import TestClient

SECRET = "test-secret-with-at-least-32-characters!!"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:54321")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    from app.config import get_settings

    get_settings.cache_clear()
    from app.main import app

    return TestClient(app)


def token(**overrides):
    claims = {"sub": "11111111-1111-1111-1111-111111111111", "email": "a@b.co", "role": "authenticated", "aud": "authenticated", "exp": int(time.time()) + 60}
    claims.update(overrides)
    return jwt.encode(claims, SECRET, algorithm="HS256")


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_me_requires_token(client):
    assert client.get("/v1/me").status_code == 401


def test_me_accepts_valid_token(client):
    r = client.get("/v1/me", headers={"Authorization": f"Bearer {token()}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.co"


@pytest.mark.parametrize(
    "overrides,code",
    [({"exp": int(time.time()) - 10}, 401), ({"aud": "other"}, 401), ({"role": "anon"}, 403)],
)
def test_me_rejects_bad_tokens(client, overrides, code):
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {token(**overrides)}"}).status_code == code


def test_me_rejects_wrong_signature(client):
    bad = jwt.encode({"sub": "x", "role": "authenticated", "aud": "authenticated", "exp": int(time.time()) + 60}, "another-secret-that-is-long-enough-123", algorithm="HS256")
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {bad}"}).status_code == 401
