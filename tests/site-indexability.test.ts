import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * As DUAS rotas voltadas ao prospect renderizam o MESMO componente com o nome do
 * negócio real, e por isso vivem sendo confundidas. A regra do buscador é oposta
 * em cada uma:
 *
 *   /p/[token]   prévia rastreada, mandada por email ANTES da venda → noindex.
 *                Link privado: indexar publica uma página sobre o negócio de
 *                terceiro que não pediu nada, e expõe o token na busca.
 *   /site/[slug] site publicado DEPOIS da venda → index. Ser achável no Google é
 *                literalmente o que o cliente comprou.
 *
 * Estes testes leem a fonte porque `page.tsx` não é importável fora do Next (JSX,
 * alias `@/`, next/navigation): a trava possível aqui é sobre o código escrito.
 */

/** Fonte sem comentários: o que é EXECUTADO, não o que se explica sobre ele. */
function code(relative: string): string {
  const src = readFileSync(new URL(relative, import.meta.url), "utf8");
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const published = () => code("../src/app/site/[slug]/page.tsx");
const preview = () => code("../src/app/p/[token]/page.tsx");

function count(src: string, re: RegExp): number {
  return src.match(re)?.length ?? 0;
}

test("site publicado: o caminho de sucesso é indexável", () => {
  const src = published();
  assert.match(
    src,
    /robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/,
    "o site vendido voltou a ser noindex — o cliente pagou por uma página que o Google acha",
  );
});

test("site publicado: o único noindex que sobra é o do slug inexistente", () => {
  const src = published();
  // Uma página de "não encontrado" não se indexa. Esse return é o ÚNICO lugar
  // legítimo de `index: false` neste arquivo.
  assert.match(src, /if \(!site\) return \{ robots: \{ index: false \} \};/);
  assert.equal(
    count(src, /index:\s*false/g),
    1,
    "apareceu um noindex fora do caminho de erro no site publicado",
  );
});

test("prévia rastreada: continua noindex em TODOS os caminhos", () => {
  const src = preview();
  assert.equal(
    count(src, /index:\s*true/g),
    0,
    "a prévia privada virou indexável — publicaria o negócio de quem não comprou nada",
  );
  const robotsBlocks = count(src, /robots:\s*\{/g);
  assert.ok(robotsBlocks > 0, "a prévia ficou sem declaração de robots");
  assert.equal(
    count(src, /index:\s*false/g),
    robotsBlocks,
    "algum retorno de metadata da prévia deixou de declarar noindex",
  );
});

test("site publicado: canonical/og:url saem de env, nunca de domínio chumbado", () => {
  const src = published();
  // Canonical é uma AFIRMAÇÃO de qual é o endereço oficial da página. Um domínio
  // escrito na mão envelhece e passa a canonicalizar para uma URL que não existe,
  // o que TIRA do índice a página que o cliente comprou — pior que não declarar.
  assert.equal(
    count(src, /https?:\/\/[^"'`\s]/g),
    0,
    "domínio absoluto chumbado no arquivo do site publicado",
  );
  assert.match(src, /process\.env\.(NEXT_PUBLIC_APP_URL|APP_URL)/);
  // Sem origem verificada não se emite canonical nem og:url (ambos condicionais),
  // mas a indexabilidade NÃO pode depender disso: `robots` é fixo.
  assert.match(src, /canonical \? \{ alternates: \{ canonical \} \} : \{\}/);
  assert.doesNotMatch(src, /origin \?[^\n]*robots/);
});
