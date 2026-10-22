# Como o projeto funciona

Um resumo de como as partes conversam, para quem for mexer no código depois.

## O caminho dos dados

```text
componente → hook → Axios → MSW → IndexedDB
```

O componente não guarda uma cópia dos dados. Ele chama um hook do React Query, que faz a requisição com Axios. O MSW intercepta essa requisição e responde como se fosse um servidor. O estado fica no IndexedDB.

Quando algo muda, o React Query invalida a consulta e busca os dados de novo. Foi a parte que mais me deu trabalho no começo.

## Pastas principais

- `src/contracts.ts`: os tipos que a API devolve e recebe.
- `src/rules.ts`: cálculo dos totais, junção do carrinho, versões dos eventos e comparação do pedido.
- `src/api.ts`: configuração do Axios, do React Query e os hooks de cada recurso.
- `src/router.tsx`: rotas, parâmetros da URL e proteção das páginas que precisam de login.
- `src/features/`: as telas de catálogo, checkout e conta.
- `src/mocks/`: a API falsa. O `server.ts` tem as rotas e as regras; o `database.ts` guarda tudo no IndexedDB.

## Rotas da API

Todas começam com `/api`.

- `/session`, `/login`, `/register`: sessão de uma hora.
- `/nfts` e `/nfts/:id`: catálogo e detalhe.
- `/favorites`: favoritos do usuário logado.
- `/cart`: carrinho do usuário ou do visitante.
- `/quote`: cotação e cupom.
- `/orders`: criação e consulta de pedidos.
- `/profile`, `/password`, `/wallets`: dados da conta.
- `/demo`: muda o cenário da simulação.

## Regras que dão mais trabalho

**Dinheiro.** Os preços são string e os cálculos usam `decimal.js`, para não aparecer aquele `0.30000000000000004`.

**Carrinho de visitante.** Quando a pessoa entra na conta, o carrinho que ela montou sem login é somado ao carrinho dela. Se passar do estoque, a quantidade é ajustada e a tela avisa.

**Cotação.** O checkout guarda uma cotação com validade de 60 segundos. Se o preço ou o estoque mudar nesse meio tempo, a cotação antiga não vale mais e a pessoa precisa confirmar os valores novos.

**Pedido duplicado.** Se a pessoa clicar duas vezes em comprar ou a conexão cair, o pedido não é criado duas vezes. O checkout manda uma chave junto com a compra; se a mesma chave chegar de novo, a API devolve o pedido que já existe.

**Tempo real.** O Socket.IO avisa quando o preço mudou, mas ele não manda o dado para a tela. Ele só avisa que algo mudou, e o React Query busca a informação atualizada na API.

## Limites

Tudo roda no navegador. Não tem blockchain, pagamento de verdade nem banco de dados compartilhado. Duas abas abertas usam a mesma sessão, e não existe controle para escrita simultânea entre elas.

O maior problema de performance é o MSW precisar iniciar antes do React, o que pesa no carregamento do mobile.
