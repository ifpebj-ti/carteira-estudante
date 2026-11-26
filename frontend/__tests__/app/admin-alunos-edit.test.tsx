import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ListaAlunosPage from "@/app/admin/alunos/page";
import EditStudentPage from "@/app/admin/editar/[id]/page";
import * as authService from "@/services/auth";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "20241EWBJ0099" }),
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("app/admin/alunos and app/admin/editar/[id]", () => {
  let performLogoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
    performLogoutSpy = vi
      .spyOn(authService, "performLogout")
      .mockImplementation(() => {});
  });

  it("filters ALUNO records and handles 401/403 in ListaAlunosPage", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            id: 1,
            matricula: "20241EWBJ0099",
            nome: "Maria Clara",
            cpf: "12345678901",
            tipo_vinculo: "ALUNO",
            curso: "ADS",
            status_matricula: "Ativo",
            status: true,
          },
          {
            id: 2,
            matricula: "SIAPE001",
            nome: "Prof. Carlos",
            cpf: "99999999999",
            tipo_vinculo: "PROFESSOR",
            status: true,
          },
        ]),
      })
    );

    const view = render(<ListaAlunosPage />);
    expect(await screen.findByText("Maria Clara")).toBeInTheDocument();
    expect(screen.queryByText("Prof. Carlos")).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Pesquisar por nome ou matrícula..."),
      "Inexistente"
    );
    expect(screen.getByText("Nenhum aluno encontrado.")).toBeInTheDocument();
    view.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );
    const view401 = render(<ListaAlunosPage />);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalledTimes(1);
    });
    view401.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 })
    );
    render(<ListaAlunosPage />);
    expect(
      await screen.findByText(
        "Permissão negada para consultar a listagem cadastral."
      )
    ).toBeInTheDocument();
  });

  it("loads student data, sends PATCH without read-only fields and formats validation errors", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          id: 1,
          matricula: "20241EWBJ0099",
          nome: "Maria Clara",
          cpf: "12345678901",
          tipo_vinculo: "ALUNO",
          curso: "ADS",
          email: "maria@discente.ifpe.edu.br",
          status: true,
          qr_code_hash: "hash",
          created_at: "2026-01-01",
          movimentacoes: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({
          detail: [{ msg: "Value error, CPF inválido." }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<EditStudentPage />);
    expect(await screen.findByDisplayValue("Maria Clara")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /salvar alterações/i });
    await user.click(saveBtn);

    expect(await screen.findByText("CPF inválido.")).toBeInTheDocument();

    await user.click(saveBtn);
    expect(await screen.findByText("Cadastro atualizado")).toBeInTheDocument();

    const patchBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(patchBody).not.toHaveProperty("id");
    expect(patchBody).not.toHaveProperty("matricula");
    expect(patchBody).not.toHaveProperty("qr_code_hash");
    expect(patchBody).not.toHaveProperty("created_at");
    expect(patchBody).not.toHaveProperty("movimentacoes");
  });
});
