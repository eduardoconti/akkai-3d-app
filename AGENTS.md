# Akkai 3D App

Instrucoes para agentes que trabalham neste repositorio.

## Visao geral

Este projeto e um app operacional web para a Akkai 3D, feito com React, TypeScript e Vite. A interface cobre vendas, produtos/estoque, financeiro, orcamentos, assinatura, relatorios/dashboard e parte inicial de consignacao.

O app conversa com uma API HTTP. Em desenvolvimento, a base padrao e `VITE_API_URL` ou `/api`; em deploy, `vercel.json` reescreve `/api/:path*` para `https://akkai-3d-api.onrender.com/:path*`.

## Comandos

- `npm run dev`: inicia o Vite.
- `npm run typecheck`: roda `tsc -p tsconfig.app.json --noEmit`.
- `npm run build`: roda typecheck e build do Vite.
- `npm run lint`: roda ESLint.
- `npm run format`: roda Prettier escrevendo alteracoes.
- `npm run preview`: serve o build localmente.

Nao ha script de testes automatizados configurado no `package.json` neste momento. Para mudancas de codigo, priorize ao menos `npm run typecheck` e, quando fizer sentido, `npm run lint` ou `npm run build`.

## Stack e convencoes tecnicas

- React 19, TypeScript estrito, Vite 7, React Router 7.
- UI com MUI 7, `@mui/icons-material` e `@mui/x-date-pickers`.
- Estado remoto/local por stores Zustand em cada feature.
- Imports usam alias `@` para `src`; prefira `@/shared`, `@/features/...` etc. em vez de caminhos longos relativos entre modulos.
- O `tsconfig.app.json` esta em modo estrito e usa `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` e `verbatimModuleSyntax`.
- O projeto usa ESM (`"type": "module"`).

## Estrutura

- `src/app`: roteamento, layout principal e error boundary.
- `src/features/<feature>`: cada dominio costuma ter `api`, `components`, `pages`, `store`, `types` e/ou `utils`.
- `src/shared`: componentes reutilizaveis, `httpClient`, tipos de dominio, helpers, offline/cache e feedback global.
- `src/theme`: tema MUI, modo claro/escuro e estilos de menu ativo.
- `public`: PWA/service worker, manifest e icones.

Features existentes:

- `auth`: login, refresh/logout, perfil, senha e rota protegida.
- `sales`: vendas, feiras, precos por feira e fluxo offline de vendas pendentes.
- `products`: produtos, categorias, estoque e historico de movimentacoes.
- `finance`: carteiras, despesas, categorias e taxas por meio de pagamento/carteira.
- `budgets`: orcamentos.
- `assinatura`: planos, assinantes, ciclos e kits.
- `reports`: dashboard e relatorios de vendas, estoque e producao.
- `consignacao`: API inicial presente, mas ainda nao parece estar roteada no app.

## Roteamento e layout

As rotas ficam em `src/app/app.tsx`. Elas sao lazy-loaded e protegidas por `ProtectedRoute`, com `MainLayout` e `RouteErrorBoundary` envolvendo as telas autenticadas.

Ao adicionar uma pagina:

- Crie a pagina em `src/features/<feature>/pages`.
- Exporte pelo `index.ts` da feature quando o padrao local fizer sentido.
- Adicione o lazy import e a rota em `src/app/app.tsx`.
- Adicione navegacao/acoes no `MainLayout` se a tela precisa aparecer no menu.

## API e erros

Use `httpClient` em `src/shared/lib/api/http-client.ts` para chamadas HTTP:

- `httpClient.get<T>(path, query?)`
- `httpClient.post<T>(path, body)`
- `httpClient.put<T>(path, body)`
- `httpClient.delete<T>(path)`

O cliente:

- Injeta `Authorization: Bearer <accessToken>` quando ha token.
- Faz refresh automatico em 401, exceto login/refresh.
- Converte respostas `application/problem+json` em `ApiProblemError`.
- Usa `getProblemDetailsFromError` para mensagens exibidas em stores e formularios.
- Monta query string ignorando valores `undefined`, string vazia e arrays vazios.

Em APIs de feature, mantenha funcoes finas e tipadas, no estilo `listProducts`, `createSale`, `getProductionReport`.

## Estado e stores

Stores ficam em `src/features/<feature>/store` e seguem o padrao:

- Estado inicial com paginacao e flags `isFetching...`, `isSubmitting`, mensagens de erro etc.
- Metodos async que chamam a API, atualizam estado e retornam `ActionResult<T>` para submits.
- Erros tratados com `getProblemDetailsFromError`.
- Selectors exportados como `<feature>StoreSelectors`.
- Nas paginas, prefira `useShallow` com selectors para evitar renderizacoes desnecessarias.

Quando alterar stores existentes, preserve a semantica das flags e mensagens de erro. Para submits, mantenha o padrao `success: true/false` em vez de fazer a UI depender de exceptions.

## Offline e PWA

