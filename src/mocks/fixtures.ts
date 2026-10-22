import type { NFT, Wallet } from "../contracts";
export const collections = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
const names = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Golden Signal #160",
  "Golden Signal #161",
];
const images = [
  "emerald",
  "sage",
  "ivory",
  "sage",
  "sage",
  "ivory",
  "golden",
  "golden",
  "golden",
];
const prices = [
  "1.19",
  "1.69",
  "1.99",
  "1.29",
  "1.39",
  "1.79",
  "0.99",
  "0.39",
  "0.49",
];
export function nftFixtures(): NFT[] {
  return Array.from({ length: 36 }, (_, i) => ({
    id: String(i + 1),
    name:
      i < 9
        ? names[i]
        : `${names[i % 9].split(" #")[0]} #${String(200 + i).padStart(3, "0")}`,
    price: prices[i % 9],
    oldPrice: i % 9 === 2 ? "2.29" : undefined,
    image: `/assets/${images[i % 9]}.webp`,
    collection: collections[Math.floor(i / 4) % 9],
    network:
      i < 9 ? "Ethereum" : (["Ethereum", "Polygon", "Solana"] as const)[i % 3],
    stock: { "1/1": 1, "1/10": 10, "1/50": 50, Aberta: 100 },
    version: 1,
  }));
}
export function walletFixtures(userId: string): Wallet[] {
  return [
    {
      id: `${userId}-main`,
      name: "Principal",
      alias: "Minha carteira",
      network: "Ethereum",
      address: "0xA91F00000000000000000000000000000000E82C",
      provider: "MetaMask",
      profile: "Colecionador Kurio",
      email: userId === "u1" ? "nova@kurio.art" : "leo@kurio.art",
      ens: "nova.kurio.eth",
      referral: "KURIO",
    },
    {
      id: `${userId}-secondary`,
      name: "Reserva",
      alias: "Reserva",
      network: "Polygon",
      address: "0xB000000000000000000000000000000000000001",
      provider: "Coinbase Wallet",
      profile: "Reserva",
      email: "reserva@kurio.art",
      ens: "reserva.kurio.eth",
      referral: "KURIO",
    },
  ];
}
