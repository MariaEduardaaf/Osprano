// Import relativo com extensão de propósito: tests/image-resize.test.ts carrega
// este arquivo em `node --experimental-strip-types`, que não lê os `paths` do
// tsconfig. `Id` entra só como tipo (some na execução).
import type { Id } from "../../convex/_generated/dataModel";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.82;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Valor do `accept` do `<input type="file">`. */
export const ACCEPT = ACCEPTED_TYPES.join(",");

/** Recusa antes de qualquer trabalho (spec 2.4): mensagem pt-BR, ou null quando o arquivo serve. */
export function checkFile(file: { size: number; type: string }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "Use uma foto JPEG, PNG ou WebP";
  if (file.size > MAX_UPLOAD_BYTES) return "Foto maior que 10 MB";
  return null;
}

/** Lado maior limitado a `max`, proporção mantida, nunca amplia; inteiros, nunca zero. */
export function targetSize(w: number, h: number, max: number): { width: number; height: number } {
  const side = Math.max(w, h);
  const k = side > max ? max / side : 1;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/**
 * Só navegador. `imageOrientation: "from-image"` aplica a rotação do EXIF (foto
 * de celular deitada). Reduz para até 1600 px no lado maior e exporta JPEG 0,82:
 * é isso que vai para o storage, seja qual for o formato de entrada.
 */
export async function resizeToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = targetSize(bitmap.width, bitmap.height, MAX_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível neste navegador");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("Falha ao converter a foto");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** POST do JPEG na URL de `previews.generateUploadUrl`; o storage responde `{ storageId }`. */
export async function postToStorage(uploadUrl: string, body: Blob): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body });
  if (!res.ok) throw new Error(`Falha no envio (${res.status})`);
  const json = (await res.json()) as { storageId?: unknown };
  if (typeof json.storageId !== "string") throw new Error("Resposta do storage sem storageId");
  return json.storageId as Id<"_storage">;
}
