from fastapi import status


def test_get_aluno_by_matricula_not_found(client):
    response = client.get("/api/v1/alunos/123456789")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response.json()["detail"] == "Aluno não encontrado"


def test_get_aluno_by_matricula_success(client, db_session):
    # This test would require a fixture that creates an 'aluno'
    # and a 'movimentacao' in the test database.
    # We will implement this as soon as we have factories or fixtures.
    pass
