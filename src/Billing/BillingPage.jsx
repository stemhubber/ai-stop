import Billing from "./Billing";
import { useAuth } from "../context/AuthContext";

export default function BillingPage() {
  const { user } = useAuth();

  const billingUser = {
    name: user?.displayName || user?.email?.split("@")[0] || "Customer",
    email: user?.email || "",
  };

  return (
    <div>
      <Billing
        item="Premium Credits Pack"
        amount={100}
        user={billingUser}
        userId={user?.uid}
      />
    </div>
  );
}
