import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/contexts/AuthContext";

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <div className="p-6">Acesso restrito ao administrador.</div>;
  return <AdminPanel />;
}
