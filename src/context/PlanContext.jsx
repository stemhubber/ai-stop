import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { db } from "../services/firebase.config";
import {
  currentUsagePeriod,
  normalizePlanId,
  PLAN_CATALOG,
} from "../config/plans";

const PlanContext = createContext(null);
const emptyUsage = {
  aiRequests: 0,
  inputTokens: 0,
  outputTokens: 0,
  transcriptions: 0,
  messages: 0,
};

function validPro(account) {
  if (account.plan !== "pro") return false;
  if (account.planStatus && account.planStatus !== "active") return false;
  const expiry = account.planExpiresAt?.toDate?.() || (
    account.planExpiresAt ? new Date(account.planExpiresAt) : null
  );
  return !expiry || expiry.getTime() > Date.now();
}

export function PlanProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const [account, setAccount] = useState({});
  const [usage, setUsage] = useState(emptyUsage);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const period = currentUsagePeriod();

  useEffect(() => {
    if (loadingUser) return undefined;
    if (!user) {
      setAccount({});
      setUsage(emptyUsage);
      setLoadingPlan(false);
      return undefined;
    }

    setLoadingPlan(true);
    let accountReady = false;
    let usageReady = false;
    const finish = () => {
      if (accountReady && usageReady) setLoadingPlan(false);
    };
    const unsubscribeAccount = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setAccount(snapshot.exists() ? snapshot.data() : {});
        accountReady = true;
        finish();
      },
      () => {
        setAccount({});
        accountReady = true;
        finish();
      }
    );
    const unsubscribeUsage = onSnapshot(
      doc(db, "users", user.uid, "usage", period),
      (snapshot) => {
        setUsage({ ...emptyUsage, ...(snapshot.exists() ? snapshot.data() : {}) });
        usageReady = true;
        finish();
      },
      () => {
        setUsage(emptyUsage);
        usageReady = true;
        finish();
      }
    );
    return () => {
      unsubscribeAccount();
      unsubscribeUsage();
    };
  }, [loadingUser, period, user]);

  const value = useMemo(() => {
    const planId = validPro(account) ? "pro" : normalizePlanId(account.plan);
    const effectivePlanId = planId === "pro" && validPro(account) ? "pro" : "core";
    const plan = PLAN_CATALOG[effectivePlanId];
    const normalizedUsage = {
      ...usage,
      aiTokens: Number(usage.inputTokens || 0) + Number(usage.outputTokens || 0),
    };
    const can = (entitlement) => Boolean(plan.entitlements[entitlement]);
    const limit = (metric) => plan.limits[metric] ?? null;
    const remaining = (metric) => {
      const maximum = limit(metric);
      return maximum == null
        ? null
        : Math.max(0, maximum - Number(normalizedUsage[metric] || 0));
    };
    return {
      account,
      plan,
      planId: effectivePlanId,
      isPro: effectivePlanId === "pro",
      loadingPlan,
      usage: normalizedUsage,
      period,
      can,
      limit,
      remaining,
    };
  }, [account, loadingPlan, period, usage]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan must be used inside PlanProvider.");
  return context;
}
