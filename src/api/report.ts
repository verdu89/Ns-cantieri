import { jobAPI } from "./jobs";
import { jobOrderAPI } from "./jobOrders";
import { customerAPI } from "./customers";

export const reportAPI = {
  async overview() {
    const [jobs, orders, customers] = await Promise.all([
      jobAPI.list(),
      jobOrderAPI.list(),
      customerAPI.list(),
    ]);

    const jobsByStatus = jobs.reduce<Record<string, number>>((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {});

    return {
      jobsCount: jobs.length,
      ordersCount: orders.length,
      customersCount: customers.length,
      jobsByStatus,
    };
  },
};
