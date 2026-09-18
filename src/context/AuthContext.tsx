// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, getStoredGoogleUser, saveGoogleUser, logoutGoogleUser } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredGoogleUser()
      .then((stored) => {
        if (stored) {
          setUser(stored);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (newUser: UserProfile) => {
    await saveGoogleUser(newUser);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await logoutGoogleUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
