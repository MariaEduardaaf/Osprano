/**
 * ctx falso em memória para testar funções de convex/model sem deployment.
 * Cobre só o que os modelos usam: query/withIndex(eq)/take/first/collect, get, insert, patch,
 * delete, system.get("_storage") e storage.delete. Uso: `fakeCtx(seed).ctx as never`.
 */
type Row = Record<string, unknown> & { _id: string };

export function fakeCtx(seed: Record<string, Array<Record<string, unknown>>> = {}, storageIds: string[] = []) {
  const tables = new Map<string, Row[]>();
  for (const [t, rows] of Object.entries(seed)) tables.set(t, rows.map((r) => ({ ...r }) as Row));
  const storage = new Set<string>(storageIds);
  let n = 0;

  const find = (id: string): [Row[], number] | null => {
    for (const rows of tables.values()) {
      const i = rows.findIndex((r) => r._id === id);
      if (i >= 0) return [rows, i];
    }
    return null;
  };

  const db = {
    query(table: string) {
      const conds: Array<[string, unknown]> = [];
      const run = () => (tables.get(table) ?? []).filter((r) => conds.every(([f, val]) => r[f] === val));
      const q = {
        withIndex(_name: string, fn?: (b: { eq: (f: string, val: unknown) => unknown }) => unknown) {
          const b = {
            eq(f: string, val: unknown) {
              conds.push([f, val]);
              return b;
            },
          };
          fn?.(b);
          return q;
        },
        async take(k: number) {
          return run().slice(0, k);
        },
        async first() {
          return run()[0] ?? null;
        },
        async collect() {
          return run();
        },
      };
      return q;
    },
    async get(id: string) {
      const hit = find(id);
      return hit ? hit[0][hit[1]] : null;
    },
    async insert(table: string, doc: Record<string, unknown>) {
      const _id = `${table}:${++n}`;
      const rows = tables.get(table) ?? [];
      rows.push({ ...doc, _id });
      tables.set(table, rows);
      return _id;
    },
    async patch(id: string, fields: Record<string, unknown>) {
      const hit = find(id);
      if (hit) Object.assign(hit[0][hit[1]], fields);
    },
    async delete(id: string) {
      const hit = find(id);
      if (hit) hit[0].splice(hit[1], 1);
    },
    system: {
      async get(_table: string, id: string) {
        return storage.has(id) ? { _id: id } : null;
      },
    },
  };

  const ctx = {
    db,
    storage: {
      async delete(id: string) {
        storage.delete(id);
      },
    },
  };
  return { ctx: ctx as unknown, tables, storage };
}
