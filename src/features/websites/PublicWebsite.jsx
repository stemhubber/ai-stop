import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublishedWebsite } from "../../services/websiteRepository";
import { getBusiness, listPublicOffers } from "../../services/businessRepository";
import { submitPublicBusinessRequest } from "../../services/commerceService";
import WebsitePreview from "./components/WebsitePreview";
import { EmptyState, Icon } from "./components/WebiloUI";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";
import PublicCheckoutPanel from "../commerce/PublicCheckoutPanel";
import { checkoutEligible, useCommerceCart } from "../commerce/cart";

const emptyRequest = {
  name: "",
  email: "",
  phone: "",
  message: "",
  requestType: "contact",
  offerKey: "",
  quantity: 1,
  fulfilmentMethod: "",
  startTime: "",
  company: "",
};

export default function PublicWebsite() {
  const { slug } = useParams();
  const siteRef = useRef(null);
  const [project, setProject] = useState(null);
  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [pageId, setPageId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [request, setRequest] = useState(emptyRequest);
  const [requestState, setRequestState] = useState("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [pendingTarget, setPendingTarget] = useState("");
  const cart = useCommerceCart(business?.slug || slug);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getPublishedWebsite(slug)
      .then(async (website) => {
        if (cancelled) return;
        if (!website) {
          setStatus("missing");
          return;
        }
        setProject(website);
        setPageId(website.pages[0]?.id);
        const businessId = website.settings?.businessId;
        if (businessId) {
          const [nextBusiness, nextOffers] = await Promise.all([
            getBusiness(businessId).catch(() => null),
            listPublicOffers(businessId).catch(() => []),
          ]);
          if (cancelled) return;
          setBusiness(nextBusiness);
          setProducts(nextOffers.filter((item) => item.offerType !== "service"));
          setServices(nextOffers.filter((item) => item.offerType === "service"));
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!pendingTarget || !project) return;
    const frame = window.requestAnimationFrame(() => {
      const selector = pendingTarget === "products"
        ? "#site-products"
        : pendingTarget === "services"
          ? "#site-services"
          : '[data-section-type="contact"]';
      siteRef.current?.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingTarget("");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pageId, pendingTarget, project]);

  const navigateTo = (target) => {
    if (!project) return;
    if (target === "products" || target === "services") {
      setPageId(project.pages[0]?.id);
      setPendingTarget(target);
      return;
    }
    const targetPage = project.pages.find((candidate) =>
      candidate.sections.some((section) => section.visibility && section.type === target)
    );
    if (targetPage) setPageId(targetPage.id);
    setPendingTarget(target);
  };

  const changePage = (nextPageId) => {
    setPageId(nextPageId);
    window.requestAnimationFrame(() => {
      siteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const chooseProduct = (product) => {
    if (business?.checkoutEnabled && checkoutEligible(product)) {
      cart.add(product);
      return;
    }
    setRequest((current) => ({
      ...current,
      requestType: "order",
      offerKey: product.key,
      fulfilmentMethod: product.fulfilmentMethods?.[0] || "pickup",
      startTime: "",
    }));
    setRequestMessage("");
    navigateTo("contact");
  };

  const chooseService = (service) => {
    setRequest((current) => ({
      ...current,
      requestType: "booking",
      offerKey: service.key,
      fulfilmentMethod: service.fulfilmentMethods?.[0] || "booking",
      startTime: "",
    }));
    setRequestMessage("");
    navigateTo("contact");
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!business?.slug) return setRequestMessage("This business is not accepting online requests yet.");
    if (!request.name.trim() || !request.phone.trim()) {
      return setRequestMessage("Enter your name and phone number.");
    }

    const offer = [...products, ...services].find((item) => item.key === request.offerKey);
    const product = request.requestType === "order" ? offer : null;
    const service = request.requestType === "booking" ? offer : null;
    if (request.requestType === "order" && !product) return setRequestMessage("Choose a product to order.");
    if (request.requestType === "booking" && (!service || (request.fulfilmentMethod === "booking" && !request.startTime))) {
      return setRequestMessage("Choose a service and preferred date.");
    }

    setRequestState("saving");
    setRequestMessage("");
    try {
      const result = await submitPublicBusinessRequest({
        slug: business.slug,
        requestType: request.requestType === "contact" ? "contact" : "offer",
        customer: {
          name: request.name.trim(),
          email: request.email.trim(),
          phone: request.phone.trim(),
        },
        selection: offer ? {
          resource: offer.sourceResource,
          id: offer.sourceId,
          quantity: Math.max(1, Number(request.quantity || 1)),
        } : undefined,
        fulfilmentMethod: request.fulfilmentMethod,
        requestedStartTime: request.startTime,
        notes: request.message.trim(),
        company: request.company,
      });

      const success = request.requestType === "order"
        ? `Order request received. Reference: ${result.reference}.`
        : request.requestType === "booking"
          ? `Booking request received. Reference: ${result.reference}.`
          : "Thanks. The business has received your details.";
      setRequest(emptyRequest);
      setRequestMessage(success);
      setRequestState("done");
    } catch {
      setRequestMessage("Your request could not be sent. Please try again.");
      setRequestState("error");
    }
  };

  if (status === "loading") {
    return <div className="wl-public-loading"><WebiloAnimatedLogo size={68} /><p>Opening business website…</p></div>;
  }

  if (status !== "ready" || !project) {
    return (
      <main className="wl-public-error">
        <EmptyState
          icon="site"
          title={status === "missing" ? "This website is not published" : "The website could not be loaded"}
          body={status === "missing" ? "Check the address or ask the website owner for an updated link." : "Check your connection and try again."}
          action={<a href="/"><Icon name="arrow" /> Visit Webilo</a>}
        />
      </main>
    );
  }

  const page = project.pages.find((item) => item.id === pageId) || project.pages[0];
  const contactForm = project.settings?.businessId ? (
    <form className="wl-site-contact-form" onSubmit={submitRequest}>
      <label><span>Name</span><input required value={request.name} onChange={(event) => setRequest({ ...request, name: event.target.value })} /></label>
      <label><span>Email</span><input type="email" value={request.email} onChange={(event) => setRequest({ ...request, email: event.target.value })} /></label>
      <label><span>Phone</span><input required value={request.phone} onChange={(event) => setRequest({ ...request, phone: event.target.value })} /></label>
      <label>
        <span>What would you like to do?</span>
        <select value={request.requestType} onChange={(event) => setRequest({ ...request, requestType: event.target.value, offerKey: "", fulfilmentMethod: "", startTime: "" })}>
          <option value="contact">Send an enquiry</option>
          {products.length > 0 && <option value="order">Place an order</option>}
          {services.length > 0 && <option value="booking">Book a service</option>}
        </select>
      </label>
      {request.requestType === "order" && (
        <>
          <label>
            <span>Product</span>
            <select required value={request.offerKey} onChange={(event) => {
              const offer = products.find((item) => item.key === event.target.value);
              setRequest({ ...request, offerKey: event.target.value, fulfilmentMethod: offer?.fulfilmentMethods?.[0] || "pickup" });
            }}>
              <option value="">Choose a product</option>
              {products.map((product) => <option value={product.key} key={product.key}>{product.name}</option>)}
            </select>
          </label>
          <label><span>Quantity</span><input type="number" min="1" value={request.quantity} onChange={(event) => setRequest({ ...request, quantity: event.target.value })} /></label>
          {productFulfilment(products, request.offerKey).length > 0 && (
            <label>
              <span>Fulfilment</span>
              <select value={request.fulfilmentMethod} onChange={(event) => setRequest({ ...request, fulfilmentMethod: event.target.value })}>
                {productFulfilment(products, request.offerKey).map((method) => <option value={method} key={method}>{fulfilmentLabel(method)}</option>)}
              </select>
            </label>
          )}
        </>
      )}
      {request.requestType === "booking" && (
        <>
          <label>
            <span>Service</span>
            <select required value={request.offerKey} onChange={(event) => {
              const offer = services.find((item) => item.key === event.target.value);
              setRequest({ ...request, offerKey: event.target.value, fulfilmentMethod: offer?.fulfilmentMethods?.[0] || "booking" });
            }}>
              <option value="">Choose a service</option>
              {services.map((service) => <option value={service.key} key={service.key}>{service.name}</option>)}
            </select>
          </label>
          {request.fulfilmentMethod === "booking" && <label><span>Preferred date and time</span><input required type="datetime-local" value={request.startTime} onChange={(event) => setRequest({ ...request, startTime: event.target.value })} /></label>}
        </>
      )}
      <label className="wl-site-contact-form__message"><span>Message or notes</span><textarea rows="3" value={request.message} onChange={(event) => setRequest({ ...request, message: event.target.value })} /></label>
      <label className="public-honeypot" aria-hidden="true"><span>Company</span><input tabIndex="-1" autoComplete="off" value={request.company} onChange={(event) => setRequest({ ...request, company: event.target.value })} /></label>
      <button style={{ background: project.theme.primary }} disabled={requestState === "saving"}>
        {requestState === "saving" ? "Sending…" : request.requestType === "order" ? "Place order" : request.requestType === "booking" ? "Request booking" : "Send enquiry"}
      </button>
      {requestMessage && <p className={requestState === "error" ? "error" : ""} role="status">{requestMessage}</p>}
      {business?.phone && <a className="wl-site-contact-direct" href={`tel:${business.phone}`}>Or call {business.phone}</a>}
    </form>
  ) : null;

  return (
    <main className="wl-public-site" ref={siteRef}>
      <WebsitePreview
        project={project}
        page={page}
        onPageChange={changePage}
        onNavigate={navigateTo}
        onChooseProduct={chooseProduct}
        onChooseService={chooseService}
        products={products}
        services={services}
        contactForm={contactForm}
        checkoutEnabled={business?.checkoutEnabled}
        interactive={false}
      />
      <PublicCheckoutPanel business={business} cart={cart} accentColor={project.theme.primary} />
    </main>
  );
}

function productFulfilment(products, key) {
  return products.find((item) => item.key === key)?.fulfilmentMethods || [];
}

function fulfilmentLabel(method) {
  return {
    pickup: "Pickup",
    delivery: "Delivery",
    booking: "Book a date and time",
    digital: "Digital delivery",
    quote: "Request a quote",
  }[method] || method;
}
