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


@pytest.mark.parametrize("allowed_env", ["development", "test"])
def test_seed_populates_database_when_environment_is_allowed(
    monkeypatch: pytest.MonkeyPatch,
    allowed_env: str,
) -> None:
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = None
    mock_session.query.return_value.count.return_value = 10

    mock_session_factory = MagicMock(return_value=mock_session)
    monkeypatch.setattr(seed_db, "SessionLocal", mock_session_factory)
    monkeypatch.setattr(seed_db, "get_password_hash", lambda _pwd: "mocked_hash")
    monkeypatch.setenv("ENVIRONMENT", allowed_env)

    seed_db.seed()

    mock_session_factory.assert_called_once_with()
    assert mock_session.add.called
    assert mock_session.commit.called
    mock_session.close.assert_called_once_with()
