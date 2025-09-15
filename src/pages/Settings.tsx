import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { toast } from "react-hot-toast";
import type { Worker } from "../types";

export default function Settings() {
  const { user } = useAuth();

  // Stato cambio password personale
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Stato workers
  const isAdmin = user?.role === "admin" || user?.role === "backoffice";
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");

  // Carico workers
  useEffect(() => {
    async function loadWorkers() {
      if (!user) return;

      if (isAdmin) {
        const { data, error } = await supabase
          .from("workers")
          .select("id, name, role, phone, user_id"); // Rimosso created_at

        if (error) {
          console.error("Errore caricamento workers:", error);
          toast.error("❌ Errore caricamento utenti");
          return;
        }

        const mapped: Worker[] = (data ?? []).map((w: any) => ({
          id: w.id,
          userId: w.user_id,
          name: w.name,
          phone: w.phone,
          role: w.role,
        }));

        setWorkers(mapped.filter((w) => w.role !== "admin"));
      } else {
        const { data, error } = await supabase
          .from("workers")
          .select("id, name, role, phone, user_id") // Rimosso created_at
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Errore caricamento worker:", error);
          toast.error("❌ Errore caricamento profilo");
          return;
        }

        if (data) {
          setWorkers([
            {
              id: data.id,
              userId: data.user_id,
              name: data.name,
              phone: data.phone,
              role: data.role,
            },
          ]);
        }
      }
    }

    loadWorkers();
  }, [isAdmin, user]);

  // Cambio password personale
  async function handlePasswordChange() {
    if (!newPassword || !confirmPassword) {
      toast.error("⚠️ Compila entrambi i campi");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("❌ Le password non coincidono");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("❌ La password deve avere almeno 6 caratteri");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        console.error("Errore update password:", error);
        toast.error(`❌ Errore: ${error.message}`);
      } else {
        toast.success("✅ Password aggiornata con successo!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Errore imprevisto: ${err.message}`);
    }
  }

  // Reset password admin/backoffice
  async function handleAdminPasswordReset() {
    if (!selectedWorker || !adminNewPassword) {
      toast.error("⚠️ Seleziona un utente e inserisci la nuova password");
      return;
    }
    if (adminNewPassword.length < 6) {
      toast.error("❌ La password deve avere almeno 6 caratteri");
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        toast.error("❌ Nessun token valido, rifai login");
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            workerId: selectedWorker,
            newPassword: adminNewPassword,
          }),
        }
      );

      const dataRes = await res.json();

      if (!res.ok) {
        console.error("Reset password error:", dataRes);
        toast.error(
          `❌ Errore reset password: ${dataRes.error || "Errore sconosciuto"}`
        );
        return;
      }

      toast.success("✅ Password aggiornata con successo!");
      setSelectedWorker("");
      setAdminNewPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Errore imprevisto: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">⚙️ Impostazioni</h1>

      {/* Profilo */}
      <Card>
        <CardHeader>
          <CardTitle>Profilo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <b>Nome:</b> {user?.name ?? "—"}
          </div>
          <div>
            <b>Email:</b> {user?.email ?? "—"}
          </div>
          <div>
            <b>Ruolo:</b> {user?.role ?? "—"}
          </div>
        </CardContent>
      </Card>

      {/* Password personale */}
      <Card>
        <CardHeader>
          <CardTitle>🔒 Cambia la tua password</CardTitle>
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
          <Button
            onClick={handlePasswordChange}
            className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
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
                <option key={w.id} value={w.userId}>
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAdminPasswordReset}
                className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reset password
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
