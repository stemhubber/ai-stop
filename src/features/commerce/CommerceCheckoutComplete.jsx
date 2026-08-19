import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCommerceCheckoutStatus } from "../../services/commerceService";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";
import "./commerce.css";

export default function CommerceCheckoutComplete() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || "";
  const token = searchParams.get("token") || "";
  const businessSlug = searchParams.get("business") || "";
  const [checkout, setCheckout] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!businessSlug || !sessionId || !token) {
      setState("error");
      setError("This payment link is incomplete.");
      return null;
    }
    try {
      const result = await getCommerceCheckoutStatus({ slug: businessSlug, sessionId, token });
      setCheckout(result);
      setState(result.status === "paid" ? "paid" : result.status === "review_required" ? "review" : "pending");
      if (result.status === "paid") {
        try {
          window.localStorage.removeItem(`webilo.cart.${result.businessSlug}`);
        } catch {
          // Storage may be blocked.
        }
      }
      return result;
    } catch (statusError) {
      setState("error");
      setError(statusError.message);
      return null;
    }
  }, [businessSlug, sessionId, token]);

  useEffect(() => {
    let cancelled = false;
    let timeout;
    let attempts = 0;
    const poll = async () => {
      const result = await refresh();
      if (cancelled || result?.status === "paid" || result?.status === "review_required") return;
      attempts += 1;
      if (attempts < 6) timeout = window.setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [refresh]);

  return (
    <main className="commerce-complete">
      <WebiloAnimatedLogo size={62} showWordmark />
      <section>
        {state === "loading" && <><h1>Confirming payment</h1><p>Waiting for Paystack’s secure confirmation…</p></>}
        {state === "pending" && <><h1>Payment is processing</h1><p>Paystack has not confirmed the payment yet. You can check again safely.</p></>}
        {state === "paid" && <><span className="commerce-complete__check">✓</span><h1>Payment confirmed</h1><p>Your order <strong>{checkout.publicReference}</strong> has been paid and sent to the business.</p><strong>{money(checkout.amount, checkout.currency)}</strong></>}
        {state === "review" && <><h1>Payment needs review</h1><p>No order will be fulfilled until the business verifies the payment details.</p></>}
        {state === "error" && <><h1>We could not check this payment</h1><p>{error}</p></>}
        <div>
          {["pending", "error"].includes(state) && <button onClick={refresh}>Check again</button>}
          {checkout?.businessSlug && <Link to={`/b/${checkout.businessSlug}`}>Return to business</Link>}
        </div>
      </section>
    </main>
  );
}

const money = (cents, currency = "ZAR") => new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(Number(cents || 0) / 100);
