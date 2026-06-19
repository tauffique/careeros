"""
auth.py — Clerk JWT verification middleware.
Every protected endpoint calls get_current_user() as a dependency.
"""
import os
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient

CLERK_DOMAIN = os.environ.get('CLERK_DOMAIN', '')
# Production uses clerk.yourdomain.com, dev uses domain directly
if '.' in CLERK_DOMAIN and not CLERK_DOMAIN.startswith('clerk.'):
    CLERK_JWKS_URL = f"https://clerk.{CLERK_DOMAIN}/.well-known/jwks.json"
else:
    CLERK_JWKS_URL = f"https://{CLERK_DOMAIN}/.well-known/jwks.json"

bearer_scheme = HTTPBearer()
_jwks_client = None

def get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(CLERK_JWKS_URL)
    return _jwks_client

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    """
    Verify Clerk JWT and return clerk_id (sub claim).
    Use as FastAPI dependency: user_id = Depends(get_current_user)
    """
    token = credentials.credentials
    try:
        client = get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True},
        )
        clerk_id: str = payload.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
        return clerk_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")