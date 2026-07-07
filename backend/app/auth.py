"""Authentication module: bcrypt passwords + TOTP 2FA + JWT sessions.

Flow
----
1. Admin hits POST /admin/auth/setup  (first time only)
   - Generates a TOTP secret, returns QR code URI to scan in Authenticator app.
   - Prints the hashed password to copy into .env.

2. Admin hits POST /admin/auth/login  with username + password
   - Verifies bcrypt hash.
   - Returns a short-lived "pre-auth" token (no admin access yet).

3. Admin hits POST /admin/auth/verify-2fa  with pre-auth token + TOTP code
   - Verifies the 6-digit TOTP code against the server secret.
   - Returns a full JWT session token (valid for jwt_expire_minutes).

4. Every /admin/* endpoint calls Depends(require_admin)
   - Decodes + validates the JWT.
   - Raises 401 if missing, expired, or invalid.

Security properties
-------------------
- Passwords are bcrypt-hashed with cost factor 12 (configurable).
- TOTP uses RFC 6238 (30-second window, SHA-1, 6 digits) -- Google Authenticator compatible.
- JWTs are signed with HS256 and carry an expiry claim.
- Pre-auth tokens are separate short-lived tokens (5 min) so a stolen password alone
  cannot access the admin panel without the TOTP device.
- All tokens are stateless (no session DB needed).
"""
from __future__ import annotations

import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import pyotp
import qrcode
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from .config import settings

# Cost factor for bcrypt (12 is the OWASP recommended minimum).
_BCRYPT_ROUNDS = 12

# Token types embedded in the JWT "type" claim.
_TYPE_PREAUTH = "preauth"     # after password check, before 2FA
_TYPE_SESSION = "session"     # full admin session after 2FA

bearer_scheme = HTTPBearer(auto_error=False)


# ── Password helpers ───────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash string suitable for storing in .env."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── TOTP helpers ───────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a new random base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, username: str) -> str:
    """Return the otpauth:// URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name="SkillWeave Admin")


def totp_qr_base64(secret: str, username: str) -> str:
    """Return a base64-encoded PNG QR code the frontend can render as <img>."""
    uri = get_totp_uri(secret, username)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def verify_totp(code: str, secret: str | None = None) -> bool:
    if not secret:
        secret = settings.admin_totp_secret
    if not secret:
        return False
    totp = pyotp.TOTP(secret)
    # valid_window=1 accepts the previous and next 30-second window (clock skew)
    return totp.verify(code.strip(), valid_window=1)


# ── JWT helpers ────────────────────────────────────────────────────────────

def _make_token(token_type: str, extra_minutes: int, extra: dict | None = None) -> str:
    payload = {
        "sub": settings.admin_username,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=extra_minutes),
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def make_preauth_token() -> str:
    """Short-lived token issued after password check (before 2FA)."""
    return _make_token(_TYPE_PREAUTH, extra_minutes=5)


def make_session_token() -> str:
    """Full session token issued after successful 2FA."""
    return _make_token(_TYPE_SESSION, extra_minutes=settings.jwt_expire_minutes)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependency ─────────────────────────────────────────────────────

def require_admin(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    """Dependency: validates a full session JWT on every admin endpoint."""
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = _decode_token(creds.credentials)
    if payload.get("type") != _TYPE_SESSION:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Full session token required. Please complete 2FA.",
        )
    return payload


def require_preauth(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    """Dependency: validates a pre-auth token (used only at the 2FA step)."""
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pre-auth token required.")
    payload = _decode_token(creds.credentials)
    if payload.get("type") != _TYPE_PREAUTH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Pre-auth token required.")
    return payload