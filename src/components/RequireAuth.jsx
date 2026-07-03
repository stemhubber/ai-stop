import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { LoadingScreen } from "../features/websites/components/WebiloUI";

export default function RequireAuth({ children }) {
  const { user, loadingUser } = useAuth();

  if (loadingUser) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" />;

  return children;
}
