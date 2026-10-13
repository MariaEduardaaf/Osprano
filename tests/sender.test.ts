import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSenderInput,
  isSenderComplete,
  requireSender,
  senderFooterIdentity,
  SENDER_REQUIRED_MESSAGE,
} from "../convex/lib/sender.ts";

const OK = { name: "Ana Lima", company: "Lima Web", address: "Rua A 1, 1000 Lisboa", replyTo: "ana@lima.pt" };

test("normalizeSenderInput: trim, colapsa espaço/quebra, e-mail minúsculo", () => {
  assert.deepEqual(
    normalizeSenderInput({
      name: "  Ana   Lima ",
      company: "Lima\nWeb",
      address: " Rua A 1,\n1000 Lisboa ",
      replyTo: " Ana@Lima.PT ",
    }),
    OK,
  );
});

test("normalizeSenderInput: campos vazios", () => {
  assert.throws(() => normalizeSenderInput({ ...OK, name: "   " }), /nome de quem assina/);
  assert.throws(() => normalizeSenderInput({ ...OK, company: "" }), /empresa ou marca/);
  assert.throws(() => normalizeSenderInput({ ...OK, address: "" }), /endereço postal/);
});

test("normalizeSenderInput: e-mail inválido e tamanho", () => {
  assert.throws(() => normalizeSenderInput({ ...OK, replyTo: "ana@" }), /E-mail de resposta inválido/);
  assert.throws(() => normalizeSenderInput({ ...OK, replyTo: "ana lima@x.pt" }), /E-mail de resposta inválido/);
  assert.throws(() => normalizeSenderInput({ ...OK, name: "a".repeat(81) }), /80/);
});

test("isSenderComplete / requireSender", () => {
  assert.equal(isSenderComplete(null), false);
  assert.equal(isSenderComplete({ name: "A", company: "B", address: "C" }), false);
  assert.equal(isSenderComplete(OK), true);
  assert.throws(() => requireSender(undefined), (e: Error) => e.message === SENDER_REQUIRED_MESSAGE);
  assert.equal(requireSender(OK), OK);
});

test("senderFooterIdentity e mensagem sem travessão", () => {
  assert.equal(senderFooterIdentity(OK), "Ana Lima, Lima Web, Rua A 1, 1000 Lisboa, ana@lima.pt");
  assert.ok(!SENDER_REQUIRED_MESSAGE.includes("—"));
});
