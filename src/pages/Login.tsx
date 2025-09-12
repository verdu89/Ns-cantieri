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
    <div className="bg-white shadow-xl rounded-xl p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-center text-gray-800">
        Benvenuto 👋
      </h1>
      <p className="text-sm text-gray-500 text-center">
        Accedi con le tue credenziali per continuare
      </p>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Ricorda credenziali
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
};

export default Login;
