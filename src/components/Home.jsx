import { Link } from "react-router-dom";
import { Icon } from "../features/websites/components/WebiloUI";
import "./styles/Home.css";

const featureCards = [
  ["sparkles", "Start with a conversation", "Tell Webilo about your business in plain language. It turns your answers into a focused website plan before generating anything."],
  ["layers", "Edit the structure, not code", "Change the words, reorder sections, add pages, and tune your theme in one calm, visual workspace."],
  ["desktop", "Preview every screen", "Check desktop, tablet, and mobile as you work. Your site stays connected to the same project from first draft to publish."],
];

export default function Home() {
  return (
    <div className="wl-home">
      <header className="wl-home-nav">
        <Link to="/" className="wl-brand"><span>W</span><strong>webilo</strong></Link>
        <nav><a href="#how-it-works">How it works</a><a href="#features">Features</a></nav>
        <div><Link to="/login">Sign in</Link><Link className="wl-home-nav__cta" to="/register">Start building <Icon name="arrow" size={16} /></Link></div>
      </header>

      <main>
        <section className="wl-home-hero">
          <div className="wl-home-hero__copy">
            <p><Icon name="sparkles" size={15} /> AI website builder for small businesses</p>
            <h1>A website that starts with <em>your idea.</em></h1>
            <span>Describe your business. Review the plan. Edit every detail. Webilo turns a conversation into a polished website you can confidently publish.</span>
            <div><Link className="wl-home-button" to="/register">Create your website <Icon name="arrow" /></Link><a href="#how-it-works">See how it works</a></div>
            <small>No code required · Start free · Your draft stays private</small>
          </div>
          <div className="wl-home-hero__visual">
            <div className="wl-home-app-card">
              <div className="wl-home-app-card__bar"><i /><i /><i /><span>moya-wellness.webilo.site</span></div>
              <div className="wl-home-app-card__body">
                <aside><strong>W</strong><i /><i /><i /></aside>
                <div className="wl-home-preview">
                  <nav><strong>Moya</strong><span /><span /><button /></nav>
                  <div><small>MOVE · BREATHE · RESTORE</small><h2>Feel more at home in your body.</h2><p>Small-group movement and wellness classes made for real life.</p><button>Explore classes</button></div>
                  <section><i /><i /><i /></section>
                </div>
                <div className="wl-home-inspector"><small>SECTION</small><strong>Hero</strong><label>Heading<i /></label><label>Body<i /><i /></label><small>BRAND COLOUR</small><span /></div>
              </div>
            </div>
            <span className="wl-home-float wl-home-float--one"><Icon name="check" /> Changes saved</span>
            <span className="wl-home-float wl-home-float--two"><Icon name="mobile" /> Mobile ready</span>
          </div>
        </section>

        <section className="wl-home-proof"><p>One connected path from idea to published website</p><div><span>Guided brief</span><Icon name="arrow" /><span>AI plan</span><Icon name="arrow" /><span>Visual editor</span><Icon name="arrow" /><span>Publish</span></div></section>

        <section className="wl-home-process" id="how-it-works">
          <header><p className="wl-eyebrow">A clearer way to build</p><h2>Know what happens next, at every step.</h2><span>Webilo guides the decisions that matter and keeps you in control of the result.</span></header>
          <div>
            <article><span>01</span><h3>Share your idea</h3><p>Answer a few focused questions about your business, audience, goal, and style.</p></article>
            <article><span>02</span><h3>Approve the plan</h3><p>Review the pages and sections before Webilo writes content or chooses a layout.</p></article>
            <article><span>03</span><h3>Make it yours</h3><p>Edit content directly, adjust the theme, preview each device, and publish when ready.</p></article>
          </div>
        </section>

        <section className="wl-home-features" id="features">
          {featureCards.map(([icon, title, body]) => <article key={title}><span><Icon name={icon} /></span><h3>{title}</h3><p>{body}</p></article>)}
        </section>

        <section className="wl-home-final">
          <span><Icon name="sparkles" size={24} /></span>
          <h2>Your idea deserves more than a generic template.</h2>
          <p>Build a focused first draft in minutes, then shape it into a website that feels like yours.</p>
          <Link className="wl-home-button" to="/register">Start building free <Icon name="arrow" /></Link>
        </section>
      </main>
      <footer className="wl-home-footer"><Link to="/" className="wl-brand"><span>W</span><strong>webilo</strong></Link><p>AI-powered websites, made clear.</p><div><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></div></footer>
    </div>
  );
}
