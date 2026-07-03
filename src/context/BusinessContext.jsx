import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { listBusinesses } from "../services/businessRepository";

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState(localStorage.getItem("activeBusinessId"));
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [businessError, setBusinessError] = useState("");

  const refreshBusinesses = useCallback(async () => {
    if (loadingUser) {
      setLoadingBusinesses(true);
      return;
    }
    if (!user?.uid) {
      setBusinesses([]);
      setBusinessError("");
      setLoadingBusinesses(false);
      return;
    }
    setLoadingBusinesses(true);
    setBusinessError("");
    try {
      const next = await listBusinesses(user.uid);
      setBusinesses(next);
      if (!next.some((business) => business.id === activeBusinessId)) {
        setActiveBusinessId(next[0]?.id || null);
      }
    } catch (error) {
      console.error("Business workspace could not load:", error.message);
      setBusinessError("Your business workspace could not be loaded. Refresh or try again.");
    } finally {
      setLoadingBusinesses(false);
    }
  }, [activeBusinessId, loadingUser, user?.uid]);

  useEffect(() => { refreshBusinesses(); }, [refreshBusinesses]);
  useEffect(() => {
    if (activeBusinessId) localStorage.setItem("activeBusinessId", activeBusinessId);
    else localStorage.removeItem("activeBusinessId");
  }, [activeBusinessId]);

  const value = useMemo(() => ({
    businesses,
    activeBusiness: businesses.find((item) => item.id === activeBusinessId) || null,
    activeBusinessId,
    setActiveBusinessId,
    loadingBusinesses,
    businessError,
    refreshBusinesses,
  }), [businesses, activeBusinessId, loadingBusinesses, businessError, refreshBusinesses]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const value = useContext(BusinessContext);
  if (!value) throw new Error("useBusiness must be used inside BusinessProvider");
  return value;
}
