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
});
