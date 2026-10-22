import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { z } from "zod";
import type { CatalogSearch } from "./contracts";
import { queryClient, sessionOptions } from "./api";
import { ErrorState } from "./components/common";
import { Layout, NotFound } from "./components/layout";
import { Catalog, Detail } from "./features/catalog";
const LoginPage = lazyRouteComponent(
  () => import("./features/account"),
  "LoginPage",
);
const RegisterPage = lazyRouteComponent(
  () => import("./features/account"),
  "RegisterPage",
);
const ProfilePage = lazyRouteComponent(
  () => import("./features/account"),
  "ProfilePage",
);
const WalletsPage = lazyRouteComponent(
  () => import("./features/account"),
  "WalletsPage",
);
const CartPage = lazyRouteComponent(
  () => import("./features/checkout"),
  "CartPage",
);
const Checkout = lazyRouteComponent(
  () => import("./features/checkout"),
  "Checkout",
);
const OrderPage = lazyRouteComponent(
  () => import("./features/checkout"),
  "OrderPage",
);
const schema = z.object({
  q: z.string().catch(""),
  collections: z.string().catch(""),
  networks: z.string().catch(""),
  min: z
    .string()
    .regex(/^\d*(\.\d+)?$/)
    .catch(""),
  max: z
    .string()
    .regex(/^\d*(\.\d+)?$/)
    .catch(""),
  sort: z.enum(["recent", "price-asc", "price-desc"]).catch("recent"),
  tab: z.enum(["all", "new", "trending"]).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
  returnTo: z.string().optional(),
});
const root = createRootRoute({
  validateSearch: (s): Partial<CatalogSearch> => schema.parse(s),
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => (
    <Layout>
      <ErrorState error={error} retry={reset} />
    </Layout>
  ),
});
const protect = async ({ location }: { location: { href: string } }) => {
  const session = await queryClient.fetchQuery(sessionOptions);
  if (!session.user)
    throw redirect({ to: "/login", search: { returnTo: location.href } });
};
const routes = [
  createRoute({ getParentRoute: () => root, path: "/", component: Catalog }),
  createRoute({
    getParentRoute: () => root,
    path: "/nfts/$nftId",
    component: Detail,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/carrinho",
    component: CartPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: LoginPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/cadastro",
    component: RegisterPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/checkout",
    beforeLoad: protect,
    component: Checkout,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/perfil",
    beforeLoad: protect,
    component: ProfilePage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/carteiras",
    beforeLoad: protect,
    component: WalletsPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/favoritos",
    beforeLoad: protect,
    component: () => <Catalog favorites />,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/pedidos/$orderId",
    beforeLoad: protect,
    component: OrderPage,
  }),
];
export const router = createRouter({
  routeTree: root.addChildren(routes),
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => <div className="state-panel">Carregando…</div>,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
