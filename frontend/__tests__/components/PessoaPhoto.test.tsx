import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PessoaPhoto,
  isRenderablePhotoSrc,
  resolvePhotoSrc,
} from "@/components/ui/PessoaPhoto";

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

describe("components/ui/PessoaPhoto", () => {
  describe("resolvePhotoSrc", () => {
    it("returns null for empty values or protocol-relative URLs", () => {
      expect(resolvePhotoSrc(null)).toBeNull();
      expect(resolvePhotoSrc(undefined)).toBeNull();
      expect(resolvePhotoSrc("   ")).toBeNull();
      expect(resolvePhotoSrc("//evil.example/avatar.jpg")).toBeNull();
    });

    it("resolves /static/ paths against API base URL", () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br/");
      expect(resolvePhotoSrc(" /static/photos/aluno.jpg ")).toBe(
        "https://api.ifpe.edu.br/static/photos/aluno.jpg"
      );
    });

    it("keeps absolute URLs unchanged", () => {
      expect(
        resolvePhotoSrc("https://images.unsplash.com/photo-123?w=200")
      ).toBe("https://images.unsplash.com/photo-123?w=200");
    });
  });

  describe("isRenderablePhotoSrc", () => {
    it("accepts API static paths, configured photo hosts, oraclecloud, unsplash and localhost", () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
      vi.stubEnv("NEXT_PUBLIC_PHOTO_BASE_URL", "https://cdn.ifpe.edu.br");

      expect(isRenderablePhotoSrc("/static/photos/a.jpg")).toBe(true);
      expect(isRenderablePhotoSrc("/images/local.png")).toBe(true);
      expect(isRenderablePhotoSrc("https://cdn.ifpe.edu.br/a.jpg")).toBe(true);
      expect(
        isRenderablePhotoSrc("https://images.unsplash.com/photo-1507?w=200")
      ).toBe(true);
      expect(
        isRenderablePhotoSrc(
          "https://objectstorage.sa-saopaulo-1.oraclecloud.com/b/o.png"
        )
      ).toBe(true);
      expect(
        isRenderablePhotoSrc("http://localhost:8000/static/photos/a.jpg")
      ).toBe(true);
      expect(
        isRenderablePhotoSrc("http://127.0.0.1:8000/static/photos/a.jpg")
      ).toBe(true);
    });

    it("rejects untrusted external domains and dangerous schemes", () => {
      expect(isRenderablePhotoSrc("https://evil.example/photo.jpg")).toBe(
        false
      );
      expect(isRenderablePhotoSrc("http://evil.example/photo.jpg")).toBe(false);
      expect(isRenderablePhotoSrc("javascript:alert(1)")).toBe(false);
      expect(isRenderablePhotoSrc("//evil.example/photo.jpg")).toBe(false);
    });
  });

  describe("PessoaPhoto component", () => {
    it("renders neutral User fallback icon when src is missing or untrusted", () => {
      const { container, rerender } = render(
        <PessoaPhoto src={null} alt="Estudante" sizes="64px" />
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(container.querySelector("svg")).toBeInTheDocument();

      rerender(
        <PessoaPhoto
          src="https://untrusted.example/avatar.jpg"
          alt="Estudante"
          sizes="64px"
        />
      );
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders resolved image and falls back to icon on load error", () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
      const { container } = render(
        <PessoaPhoto
          src="/static/photos/student.png"
          alt="Maria Silva"
          sizes="64px"
        />
      );

      const img = screen.getByRole("img", { name: "Maria Silva" });
      expect(img).toHaveAttribute(
        "src",
        "https://api.ifpe.edu.br/static/photos/student.png"
      );

      fireEvent.error(img);

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
