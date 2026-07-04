import { useState } from "react";
import { Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../services/firebase.config";
import { Icon } from "../features/websites/components/WebiloUI";
import WebiloAnimatedLogo from "./WebiloAnimatedLogo";
import "./styles/Auth.css";

function AuthLayout({ mode, children }) {
  const isRegister = mode === "register";
  return (
    <main className="wl-auth">
      <section className="wl-auth__intro">
        <Link to="/" className="wl-brand"><WebiloAnimatedLogo size={42} showWordmark wordmarkSize={24} inverse /></Link>
        <div>
          <p className="wl-eyebrow">AI business launch assistant</p>
          <h1>{isRegister ? "Turn your idea into a working business." : "Welcome back to your business."}</h1>
          <p>{isRegister ? "Set up your offer, digital presence, customer tools, and website in one guided workspace." : "Review what needs attention, serve customers, and keep improving your online business."}</p>
          <ul>
            <li><Icon name="check" /> AI-guided business setup</li>
            <li><Icon name="check" /> Products, services, customers, and leads</li>
            <li><Icon name="check" /> A connected website when you are ready</li>
          </ul>
        </div>
        <small>Your drafts stay private until you publish.</small>
      </section>
      <section className="wl-auth__form-wrap">{children}</section>
    </main>
  );
}

function GoogleButton({ onClick, loading }) {
  return <button className="wl-auth__google" type="button" onClick={onClick} disabled={loading}><span>G</span>Continue with Google</button>;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter both your email address and password.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace("/business");
    } catch {
      setError("Those details did not match an account. Check them and try again.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await setDoc(doc(db, "users", result.user.uid), { email: result.user.email, createdAt: Date.now(), sites: [] }, { merge: true });
      window.location.replace("/business");
    } catch {
      setError("Google sign-in could not be completed. Try again or use your email.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <form className="wl-auth-card" onSubmit={handleLogin}>
        <header><p className="wl-eyebrow">Sign in</p><h2>Open your business workspace</h2><span>Use the account connected to your businesses.</span></header>
        <GoogleButton onClick={handleGoogleLogin} loading={loading} />
        <div className="wl-auth__divider"><span>or use email</span></div>
        <label><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
        {error && <p className="wl-auth__error" role="alert">{error}</p>}
        <button className="wl-auth__submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}<Icon name="arrow" /></button>
        <p className="wl-auth__switch">New to Webilo? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createAccount = async (event) => {
    event.preventDefault();
    setError("");
    if (!email) return setError("Enter the email address you want to use.");
    if (password.length < 6) return setError("Use at least 6 characters for your password.");
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCred.user.uid), { email, createdAt: Date.now(), sites: [] });
      window.location.replace("/business");
    } catch {
      setError("We could not create that account. The email may already be in use.");
      setLoading(false);
    }
  };

  const createWithGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await setDoc(doc(db, "users", result.user.uid), { email: result.user.email, createdAt: Date.now(), sites: [] }, { merge: true });
      window.location.replace("/business");
    } catch {
      setError("Google sign-up could not be completed. Try again or use your email.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="register">
      <form className="wl-auth-card" onSubmit={createAccount}>
        <header><p className="wl-eyebrow">Create your workspace</p><h2>Start with your business idea</h2><span>Tell Webilo what you do. AI will help structure the business before building its digital presence.</span></header>
        <GoogleButton onClick={createWithGoogle} loading={loading} />
        <div className="wl-auth__divider"><span>or use email</span></div>
        <label><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label><span>Create a password</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></label>
        {error && <p className="wl-auth__error" role="alert">{error}</p>}
        <button className="wl-auth__submit" type="submit" disabled={loading}>{loading ? "Creating workspace…" : "Create account"}<Icon name="arrow" /></button>
        <p className="wl-auth__terms">By creating an account, you agree to use Webilo responsibly.</p>
        <p className="wl-auth__switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}
