from datetime import datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.aluno import Aluno
from app.models.enums import MovementType
from app.models.movimentacao import MovimentacaoPortaria
from app.services.movimentacao_service import (
    determine_next_movement_type,
    validate_student_status,
)


def test_validate_student_status_active():
    student = Aluno(status=True)
    validate_student_status(student)


def test_validate_student_status_inactive():
    student = Aluno(status=False)
    with pytest.raises(HTTPException) as exc_info:
        validate_student_status(student)
    assert exc_info.value.status_code == 403
    assert "inativa" in exc_info.value.detail


def test_determine_next_movement_type_first_access():
    db_mock = MagicMock()
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = None

    movement_type = determine_next_movement_type(1, db_mock)
    assert movement_type == MovementType.ENTRADA


def test_determine_next_movement_type_after_entry():
    db_mock = MagicMock()
    last_mov = MovimentacaoPortaria(tipo=MovementType.ENTRADA, data_hora=datetime.now())
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = last_mov

    movement_type = determine_next_movement_type(1, db_mock)
    assert movement_type == MovementType.SAIDA


def test_determine_next_movement_type_after_exit():
    db_mock = MagicMock()
    last_mov = MovimentacaoPortaria(tipo=MovementType.SAIDA, data_hora=datetime.now())
    mock_query = db_mock.query.return_value.filter.return_value.filter.return_value
    mock_query.order_by.return_value.first.return_value = last_mov

    movement_type = determine_next_movement_type(1, db_mock)
    assert movement_type == MovementType.ENTRADA
