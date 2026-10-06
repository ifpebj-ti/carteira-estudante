from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.enums import SentidoMovimentacao
from app.models.movimentacao import Movimentacao
from app.models.pessoa import Pessoa
from app.services.movimentacao_service import (
    determine_next_movement_type,
    validate_student_status,
)


def test_validate_student_status_active():
    student = Pessoa(status=True)
    validate_student_status(student)


def test_validate_student_status_inactive():
    student = Pessoa(status=False)
    with pytest.raises(HTTPException) as exc_info:
        validate_student_status(student)
    assert exc_info.value.status_code == 403
    assert "inativa" in exc_info.value.detail


def test_determine_next_movement_type_first_access_externo():
    db_mock = MagicMock()
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = None

    student = Pessoa(id=1, is_interno=False)
    movement_type = determine_next_movement_type(student, db_mock)
    assert movement_type == SentidoMovimentacao.ENTRADA


def test_determine_next_movement_type_first_access_interno():
    db_mock = MagicMock()
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = None

    student = Pessoa(id=1, is_interno=True)
    movement_type = determine_next_movement_type(student, db_mock)
    assert movement_type == SentidoMovimentacao.SAIDA


def test_determine_next_movement_type_after_entry():
    db_mock = MagicMock()
    last_mov = Movimentacao(tipo=SentidoMovimentacao.ENTRADA, data_hora=datetime.now())
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = last_mov

    student = Pessoa(id=1, is_interno=False)
    movement_type = determine_next_movement_type(student, db_mock)
    assert movement_type == SentidoMovimentacao.SAIDA


def test_determine_next_movement_type_after_exit():
    db_mock = MagicMock()
    last_mov = Movimentacao(tipo=SentidoMovimentacao.SAIDA, data_hora=datetime.now())
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = last_mov

    student = Pessoa(id=1, is_interno=False)
    movement_type = determine_next_movement_type(student, db_mock)
    assert movement_type == SentidoMovimentacao.ENTRADA