O app registra `public/sw.js` somente em producao. Existe suporte offline com IndexedDB em `src/shared/lib/offline/indexed-db.ts`.

Fluxos ja existentes:

- Cache de produtos, catalogo, categorias, feiras, carteiras, vendas e precos por feira.
- Vendas podem ser criadas offline e salvas em `pending-sales`.
- `MainLayout` hidrata o estado offline e tenta sincronizar vendas pendentes quando a conexao volta.

Ao mexer em vendas, produtos ou dados cacheados, confira se a mudanca tambem precisa atualizar o cache ou preservar comportamento offline.

## UI e UX

O app e uma ferramenta operacional. Prefira telas densas, claras e funcionais, com informacao facil de escanear.

Padroes recorrentes:

- MUI `Stack`, `Paper`, `Table`, `Dialog`, `TextField`, `Chip`, `Button`, `IconButton`.
- `Grid` vem de `@mui/material/Grid` e usa a API `size={{ xs: 12, md: 6 }}`.
- Use `PageHeader` para titulo, descricao e acao primaria de paginas.
- Use `SearchFilterPanel` para blocos de filtro com buscar/limpar.
- Use `AppTablePagination`, `EmptyState`, `LoadingState`, `FormFeedbackAlert`, `CurrencyField` e `DateRangePickerField` quando aplicavel.
- Use icones de `@mui/icons-material` em botoes e titulos de dialogs.
- Mantenha responsividade: tabelas para desktop e lista/cards compactos em mobile, seguindo paginas como produtos e vendas.
- Mantenha textos da UI em portugues.

Tema:

- Tema em `src/theme/theme.ts`.
- Paleta principal atual: azul `#1296d4`, amarelo `#ffbf0f`, fundos roxos claros/escuros.
- `shape.borderRadius` global e 16; componentes especificos podem ajustar via `sx`.
- Botoes MUI ja tem `textTransform: none` e `disableElevation`.

Evite criar uma landing page ou area de marketing; o primeiro objetivo e sempre a tela util do sistema.

## Formularios

Dialogs de formulario costumam usar:

- Tipos em `src/features/<feature>/types/*-form.ts`.
- `useFormDialog` para estado, erro local, `ProblemDetails`, `isSaving` e reset.
- Validacao local antes de chamar a store.
- Erros de campo via `getFieldMessage(problem, field)`.
- Feedback global de sucesso via `useFeedbackStore`.
- Bloqueio de duplo submit com `isSubmittingRef` quando necessario.

Para campos monetarios, use `CurrencyField` quando possivel.

## Dinheiro e datas

Valores monetarios vindos da API/dominio normalmente estao em centavos. Use `formatCurrency(value)` para exibir, pois ele divide por 100.

Em formularios, valores digitados podem estar em reais/decimal e muitos submits multiplicam por 100 antes de enviar. Verifique o padrao do formulario proximo antes de alterar calculos.

Datas sao exibidas em `pt-BR`; date pickers usam Day.js com locale `pt-br`, configurado em `src/main.tsx`.

## Autenticacao

`AuthProvider` fica em `src/features/auth/providers/auth-provider.tsx`.

- Tokens ficam em `src/shared/lib/api/token-storage.ts`.
- O provider tenta refresh no bootstrap quando ha refresh token.
- Em falha de rede, pode usar snapshot de usuario em `localStorage`.
- Falhas definitivas limpam tokens e usuario.

Evite duplicar logica de token fora do `httpClient`/auth provider.

## Tipos de dominio

Tipos compartilhados ficam em `src/shared/lib/types/domain.ts`. Antes de criar tipos novos para payloads ou respostas, confira se ja existe algo equivalente ali ou no `api` da feature.

Quando a API retornar Problem Details, use os tipos em `src/shared/lib/types/problem-details.ts` e helpers em `src/shared/lib/utils/problem.ts`.

## Estilo de codigo

- Prefira componentes funcionais, hooks e TypeScript explicito nas bordas publicas.
- Preserve nomes em portugues usados no dominio (`vendas`, `feiras`, `carteiras`, `orcamentos`, `assinantes`).
- Evite refactors amplos enquanto implementa uma mudanca pequena.
- Mantenha imports organizados de acordo com o estilo local: libs externas, relativos da feature, depois `@/shared` ou aliases.
- Use `void` ao chamar promises em effects/handlers quando o retorno nao sera aguardado pela UI.
- Evite comentarios obvios; comente apenas decisoes ou blocos de logica que poupem leitura.
- Nao altere o `README.md` so para documentar o projeto, pois ele ainda e o template padrao do Vite. Use este `AGENTS.md` para orientacoes de agente.

## Checklist antes de finalizar mudancas

- Rode `npm run typecheck` para alteracoes TypeScript.
- Rode `npm run lint` quando a mudanca tocar muitas areas ou padroes de hooks/imports.
- Rode `npm run build` quando alterar roteamento, Vite, tema global, auth/offline ou fluxo importante.
- Se nao conseguir rodar alguma verificacao, informe isso claramente.

