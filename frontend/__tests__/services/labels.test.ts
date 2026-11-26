import { describe, expect, it } from "vitest";
import { formatLocalAcesso, formatVinculoLabel } from "@/services/labels";

describe("services/labels", () => {
  it("formats known institutional affiliations and falls back cleanly", () => {
    expect(formatVinculoLabel("ALUNO")).toBe("Estudante");
    expect(formatVinculoLabel("PROFESSOR")).toBe("Professor(a)");
    expect(formatVinculoLabel("SERVIDOR")).toBe("Servidor(a)");
    expect(formatVinculoLabel("COORDENACAO")).toBe("Coordenação");
    expect(formatVinculoLabel(null)).toBe("Titular");
    expect(formatVinculoLabel("VISITANTE")).toBe("VISITANTE");
  });

  it("formats access point identifiers and falls back cleanly", () => {
    expect(formatLocalAcesso("PORTARIA")).toBe("Portaria");
    expect(formatLocalAcesso(undefined)).toBe("Portaria");
    expect(formatLocalAcesso("ANEXO")).toBe("ANEXO");
  });
});
