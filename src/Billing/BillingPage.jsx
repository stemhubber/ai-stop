import Billing from "./Billing";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { PLAN_CATALOG } from "../config/plans";
import { AppLayout } from "../features/websites/components/WebiloUI";

export default function BillingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const buyingPro = searchParams.get("plan") === "pro";
  const product = buyingPro
    ? {
      item: "Webilo Pro — 30 days",
      amount: PLAN_CATALOG.pro.price,
      metadata: { purchaseType: "plan", planId: "pro" },
    }
    : {
      item: "Premium Credits Pack",
      amount: 100,
      metadata: { purchaseType: "credits" },
    };

  const billingUser = {
    name: user?.displayName || user?.email?.split("@")[0] || "Customer",
    email: user?.email || "",
  };

  return (
    <AppLayout>
      <Billing
        item={product.item}
        amount={product.amount}
        user={billingUser}
        userId={user?.uid}
        metadata={product.metadata}
      />
    </AppLayout>
  );
}
