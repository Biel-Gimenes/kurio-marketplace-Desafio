import { credentials } from "./credentials";
import { openDB } from "idb";
import type {
  Cart,
  NFT,
  Order,
  Profile,
  Quote,
  Scenario,
  Wallet,
} from "../contracts";
import { nftFixtures, walletFixtures } from "./fixtures";
export interface User extends Profile {
  hash: string;
  salt: string;
}
export interface State {
  schema: 1;
  users: User[];
  session: { userId: string; expiresAt: number } | null;
  nfts: NFT[];
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  orders: Order[];
  quotes: Record<string, Quote>;
  scenario: Scenario;
}
const db = openDB("kurio-simulation", 1, {
  upgrade(db) {
    db.createObjectStore("state");
  },
});
export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function seed(): Promise<State> {
  const users = credentials.map((user) => ({
    ...user,
    ens: `${user.username}.kurio.eth`,
    walletAlias: "Minha carteira",
    avatar: "",
  }));
  return {
    schema: 1,
    users,
    session: null,
    nfts: nftFixtures(),
    carts: { guest: { items: [], coupon: "", version: 1 } },
    favorites: {},
    wallets: { u1: walletFixtures("u1"), u2: walletFixtures("u2") },
    orders: [],
    quotes: {},
    scenario: "normal",
  };
}
// A fila garante que duas operações na mesma aba não leiam o mesmo snapshot.
let queue: Promise<unknown> = Promise.resolve();
export function transaction<T>(
  fn: (state: State) => Promise<T> | T,
): Promise<T> {
  const task = queue.then(async () => {
    const database = await db;
    const state: State =
      (await database.get("state", "main")) ?? (await seed());
    const result = await fn(state);
    await database.put("state", state, "main");
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
export function publicUser(u: User): Profile {
  const { hash, salt, ...profile } = u;
  void hash;
  void salt;
  return profile;
}
