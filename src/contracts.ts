export type Network = "Ethereum" | "Polygon" | "Solana";
export type Edition = "1/1" | "1/10" | "1/50" | "Aberta";
export interface NFT {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  image: string;
  collection: string;
  network: Network;
  stock: Record<Edition, number>;
  version: number;
}
export interface CartItem {
  nftId: string;
  edition: Edition;
  quantity: number;
}
export interface Cart {
  items: CartItem[];
  coupon: string;
  version: number;
}
export interface CartView extends Cart {
  products: NFT[];
}
export interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  ens: string;
  walletAlias: string;
  avatar: string;
}
export interface Session {
  user: Profile | null;
  expiresAt: number;
  adjustments?: string[];
}
export interface Wallet {
  id: string;
  name: string;
  alias: string;
  network: Network;
  address: string;
  provider: "MetaMask" | "WalletConnect" | "Coinbase Wallet";
  profile: string;
  email: string;
  ens: string;
  referral: string;
}
export interface Quote {
  id: string;
  fingerprint: string;
  expiresAt: number;
  items: (CartItem & {
    name: string;
    image: string;
    price: string;
    network: Network;
  })[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string;
  networks: Network[];
}
export interface Order {
  id: string;
  userId: string;
  key: string;
  payload: string;
  status: "pending" | "confirmed" | "declined";
  version: number;
  quote: Quote;
  wallet: Wallet;
  collector: Record<string, string>;
  createdAt: number;
  settlesAt: number;
  outcome: "confirmed" | "declined";
  transaction: string;
  consumed: boolean;
}
export interface ResourceEvent {
  eventId: string;
  resourceId: string;
  version: number;
  userId?: string;
  data: NFT | Order;
}
export type Scenario =
  | "normal"
  | "empty"
  | "slow"
  | "variable"
  | "offline"
  | "server-error"
  | "favorite-error"
  | "expired"
  | "declined"
  | "timeout"
  | "wallet-refused";
export interface Demo {
  scenario: Scenario;
  socketConnected: boolean;
}
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}
export interface CatalogSearch {
  q: string;
  collections: string;
  networks: string;
  min: string;
  max: string;
  sort: string;
  tab: string;
  page: number;
  returnTo?: string;
}
