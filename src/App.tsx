import AppRoutes from "./AppRoutes";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  );
}
