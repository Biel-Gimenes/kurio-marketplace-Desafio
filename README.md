# Kurio

Marketplace de arte digital em React + TypeScript. O backend inteiro é simulado no navegador com MSW e IndexedDB: REST, Socket.IO, sessão, carrinho e pedidos funcionam sem servidor.

![Página inicial no desktop](docs/screenshots/inicio-desktop.jpg)

## O que está funcionando

- catálogo com busca, filtros, ordenação, paginação e estado na URL;
- detalhe com edição, estoque por edição, quantidade, favorito e galeria;
- carrinho com cupom `KURIO10`, fusão do carrinho de visitante no login;
- checkout com cotação, carteira por rede, revisão e idempotência;
- pedido confirmado ou recusado, com recibo que sobrevive a refresh;
- login, cadastro, perfil, avatar, senha e carteiras;
- preço/estoque mudando em tempo real via Socket.IO;
- painel **Demonstração** com 11 cenários de erro (timeout, 503, sessão expirada, pagamento recusado etc.).

| Catálogo mobile | Detalhe desktop |
| --- | --- |
| ![Catálogo](docs/screenshots/inicio-mobile.jpg) | ![Detalhe](docs/screenshots/detalhe-desktop.jpg) |

## Rodando

Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173`. Os mocks vêm ligados, inclusive no build. `VITE_ENABLE_MOCKS=false` desliga o MSW e passa a exigir um backend em `/api`.

Contas de demonstração:

| Conta | E-mail | Senha |
| --- | --- | --- |
| Nova Sato | nova@kurio.art | Kurio123! |
| Leo Costa | leo@kurio.art | Kurio123! |

Tudo é fictício. Não use dados reais.

## Testes

```bash
npm run typecheck
npm run lint
npm test                 # regras de negócio (Vitest)
npm run build
npx playwright install chromium
npm run test:e2e         # fluxos, contratos e responsividade
npm run test:visual      # snapshots + axe
```

O Lighthouse fica em `npm run audit`, com o preview em `:4173`. No Windows, informe `CHROME_PATH` se o Chrome não estiver no caminho padrão.

Os snapshots visuais são sensíveis à renderização de fonte do sistema. Se você rodar em outro SO e eles falharem por alguns pixels, regenere com `npx playwright test tests/visual.spec.ts --update-snapshots`.

## Decisões que vale explicar

- **MSW em vez de dados no componente.** A interface fala HTTP de verdade: status, latência, erro e cancelamento. Trocar o mock por um backend real muda só a origem.
- **IndexedDB em vez de localStorage.** O estado (36 NFTs, pedidos, carrinhos, cotações) é grande e precisa sobreviver a refresh.
- **Dinheiro como string e `decimal.js`.** Nenhum valor em ETH passa por `number`.
- **Cotação com fingerprint.** Se preço ou estoque mudar entre a revisão e a confirmação, o usuário vê os novos valores e confirma de novo.
- **Evento de socket não injeta estado.** Ele invalida a query e o React Query relê a API. Versões por recurso descartam eventos repetidos ou atrasados.
- **Idempotência no checkout.** A mesma `Idempotency-Key` com o mesmo corpo recupera o pedido; com corpo diferente retorna 409.

## Estrutura

```text
src/
  contracts.ts        tipos do domínio
  rules.ts            totais, fusão de carrinho, versões, JSON canônico
  api.ts              Axios + React Query
  router.tsx          rotas e guardas
  features/           catálogo, checkout e conta
  components/         layout, formulários, diálogos e UI
  mocks/              MSW, fixtures e IndexedDB
tests/                Playwright (fluxos, visual, acessibilidade)
docs/CHALLENGE.md     enunciado original
```

Detalhes de contratos, cache e tempo real estão em [ARCHITECTURE.md](ARCHITECTURE.md).

## Limitações

- É uma simulação local: abas compartilham a sessão, não há exclusão mútua entre abas e não existe blockchain nem pagamento real.
- O Lighthouse mobile fica em 87–88 porque o MSW precisa iniciar antes do React. Em produção, o mock sairia do caminho crítico.
- Não há SSR nem backend multiusuário.

## O que eu faria diferente

- Removeria o MSW do bundle de produção e deixaria a demo em um ambiente separado.
- Trocaria sessão em IndexedDB por cookie `httpOnly` em um backend real.
- Dividiria o CSS por tela; hoje ele está em um arquivo só, apenas organizado por seções.
- Adicionaria testes de contrato contra um servidor de verdade.

## Créditos

O enunciado está preservado em [docs/CHALLENGE.md](docs/CHALLENGE.md). As quatro artes são derivadas de uma cópia do Figma do desafio e foram convertidas para WebP. Marcas, carteiras e transações são ilustrativas.
