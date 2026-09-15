from pytm.pytm import TM, Server, Datastore, Dataflow, Boundary, Actor

# 1. Inicializa o Modelo
tm = TM("Modelo de Ameaças - Carteira Estudantil")
tm.description = "Modelagem de segurança do backend FastAPI e banco de dados"
tm.isOrdered = True

# 2. Define as Fronteiras de Rede (Boundaries)
internet = Boundary("Internet Pública")
rede_interna = Boundary("Rede Docker (Privada)")

# 3. Define os Elementos
estudante = Actor("Estudante (App/Web)", inBoundary=internet)

backend_api = Server("Backend FastAPI", inBoundary=rede_interna)
backend_api.isHardened = True # Supondo que você configurou segurança básica

banco_dados = Datastore("PostgreSQL", inBoundary=rede_interna)
banco_dados.isSQL = True
banco_dados.inScope = True

# 4. Define os Fluxos de Dados (O que conversa com o que)
Dataflow(estudante, backend_api, "Requisita dados da carteira (HTTPS)")
Dataflow(backend_api, banco_dados, "Consulta/Grava dados do estudante", protocol="TCP")
Dataflow(backend_api, estudante, "Retorna JSON com dados da carteira")

# 5. Processa tudo
tm.process()