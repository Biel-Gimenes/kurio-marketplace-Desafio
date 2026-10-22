# Kurio

Este é um marketplace de NFTs que desenvolvi para um desafio de front-end. A ideia era montar o fluxo completo de uma loja: encontrar uma arte, ver os detalhes, colocar no carrinho, finalizar a compra e acompanhar o pedido.

O site não usa um servidor de verdade. Uma biblioteca chamada MSW simula as respostas da API dentro do navegador, e os dados ficam salvos no próprio navegador. Assim, dá para atualizar a página sem perder o login, o carrinho ou os pedidos.

**Site publicado:** https://kurio-marketplace-nine.vercel.app

![Página inicial no desktop](docs/screenshots/inicio-desktop.jpg)

## O que dá para fazer

- buscar NFTs por nome, coleção, rede e faixa de preço;
- ordenar e navegar entre as páginas do catálogo;
- abrir a página de um NFT, escolher a edição e a quantidade;
- favoritar uma obra (é preciso estar logado);
- adicionar ao carrinho, mudar a quantidade e aplicar o cupom `KURIO10`;
- escolher uma carteira e finalizar a compra;
- abrir o pedido novamente depois de atualizar a página;
- entrar, criar conta, editar o perfil, trocar a senha e cadastrar carteiras;
- acompanhar a mudança de preço em tempo real;
- testar situações de erro pelo painel **Demonstração**, no canto da tela.

| Catálogo no celular                             | Detalhe no computador                            |
| ----------------------------------------------- | ------------------------------------------------ |
| ![Catálogo](docs/screenshots/inicio-mobile.jpg) | ![Detalhe](docs/screenshots/detalhe-desktop.jpg) |

## Como rodar

Você vai precisar do Node.js 22 ou superior.

```bash
npm ci
npm run dev
```

Depois, abra `http://localhost:5173` no navegador. A simulação já vem ligada. Se quiser desligar, use `VITE_ENABLE_MOCKS=false`. Nesse caso, o site vai precisar de uma API de verdade em `/api`.

Contas para teste:

| Nome      | E-mail         | Senha     |
| --------- | -------------- | --------- |
| Nova Sato | nova@kurio.art | Kurio123! |
| Leo Costa | leo@kurio.art  | Kurio123! |

Essas contas são fictícias. Não use dados pessoais ou senhas reais.

## Testes

Para conferir se está tudo funcionando:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:visual
```

Os testes abrem o site e simulam uma pessoa navegando: buscam, filtram, compram e erram de propósito. Os testes visuais comparam capturas de tela e também verificam acessibilidade.

Se a comparação de imagens falhar por poucos pixels em outro computador, rode `npx playwright test tests/visual.spec.ts --update-snapshots`. Isso acontece porque cada sistema desenha as fontes de um jeito um pouco diferente.

## Organização das pastas

```text
src/
  contracts.ts     tipos dos dados usados no site
  rules.ts         cálculos e regras do carrinho e do pedido
  api.ts           conversa com a API
  router.tsx       endereços das páginas
  features/        catálogo, checkout e conta
  components/      cabeçalho, rodapé, formulários e botões
  mocks/           API simulada, dados de exemplo e armazenamento
tests/             testes feitos com Playwright
docs/CHALLENGE.md  enunciado do desafio
```
