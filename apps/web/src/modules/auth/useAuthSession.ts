import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { logoutRequest, meRequest } from "./auth.api";
import type { User } from "./auth.types";

export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: meRequest,
    retry: false,
  });

  useEffect(() => {
    setUser(meQuery.data?.user ?? null);
  }, [meQuery.data?.user]);

  const login = useCallback(
    (nextUser: User) => {
      setUser(nextUser);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      queryClient.removeQueries({ queryKey: ["me"] });
    }
  }, [queryClient]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: meQuery.isLoading,
      login,
      logout,
    }),
    [user, meQuery.isLoading, login, logout],
  );
};