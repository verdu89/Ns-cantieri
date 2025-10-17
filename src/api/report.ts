// src/api/report.ts
import { supabase } from "../supabaseClient";

export const reportAPI = {
  async overview() {
    // 1) Contatori veloci (HEAD + count): non trasferiscono righe
    const [
      { count: jobsCount, error: jobsErr },
      { count: ordersCount, error: ordersErr },
      { count: customersCount, error: custErr },
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("job_orders").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
    ]);

    if (jobsErr) throw jobsErr;
    if (ordersErr) throw ordersErr;
    if (custErr) throw custErr;

    // 2) Distribuzione per status: scarichiamo solo la colonna 'status' (leggero)
    const { data: statusRows, error: statusErr } = await supabase
      .from("jobs")
      .select("status"); // una sola colonna, poche decine/centinaia di valori

    if (statusErr) throw statusErr;

    const jobsByStatus = (statusRows || []).reduce<Record<string, number>>(
      (acc, r: any) => {
        const key = r.status ?? "sconosciuto";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      jobsCount: jobsCount ?? 0,
      ordersCount: ordersCount ?? 0,
      customersCount: customersCount ?? 0,
      jobsByStatus,
    };
  },
};
