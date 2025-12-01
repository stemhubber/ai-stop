import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function RequireAuth({ children }) {
  const { user, loadingUser } = useAuth();

  if (loadingUser) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" />;

  return children;
}
