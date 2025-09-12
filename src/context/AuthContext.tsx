import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { supabase } from "@/supabaseClient";

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // 🔑 Bootstrap: carica da localStorage al mount
  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("auth_user");
      }
    }
  }, []);

  // 🔑 Login base
  const login = async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error("Errore login:", error?.message);
      return null;
    }

    const authUser = data.user;

    // Carica worker
    const { data: worker, error: wError } = await supabase
      .from("workers")
      .select("*")
      .eq("user_id", authUser.id)
      .single();

    if (wError || !worker) {
      console.error("Worker non trovato:", wError?.message);
      return null;
    }

    const fullUser: User = {
      id: authUser.id,
      email: authUser.email!,
      workerId: worker.id,
      name: worker.name,
      role: worker.role,
    };

    setUser(fullUser);
    localStorage.setItem("auth_user", JSON.stringify(fullUser)); // 🔑 salva
    return fullUser;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("auth_user"); // 🔑 pulisci
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve essere usato dentro un AuthProvider");
  }
  return context;
};
