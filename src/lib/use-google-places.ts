"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { GooglePlaceLite } from "@convex/lib/placesFields";

/**
 * Dados do Google Maps SÓ em memória da página (Fase 10, termos do Google: 'No Caching' exceto o
 * permitido). Some ao recarregar. Proibido persistir (localStorage, sessionStorage, IndexedDB,
 * Cache API) e proibido buscar por useQuery (é reativo e cacheado).
 */
const EMPTY: ReadonlyMap<string, GooglePlaceLite> = new Map();
let snapshot: ReadonlyMap<string, GooglePlaceLite> = EMPTY;
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<{ gone: boolean }>>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function rememberGooglePlaces(entries: ReadonlyArray<{ leadId: string; place: GooglePlaceLite }>): void {
  if (entries.length === 0) return;
  const next = new Map(snapshot);
  for (const { leadId, place } of entries) next.set(leadId, { ...next.get(leadId), ...place });
  snapshot = next;
  listeners.forEach((l) => l());
}

export function useGooglePlaceMap(): ReadonlyMap<string, GooglePlaceLite> {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

export function useGooglePlace(leadId: string | null): GooglePlaceLite | undefined {
  const map = useGooglePlaceMap();
  return leadId ? map.get(leadId) : undefined;
}

export function useLoadGooglePlace(): (leadId: Id<"leads">) => Promise<{ gone: boolean }> {
  const details = useAction(api.places.details);
  return useCallback(
    async (leadId) => {
      const hit = inflight.get(leadId);
      if (hit) return hit;
      const p = details({ leadId })
        .then((r) => {
          if (r.place) rememberGooglePlaces([{ leadId, place: r.place }]);
          return { gone: r.gone };
        })
        .finally(() => inflight.delete(leadId));
      inflight.set(leadId, p);
      return p;
    },
    [details],
  );
}

export function useLoadGooglePlaces(): (
  leadIds: Id<"leads">[],
) => Promise<{ loaded: number; gone: number; failed: number }> {
  const many = useAction(api.places.detailsMany);
  return useCallback(
    async (leadIds) => {
      const r = await many({ leadIds });
      rememberGooglePlaces(r.places);
      return { loaded: r.places.length, gone: r.gone.length, failed: r.failed };
    },
    [many],
  );
}
