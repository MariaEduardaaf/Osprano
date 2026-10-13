import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx } from "./fake-ctx.ts";
import { reserveUsage, refundUsage, ensureFresh } from "../convex/model/workspace.ts";
import { dayKey } from "../convex/lib/domain.ts";
import { LEGAL_VERSION } from "../convex/lib/legal.ts";

const setup = (extra: Record<string, unknown> = {}) => {
  const f = fakeCtx({
    workspaces: [
      {
        _id: "w1",
        orgId: "A",
        plan: "solo",
        leadsUsed: 0,
        sitesUsed: 0,
        periodStart: Date.now(),
        termsVersion: LEGAL_VERSION,
        professionalUse: true,
        ...extra,
      },
    ],
  });
  return { ctx: f.ctx as never, row: () => f.tables.get("workspaces")![0] };
};

test("solo: 300 ai passa, 301o lança e não grava", async () => {
  const { ctx, row } = setup();
  await reserveUsage(ctx, "A", "ai", 300);
  assert.equal(row().aiUsed, 300);
  await assert.rejects(() => reserveUsage(ctx, "A", "ai", 1), /Limite do plano Solo atingido \(300 gerações por IA\/mês\)/);
  assert.equal(row().aiUsed, 300);
});

test("trial: 25 ai, o 26o lança", async () => {
  const { ctx } = setup({ plan: "trial" });
  await reserveUsage(ctx, "A", "ai", 25);
  await assert.rejects(() => reserveUsage(ctx, "A", "ai", 1), /Seu teste grátis acabou \(25 gerações por IA\)/);
});

test("trial já usado em outra conta", async () => {
  const { ctx } = setup({ plan: "trial", trialSpent: true });
  await assert.rejects(() => reserveUsage(ctx, "A", "leads", 1), /Você já usou o teste grátis em outra conta/);
});

test("buscas por dia: 15 passa, 16a lança", async () => {
  const { ctx, row } = setup();
  await reserveUsage(ctx, "A", "searches", 15);
  assert.equal(row().searchesToday, 15);
  assert.equal(row().dayKey, dayKey(Date.now()));
  await assert.rejects(() => reserveUsage(ctx, "A", "searches", 1), /Limite diário atingido \(15 buscas no Google\/dia\)/);
});

test("dia novo zera buscas", async () => {
  const { ctx, row } = setup({ dayKey: "2000-01-01", searchesToday: 15 });
  await reserveUsage(ctx, "A", "searches", 1);
  assert.equal(row().searchesToday, 1);
});

test("verificações: teto diário mesmo com mensal sobrando", async () => {
  const { ctx, row } = setup({ dayKey: dayKey(Date.now()), verificationsToday: 30 });
  await assert.rejects(() => reserveUsage(ctx, "A", "verifications", 1), /30 verificações\/dia/);
  const s = setup();
  await reserveUsage(s.ctx, "A", "verifications", 2);
  assert.equal(s.row().verificationsUsed, 2);
  assert.equal(s.row().verificationsToday, 2);
  void row;
});

test("refund de verificações e buscas, clamp em 0", async () => {
  const { ctx, row } = setup();
  await reserveUsage(ctx, "A", "verifications", 3);
  await refundUsage(ctx, "A", "verifications", 2);
  assert.equal(row().verificationsUsed, 1);
  assert.equal(row().verificationsToday, 1);
  await refundUsage(ctx, "A", "verifications", 9);
  assert.equal(row().verificationsUsed, 0);
  assert.equal(row().verificationsToday, 0);
  await reserveUsage(ctx, "A", "searches", 2);
  await refundUsage(ctx, "A", "searches", 1);
  assert.equal(row().searchesToday, 1);
});

test("virada de 31 dias: pago zera, teste e free não", async () => {
  const old = Date.now() - 31 * 864e5;
  const paid = setup({ leadsUsed: 5, aiUsed: 4, verificationsUsed: 2, periodStart: old });
  await ensureFresh(paid.ctx, "A");
  assert.equal(paid.row().leadsUsed, 0);
  assert.equal(paid.row().aiUsed, 0);
  assert.equal(paid.row().verificationsUsed, 0);
  assert.ok((paid.row().periodStart as number) > old);
  for (const plan of ["trial", "free"]) {
    const t = setup({ plan, leadsUsed: 5, aiUsed: 4, periodStart: old });
    await ensureFresh(t.ctx, "A");
    assert.equal(t.row().leadsUsed, 5);
    assert.equal(t.row().aiUsed, 4);
    assert.equal(t.row().periodStart, old);
  }
});
