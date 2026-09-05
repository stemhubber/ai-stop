import { useEffect, useMemo, useState } from "react";
import { createRecord } from "../../services/businessRepository";
import { extractBusinessImage } from "../../services/aiService";
import { Icon } from "../../features/websites/components/WebiloUI";

export default function AIVisualImporter({ businessId, resource, onImported, onClose }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const analyze = async () => {
    if (!file) return setError("Choose a menu, poster, price list, or catalogue image.");
    setState("analyzing");
    setError("");
    try {
      const data = await extractBusinessImage(file, resource);
      const items = (data.items || []).filter((item) => item.name?.trim());
      setResult({ ...data, items });
      setSelected(items.map((_, index) => index));
      setState("review");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "The image could not be analyzed.");
      setState("idle");
    }
  };

  const updateItem = (index, field, value) => {
    setResult((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const importItems = async () => {
    if (!selected.length) return setError("Select at least one item to import.");
    setState("importing");
    setError("");
    try {
      await Promise.all(selected.map((index) => {
        const item = result.items[index];
        const common = {
          name: item.name.trim(),
          description: item.description?.trim() || "",
          price: Math.round(Number(item.price || 0) * 100),
          category: item.category?.trim() || "",
          currency: "ZAR",
          status: "active",
          source: "ai-image-import",
        };
        if (resource === "offers") {
          return createRecord(businessId, "offers", {
            ...common,
            offerType: "product",
            pricingMode: "fixed",
            fulfilmentMethods: ["pickup"],
            available: true,
            prepMinutes: Number(item.durationMinutes || 0) || null,
          });
        }
        return createRecord(
          businessId,
          resource,
          resource === "services"
            ? { ...common, durationMinutes: Number(item.durationMinutes || 0), bookingEnabled: true }
            : common
        );
      }));
      setState("done");
      await onImported();
    } catch (err) {
      setError(err.message || "The extracted items could not be imported.");
      setState("review");
    }
  };

  return (
    <section className="wb-card product-ai-importer">
      <header>
        <div><span className="wb-label">AI visual import</span><h2 className="wb-heading">{resource === "offers" ? "Turn a menu photo into catalogue items" : `Turn an old menu or poster into ${resource}`}</h2><p className="wb-secondary">Upload a clear image. AI extracts the details, then you review everything before it is saved.</p></div>
        <button className="wb-btn wb-btn-ghost wb-btn-sm" onClick={onClose} aria-label="Close AI import"><Icon name="close" size={16} /> Close</button>
      </header>

      {!result && (
        <div className="product-ai-upload">
          <label>
            {previewUrl ? <img src={previewUrl} alt="Selected document preview" /> : <span><Icon name="image" size={24} /><strong>Choose an image</strong><small>PNG, JPEG, or WebP · maximum 5 MB</small></span>}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button className="wb-btn wb-btn-primary" type="button" onClick={analyze} disabled={state === "analyzing"}>{state === "analyzing" ? "Reading the image…" : "Analyze with AI"}</button>
        </div>
      )}

      {result && (
        <>
          <div className="product-ai-summary"><Icon name="sparkles" /><div><strong>{result.title || "Extracted content"}</strong><p>{result.summary || `${result.items.length} items found.`}</p></div><span>{result.items.length} found</span></div>
          <div className="product-ai-items">
            {result.items.map((item, index) => (
              <article className={selected.includes(index) ? "selected" : ""} key={`${item.name}_${index}`}>
                <label className="product-ai-check"><input type="checkbox" checked={selected.includes(index)} onChange={() => setSelected((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} /><span /></label>
                <div className="product-ai-item-fields">
                  <label className="wb-field"><span className="wb-field-label">Name</span><input className="wb-input" value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} /></label>
                  <label className="wb-field"><span className="wb-field-label">Price (R)</span><input className="wb-input" type="number" min="0" value={item.price || ""} onChange={(event) => updateItem(index, "price", event.target.value)} /></label>
                  <label className="wb-field product-ai-description"><span className="wb-field-label">Description</span><input className="wb-input" value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} /></label>
                </div>
                <small>{Math.round(item.confidence * 100)}% confidence</small>
              </article>
            ))}
          </div>
          <footer><button className="wb-btn" type="button" onClick={() => { setResult(null); setState("idle"); }}>Use another image</button><button className="wb-btn wb-btn-primary" type="button" onClick={importItems} disabled={state === "importing"}>{state === "importing" ? "Importing…" : `Import ${selected.length} ${resource}`}</button></footer>
        </>
      )}
      {state === "done" && <p className="product-ai-success"><Icon name="check" size={16} /> Items imported. You can edit them below.</p>}
      {error && <p className="wb-field-error" role="alert">{error}</p>}
    </section>
  );
}

