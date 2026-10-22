import axios from "axios";
import {
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type {
  ApiError,
  CartItem,
  CartView,
  Demo,
  NFT,
  Order,
  Profile,
  Quote,
  Session,
  Wallet,
} from "./contracts";
export const http = axios.create({ baseURL: "/api", timeout: 6000 });
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      retry: (count, error) =>
        count < 2 &&
        axios.isAxiosError(error) &&
        (!error.response || error.response.status >= 500),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});
export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }) =>
    (await http.get<Session>("/session", { signal })).data,
  staleTime: 15000,
  refetchInterval: 15000,
});
export const useSession = () => useQuery(sessionOptions);
export const errorMessage = (e: unknown) =>
  axios.isAxiosError<ApiError>(e)
    ? (e.response?.data.message ??
      "Sem conexão. Verifique a rede e tente novamente.")
    : e instanceof Error
      ? e.message
      : "Não foi possível concluir. Tente novamente.";
export function useCart() {
  const { data } = useSession();
  const uid = data?.user?.id ?? "guest";
  return useQuery({
    queryKey: ["cart", uid],
    queryFn: async ({ signal }) =>
      (await http.get<CartView>("/cart", { signal })).data,
    staleTime: 15000,
    enabled: !!data,
  });
}
export const useQuote = () => {
  const { data } = useSession();
  const c = useCart();
  return useQuery({
    queryKey: ["quote", data?.user?.id ?? "guest", c.data?.version],
    queryFn: async ({ signal }) =>
      (await http.get<Quote>("/quote", { signal })).data,
    enabled: !!c.data,
    staleTime: 15000,
  });
};
export function useCartMutation() {
  return useMutation({
    mutationFn: async ({
      item,
      add = false,
    }: {
      item: CartItem;
      add?: boolean;
    }) =>
      (
        await http.request<CartView>({
          url: "/cart",
          method: add ? "POST" : "PATCH",
          data: item,
        })
      ).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cart"] }),
        queryClient.invalidateQueries({ queryKey: ["quote"] }),
      ]);
    },
  });
}
export function useFavorites() {
  const { data } = useSession();
  return useQuery({
    queryKey: ["private", data?.user?.id, "favorites"],
    queryFn: async ({ signal }) =>
      (await http.get<string[]>("/favorites", { signal })).data,
    enabled: !!data?.user,
    staleTime: 15000,
  });
}
export function useFavoriteMutation() {
  const { data } = useSession();
  const key = ["private", data?.user?.id, "favorites"];
  return useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) =>
      (await http.post<string[]>("/favorites", { nftId: id, favorite })).data,
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (old) =>
        favorite
          ? [...new Set([...(old ?? []), id])]
          : (old ?? []).filter((i) => i !== id),
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(key, context?.previous),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
export function useNFT(id: string) {
  return useQuery({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await http.get<NFT>(`/nfts/${id}`, { signal })).data,
  });
}
export function useProfile() {
  const { data } = useSession();
  return useQuery({
    queryKey: ["private", data?.user?.id, "profile"],
    queryFn: async ({ signal }) =>
      (await http.get<Profile>("/profile", { signal })).data,
    enabled: !!data?.user,
    staleTime: 15000,
  });
}
export function useWallets() {
  const { data } = useSession();
  return useQuery({
    queryKey: ["private", data?.user?.id, "wallets"],
    queryFn: async ({ signal }) =>
      (await http.get<Wallet[]>("/wallets", { signal })).data,
    enabled: !!data?.user,
    staleTime: 15000,
  });
}
export function useOrder(id: string, connected: boolean) {
  const { data } = useSession();
  return useQuery({
    queryKey: ["private", data?.user?.id, "order", id],
    queryFn: async ({ signal }) =>
      (await http.get<Order>(`/orders/${id}`, { signal })).data,
    enabled: !!data?.user,
    staleTime: 15000,
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? (connected ? 5000 : 1000) : false,
  });
}
export function useDemo() {
  return useQuery({
    queryKey: ["demo"],
    queryFn: async () => (await http.get<Demo>("/demo")).data,
  });
}
export async function clearSessionCache(session: Session) {
  await queryClient.cancelQueries();
  queryClient.clear();
  queryClient.setQueryData(["session"], session);
}
