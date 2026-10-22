import { describe, it, expect } from "vitest";
import {
  acceptVersion,
  canonical,
  mergeCart,
  totals,
  transition,
} from "./rules";
import { nftFixtures } from "./mocks/fixtures";
import type { Order } from "./contracts";
describe("precisão de ETH", () => {
  it("soma decimais sem ponto flutuante", () => {
    expect(
      totals(
        [
          { price: "0.1", quantity: 1 },
          { price: "0.2", quantity: 1 },
        ],
        "",
      ).total,
    ).toBe("0.316");
  });
  it("aplica cupom exatamente", () =>
    expect(totals([{ price: "1.19", quantity: 3 }], "KURIO10")).toEqual({
      subtotal: "3.57",
      discount: "0.357",
      fee: "0.016",
      total: "3.229",
    }));
  it("não cobra taxa no carrinho vazio", () =>
    expect(totals([], "").total).toBe("0"));
});
describe("fusão de carrinhos", () => {
  it("soma e limita ao estoque sem misturar edições", () => {
    const n = nftFixtures();
    const r = mergeCart(
      [{ nftId: "1", edition: "1/10", quantity: 8 }],
      [
        { nftId: "1", edition: "1/10", quantity: 5 },
        { nftId: "1", edition: "1/1", quantity: 1 },
      ],
      n,
    );
    expect(r.items).toEqual([
      { nftId: "1", edition: "1/10", quantity: 10 },
      { nftId: "1", edition: "1/1", quantity: 1 },
    ]);
    expect(r.adjustments).toHaveLength(1);
  });
  it("remove edições indisponíveis", () => {
    const n = nftFixtures();
    n[0].stock["1/1"] = 0;
    expect(
      mergeCart([], [{ nftId: "1", edition: "1/1", quantity: 1 }], n).items,
    ).toEqual([]);
  });
});
describe("eventos e estados terminais", () => {
  it("rejeita eventos repetidos e antigos", () => {
    expect(acceptVersion(4, { version: 4 })).toBe(false);
    expect(acceptVersion(4, { version: 3 })).toBe(false);
    expect(acceptVersion(4, { version: 5 })).toBe(true);
  });
  it.each(["confirmed", "declined"] as const)(
    "mantém %s como terminal",
    (status) => {
      const order = { status, version: 4 } as Order;
      expect(transition(order, "pending")).toBe(order);
    },
  );
  it("avança uma versão ao confirmar", () =>
    expect(
      transition({ status: "pending", version: 1 } as Order, "confirmed"),
    ).toMatchObject({ status: "confirmed", version: 2 }));
});

it("normaliza conteúdo de idempotência", () => {
  expect(
    canonical({ wallet: "a", collector: { name: "Nova", email: "n@k.art" } }),
  ).toBe(
    canonical({ collector: { email: "n@k.art", name: "Nova" }, wallet: "a" }),
  );
});
