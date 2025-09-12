import type { Worker } from "../types";

export const workers: Worker[] = [
  { id: "w1", name: "Luca Bianchi", phone: "3331111111", userId: "u3" },
  { id: "w2", name: "Anna Verdi", phone: "3332222222", userId: "u4" },
  { id: "w3", name: "Mario Rossi", phone: "3333333333", userId: "u5" },
  // 🔹 backoffice e admin non servono qui, non sono montatori
];
