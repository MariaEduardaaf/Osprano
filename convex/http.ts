import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyStripeSignature, planForPrice } from "./lib/stripe";
import { unsubscribePageHtml } from "./lib/compliance";

interface StripeObj {
  customer?: string;
  subscription?: string;
  id?: string;
  status?: string;
  metadata?: { plan?: "pro" | "agency" };
  items?: { data?: { price?: { id?: string } }[] };
}

const http = httpRouter();

/**
 * Stripe webhook. Endpoint = `${CONVEX_SITE_URL}/stripe/webhook`
 * (NEXT_PUBLIC_CONVEX_SITE_URL). Set STRIPE_WEBHOOK_SECRET in the deployment.
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature");
    if (!secret || !sig || !(await verifyStripeSignature(payload, sig, secret))) {
      return new Response("bad signature", { status: 400 });
    }

    const event = JSON.parse(payload) as { type: string; data: { object: StripeObj } };
    const obj = event.data.object;

    if (event.type === "checkout.session.completed" && obj.customer) {
      await ctx.runMutation(internal.workspaces.applySubscription, {
        customerId: obj.customer,
        plan: obj.metadata?.plan,
        subscriptionId: obj.subscription,
        status: "active",
      });
    } else if (
      (event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") &&
      obj.customer
    ) {
      const status = event.type.endsWith("deleted") ? "canceled" : (obj.status ?? "active");
      const derivedPlan = planForPrice(obj.items?.data?.[0]?.price?.id);
      await ctx.runMutation(internal.workspaces.applySubscription, {
        customerId: obj.customer,
        plan: derivedPlan,
        subscriptionId: obj.id,
        status,
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

/**
 * Unsubscribe público (COMP-02). Sem auth, idempotente, no-leak.
 * GET  = clique no link do rodapé.  POST = RFC 8058 one-click.
 * Endpoint = `${CONVEX_SITE_URL}/unsubscribe?token=...`.
 */
const unsubscribe = httpAction(async (ctx, req) => {
  const token = new URL(req.url).searchParams.get("token");
  let lang = "English";
  if (token) {
    // A supressão vem PRIMEIRO: é o efeito legal, não pode depender da localização.
    await ctx.runMutation(internal.suppressions.unsubscribeByToken, { token });
    // Idioma derivado de (país, cidade) — na Suíça ele é regional: quem clicou em
    // "Se désabonner" em Genebra não pode aterrissar numa página em alemão.
    const leadLang = await ctx.runQuery(internal.outreach.langForUnsubToken, { token });
    if (leadLang) lang = leadLang;
  }
  // SEMPRE o mesmo status e a mesma página — token válido, inválido ou ausente.
  // Nunca vaza qual email existe; só o IDIOMA acompanha o lead, porque este é o fim
  // do caminho de opt-out (COMP-02): quem clicou em "Afmeld dig" lê dinamarquês.
  // Token que não resolve lead → inglês.
  return new Response(unsubscribePageHtml(lang), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
});

http.route({ path: "/unsubscribe", method: "GET", handler: unsubscribe });
http.route({ path: "/unsubscribe", method: "POST", handler: unsubscribe }); // RFC 8058 one-click

export default http;
