import type { JobOrder } from "../types";

export const mockJobOrders: JobOrder[] = [
  {
    id: "o1",
    code: "25-001",
    customerId: "c1",
    location: {
      address: "Via Roma 10, Milano",
      mapsUrl: "https://maps.google.com/?q=Via+Roma+10,+Milano",
    },
    notes: "Commessa porta blindata",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",
  },
  {
    id: "o2",
    code: "25-002",
    customerId: "c2",
    location: {
      address: "Corso Italia 25, Torino",
      mapsUrl: "https://maps.google.com/?q=Corso+Italia+25,+Torino",
    },
    notes: "Commessa finestra scorrevole",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",
  },
  {
    id: "o3",
    code: "25-003",
    customerId: "c3",
    location: {
      address: "Via Garibaldi 50, Torino",
      mapsUrl: "https://maps.google.com/?q=Via+Garibaldi+50,+Torino",
    },
    notes: "Commessa infissi PVC",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",
  },
  {
    id: "o4",
    code: "25-004",
    customerId: "c4",
    location: {
      address: "Piazza Duomo 1, Firenze",
      mapsUrl: "https://maps.google.com/?q=Piazza+Duomo+1,+Firenze",
    },
    notes: "Commessa serramenti alluminio",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",

  },
  {
    id: "o5",
    code: "25-005",
    customerId: "c5",
    location: {
      address: "Viale Italia 100, Bologna",
      mapsUrl: "https://maps.google.com/?q=Viale+Italia+100,+Bologna",
    },
    notes: "Commessa vetrata uffici",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",

  },
  {
    id: "o6",
    code: "25-006",
    customerId: "c6",
    location: {
      address: "Via Venezia 30, Verona",
      mapsUrl: "https://maps.google.com/?q=Via+Venezia+30,+Verona",
    },
    notes: "Commessa manutenzione infissi",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",

  },
  {
    id: "o7",
    code: "25-007",
    customerId: "c7",
    location: {
      address: "Via Grecale 21, Cagliari",
      mapsUrl: "",
    },
    notes: "Regolazioni da fare",
    payments: [],
    createdAt: "2025-01-15T09:30:00Z",

  },
];
