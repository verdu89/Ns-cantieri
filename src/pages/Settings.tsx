import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useToast } from "../context/ToastContext";
import type { Worker } from "../types";

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Stato per cambio password personale
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Stato per admin/backoffice
  const isAdmin = user?.role === "admin" || user?.role === "backoffice";
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState(""); // user_id del worker
  const [adminNewPassword, setAdminNewPassword] = useState("");

  // Carico workers se admin (includo user_id)
  useEffect(() => {
    if (isAdmin) {
      supabase
        .from("workers")
        .select("id, name, role, user_id")
        .then(({ data, error }) => {
          if (error) {
            console.error(error);
            showToast("error", "❌ Errore caricamento utenti");
          } else {
            const nonAdmin = (data || []).filter((w) => w.role !== "admin");
            setWorkers(nonAdmin);
          }
        });
    }
    // 👇 showToast rimosso dalle dipendenze per evitare warning
  }, [isAdmin]);

  // Cambio password utente loggato
  async function handlePasswordChange() {
    if (!newPassword || newPassword !== confirmPassword) {
      showToast("error", "❌ Le password non coincidono");
      return;
    }
    if (newPassword.length < 6) {
      showToast("error", "❌ La password deve avere almeno 6 caratteri");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.error("Errore update password:", error);
        showToast("error", `❌ Errore: ${error.message}`);
      } else {
        showToast("success", "✅ Password aggiornata con successo!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", `❌ Errore imprevisto: ${err.message}`);
    }
  }

  // Admin reset password (chiama Edge Function con JWT)
  async function handleAdminPasswordReset() {
    if (!selectedWorker || !adminNewPassword) {
      showToast("error", "❌ Seleziona un utente e inserisci la nuova password");
      return;
    }
    if (adminNewPassword.length < 6) {
      showToast("error", "❌ La password deve avere almeno 6 caratteri");
      return;
    }

    try {
      // Prendo il JWT dell’utente loggato
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        showToast("error", "❌ Nessun token valido, rifai login");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            workerId: selectedWorker, // 👈 workers.user_id (UUID di auth.users)
            newPassword: adminNewPassword,
          }),
        }
      );

      const dataRes = await res.json();

      if (!res.ok) {
        console.error("Reset password error:", dataRes);
        showToast("error", `❌ Errore reset password: ${dataRes.error || "Errore sconosciuto"}`);
        return;
      }

      showToast("success", "✅ Password aggiornata con successo!");
      setSelectedWorker("");
      setAdminNewPassword("");
    } catch (err: any) {
      console.error(err);
      showToast("error", `❌ Errore imprevisto: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">⚙️ Impostazioni</h1>

      {/* Profilo */}
      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><b>Nome:</b> {user?.name ?? "—"}</div>
          <div><b>Email:</b> {user?.email ?? "—"}</div>
          <div><b>Ruolo:</b> {user?.role ?? "—"}</div>
        </CardContent>
      </Card>

      {/* Password personale */}
      <Card>
        <CardHeader>
          <CardTitle>Cambia password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="password"
            placeholder="Nuova password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <input
            type="password"
            placeholder="Conferma password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 w-full"
          />
          <Button variant="primary" onClick={handlePasswordChange}>
            Aggiorna password
          </Button>
        </CardContent>
      </Card>

      {/* Reset password admin/backoffice */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>🔑 Reset password utente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            >
              <option value="">Seleziona utente</option>
              {workers.map((w) => (
                <option key={w.id} value={w.user_id}>
                  {w.name}
                </option>
              ))}
            </select>
            <input
              type="password"
              placeholder="Nuova password"
              value={adminNewPassword}
              onChange={(e) => setAdminNewPassword(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full"
            />
            <Button variant="primary" onClick={handleAdminPasswordReset}>
              Reset password
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
