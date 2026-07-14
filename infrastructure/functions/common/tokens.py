import base64
import hashlib
import hmac
import secrets


def subscriber_id(email: str, pepper: str) -> str:
    return hmac.new(pepper.encode("utf-8"), email.encode("utf-8"), hashlib.sha256).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def unsubscribe_token(record_id: str, pepper: str, nonce: str) -> str:
    digest = hmac.new(
        pepper.encode("utf-8"),
        f"unsubscribe:{record_id}:{nonce}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def same_hash(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)
