import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/ui/ProtectedRoute";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AuthHarness() {
  const { user, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user-role">{user?.role ?? "anon"}</span>
      <button
        type="button"
        onClick={() => void login("admin@ifpe.edu.br", "Mudar@123")}
      >
        Entrar
      </button>
      <button type="button" onClick={logout}>
        Sair
      </button>
      <ProtectedRoute
        allowedRoles={["Administrador"]}
        fallback={<span>Acesso Restrito</span>}
      >
        <span>Painel Admin</span>
      </ProtectedRoute>
    </div>
  );
}

describe("ProtectedRoute & useAuth", () => {
  it("throws when useAuth is used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BrokenConsumer() {
      useAuth();
      return null;
    }

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
    spy.mockRestore();
  });

  it("controls protected UI visibility across login and logout", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          token: "cookie-based",
          user: {
            id: "1",
            name: "Admin",
            email: "admin@ifpe.edu.br",
            role: "Administrador",
          },
        }),
      })
    );

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    expect(screen.getByText("Acesso Restrito")).toBeInTheDocument();
    expect(screen.queryByText("Painel Admin")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-role")).toHaveTextContent(
        "Administrador"
      );
    });
    expect(screen.getByText("Painel Admin")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByTestId("user-role")).toHaveTextContent("anon");
    expect(screen.getByText("Acesso Restrito")).toBeInTheDocument();
  });

  it("blocks authenticated users with disallowed roles and supports default null fallback", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          token: "cookie-based",
          user: {
            id: "2",
            name: "Porteiro",
            email: "porteiro@ifpe.edu.br",
            role: "Portaria",
          },
        }),
      })
    );

    render(
      <AuthProvider>
        <AuthHarness />
        <ProtectedRoute allowedRoles={["Administrador"]}>
          <span>Somente Admin Sem Fallback</span>
        </ProtectedRoute>
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByTestId("user-role")).toHaveTextContent("Portaria");
    });

    expect(screen.getByText("Acesso Restrito")).toBeInTheDocument();
    expect(screen.queryByText("Painel Admin")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Somente Admin Sem Fallback")
    ).not.toBeInTheDocument();
  });

  it("propagates login errors and resets loading state", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({ detail: "Credenciais inválidas" }),
      })
    );

    const onError = vi.fn();

    function ErrorHarness() {
      const { login, isLoading } = useAuth();
      return (
        <div>
          <span data-testid="loading-state">{String(isLoading)}</span>
          <button
            type="button"
            onClick={() => {
              void login("user@ifpe.edu.br", "wrong").catch(onError);
            }}
          >
            Tentar Login
          </button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <ErrorHarness />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: "Tentar Login" }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          message: "Credenciais inválidas",
        })
      );
      expect(screen.getByTestId("loading-state")).toHaveTextContent("false");
    });
    consoleSpy.mockRestore();
  });
});
