import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileAlunoPage from "@/app/mobile/aluno/page";
import * as authService from "@/services/auth";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    className,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} className={className} />
  ),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, size }: { value: string; size?: number }) => (
    <svg data-testid="qr-code" data-value={value} data-size={size} />
  ),
}));

const sampleAluno = {
  id: 17,
  matricula: "20241EWBJ0099",
  nome: "Maria Clara Santos",
  cpf: "12345678901",
  tipo_vinculo: "ALUNO",
  curso: "Engenharia de Software",
  modalidade: "Presencial",
  email: "maria.clara@discente.ifpe.edu.br",
  foto_url: "/static/photos/maria.jpg",
  status: true,
  qr_token: "dynamic-qr-token-1",
  qr_expires_in: 180,
  movimentacoes: [
    {
      id: 1,
      tipo: "ENTRADA",
      local_acesso: "PORTARIA",
      data_hora: "2026-11-26T08:30:00Z",
    },
    {
      id: 2,
      tipo: "SAIDA",
      local_acesso: "PORTARIA",
      data_hora: "2026-11-26T12:15:00Z",
    },
  ],
};

class MockFileReader {
  result: string | ArrayBuffer | null = "data:image/jpeg;base64,ZmFrZQ==";
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL() {
    if (this.onload) {
      this.onload({
        target: this,
      } as unknown as ProgressEvent<FileReader>);
    }
  }
}

