"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

interface PessoaPhotoProps {
  src?: string | null;
  alt: string;
  sizes: string;
  iconClassName?: string;
}

export function isRenderablePhotoSrc(src?: string | null): src is string {
  const trimmed = src?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" && parsed.hostname === "images.unsplash.com"
    );
  } catch {
    return false;
  }
}

/**
 * Renderiza a foto do titular quando `src` está presente e exibe um ícone
 * neutro quando não há foto cadastrada ou ocorre erro ao carregar a URL.
 */
export function PessoaPhoto({
  src,
  alt,
  sizes,
  iconClassName = "w-5 h-5 text-slate-400",
}: PessoaPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const trimmedSrc = src?.trim();

  if (!isRenderablePhotoSrc(trimmedSrc) || failedSrc === trimmedSrc) {
    return <User className={iconClassName} aria-hidden="true" />;
  }

  return (
    <Image
      src={trimmedSrc}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      onError={() => setFailedSrc(trimmedSrc)}
    />
  );
}
