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

// ✅ Spinner CSS globale (puoi spostarlo in un file esterno se preferisci)
const spinnerStyles = document.createElement("style");
spinnerStyles.innerHTML = `
.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #333;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(spinnerStyles);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // 👈 blocca il rendering finché non sappiamo lo stato auth

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        localStorage.removeItem("auth_user");
        setUser(null);
      } else {
        const authUser = session.user;

        const { data: worker } = await supabase
          .from("workers")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (!worker) {
          await supabase.auth.signOut();
          localStorage.removeItem("auth_user");
          setUser(null);
        } else {
          const fullUser: User = {
            id: authUser.id,
            email: authUser.email!,
            workerId: worker.id,
            name: worker.name,
            role: worker.role ?? "worker",
          };

          setUser(fullUser);
          localStorage.setItem("auth_user", JSON.stringify(fullUser));
        }
      }

      setLoading(false);
    };

    init();
  }, []);

  // ✨ SPINNER di caricamento
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div className="loader" />
        <p style={{ fontSize: "14px", color: "#666" }}>Caricamento...</p>
      </div>
    );
  }

  const login = async (
    email: string,
    password: string
  ): Promise<User | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      console.error("Errore login:", error?.message);
      return null;
    }

    const authUser = data.user;

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
    localStorage.setItem("auth_user", JSON.stringify(fullUser));
    return fullUser;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem("auth_user");
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