describe("app/mobile/aluno/page (Carteira Digital e Upload)", () => {
  let performLogoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
    performLogoutSpy = vi
      .spyOn(authService, "performLogout")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("loads and renders wallet credentials, formatted CPF, QR code, movements and expanded QR modal", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(sampleAluno),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sampleAluno,
          qr_token: "dynamic-qr-token-2",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MobileAlunoPage />);

    expect(screen.getByText("Carregando credenciais...")).toBeInTheDocument();

    expect(await screen.findByText("MARIA CLARA SANTOS")).toBeInTheDocument();
    expect(screen.getByText("Estudante")).toBeInTheDocument();
    expect(screen.getByText("Engenharia de Software")).toBeInTheDocument();
    expect(screen.getByText("123.456.789-01")).toBeInTheDocument();
    expect(
      screen.getByText("maria.clara@discente.ifpe.edu.br")
    ).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Entrada")).toBeInTheDocument();
    expect(screen.getByText("Saída")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ifpe.edu.br/api/v1/auth/pessoa/me",
      expect.objectContaining({ credentials: "include" })
    );

    const qr = screen.getByTestId("qr-code");
    expect(qr).toHaveAttribute("data-value", "dynamic-qr-token-1");

    // Abre e fecha o modal de QR ampliado
    await user.click(screen.getByRole("button", { name: /ampliar qr$/i }));
    expect(
      screen.getByRole("dialog", { name: "QR Code Ampliado" })
    ).toBeInTheDocument();
    expect(screen.getByText("Apresente na Portaria")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "QR Code Ampliado" })
    ).not.toBeInTheDocument();

    // Atualização manual do histórico e token QR
    await user.click(
      screen.getByRole("button", { name: "Atualizar acessos recentes" })
    );
    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-value",
        "dynamic-qr-token-2"
      );
    });
  });

  it("handles 401, 403 and network errors when loading wallet profile", async () => {
    const fetch401 = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("fetch", fetch401);

    const { unmount } = render(<MobileAlunoPage />);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalledTimes(1);
    });
    unmount();

    const fetch403 = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    });
    vi.stubGlobal("fetch", fetch403);

    const view403 = render(<MobileAlunoPage />);
    expect(await screen.findByText("Erro de Acesso")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Esta carteira digital está desativada ou sem permissão."
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao Login" }));
    expect(performLogoutSpy).toHaveBeenCalledTimes(2);
    view403.unmount();

    const fetchNetError = vi
      .fn()
      .mockRejectedValue(new Error("Servidor indisponível"));
    vi.stubGlobal("fetch", fetchNetError);

    render(<MobileAlunoPage />);
    expect(await screen.findByText("Erro de Acesso")).toBeInTheDocument();
    expect(screen.getByText("Servidor indisponível")).toBeInTheDocument();
  });

  it("validates photo extension/mime, empty files and 5MB limit before upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(sampleAluno),
      })
    );

    render(<MobileAlunoPage />);
    await screen.findByText("MARIA CLARA SANTOS");

    const fileInput = screen.getByLabelText(
      "Selecionar foto de perfil"
    ) as HTMLInputElement;

    // Formato inválido
    const pdfFile = new File(["%PDF"], "documento.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(
      await screen.findByText(
        "Formato inválido. Use imagens nos formatos JPG, PNG ou WEBP."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar e enviar/i })
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Fechar janela de envio de foto" })
    );

    // Arquivo vazio
    const emptyFile = new File([], "vazio.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });
    expect(
      await screen.findByText("O arquivo selecionado está vazio.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Arquivo maior que 5 MB
    const bigFile = new File(["x"], "grande.jpg", { type: "image/jpeg" });
    Object.defineProperty(bigFile, "size", { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });
    expect(
      await screen.findByText(
        "A imagem excede o tamanho máximo permitido de 5 MB."
      )
    ).toBeInTheDocument();
  });

  it("previews valid photo, uploads FormData to API and refreshes profile on 202", async () => {
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(sampleAluno),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: vi.fn().mockResolvedValue({
          message: "Photo upload received and processing started in background",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sampleAluno,
          foto_url: "/static/photos/nova.jpg",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MobileAlunoPage />);
    await screen.findByText("MARIA CLARA SANTOS");

    const fileInput = screen.getByLabelText(
      "Selecionar foto de perfil"
    ) as HTMLInputElement;
    const validImage = new File(["jpg-bytes"], "selfie.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(fileInput, { target: { files: [validImage] } });

    expect(
      await screen.findByRole("dialog", {
        name: "Enviar Foto de Identificação",
      })
    ).toBeInTheDocument();
    expect(screen.getByAltText("Prévia da foto selecionada")).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,ZmFrZQ=="
    );

    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: /confirmar e enviar/i })
    );

    await vi.waitFor(() => {
      expect(
        screen.getByText("Foto enviada com sucesso! Atualizando carteira...")
      ).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.ifpe.edu.br/api/v1/pessoas/17/photo",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: expect.any(FormData),
      })
    );
    const uploadCallBody = fetchMock.mock.calls[1][1].body as FormData;
    expect(uploadCallBody.get("file")).toBe(validImage);

    await vi.advanceTimersByTimeAsync(1500);
    expect(
      screen.queryByRole("dialog", { name: "Enviar Foto de Identificação" })
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("handles 400 array detail, 403, 413 and 401 errors during photo upload", async () => {
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(sampleAluno),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi
          .fn()
          .mockResolvedValue({ detail: [{ msg: "Imagem corrompida" }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: vi.fn().mockRejectedValue(new Error("no json")),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: vi.fn().mockRejectedValue(new Error("no json")),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MobileAlunoPage />);
    await screen.findByText("MARIA CLARA SANTOS");

    const fileInput = screen.getByLabelText(
      "Selecionar foto de perfil"
    ) as HTMLInputElement;
    const validImage = new File(["jpg-bytes"], "selfie.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(fileInput, { target: { files: [validImage] } });
    const sendBtn = await screen.findByRole("button", {
      name: /confirmar e enviar/i,
    });

    fireEvent.click(sendBtn);
    expect(await screen.findByText("Imagem corrompida")).toBeInTheDocument();

    fireEvent.click(sendBtn);
    expect(
      await screen.findByText(
        "Acesso negado: sem permissão para atualizar a foto."
      )
    ).toBeInTheDocument();

    fireEvent.click(sendBtn);
    expect(
      await screen.findByText(
        "Arquivo excede o limite máximo permitido de 5 MB."
      )
    ).toBeInTheDocument();

    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalled();
    });
  });
});
