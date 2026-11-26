// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

function createJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

function buildRequest(pathname: string, token?: string): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  const headers = token ? { cookie: `access_token=${token}` } : undefined;
  return new NextRequest(url, { headers });
}

describe("proxy (RBAC and session route guard)", () => {
  it("allows internal Next.js routes, API routes and static files without auth", () => {
    expect(proxy(buildRequest("/_next/static/chunk.js")).status).toBe(200);
    expect(proxy(buildRequest("/api/health")).status).toBe(200);
    expect(proxy(buildRequest("/wasm/zxing_reader.wasm")).status).toBe(200);
  });

  it("allows public routes without token and redirects protected routes to login", () => {
    expect(proxy(buildRequest("/")).status).toBe(200);
    expect(proxy(buildRequest("/mobile/carteira")).status).toBe(200);

    for (const protectedPath of [
      "/admin",
      "/admin/alunos",
      "/mobile/aluno",
      "/mobile/leitor",
    ]) {
      const response = proxy(buildRequest(protectedPath));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/");
    }
  });

  it("clears cookie and redirects when access_token is expired or malformed", () => {
    const expiredToken = createJwt({
      sub: "1",
      account_type: "pessoa",
      role: "ALUNO",
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    const protectedResp = proxy(buildRequest("/mobile/aluno", expiredToken));
    expect(protectedResp.status).toBe(307);
    expect(protectedResp.headers.get("location")).toBe(
      "http://localhost:3000/"
    );
    expect(protectedResp.cookies.get("access_token")?.value).toBe("");

    const publicResp = proxy(buildRequest("/", "token.invalido"));
    expect(publicResp.status).toBe(200);
    expect(publicResp.cookies.get("access_token")?.value).toBe("");
  });

  it("enforces strict RBAC isolation for pessoa sessions", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const alunoToken = createJwt({
      sub: "10",
      account_type: "pessoa",
      role: "ALUNO",
      exp: futureExp,
    });

    expect(proxy(buildRequest("/mobile/aluno", alunoToken)).status).toBe(200);

    const loginRedirect = proxy(buildRequest("/", alunoToken));
    expect(loginRedirect.status).toBe(307);
    expect(loginRedirect.headers.get("location")).toBe(
      "http://localhost:3000/mobile/aluno"
    );

    for (const forbiddenPath of ["/admin", "/admin/alunos", "/mobile/leitor"]) {
      const blocked = proxy(buildRequest(forbiddenPath, alunoToken));
      expect(blocked.status).toBe(307);
      expect(blocked.headers.get("location")).toBe(
        "http://localhost:3000/mobile/aluno"
      );
    }
  });

  it("enforces strict RBAC isolation for PORTEIRO and ADMIN operators", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const porteiroToken = createJwt({
      sub: "2",
      account_type: "operador",
      role: "PORTEIRO",
      exp: futureExp,
    });

    expect(proxy(buildRequest("/mobile/leitor", porteiroToken)).status).toBe(
      200
    );

    const porteiroAdminBlocked = proxy(buildRequest("/admin", porteiroToken));
    expect(porteiroAdminBlocked.status).toBe(307);
    expect(porteiroAdminBlocked.headers.get("location")).toBe(
      "http://localhost:3000/mobile/leitor"
    );

    const porteiroAlunoBlocked = proxy(
      buildRequest("/mobile/aluno", porteiroToken)
    );
    expect(porteiroAlunoBlocked.status).toBe(307);
    expect(porteiroAlunoBlocked.headers.get("location")).toBe(
      "http://localhost:3000/mobile/leitor"
    );

    const adminToken = createJwt({
      sub: "1",
      perfil: "ADMIN",
      exp: futureExp,
    });

    expect(proxy(buildRequest("/admin", adminToken)).status).toBe(200);
    expect(proxy(buildRequest("/mobile/leitor", adminToken)).status).toBe(200);

    const adminLoginRedirect = proxy(buildRequest("/", adminToken));
    expect(adminLoginRedirect.status).toBe(307);
    expect(adminLoginRedirect.headers.get("location")).toBe(
      "http://localhost:3000/admin"
    );

    const adminAlunoBlocked = proxy(buildRequest("/mobile/aluno", adminToken));
    expect(adminAlunoBlocked.status).toBe(307);
    expect(adminAlunoBlocked.headers.get("location")).toBe(
      "http://localhost:3000/admin"
    );
  });
});
