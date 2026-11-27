import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

    // Abre e fecha o modal de QR ampliado (Escape, botão fechar e clique no overlay)
    fireEvent.click(screen.getByRole("button", { name: /ampliar qr$/i }));
    expect(
      screen.getByRole("dialog", { name: "QR Code Ampliado" })
    ).toBeInTheDocument();
    expect(screen.getByText("Apresente na Portaria")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "QR Code Ampliado" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ampliar QR Code para leitura" })
    );
    expect(
      screen.getByRole("dialog", { name: "QR Code Ampliado" })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Fechar QR Code ampliado" })
    );
    expect(
      screen.queryByRole("dialog", { name: "QR Code Ampliado" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ampliar qr$/i }));
    fireEvent.click(screen.getByRole("dialog", { name: "QR Code Ampliado" }));
    expect(
      screen.queryByRole("dialog", { name: "QR Code Ampliado" })
    ).not.toBeInTheDocument();

    // Atualização manual do histórico e token QR
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar acessos recentes" })
    );
    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-value",
        "dynamic-qr-token-2"
      );
    });
  });

  it("renders inactive status, non-ALUNO affiliation, empty movements, and QR fallbacks", async () => {
    const servidorComHash = {
      ...sampleAluno,
      tipo_vinculo: "PROFESSOR",
      curso: undefined,
      modalidade: undefined,
      cpf: undefined,
      email: undefined,
      foto_url: undefined,
      status: false,
      qr_token: undefined,
      qr_code_hash: "static-hash-fallback",
      qr_expires_in: undefined,
      movimentacoes: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(servidorComHash),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...servidorComHash,
          cpf: "12345",
          qr_code_hash: undefined,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MobileAlunoPage />);

    expect(await screen.findByText("Inativa")).toBeInTheDocument();
    expect(screen.getAllByText("Professor(a)").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText("IFPE Belo Jardim")).toBeInTheDocument();
    expect(screen.getByText("Identificação")).toBeInTheDocument();
    expect(screen.getByText("Categoria")).toBeInTheDocument();
    expect(screen.getByText("Nenhum acesso registrado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar foto/i })).toBeVisible();
    expect(screen.getByTestId("qr-code")).toHaveAttribute(
      "data-value",
      "static-hash-fallback"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar acessos recentes" })
    );
    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toHaveAttribute(
        "data-value",
        sampleAluno.matricula
      );
    });
    expect(screen.getByText("12345")).toBeInTheDocument();
  });

  it("periodically refreshes dynamic QR token based on qr_expires_in", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sampleAluno,
          qr_token: "token-inicial",
          qr_expires_in: 60,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          ...sampleAluno,
          qr_token: "token-renovado",
          qr_expires_in: 60,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MobileAlunoPage />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("qr-code")).toHaveAttribute(
      "data-value",
      "token-inicial"
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("qr-code")).toHaveAttribute(
      "data-value",
      "token-renovado"
    );
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

  it("triggers file picker from both wallet card and Meus Dados, supports swap/Escape and FileReader error", async () => {
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
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
    const clickSpy = vi.spyOn(fileInput, "click");

    fireEvent.click(
      screen.getByRole("button", { name: "Enviar ou alterar foto do aluno" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Alterar Foto" }));
    expect(clickSpy).toHaveBeenCalledTimes(2);

    const pngFile = new File(["png-bytes"], "perfil.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });
    expect(
      await screen.findByRole("dialog", {
        name: "Enviar Foto de Identificação",
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/perfil\.png/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Escolher outra" }));
    expect(clickSpy).toHaveBeenCalledTimes(3);

    const webpFile = new File(["webp-bytes"], "nova.webp", {
      type: "image/webp",
    });
    fireEvent.change(fileInput, { target: { files: [webpFile] } });
    expect(await screen.findByText(/nova\.webp/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Enviar Foto de Identificação" })
    ).not.toBeInTheDocument();

    class FailingFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal(
      "FileReader",
      FailingFileReader as unknown as typeof FileReader
    );
    fireEvent.change(fileInput, { target: { files: [pngFile] } });
    expect(
      await screen.findByText(
        "Não foi possível processar a prévia da imagem selecionada."
      )
    ).toBeInTheDocument();
  });

  it("previews valid photo, uploads FormData to API, shows loading state and refreshes profile on 202", async () => {
    vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
    let resolveUpload!: (value: unknown) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(sampleAluno),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
      )
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
    expect(screen.getByText(/selfie\.jpg/i)).toBeInTheDocument();
    expect(screen.getByAltText("Prévia da foto selecionada")).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,ZmFrZQ=="
    );

    vi.useFakeTimers();
    fireEvent.click(
      screen.getByRole("button", { name: /confirmar e enviar/i })
    );

    expect(
      screen.getByRole("button", { name: /enviando foto\.\.\./i })
    ).toBeDisabled();

    await act(async () => {
      resolveUpload({
        ok: true,
        status: 202,
        json: vi.fn().mockResolvedValue({
          message: "Photo upload received and processing started in background",
        }),
      });
      await Promise.resolve();
    });

    expect(
      screen.getByText("Foto enviada com sucesso! Atualizando carteira...")
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: sampleAluno.nome })).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,ZmFrZQ=="
    );

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(
      screen.queryByRole("dialog", { name: "Enviar Foto de Identificação" })
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("clears pending upload refresh timer on unmount", async () => {
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
        json: vi.fn().mockResolvedValue({ message: "ok" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(<MobileAlunoPage />);
    await screen.findByText("MARIA CLARA SANTOS");

    const fileInput = screen.getByLabelText(
      "Selecionar foto de perfil"
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["jpg-bytes"], "selfie.jpg", { type: "image/jpeg" })],
      },
    });
    await screen.findByRole("dialog", { name: "Enviar Foto de Identificação" });

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /confirmar e enviar/i })
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles 400 string/array detail, 403, 413, network error and 401 during photo upload", async () => {
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
          .mockResolvedValue({ detail: "Assinatura de arquivo inválida." }),
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
      .mockRejectedValueOnce(new Error("Falha de conexão no upload"))
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
    expect(
      await screen.findByText("Assinatura de arquivo inválida.")
    ).toBeInTheDocument();

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
    expect(
      await screen.findByText("Falha de conexão no upload")
    ).toBeInTheDocument();

    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(performLogoutSpy).toHaveBeenCalled();
    });
  });
});
