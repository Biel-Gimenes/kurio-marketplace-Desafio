import { createContext, useContext } from "react";

type AppContextValue = {
  notify: (message: string) => void;
  connected: boolean;
};

export const AppContext = createContext<AppContextValue>({
  notify: () => {},
  connected: false,
});

export const useApp = () => useContext(AppContext);
