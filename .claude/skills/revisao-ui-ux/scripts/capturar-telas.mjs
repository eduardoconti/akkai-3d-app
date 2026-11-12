#!/usr/bin/env node
/**
 * Captura telas do akkai-3d-app em celular e desktop (tema claro e/ou escuro)
 * e roda verificações automáticas de UI/UX em cada uma.
 *
 * Uso:
 *   node capturar-telas.mjs --rotas /,/vendas,/produtos [--url http://localhost:5173]
 *        [--tema claro|escuro|ambos] [--saida <pasta>] [--viewports celular,desktop]
 *
 * Login (necessário para rotas protegidas) vem SOMENTE de variáveis de ambiente:
 *   UI_REVIEW_LOGIN, UI_REVIEW_SENHA
 *
 * Dependência: playwright-core instalado fora do repositório, em
 *   ~/.cache/revisao-ui-ux  (npm install --prefix ~/.cache/revisao-ui-ux playwright-core@1.49.1)
 * O navegador usado é o Google Chrome/Chromium do sistema.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const RUNTIME_DIR = join(homedir(), '.cache', 'revisao-ui-ux');
const require = createRequire(join(RUNTIME_DIR, 'package.json'));

let chromium;
try {
  ({ chromium } = require('playwright-core'));
} catch {
  console.error(
    `playwright-core não encontrado em ${RUNTIME_DIR}.\n` +
      `Instale com: npm install --prefix ${RUNTIME_DIR} playwright-core@1.49.1`,
  );
  process.exit(2);
}

const VIEWPORTS = {
  celular: {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  tablet: {
    width: 820,
    height: 1180,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
  desktop: {
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
};
const TEMAS = { claro: 'light', escuro: 'dark' };
const CHAVE_TEMA = 'akkai-3d-theme-mode';

function lerArgumentos(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const chave = argv[i];
    if (chave.startsWith('--')) {
      args[chave.slice(2)] = argv[i + 1]?.startsWith('--')
        ? 'true'
        : argv[i + 1];
      if (!argv[i + 1]?.startsWith('--')) i += 1;
    }
  }
  return args;
}

function localizarNavegador() {
  const candidatos = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ].filter(Boolean);
  return candidatos.find((caminho) => existsSync(caminho));
}

function nomeArquivo(rota) {
  const limpo = rota.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9-]+/g, '_');
  return limpo || 'inicio';
}

/** Verificações executadas dentro da página. Retorna achados objetivos. */
function auditarPagina({ ehCelular }) {
  const achados = [];
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      s.visibility !== 'hidden' &&
      s.display !== 'none'
    );
  };
  const descrever = (el) => {
    const texto = (
      el.innerText ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      ''
    )
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 60);
    const classe = [...el.classList].find((c) => c.startsWith('Mui')) || '';
    return `<${el.tagName.toLowerCase()}${classe ? ` .${classe}` : ''}>${texto ? ` "${texto}"` : ''}`;
  };

  // 1. Rolagem horizontal da página
  const larguraDoc = document.documentElement.scrollWidth;
  if (larguraDoc > window.innerWidth + 1) {
    const culpados = [...document.querySelectorAll('body *')]
      .filter(
        (el) =>
          visivel(el) &&
          el.getBoundingClientRect().right > window.innerWidth + 1,
      )
      .filter((el) => !el.closest('.MuiTableContainer-root, [data-scroll-x]'))
      .slice(0, 5)
      .map(descrever);
    achados.push({
      regra: 'rolagem-horizontal',
      severidade: 'alta',
      detalhe: `Página com ${larguraDoc}px de largura numa tela de ${window.innerWidth}px.`,
      elementos: culpados,
    });
  }

  // 2. Alvos de toque pequenos (celular)
  if (ehCelular) {
    const pequenos = [
      ...document.querySelectorAll(
        'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], [role="tab"], [role="menuitem"]',
      ),
    ]
      .filter(visivel)
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width < 40 || r.height < 40;
      })
      .filter((el) => !el.closest('.MuiTablePagination-root'))
      .slice(0, 10)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${descrever(el)} (${Math.round(r.width)}x${Math.round(r.height)})`;
      });
    if (pequenos.length) {
      achados.push({
        regra: 'alvo-de-toque-pequeno',
        severidade: 'media',
        detalhe:
          'Elementos clicáveis com menos de 40x40px no celular (recomendado ≥ 44px).',
        elementos: pequenos,
      });
    }
  }

  // 3. Controles sem nome acessível
  const semNome = [
    ...document.querySelectorAll(
      'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea',
    ),
  ]
    .filter(visivel)
    .filter((el) => {
      const nome =
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby') ||
        el.getAttribute('title') ||
        (el.labels && el.labels.length ? 'label' : '') ||
        el.getAttribute('placeholder') ||
        (el.innerText || '').trim();
      return !nome;
    })
    .slice(0, 10)
    .map(descrever);
  if (semNome.length) {
    achados.push({
      regra: 'sem-nome-acessivel',
      severidade: 'alta',
      detalhe:
        'Botões/campos sem texto, label ou aria-label (leitor de tela não consegue anunciar).',
      elementos: semNome,
    });
  }

  // 4. Imagens sem alt
  const semAlt = [...document.querySelectorAll('img:not([alt])')]
    .filter(visivel)
    .slice(0, 5)
    .map(descrever);
  if (semAlt.length) {
    achados.push({
      regra: 'imagem-sem-alt',
      severidade: 'media',
      detalhe: 'Imagens sem atributo alt.',
      elementos: semAlt,
    });
  }

  // 5. Contraste de texto (aproximação: cor do texto x primeiro fundo opaco ancestral)
  const parse = (cor) => {
    const m = cor.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  };
  const luminancia = ({ r, g, b }) => {
    const canal = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  const fundoDe = (el) => {
    for (let atual = el; atual; atual = atual.parentElement) {
      const c = parse(getComputedStyle(atual).backgroundColor);
      if (c && c.a >= 0.95) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const baixoContraste = [];
  const vistos = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (baixoContraste.length >= 10) break;
    const temTextoProprio = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim(),
    );
    if (
      !temTextoProprio ||
      !visivel(el) ||
      el.closest('[aria-hidden="true"], [disabled], .Mui-disabled')
    )
      continue;
    const estilo = getComputedStyle(el);
    const cor = parse(estilo.color);
    if (!cor || cor.a < 0.5) continue;
    const fundo = fundoDe(el);
    const [l1, l2] = [luminancia(cor), luminancia(fundo)].sort((a, b) => b - a);
    const razao = (l1 + 0.05) / (l2 + 0.05);
    const tamanho = parseFloat(estilo.fontSize);
    const negrito = Number(estilo.fontWeight) >= 700;
    const minimo = tamanho >= 24 || (tamanho >= 18.66 && negrito) ? 3 : 4.5;
    const chave = `${estilo.color}|${fundo.r},${fundo.g},${fundo.b}`;
    if (razao < minimo && !vistos.has(chave)) {
      vistos.add(chave);
      baixoContraste.push(
        `${descrever(el)} contraste ${razao.toFixed(2)}:1 (mínimo ${minimo}:1)`,
      );
    }
  }
  if (baixoContraste.length) {
    achados.push({
      regra: 'contraste-baixo',
      severidade: 'alta',
      detalhe:
        'Texto abaixo do contraste WCAG AA (cálculo aproximado; confira no print).',
      elementos: baixoContraste,
    });
  }

  // 6. Texto cortado por overflow sem reticências/tooltip
  const cortados = [...document.querySelectorAll('body *')]
    .filter(
      (el) =>
        visivel(el) && el.children.length === 0 && (el.innerText || '').trim(),
    )
    .filter((el) => {
      const s = getComputedStyle(el);
      return (
        el.scrollWidth > el.clientWidth + 1 &&
        s.overflow !== 'visible' &&
        s.textOverflow !== 'ellipsis'
      );
    })
    .slice(0, 5)
    .map(descrever);
  if (cortados.length) {
    achados.push({
      regra: 'texto-cortado',
      severidade: 'media',
      detalhe: 'Texto que não cabe no container e é cortado sem reticências.',
      elementos: cortados,
    });
  }

  // 7. Hierarquia de títulos
  const h1s = document.querySelectorAll('h1');
  if (h1s.length !== 1) {
    achados.push({
      regra: 'hierarquia-titulos',
      severidade: 'baixa',
      detalhe: `A tela tem ${h1s.length} <h1> (esperado 1).`,
      elementos: [],
    });
  }

  return achados;
}

async function fazerLogin(page, baseUrl) {
  const login = process.env.UI_REVIEW_LOGIN;
  const senha = process.env.UI_REVIEW_SENHA;
  if (!login || !senha) return false;
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="username"]', login);
  await page.fill('input[name="password"]', senha);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15000,
    }),
    page.click('button[type="submit"]'),
  ]);
  return true;
}

async function main() {
  const args = lerArgumentos(process.argv.slice(2));
  const baseUrl = (args.url || 'http://localhost:5173').replace(/\/$/, '');
  const rotas = (args.rotas || '/')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  const temas =
    args.tema === 'ambos' ? ['claro', 'escuro'] : [args.tema || 'claro'];
  const viewports = (args.viewports || 'celular,desktop')
    .split(',')
    .map((v) => v.trim());
  const saida = args.saida || join(tmpdir(), `revisao-ui-ux-${Date.now()}`);
  mkdirSync(saida, { recursive: true });

  const executablePath = localizarNavegador();
  if (!executablePath) {
    console.error('Nenhum Chrome/Chromium encontrado. Defina CHROME_PATH.');
    process.exit(2);
  }

  const browser = await chromium.launch({ executablePath, headless: true });
  const relatorio = {
    baseUrl,
    geradoEm: new Date().toISOString(),
    saida,
    telas: [],
  };

  try {
    for (const tema of temas) {
      for (const nomeViewport of viewports) {
        const viewport = VIEWPORTS[nomeViewport];
        if (!viewport)
          throw new Error(`Viewport desconhecido: ${nomeViewport}`);
        const { width, height, ...resto } = viewport;
        const context = await browser.newContext({
          viewport: { width, height },
          ...resto,
          colorScheme: TEMAS[tema],
          locale: 'pt-BR',
          timezoneId: 'America/Sao_Paulo',
        });
        await context.addInitScript(
          ([chave, valor]) => window.localStorage.setItem(chave, valor),
          [CHAVE_TEMA, TEMAS[tema]],
        );
        const page = await context.newPage();
        const errosConsole = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error')
            errosConsole.push(msg.text().slice(0, 300));
        });
        page.on('pageerror', (erro) =>
          errosConsole.push(String(erro).slice(0, 300)),
        );

        const logado = rotas.some((r) => r !== '/login')
          ? await fazerLogin(page, baseUrl)
          : false;

        for (const rota of rotas) {
          errosConsole.length = 0;
          await page.goto(`${baseUrl}${rota}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(600); // animações do MUI e lazy loading
          const redirecionadoParaLogin =
            rota !== '/login' && new URL(page.url()).pathname === '/login';
          const arquivo = join(
            saida,
            `${nomeArquivo(rota)}__${nomeViewport}__${tema}.png`,
          );
          await page.screenshot({ path: arquivo, fullPage: true });
          const achados = redirecionadoParaLogin
            ? []
            : await page.evaluate(auditarPagina, {
                ehCelular: viewport.isMobile,
              });
          relatorio.telas.push({
            rota,
            viewport: nomeViewport,
            tema,
            print: arquivo,
            redirecionadoParaLogin,
            logado,
            errosConsole: [...errosConsole],
            achados,
          });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const caminhoRelatorio = join(saida, 'relatorio.json');
  writeFileSync(caminhoRelatorio, JSON.stringify(relatorio, null, 2));

  for (const tela of relatorio.telas) {
    const status = tela.redirecionadoParaLogin
      ? 'REDIRECIONOU PARA /login (defina UI_REVIEW_LOGIN/UI_REVIEW_SENHA)'
      : `${tela.achados.length} achado(s), ${tela.errosConsole.length} erro(s) de console`;
    console.log(
      `${tela.rota} [${tela.viewport}/${tela.tema}] → ${status}\n  ${tela.print}`,
    );
  }
  console.log(`\nRelatório: ${caminhoRelatorio}`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
