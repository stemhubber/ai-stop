import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { checkSiteNameExists, publishSite } from "../controllers/SiteController";
import "./styles/PublishNewSite.css";
import { useAuth } from "../context/AuthContext";
import WebsiteCreatedModal from "./WebsiteCreatedModal";

export default function PublishNewSite() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const siteHtml = state?.siteHtml;
  const [error, setError] = useState("");

  const [siteName, setSiteName] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [plan, setPlan] = useState("monthly");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { user } = useAuth();
  

  const handleCheckName = async () => {
    setError('');
    if (!siteName || siteName.length < 3 ) {
      setError("Please enter a longer name");
      return
    }
    setChecking(true);
    const exists = await checkSiteNameExists(siteName);
    setAvailable(!exists);
    setChecking(false);
    return !exists;
  };

  const handlePublish = async () => {
    const checkPassed = await handleCheckName();
    if (!checkPassed) {
      setError('Website name taken');
      return;
    }
    setPaymentProcessing(true);
    setError('');

    // Mock payment process
    await new Promise((res) => setTimeout(res, 2000));

    await publishSite(siteName, siteHtml, plan, user);

    setPaymentProcessing(false);

    window.open(`${window.location.origin}/site/${siteName}`, "_blank");
    navigate("/app");

  };

  return (
    <div className="publish-container">
      <h1 className="publish-title">Publish Your Website</h1>

      <WebsiteCreatedModal show={showModal} step={'publishing'} onClose={()=> setShowModal(false)}/>

      {/* Site Name */}
      <label className="publish-label">Choose a Site Name</label>

      <div className="publish-row">
        <input
          className="publish-input"
          placeholder="my-portfolio"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value.toLowerCase())}
        />
        <button className="publish-check-btn" onClick={handleCheckName}>
          Check
        </button>
      </div>

      {checking && <p className="publish-info">Checking availability...</p>}
      <p>{error}</p>
      {available === true && (
        <p className="publish-available">✔ Name is available</p>
      )}
      {available === false && (
        <p className="publish-taken">✖ Name already taken</p>
      )}

      {/* Plan selector */}
      <label className="publish-label">Select a Plan</label>

      <div className="publish-plans">
        <div
          className={`publish-plan ${plan === "monthly" ? "active" : ""}`}
          onClick={() => setPlan("monthly")}
        >
          <h3>Monthly</h3>
          <p>R49 / month</p>
        </div>

        <div
          className={`publish-plan ${plan === "annual" ? "active" : ""}`}
          onClick={() => setPlan("annual")}
        >
          <h3>Annual</h3>
          <p>R499 / year</p>
        </div>
      </div>

      {/* Publish */}
      <button
        className="publish-btn"
        disabled={!available || paymentProcessing}
        onClick={handlePublish}
      >
        {paymentProcessing ? "Processing Payment..." : "Publish Website"}
      </button>
    </div>
  );
}
