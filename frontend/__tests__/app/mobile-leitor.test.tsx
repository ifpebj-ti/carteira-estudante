import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QrScannerPage from "@/app/mobile/leitor/page";
import * as authService from "@/services/auth";

let capturedOnScan: ((codes: Array<{ rawValue: string }>) => void) | null =
  null;
let capturedOnError: ((err: unknown) => void) | null = null;

vi.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({
    onScan,
    onError,
  }: {
    onScan: (codes: Array<{ rawValue: string }>) => void;
    onError: (err: unknown) => void;
  }) => {
    capturedOnScan = onScan;
    capturedOnError = onError;
    return <div data-testid="qr-scanner" />;
  },
  outline: vi.fn(),
  prepareZXingModule: vi.fn(),
  useDevices: () => [{ deviceId: "cam-1", label: "Câmera Principal" }],
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe("app/mobile/leitor/page (Sessão de Portaria, Scan e Erros)", () => {
  let performLogoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedOnScan = null;
    capturedOnError = null;
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
    performLogoutSpy = vi
      .spyOn(authService, "performLogout")
      .mockImplementation(() => {});
  });

  it("triggers logout on 401 and displays session mismatch overlay on 403", async () => {
    const fetch401 = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ detail: "Não autenticado" }),
    });
    vi.stubGlobal("fetch", fetch401);

    const view401 = render(<QrScannerPage />);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalledTimes(1);
    });
    view401.unmount();

    const fetch403 = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({
        detail: "Acesso negado: privilégios insuficientes",
      }),
    });
    vi.stubGlobal("fetch", fetch403);

    render(<QrScannerPage />);
    expect(
      await screen.findByText("Sessão de portaria inativa")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Entrar como Porteiro" })
    ).toBeInTheDocument();
  });

  it("validates scanned QR code and loads movement history tab", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 1, perfil: "PORTEIRO" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          status: true,
          student_name: "João Silva",
          student_photo_url: "/static/photos/joao.jpg",
          student_tipo_vinculo: "ALUNO",
          movement_type: "ENTRADA",
          local_acesso: "PORTARIA",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([
          {
            id: 9,
            pessoa_id: 1,
            pessoa_nome: "João Silva",
            pessoa_tipo_vinculo: "ALUNO",
            tipo: "ENTRADA",
            local_acesso: "PORTARIA",
            data_hora: "2026-11-26T08:30:00Z",
          },
        ]),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<QrScannerPage />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.ifpe.edu.br/api/v1/auth/me",
        expect.objectContaining({ credentials: "include" })
      );
    });

    capturedOnScan?.([{ rawValue: "signed-qr-token" }]);

    expect(await screen.findByText("Acesso Permitido!")).toBeInTheDocument();
    expect(
      screen.getByText("João Silva - Entrada • Portaria")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /histórico/i }));
    expect(await screen.findByText("João Silva")).toBeInTheDocument();
  });

  it("displays friendly camera permission error when scanner fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 1, perfil: "PORTEIRO" }),
      })
    );

    render(<QrScannerPage />);
    await waitFor(() => {
      expect(capturedOnError).not.toBeNull();
    });

    capturedOnError?.({ kind: "permission-denied", message: "Denied" });

    expect(
      await screen.findByText("Permissão da câmera bloqueada")
    ).toBeInTheDocument();
  });
});
