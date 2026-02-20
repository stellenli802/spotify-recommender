import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  spotifyUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60000,
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
