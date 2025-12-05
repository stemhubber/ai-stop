import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { db, auth } from "../services/firebase.config";
import { doc, setDoc } from "firebase/firestore";
import "./styles/Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const googleProvider = new GoogleAuthProvider();

  const handleLogin = async () => {
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      window.location.href = "/";
    } catch (err) {
      setError("Incorrect login details.");
    }
  };

  const handleGoogleLogin = async () => {
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email,
          createdAt: Date.now(),
          plan: "free",
          sites: [],
        },
        { merge: true }
      );

      window.location.href = "/studio";
    } catch (err) {
      console.log(err);
      setError("Could not sign in with Google.");
    }
  };

  return (
    <div className="auth-container">
      <h1>Login</h1>

      <input
        className="auth-input"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="auth-input"
        placeholder="Password"
        type="password"
        onChange={(e) => setPass(e.target.value)}
      />

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" onClick={handleLogin}>
        Login
      </button>

      <button className="auth-btn google-btn" onClick={handleGoogleLogin}>
        Continue with Google
      </button>

      <a href="/register">Create account</a>
    </div>
  );
}

export function Register() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);

      await setDoc(doc(db, "users", userCred.user.uid), {
        email,
        createdAt: Date.now(),
        plan: "free",
        sites: []
      });

      window.location.href = "/";
    } catch (err) {
      console.log(err);
      setError("Could not register.");
    }
  };

  return (
    <div className="auth-container">
      <h1>Create Account</h1>

      <input
        className="auth-input"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="auth-input"
        placeholder="Password"
        type="password"
        onChange={(e) => setPass(e.target.value)}
      />

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" onClick={handleRegister}>
        Sign Up
      </button>

      <a href="/login">Login instead</a>
    </div>
  );
}
