import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

describe("app/page (LoginPage)", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
  });

  it("submits credentials with cookies and redirects according to account role", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          account_type: "pessoa",
          role: "ALUNO",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          account_type: "operador",
          role: "ADMIN",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          account_type: "operador",
          role: "PORTEIRO",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);

    const googleLink = screen.getByRole("link", { name: /entrar com google/i });
    expect(googleLink).toHaveAttribute(
      "href",
      "https://api.ifpe.edu.br/api/v1/auth/login/google"
    );

    const loginInput = screen.getByLabelText(/matrícula, e-mail ou login/i);
    const passwordInput = screen.getByLabelText("Senha");
    const submitBtn = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });

    await user.type(loginInput, "20241EWBJ0001");
    await user.type(passwordInput, "Senha@123");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/mobile/aluno");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ifpe.edu.br/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ login: "20241EWBJ0001", senha: "Senha@123" }),
      })
    );

    await user.click(submitBtn);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin");
    });

    await user.click(submitBtn);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/mobile/leitor");
    });
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText("Senha");
    expect(passwordInput).toHaveAttribute("type", "password");

    const formButtons = screen.getAllByRole("button");
    const toggleBtn = formButtons.find(
      (btn) => btn.getAttribute("type") === "button"
    )!;
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("displays loading state and disables inputs while authenticating", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);

    const loginInput = screen.getByLabelText(/matrícula, e-mail ou login/i);
    const passwordInput = screen.getByLabelText("Senha");

    await user.type(loginInput, "20241EWBJ0001");
    await user.type(passwordInput, "Senha@123");
    await user.click(
      screen.getByRole("button", { name: /entrar no sistema/i })
    );

    const loadingBtn = await screen.findByRole("button", {
      name: /conectando\.\.\./i,
    });
    expect(loadingBtn).toBeDisabled();
    expect(loginInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();

    resolveFetch({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        account_type: "pessoa",
        role: "ALUNO",
      }),
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/mobile/aluno");
    });
  });

  it("handles 401, 403, 500, network failure and unrecognized role errors", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          account_type: "desconhecido",
          role: "VISITANTE",
        }),
      })
      .mockRejectedValueOnce(new Error("Falha de rede"));
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);

    await user.type(
      screen.getByLabelText(/matrícula, e-mail ou login/i),
      "20241EWBJ0001"
    );
    await user.type(screen.getByLabelText("Senha"), "errada");
    const submitBtn = screen.getByRole("button", {
      name: /entrar no sistema/i,
    });

    await user.click(submitBtn);
    expect(
      await screen.findByText("Login ou senha incorretos.")
    ).toBeInTheDocument();

    await user.click(submitBtn);
    expect(
      await screen.findByText("Esta conta está desativada.")
    ).toBeInTheDocument();

    await user.click(submitBtn);
    expect(
      await screen.findByText("Erro ao conectar com o servidor.")
    ).toBeInTheDocument();

    await user.click(submitBtn);
    expect(
      await screen.findByText(
        "Tipo de conta ou perfil não reconhecido pelo sistema."
      )
    ).toBeInTheDocument();

    await user.click(submitBtn);
    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
