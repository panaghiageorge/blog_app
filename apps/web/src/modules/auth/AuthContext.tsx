import { type ReactNode, createContext, useContext } from "react";
import { useAuthSession } from "./useAuthSession";

type AuthSession = ReturnType<typeof useAuthSession>;

const AuthContext = createContext<AuthSession | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const session = useAuthSession();
  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
