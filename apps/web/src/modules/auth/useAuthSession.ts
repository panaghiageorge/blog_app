import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAuthToken, getAuthToken, setAuthToken } from "../../shared/api";
import { meRequest } from "./auth.api";
import type { User } from "./auth.types";

export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: meRequest,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (meQuery.isError && token) {
      clearAuthToken();
      setToken(null);
    }
  }, [meQuery.isError, token]);

  const user: User | null = meQuery.data?.user ?? null;
  const isAuthenticated = Boolean(token && user);

  const login = useCallback(
    (nextToken: string) => {
      setAuthToken(nextToken);
      setToken(nextToken);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    queryClient.removeQueries({ queryKey: ["me"] });
  }, [queryClient]);

  return useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      isLoading: meQuery.isLoading,
      login,
      logout,
    }),
    [token, user, isAuthenticated, meQuery.isLoading, login, logout],
  );
};
