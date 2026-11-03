import pytest
from pydantic import ValidationError

from mypaisa_agent import __version__
from mypaisa_agent.core.config import Settings, get_settings


def test_defaults_are_local_and_the_package_version(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MYPAISA_ENVIRONMENT", raising=False)
    settings = Settings()
    assert settings.environment == "local"
    assert settings.version == __version__


def test_read_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MYPAISA_ENVIRONMENT", "dev")
    assert Settings().environment == "dev"


def test_an_unknown_environment_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MYPAISA_ENVIRONMENT", "staging")
    with pytest.raises(ValidationError):
        Settings()


def test_settings_are_read_once() -> None:
    get_settings.cache_clear()
    assert get_settings() is get_settings()
