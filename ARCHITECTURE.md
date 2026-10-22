# Como o projeto funciona

Escrevi este arquivo para explicar, de forma simples, o caminho que os dados percorrem e onde fica cada parte do código.

## Do clique até a tela

Quando alguém usa o site, a informação passa por quatro lugares:

1. o componente da tela mostra o conteúdo e recebe os cliques;
2. uma função busca os dados na API;
3. o MSW responde como se fosse um servidor;
4. a resposta é guardada no navegador e a tela é atualizada.

O componente nunca inventa os dados sozinho. Ele sempre pede para a API. Isso deixou o código mais fácil de testar, porque o painel de demonstração também passa pelo mesmo caminho.

## O que cada pasta faz

- `src/contracts.ts`: os tipos dos dados, como NFT, carrinho, cotação e pedido.
- `src/rules.ts`: as contas de preço, a soma do carrinho e as regras do pedido.
- `src/api.ts`: a configuração das requisições e os hooks que buscam cada informação.
- `src/router.tsx`: os endereços do site e quais páginas exigem login.
- `src/features/`: as telas de catálogo, checkout e conta.
- `src/mocks/`: a API simulada. O arquivo `server.ts` tem as rotas e o `database.ts` guarda os dados no navegador.

## Endereços da API

Todos começam com `/api`.

- `/session`, `/login` e `/register`: entrada e saída da conta.
- `/nfts` e `/nfts/:id`: catálogo e detalhe de uma obra.
- `/favorites`: obras favoritas de quem está logado.
- `/cart`: carrinho de visitante ou de usuário.
- `/quote`: cálculo dos valores e cupom.
- `/orders`: criação e consulta de pedidos.
- `/profile`, `/password` e `/wallets`: dados da conta.
- `/demo`: muda o cenário da simulação.

## Regras que exigem mais atenção

**Preços.** Os valores são guardados como texto e calculados com uma biblioteca chamada `decimal.js`. Sem isso, uma conta simples como `0.1 + 0.2` pode dar `0.30000000000000004`.

**Carrinho sem login.** A pessoa pode montar o carrinho antes de entrar na conta. Quando ela faz login, esse carrinho é somado ao carrinho da conta. Se passar do estoque, a quantidade é ajustada e a tela avisa.

**Valores que mudam.** O checkout calcula os valores e guarda o resultado por 60 segundos. Se o preço ou o estoque mudar nesse período, a pessoa precisa confirmar tudo de novo antes de pagar.

**Compra duplicada.** Se alguém clicar duas vezes no botão de comprar, ou se a conexão cair no meio do pedido, a compra não é feita duas vezes. O site envia uma chave junto com o pedido, e a API usa essa chave para reconhecer uma tentativa repetida.

**Preço em tempo real.** Quando um preço muda, o servidor de tempo real avisa o site. Esse aviso não altera a tela diretamente: ele só diz que algo mudou, e o site busca a informação atualizada.

## Limitações

Tudo acontece dentro do navegador. Não existe blockchain, pagamento de verdade nem banco de dados compartilhado. Duas abas abertas usam a mesma conta, e não há controle para duas pessoas alterarem os mesmos dados ao mesmo tempo.

O ponto mais fraco é o carregamento no celular, porque a simulação precisa começar antes da página aparecer.
