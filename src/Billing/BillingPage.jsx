import Billing from "./Billing";
import { useAuth } from "../context/AuthContext";

export default function BillingPage() {
      const { user } = useAuth();
  const userx = { name: "Amahle", email: "amahle@example.com", uid: "" };

  return (
    <div>
      <Billing item="Premium Credits Pack" amount={100} user={userx} userId={user?.uid} />
    </div>
  );
}
