# Arquitetura

## Fluxo

```text
componentes → hooks + React Query → Axios → MSW → IndexedDB
                                              └→ Socket.IO (binding)
```

Nada de dado fictício vive no componente: até o painel de demonstração passa por HTTP. Somente o MSW altera o estado simulado.

Stack: Vite, React 19, TypeScript estrito, TanStack Router/Query, Axios, Zod, React Hook Form, Tailwind 4, Radix (Button/Dialog), MSW, `@mswjs/socket.io-binding`, `idb`, `decimal.js`.

## Contratos

`src/contracts.ts` é a fonte dos tipos de transporte.

- Preços em ETH são **string decimal**; quantidades são inteiros.
- Redes: `Ethereum | Polygon | Solana`.
- Edições: `1/1 | 1/10 | 1/50 | Aberta`, cada uma com estoque próprio.
- Erros: `{ code, message, fields? }`.
- `Quote` traz fingerprint e validade de 60 s.
- `Order` guarda `key`, `payload` normalizado, snapshot de cotação/carteira/coletor e a flag `consumed`.

## REST

Origem `/api`, um único handler MSW com roteamento por path e método.

| Rota | Função |
| --- | --- |
| `GET /session`, `POST /login`, `POST /register`, `DELETE /session` | sessão de 1 h |
| `GET /nfts`, `GET /nfts/:id` | catálogo e detalhe (9 por página) |
| `GET/POST /favorites` | favoritos do usuário |
| `GET/POST/PATCH /cart` | carrinho por usuário ou `guest` |
| `GET/POST /quote` | cotação e cupom |
| `POST /orders`, `GET /orders/:id`, `GET /orders/by-key` | pedido e idempotência |
| `GET/PATCH /profile`, `POST /password` | conta |
| `GET/POST/PATCH /wallets`, `POST /wallets/connect` | carteiras |
| `GET/POST /demo` | cenários, eventos e reset |

Status usados: 401, 403, 404, 409, 422, 503 e erro de rede.

## Cache

- `staleTime`: 60 s no catálogo, 15 s nos recursos privados.
- Retry somente para rede e 5xx, no máximo duas vezes.
- Chaves privadas incluem o `uid`; troca de conta remove as queries anteriores.
- Favorito é otimista: guarda o snapshot, altera o cache e restaura em erro.
- Busca usa `AbortSignal` do React Query, então resposta antiga não sobrescreve a atual.

## Tempo real

- `main.tsx` inicia o MSW antes do primeiro render.
- `layout.tsx` importa `socket.io-client` dinamicamente, porque o transporte captura o WebSocket no import.
- URL fake `wss://realtime.kurio.test/`; o binding traduz os pacotes Engine.IO.
- Eventos: `nft.updated` e `order.updated`.
- A interface relê a API; a versão por recurso descarta duplicata e evento atrasado.
- Pedido pendente usa polling de 1 s desconectado e 5 s conectado.

## Persistência e segurança

- IndexedDB `kurio-simulation`, schema 1, store `state`.
- Uma fila serializa operações na mesma aba; entre abas não há lock global.
- Senhas usam PBKDF2/SHA-256, 100.000 iterações e salt individual.
- Autorização é verificada no MSW: perfil, carteira, favoritos e pedidos ignoram qualquer `userId` do cliente.
- O checkout grava a tentativa em `localStorage` (`kurio-attempt:<uid>`) e o rascunho em `sessionStorage` (`kurio-draft:<uid>`).

## Limites

Simulação local, sem blockchain, sem pagamento real e sem multiusuário. O custo de inicializar o MSW antes do React é o principal motivo do LCP mobile ficar em 87–88 no Lighthouse.
