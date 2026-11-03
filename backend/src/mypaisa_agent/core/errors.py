"""The errors the services raise. The api layer maps each to an HTTP problem (RFC 9457); nothing below the api
knows a status code."""


class MyPaisaError(Exception):
    """Base of every error MyPaisa raises on purpose. `code` is stable and safe to show a member."""

    code = "error"

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(MyPaisaError):
    code = "not_found"


class ConflictError(MyPaisaError):
    code = "conflict"


class ForbiddenError(MyPaisaError):
    code = "forbidden"


class UnavailableError(MyPaisaError):
    code = "unavailable"
