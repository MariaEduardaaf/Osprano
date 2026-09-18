"use client";

import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { checkFile, postToStorage, resizeToJpeg } from "@/lib/image-resize";

export interface Uploaded {
  id: Id<"_storage">;
  /** Object URL do JPEG enviado, para a prévia ao vivo antes do Salvar (spec 2.4). Quem revoga é o editor. */
  url: string;
}

/**
 * Fluxo de upload de uma foto (spec 2.4): recusa tipo/tamanho antes de tudo,
 * redimensiona no navegador, pede a URL de upload, faz o POST e registra o
 * storageId como upload do lead. `onProgress` alimenta a barra do slot.
 * Lança com mensagem pronta para a tela; quem chama mantém a foto anterior.
 */
export function useUpload(leadId: Id<"leads">) {
  const generateUploadUrl = useMutation(api.previews.generateUploadUrl);
  const registerUpload = useMutation(api.previews.registerUpload);
  return async function upload(file: File, onProgress: (pct: number) => void): Promise<Uploaded> {
    const problem = checkFile(file);
    if (problem) throw new Error(problem);
    onProgress(10);
    const blob = await resizeToJpeg(file);
    onProgress(40);
    const uploadUrl = await generateUploadUrl({});
    const id = await postToStorage(uploadUrl, blob);
    onProgress(85);
    await registerUpload({ leadId, storageId: id });
    onProgress(100);
    return { id, url: URL.createObjectURL(blob) };
  };
}
