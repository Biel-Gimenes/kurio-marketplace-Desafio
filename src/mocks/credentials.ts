/** Public demo fixtures: PBKDF2/SHA-256, 100,000 iterations. Registrations use random salts. */
export const credentials = [
  {
    id: "u1",
    name: "Nova Sato",
    username: "nova",
    email: "nova@kurio.art",
    salt: "kurio-public-fixture-u1-2026-v1",
    hash: "553b90dbd5f64c8ea90636f5bd4aad37d96e4341cd1ff6c084b74b30ad71f61f",
  },
  {
    id: "u2",
    name: "Leo Costa",
    username: "leo",
    email: "leo@kurio.art",
    salt: "kurio-public-fixture-u2-2026-v1",
    hash: "d1baf05c0ee7c38dd2bb8d1f0aa8debc58f6eda71ae38e8602d08ba9705753ce",
  },
];
