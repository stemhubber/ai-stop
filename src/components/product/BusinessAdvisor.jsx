import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { usePlan } from "../../context/PlanContext";
import { Icon } from "../../features/websites/components/WebiloUI";
import {
  listAdvisorActivity,
  recordAdvisorAsset,
  streamAdvisor,
} from "../../services/advisorService";

const QUICK_PROMPTS = [
  "What is the most important thing I should do next?",
  "Give me three practical ways to get more customers.",
  "Help me write a simple promotion for this business.",
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(cents) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(cents || 0) / 100);
}

export default function BusinessAdvisor({ business, records, projects }) {
  const { usage, limit, remaining } = usePlan();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [qr, setQr] = useState(null);
  const aiLimit = limit("aiRequests");
  const aiRemaining = remaining("aiRequests");
  const offers = useMemo(
    () => [...(records.products || []), ...(records.services || [])],
    [records.products, records.services]
  );
  const publishedProject = projects.find(
    (project) => project.settings?.businessId === business.id && project.status === "published"
  );
  const publicUrl = publishedProject?.publishedSlug
    ? `${window.location.origin}/w/${publishedProject.publishedSlug}`
    : `${window.location.origin}/b/${business.slug}`;

  useEffect(() => {
    let cancelled = false;
    listAdvisorActivity(business.id)
      .then((items) => { if (!cancelled) setActivity(items); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [business.id]);

  const ask = async (suggestion) => {
    const question = String(suggestion || input).trim();
    if (!question || state === "streaming") return;
    const history = messages.slice(-6);
    setMessages((current) => [...current, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setState("streaming");
    try {
      await streamAdvisor({
        businessId: business.id,
        message: question,
        history,
        onDelta: (text) => setMessages((current) => current.map((item, index) =>
          index === current.length - 1 ? { ...item, content: item.content + text } : item
        )),
      });
      setState("idle");
      listAdvisorActivity(business.id).then(setActivity).catch(() => {});
    } catch (requestError) {
      setMessages((current) => current.filter((item, index) =>
        !(index === current.length - 1 && item.role === "assistant" && !item.content)
      ));
      setError(requestError.message);
      setState("error");
    }
  };

  const printProductList = () => {
    if (!offers.length) return setError("Add a product or service before creating a product list.");
    const popup = window.open("", "_blank");
    if (!popup) return setError("Allow pop-ups to open the printable product list.");
    popup.opener = null;
    const rows = offers.map((item) => `
      <article>
        <div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description)}</p></div>
        <strong>${money(item.price)}</strong>
      </article>
    `).join("");
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(business.name)} product list</title>
      <style>
        @page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#15211e;font-family:Arial,sans-serif}
        header{padding-bottom:20px;border-bottom:3px solid #176b5d}h1{margin:0;font-size:30px}header p{color:#687a75}
        article{padding:16px 0;display:grid;grid-template-columns:1fr auto;gap:24px;border-bottom:1px solid #dce6e2}
        h2{margin:0 0 5px;font-size:17px}article p{margin:0;color:#687a75;font-size:12px;line-height:1.5}
        strong{color:#105347}footer{margin-top:24px;color:#687a75;font-size:11px}
      </style></head><body><header><h1>${escapeHtml(business.name)}</h1><p>${escapeHtml(business.description)}</p></header>
      <main>${rows}</main><footer>${escapeHtml(business.phone || business.email || publicUrl)}</footer></body></html>`);
    popup.document.close();
    recordAdvisorAsset(business.id, "product_list").catch(() => {});
    window.setTimeout(() => { popup.focus(); popup.print(); }, 250);
  };

  const createQr = async () => {
    setError("");
    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 720,
        margin: 2,
        color: { dark: "#15211e", light: "#ffffff" },
      });
      setQr({ dataUrl, url: publicUrl });
      recordAdvisorAsset(business.id, "qr_code").catch(() => {});
    } catch {
      setError("The QR code could not be generated.");
    }
  };

  const latestAnswer = [...messages].reverse().find((item) => item.role === "assistant");
  const usedPercent = aiLimit ? Math.min(100, Math.round((Number(usage.aiRequests || 0) / aiLimit) * 100)) : 0;

  return (
    <section className="product-advisor" aria-labelledby="ask-webilo-title">
      <div className="product-advisor-main">
        <header>
          <div><span className="wl-eyebrow">Business advisor</span><h2 id="ask-webilo-title">Ask Webilo</h2></div>
          <span className="product-advisor-usage" title={`${usage.aiRequests || 0} of ${aiLimit} AI actions used`}>
            <i style={{ width: `${usedPercent}%` }} /> {aiRemaining} left
          </span>
        </header>

        {!latestAnswer && (
          <div className="product-advisor-prompts">
            {QUICK_PROMPTS.map((prompt) => <button onClick={() => ask(prompt)} key={prompt}>{prompt}</button>)}
          </div>
        )}
        {latestAnswer && (
          <div className="product-advisor-answer" aria-live="polite">
            <span><Icon name="sparkles" size={16} /></span>
            <p>{latestAnswer.content}{state === "streaming" && <i className="product-advisor-cursor" />}</p>
          </div>
        )}
        <form onSubmit={(event) => { event.preventDefault(); ask(); }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your next step, customers, pricing, or using Webilo…"
            maxLength="2000"
            rows="3"
            disabled={state === "streaming" || aiRemaining === 0}
            aria-label="Ask Webilo"
          />
          <button className="wb-btn wb-btn-primary" disabled={!input.trim() || state === "streaming" || aiRemaining === 0}>
            {state === "streaming" ? "Thinking…" : "Ask"}
          </button>
        </form>
        {error && <p className="product-feedback product-feedback--error" role="alert">{error}</p>}
        {aiRemaining === 0 && <p className="product-advisor-limit">Monthly AI allowance reached. Your business tools remain available.</p>}
      </div>

      <aside className="product-advisor-assets">
        <span className="wl-eyebrow">Quick outputs</span>
        <button onClick={printProductList} disabled={!offers.length}><Icon name="site" /><span><strong>A4 product list</strong><small>{offers.length ? `${offers.length} offers ready` : "Add products first"}</small></span></button>
        <button onClick={createQr}><Icon name="grid" /><span><strong>Business QR code</strong><small>Website or business page</small></span></button>
        <button onClick={() => ask(QUICK_PROMPTS[2])}><Icon name="sparkles" /><span><strong>Poster copy</strong><small>Draft a clear promotion</small></span></button>
        <button onClick={() => ask("Can you estimate my stock needs? Tell me what data is missing before making any estimate.")}><Icon name="clock" /><span><strong>Stock guidance</strong><small>Checks data before estimating</small></span></button>
      </aside>

      {qr && (
        <div className="product-advisor-qr">
          <button onClick={() => setQr(null)} aria-label="Close QR code"><Icon name="close" /></button>
          <img src={qr.dataUrl} alt={`QR code for ${business.name}`} />
          <strong>Business QR code</strong>
          <small>{qr.url}</small>
          <a className="wb-btn wb-btn-primary" href={qr.dataUrl} download={`${business.slug || "business"}-qr.png`}>Download PNG</a>
        </div>
      )}

      {activity.length > 0 && (
        <details className="product-advisor-history">
          <summary>Recent advisor activity</summary>
          {activity.slice(0, 5).map((item) => (
            <div key={item.id}>
              <Icon name={item.type === "asset" ? "site" : "sparkles"} size={14} />
              <span>{item.type === "asset" ? item.action?.replace("_", " ") : item.prompt}</span>
              <small>{item.status}</small>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
