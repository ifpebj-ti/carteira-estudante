import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlunoDetailsPage from "@/app/admin/aluno/[id]/page";
import * as authService from "@/services/auth";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "20241EWBJ0099" }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="admin-qr-code" data-value={value} />
  ),
}));

describe("app/admin/aluno/[id]/page", () => {
  let performLogoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
    performLogoutSpy = vi
      .spyOn(authService, "performLogout")
      .mockImplementation(() => {});
  });

  it("renders student details and resolved photo from backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          id: 1,
          matricula: "20241EWBJ0099",
          nome: "Maria Clara",
          cpf: "12345678901",
          curso: "Engenharia de Software",
          foto_url: "/static/photos/maria.jpg",
          status: true,
          movimentacoes: [],
        }),
      })
    );

    render(<AlunoDetailsPage />);

    expect(await screen.findByText("Maria Clara")).toBeInTheDocument();
    const images = screen.getAllByRole("img", { name: "Maria Clara" });
    expect(images[0]).toHaveAttribute(
      "src",
      "https://api.ifpe.edu.br/static/photos/maria.jpg"
    );
  });

  it("calls performLogout on 401 and shows error screen on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      })
    );

    const view401 = render(<AlunoDetailsPage />);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalledTimes(1);
    });
    view401.unmount();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      })
    );

    render(<AlunoDetailsPage />);
    expect(
      await screen.findByText("Erro ao carregar perfil")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Erro na requisição ao backend: status 403")
    ).toBeInTheDocument();
  });
});
