import { describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/services/api";

describe("services/api", () => {
  it("sends credentials include and JSON headers, returning parsed payload", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: true, student_name: "Ana" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await api<{ status: boolean; student_name: string }>(
      "/api/v1/movimentacao/scan",
      {
        method: "POST",
        body: JSON.stringify({ qr_code_hash: "abc" }),
      }
    );

    expect(result).toEqual({ status: true, student_name: "Ana" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ifpe.edu.br/api/v1/movimentacao/scan",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("returns empty object on HTTP 204 No Content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await api<Record<string, never>>("/api/v1/pessoas/123", {
      method: "DELETE",
    });

    expect(result).toEqual({});
  });

  it("throws ApiError with backend detail message when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({
        detail: "Acesso negado: privilégios insuficientes",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/v1/auth/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Acesso negado: privilégios insuficientes",
    });
  });

  it("throws fallback ApiError message when error body cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/v1/auth/me")).rejects.toBeInstanceOf(ApiError);
    await expect(api("/api/v1/auth/me")).rejects.toMatchObject({
      status: 500,
      message: "Ocorreu um erro inesperado ao se comunicar com o servidor.",
    });
  });

  it("formats FastAPI array detail messages in ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({
        detail: [{ msg: "Campo obrigatório" }, { msg: "CPF inválido" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/v1/pessoas/1")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Campo obrigatório, CPF inválido",
    });
  });

  it("propagates network failures when fetch rejects", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/v1/auth/me")).rejects.toThrow("Failed to fetch");
  });
});
