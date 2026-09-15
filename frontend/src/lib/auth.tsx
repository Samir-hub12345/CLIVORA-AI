"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, UserRole } from "@/types";
import { getStoredUser, clearToken, api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  isClinician: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {},
  isClinician: false,
  isDoctor: false,
  isAdmin: false,
  isPatient: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUserState(stored);
      api.getMe().then((res) => {
        if (res.data) {
          setUserState(res.data);
        } else if (res.status === 401) {
          clearToken();
          setUserState(null);
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
  };

  const logout = () => {
    clearToken();
    setUserState(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const role = user?.role;
  const isDoctor = role === "doctor";
  const isAdmin = role === "admin";
  const isClinician = role === "doctor" || role === "nurse" || role === "admin";
  const isPatient = role === "patient";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        logout,
        isClinician,
        isDoctor,
        isAdmin,
        isPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
