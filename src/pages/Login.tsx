import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("remember_email");
    const savedPassword = localStorage.getItem("remember_password");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRemember(true);
    }
  }, []);

  const getHomeRoute = (role: string) => {
    if (role === "worker") return "/agenda";
    return "/backoffice/home";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const user = await login(email, password);

    if (!user) {
      setError("Credenziali non valide");
      setLoading(false);
      return;
    }

    if (remember) {
      localStorage.setItem("remember_email", email);
      localStorage.setItem("remember_password", password);
    } else {
      localStorage.removeItem("remember_email");
      localStorage.removeItem("remember_password");
    }

    setLoading(false);
    navigate(getHomeRoute(user.role), { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Benvenuto 👋</h1>
        <p className="text-sm text-gray-500 mt-1">
          Accedi con le tue credenziali per continuare
        </p>
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-300 
                     focus:outline-none focus:ring-4 focus:ring-orange-300 
                     focus:border-orange-400 transition text-gray-900"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-300 
                     focus:outline-none focus:ring-4 focus:ring-orange-300 
                     focus:border-orange-400 transition text-gray-900"
          required
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded accent-orange-500"
          />
          Ricorda credenziali
        </label>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold
                     bg-orange-500 hover:bg-orange-600 text-white
                     shadow-md shadow-orange-200
                     disabled:opacity-50 transition-all"
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </Button>
      </form>
    </div>
  );
};

export default Login;
