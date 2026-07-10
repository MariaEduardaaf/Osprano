"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

/** Fires the "prospect opened the preview" signal once, on mount. Renders nothing. */
export function PreviewTracker({ token }: { token: string }) {
  const record = useMutation(api.previews.recordOpen);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void record({ token }).catch(() => {});
  }, [record, token]);

  return null;
}
