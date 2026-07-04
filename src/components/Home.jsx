import { Link } from "react-router-dom";
import { Icon } from "../features/websites/components/WebiloUI";
import WebiloAnimatedLogo from "./WebiloAnimatedLogo";
import "./styles/Home.css";

const featureCards = [
  ["grid", "One business foundation", "Offer, customers, products, services, and brand in one place."],
  ["sparkles", "Practical guidance", "Recommendations based on your goals and business stage."],
  ["site", "A connected website", "Collect enquiries, orders, and bookings from real customers."],
];

export default function Home() {
  return (
    <div className="wl-home">
      <header className="wl-home-nav">
        <Link to="/" className="wl-brand"><WebiloAnimatedLogo size={36} showWordmark wordmarkSize={21} /></Link>
        <nav><a href="#how-it-works">How it works</a><a href="#features">What it manages</a></nav>
        <div><Link to="/login">Sign in</Link><Link className="wl-home-nav__cta" to="/register">Start your business <Icon name="arrow" size={16} /></Link></div>
      </header>

      <main>
        <section className="wl-home-hero">
          <div className="wl-home-hero__copy">
            <p><Icon name="sparkles" size={15} /> AI business launch assistant</p>
            <h1>Build the business, <em>not just the website.</em></h1>
            <span>Describe your business once. Run it from one connected workspace.</span>
            <div><Link className="wl-home-button" to="/register">Set up your business <Icon name="arrow" /></Link><a href="#how-it-works">See how Webilo works</a></div>
          </div>

          <div className="wl-home-hero__visual">
            <div className="wl-home-app-card">
              <div className="wl-home-app-card__bar"><i /><i /><i /><span>Moya Wellness · Business workspace</span></div>
              <div className="wl-home-command-shell">
                <aside><strong>W</strong><i /><i /><i /><i /></aside>
                <div className="wl-home-command">
                  <header><small>BUSINESS COMMAND CENTRE</small><h2>Good morning, Naledi.</h2><p>Here is what will move Moya Wellness forward.</p></header>
                  <section className="wl-home-command__metrics"><div><small>READINESS</small><strong>78%</strong></div><div><small>NEW LEADS</small><strong>12</strong></div><div><small>BOOKINGS</small><strong>8</strong></div></section>
                  <article><span><Icon name="sparkles" size={14} /></span><div><small>RECOMMENDED NEXT</small><strong>Add two customer reviews</strong><p>Reviews will strengthen trust before you publish.</p></div><Link to="/register">Continue</Link></article>
                  <div className="wl-home-command__list"><span><i className="done"><Icon name="check" size={11} /></i>Business profile</span><span><i className="done"><Icon name="check" size={11} /></i>Services added</span><span><i><Icon name="plus" size={11} /></i>Trust signals</span></div>
                </div>
                <div className="wl-home-advisor"><span><Icon name="sparkles" /></span><small>WEBILO ADVISOR</small><strong>Your offer is clear.</strong><p>Next, add proof that customers can trust before publishing.</p><a href="#how-it-works">View launch plan</a></div>
              </div>
            </div>
            <span className="wl-home-float wl-home-float--one"><Icon name="check" /> Business profile ready</span>
            <span className="wl-home-float wl-home-float--two"><Icon name="site" /> Website connected</span>
          </div>
        </section>

        <section className="wl-home-proof"><div><span>Business profile</span><Icon name="arrow" /><span>Launch plan</span><Icon name="arrow" /><span>Digital presence</span><Icon name="arrow" /><span>Customers</span></div></section>

        <section className="wl-home-process" id="how-it-works">
          <header><p className="wl-eyebrow">How it works</p><h2>Start with the business.</h2></header>
          <div>
            <article><span>01</span><h3>Describe it</h3><p>What you do, sell, and want to achieve.</p></article>
            <article><span>02</span><h3>Review it</h3><p>Approve your offer, tools, and brand.</p></article>
            <article><span>03</span><h3>Run it</h3><p>Launch, serve customers, and improve.</p></article>
          </div>
        </section>

        <section className="wl-home-features" id="features">
          {featureCards.map(([icon, title, body]) => <article key={title}><span><Icon name={icon} /></span><h3>{title}</h3><p>{body}</p></article>)}
        </section>

        <section className="wl-home-final">
          <span><Icon name="sparkles" size={24} /></span>
          <h2>Ready to run your business?</h2>
          <Link className="wl-home-button" to="/register">Create your business workspace <Icon name="arrow" /></Link>
        </section>
      </main>
      <footer className="wl-home-footer"><Link to="/" className="wl-brand"><WebiloAnimatedLogo size={36} showWordmark wordmarkSize={21} /></Link><p>The AI operating layer for taking a business online.</p><div><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></div></footer>
    </div>
  );
}
