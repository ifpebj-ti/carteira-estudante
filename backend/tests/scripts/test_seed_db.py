from unittest.mock import MagicMock

import pytest

from scripts import seed_db


@pytest.mark.parametrize(
    "blocked_env",
    [
        "production",
        "prod",
        "PRODUCTION",
        "  Prod  ",
        "  PRODUCTION\n",
    ],
)
def test_seed_raises_runtime_error_when_environment_is_production(
    monkeypatch: pytest.MonkeyPatch,
    blocked_env: str,
) -> None:
    mock_session_factory = MagicMock()
    monkeypatch.setattr(seed_db, "SessionLocal", mock_session_factory)
    monkeypatch.setenv("ENVIRONMENT", blocked_env)

    with pytest.raises(RuntimeError, match="Database seed is blocked"):
        seed_db.seed()

    mock_session_factory.assert_not_called()


@pytest.mark.parametrize(
    "unknown_env",
    [
        "staging",
        "homolog",
        "qa",
        "",
        "   ",
    ],
)
def test_seed_raises_runtime_error_when_environment_is_unrecognized(
    monkeypatch: pytest.MonkeyPatch,
    unknown_env: str,
) -> None:
    mock_session_factory = MagicMock()
    monkeypatch.setattr(seed_db, "SessionLocal", mock_session_factory)
    monkeypatch.setenv("ENVIRONMENT", unknown_env)

    with pytest.raises(RuntimeError, match="Database seed is blocked"):
        seed_db.seed()

    mock_session_factory.assert_not_called()


def test_ensure_non_production_environment_raises_runtime_error_when_settings_is_prod(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setattr(seed_db.settings, "ENVIRONMENT", "  Production ")

    with pytest.raises(RuntimeError, match="Database seed is blocked"):
        seed_db.ensure_non_production_environment()


@pytest.mark.parametrize(
    ("allowed_env", "expected_normalized"),
    [
        ("development", "development"),
        ("  DEV  ", "dev"),
        ("Local", "local"),
        ("test", "test"),
        (" TESTING ", "testing"),
    ],
)
def test_ensure_non_production_environment_returns_value_when_environment_is_allowed(
    monkeypatch: pytest.MonkeyPatch,
    allowed_env: str,
    expected_normalized: str,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", allowed_env)

    result = seed_db.ensure_non_production_environment()

    assert result == expected_normalized


def test_resolve_seed_password_returns_configured_value_when_env_is_set(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    mock_token = MagicMock()
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("SEED_DEFAULT_PASSWORD", "  CustomLocalSeed#2026  ")
    monkeypatch.setattr(seed_db.secrets, "token_urlsafe", mock_token)

    resolved = seed_db.resolve_seed_password()

    assert resolved == "CustomLocalSeed#2026"
    mock_token.assert_not_called()
    assert "[WARNING]" not in capsys.readouterr().out


@pytest.mark.parametrize("empty_value", [None, "", "   "])
def test_resolve_seed_password_generates_random_token_when_env_is_unset_or_blank(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    empty_value: str | None,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setattr(seed_db.settings, "SEED_DEFAULT_PASSWORD", None)
    if empty_value is None:
        monkeypatch.delenv("SEED_DEFAULT_PASSWORD", raising=False)
    else:
        monkeypatch.setenv("SEED_DEFAULT_PASSWORD", empty_value)

    generated_first = seed_db.resolve_seed_password()
    warning_output = capsys.readouterr().out
    generated_second = seed_db.resolve_seed_password()

    assert len(generated_first) >= 20
    assert generated_first != generated_second
    assert "SEED_DEFAULT_PASSWORD is not set" in warning_output


def test_resolve_seed_password_raises_runtime_error_when_environment_is_production(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("SEED_DEFAULT_PASSWORD", raising=False)

    with pytest.raises(RuntimeError, match="Database seed is blocked"):
        seed_db.resolve_seed_password()

    assert capsys.readouterr().out == ""


@pytest.mark.parametrize("allowed_env", ["development", "test"])
def test_seed_hashes_configured_env_password_when_environment_is_allowed(
    monkeypatch: pytest.MonkeyPatch,
    allowed_env: str,
) -> None:
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None
    mock_session.query.return_value.count.return_value = 10
    hashed_inputs: list[str] = []

    def _capture_hash(raw_value: str) -> str:
        hashed_inputs.append(raw_value)
        return "mocked_hash"

    mock_session_factory = MagicMock(return_value=mock_session)
    monkeypatch.setattr(seed_db, "SessionLocal", mock_session_factory)
    monkeypatch.setattr(seed_db, "get_password_hash", _capture_hash)
    monkeypatch.setenv("ENVIRONMENT", allowed_env)
    monkeypatch.setenv("SEED_DEFAULT_PASSWORD", "EnvProvidedSeedSecret!1")

    seed_db.seed()

    assert hashed_inputs == ["EnvProvidedSeedSecret!1"]
    mock_session_factory.assert_called_once_with()
    assert mock_session.add.called
    assert mock_session.commit.called
    mock_session.close.assert_called_once_with()


def test_seed_hashes_generated_random_password_when_env_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None
    mock_session.query.return_value.count.return_value = 10
    hashed_inputs: list[str] = []

    monkeypatch.setattr(seed_db, "SessionLocal", MagicMock(return_value=mock_session))
    monkeypatch.setattr(
        seed_db,
        "get_password_hash",
        lambda raw_value: hashed_inputs.append(raw_value) or "mocked_hash",
    )
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("SEED_DEFAULT_PASSWORD", raising=False)
    monkeypatch.setattr(seed_db.settings, "SEED_DEFAULT_PASSWORD", None)
    monkeypatch.setattr(
        seed_db.secrets, "token_urlsafe", lambda nbytes: f"random_tok_{nbytes}"
    )

    seed_db.seed()

    assert hashed_inputs == ["random_tok_16"]
