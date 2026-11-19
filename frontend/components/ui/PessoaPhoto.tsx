"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { getApiBaseUrl } from "@/services/auth";

interface PessoaPhotoProps {
  src?: string | null;
  alt: string;
  sizes: string;
  iconClassName?: string;
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const candidate of [
    getApiBaseUrl(),
    process.env.NEXT_PUBLIC_PHOTO_BASE_URL,
  ]) {
    if (!candidate) continue;
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // Ignore malformed configured URLs
    }
  }
  return origins;
}

export function resolvePhotoSrc(src?: string | null): string | null {
  const trimmed = src?.trim();
  if (!trimmed || trimmed.startsWith("//")) return null;

  if (trimmed.startsWith("/static/")) {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
    return `${baseUrl}${trimmed}`;
  }

  return trimmed;
}

export function isRenderablePhotoSrc(src?: string | null): src is string {
  const resolved = resolvePhotoSrc(src);
  if (!resolved) return false;
  if (resolved.startsWith("/")) return true;

  try {
    const parsed = new URL(resolved);
    if (getAllowedOrigins().has(parsed.origin)) {
      return true;
    }
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "images.unsplash.com" ||
        parsed.hostname.endsWith(".oraclecloud.com"))
    ) {
      return true;
    }
    if (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return true;
    }
    return false;
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
  const resolvedSrc = resolvePhotoSrc(src);

  if (
    !resolvedSrc ||
    !isRenderablePhotoSrc(resolvedSrc) ||
    failedSrc === resolvedSrc
  ) {
    return <User className={iconClassName} aria-hidden="true" />;
  }

  const isExternalOrApiImage = /^https?:\/\//i.test(resolvedSrc);

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={isExternalOrApiImage}
      className="object-cover"
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );
}
