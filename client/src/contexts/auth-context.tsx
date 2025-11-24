import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  requiresPasswordChange: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password, rememberMe }: { username: string; password: string; rememberMe?: boolean }) => {
      const response = await apiRequest('POST', '/api/auth/login', { username, password, rememberMe });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      await apiRequest('POST', '/api/auth/change-password', { currentPassword, newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const login = async (username: string, password: string, rememberMe?: boolean) => {
    await loginMutation.mutateAsync({ username, password, rememberMe });
    // Wait for user data to refetch after successful login
    await queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        refetchUser: refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
