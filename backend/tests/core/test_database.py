from unittest.mock import MagicMock

import pytest

from app.core import database


def test_get_db_yields_session_and_closes_on_completion(monkeypatch):
    mock_session = MagicMock()
    monkeypatch.setattr(database, "SessionLocal", lambda: mock_session)

    db_generator = database.get_db()
    yielded_session = next(db_generator)
    assert yielded_session is mock_session
    mock_session.close.assert_not_called()

    with pytest.raises(StopIteration):
        next(db_generator)

    mock_session.close.assert_called_once()


def test_get_db_closes_session_when_consumer_raises_exception(monkeypatch):
    mock_session = MagicMock()
    monkeypatch.setattr(database, "SessionLocal", lambda: mock_session)

    db_generator = database.get_db()
    assert next(db_generator) is mock_session

    with pytest.raises(RuntimeError, match="Simulated DB consumer error"):
        db_generator.throw(RuntimeError("Simulated DB consumer error"))

    mock_session.close.assert_called_once()
