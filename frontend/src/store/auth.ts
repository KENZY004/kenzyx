import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  avatar_url: string;
  reputation: number;
  streak: number;
  bio?: string;
  is_verified?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setUser: (user: User) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isInitialized: false,
      setUser: (user) => set({ user }),
      login: (user, token) => set({ user, token, isInitialized: true }),
      logout: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "kenyx-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);
