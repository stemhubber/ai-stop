# Webilo UI — Usage Guide

This guide explains how to add and reuse UI in the current Webilo React application. It reflects the repository as it exists today; it is not an Angular or standalone component-library guide.

## Setup

Install the project dependencies from the repository root:

```bash
npm install
npm start
```

The application uses Create React App and runs at `http://localhost:3000`.

## UI structure

UI code is organized by feature:

```text
src/
  components/
    ComponentName.jsx
    styles/
      ComponentName.css
  Billing/
    Billing.jsx
    styles/
      Billing.css
  linkyloop/
    components/
      MessagingMain.jsx
      styles/
        MessagingMain.css
```

Keep a component beside its feature and place its stylesheet in that feature's `styles/` directory.

## Creating a component

Create a JSX file and import its stylesheet directly:

```jsx
// src/components/BusinessCard.jsx
import "./styles/BusinessCard.css";

export default function BusinessCard({ business, onOpen }) {
  return (
    <article className="business-card">
      <div>
        <h3 className="business-card-title">{business.name}</h3>
        <p className="business-card-description">{business.description}</p>
      </div>

      <button
        className="business-card-action"
        type="button"
        onClick={() => onOpen(business)}
      >
        Open
      </button>
    </article>
  );
}
```

```css
/* src/components/styles/BusinessCard.css */
.business-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.business-card-title {
  margin: 0 0 6px;
}

.business-card-description {
  margin: 0;
  color: var(--text-soft);
}

.business-card-action {
  padding: 10px 16px;
  color: #fff;
  background: var(--primary);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: var(--transition);
}

.business-card-action:hover {
  background: var(--primary-hover);
}
```

CSS imported by a component is still global. Use a feature-specific prefix such as `business-card-`, `dash2030-`, or `billing-` to avoid class collisions.

## Global styles and third-party CSS

`src/index.js` loads `src/index.css` before rendering the app. `index.css` contains the global body defaults and imports Leaflet:

```css
@import "leaflet/dist/leaflet.css";
```

Add only application-wide resets, font defaults, and third-party CSS to `index.css`. Keep feature styles with their components.

`src/App.css` is also global because it is imported by `App.js`. It currently contains the original Create React App `.App` rules; do not use it as a component stylesheet.

## Shared style library

The repository also provides an opt-in style library:

```text
lib/styles/webilo-tokens.css
lib/styles/webilo.css
```

Load the tokens before the components:

```css
@import "../lib/styles/webilo-tokens.css";
@import "../lib/styles/webilo.css";
```

This provides reusable `wb-` classes for typography, buttons, fields, cards, badges, toggles, progress bars, metrics, skeletons, tables, avatars, and layout utilities:

```jsx
<div className="wb-card">
  <p className="wb-heading">Today's summary</p>
  <p className="wb-secondary">12 active websites</p>
  <button className="wb-btn wb-btn-primary" type="button">
    Create website
  </button>
</div>
```

The library is not imported by the React application automatically. Feature styles can continue to coexist with it because library classes and variables use the `wb-` prefix.

## Theme tokens

The dashboard stylesheet defines the current shared theme variables:

```css
:root {
  --bg: #f7f8fc;
  --panel: rgba(255, 255, 255, 0.65);
  --panel-deep: rgba(255, 255, 255, 0.82);
  --nav-bg: rgba(255, 255, 255, 0.55);
  --border: rgba(0, 0, 0, 0.07);
  --shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  --text: #1a1c20;
  --text-soft: #6f7480;
  --primary: #5c6cff;
  --primary-hover: #4355e8;
  --radius: 16px;
  --radius-lg: 20px;
  --transition: 0.25s ease;
}
```

Use these variables in new dashboard-compatible components instead of repeating color values.

The current dark theme is activated with:

```html
<html data-theme="dark">
```

and overridden in CSS:

```css
html[data-theme="dark"] {
  --bg: #111317;
  --text: #eef0f5;
  --text-soft: #9fa4b0;
  --primary: #8893ff;
}
```

## Theme toggle

The dashboard and messaging screens set `data-theme` on the root element. Follow the same pattern:

```jsx
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("data-theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("data-theme", theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle-btn"
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
```

Use the `data-theme` storage key consistently in new code. `App.js` currently also reads a separate `theme` key, so the global theme implementation should be consolidated before treating it as a reusable design-system API.

## Buttons

Button classes currently belong to individual features rather than a shared button component:

```jsx
<button className="dash2030-create-btn" type="button">
  Create a Website
</button>

<button className="dash2030-btn-secondary" type="button">
  Edit
</button>

<button className="billing-button" type="button" disabled={loading}>
  {loading ? "Processing..." : "Pay now"}
</button>
```

Reuse a class only when the component is in the same feature. For cross-feature reuse, extract a React component and shared stylesheet first instead of depending on another screen's private class.

## Form fields

Forms use controlled React state:

```jsx
import { useState } from "react";

export default function BusinessForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }

    setError("");
    onSubmit({ name: name.trim() });
  };

  return (
    <form className="business-form" onSubmit={handleSubmit}>
      <label className="business-form-label" htmlFor="business-name">
        Business name
      </label>

      <input
        id="business-name"
        className="business-form-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Thandi's Kitchen"
      />

      {error && (
        <p className="business-form-error" role="alert">
          {error}
        </p>
      )}

      <button className="business-form-submit" type="submit">
        Save
      </button>
    </form>
  );
}
```

Always connect labels with `htmlFor` and `id`, use a real `<form>`, and give validation messages `role="alert"`.

## Loading, empty, and error states

Existing screens render state explicitly:

```jsx
if (loading) {
  return <div className="dash2030-loading">Loading…</div>;
}

if (error) {
  return <p className="business-error" role="alert">{error}</p>;
}

if (businesses.length === 0) {
  return <div className="dash2030-empty">No businesses yet.</div>;
}
```

Do not render an empty table or grid while data is loading.

## Modals

Use a backdrop, stop click propagation on the dialog, and expose a close button:

```jsx
export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        {children}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}
```

For destructive confirmations, reuse `src/components/ConfirmModal.jsx`.

## Animation

Framer Motion is the standard animation library in the current UI:

```jsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence>
  {open && (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

Use CSS transitions for simple hover and focus effects. Use Framer Motion for mounted/unmounted elements, modal transitions, and coordinated animation.

## Routing and protected screens

Routes are registered in `src/App.js` with React Router:

```jsx
import BusinessPage from "./components/BusinessPage";

<Route
  path="/business"
  element={
    <RequireAuth>
      <BusinessPage />
    </RequireAuth>
  }
/>
```

Wrap owner-only screens in `RequireAuth`. Public website routes should remain unwrapped.

Inside a component, navigate without forcing a page reload:

```jsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
navigate("/studio");
```

## Authentication state

Use the existing authentication context:

```jsx
import { useAuth } from "../context/AuthContext";

export default function AccountSummary() {
  const { user, logout } = useAuth();

  return (
    <div>
      <span>{user?.email}</span>
      <button type="button" onClick={logout}>Sign out</button>
    </div>
  );
}
```

Do not create a second Firebase auth listener inside ordinary UI components.

## Firestore data

Keep Firestore calls out of presentation markup. Add operations to a controller or service and call them from the component:

```jsx
import { useEffect, useState } from "react";
import { getUserSites } from "../controllers/UserController";
import { useAuth } from "../context/AuthContext";

export default function SiteList() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    getUserSites(user.uid)
      .then(setSites)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  if (loading) return <p>Loading…</p>;

  return sites.map((site) => <div key={site.id}>{site.name}</div>);
}
```

Every rendered collection item must have a stable `key`; use the Firestore document ID rather than the array index.

## Images and uploads

Use Firebase Storage for user-uploaded media. Existing examples are in:

- `ImageUploader.jsx`
- `GalleryUploader.jsx`
- `VideoUploader.jsx`
- `ProductManager.jsx`

Always include useful alternative text:

```jsx
<img src={product.imageUrl} alt={product.name} />
```

Use `alt=""` only for decorative images.

## Maps

Use `MapPicker.jsx` for editable Leaflet/OpenStreetMap locations. Leaflet's stylesheet is already imported globally in `index.css`.

Google Maps and Street View are currently rendered as embeds. Do not add `@react-google-maps/api` to a component unless an interactive Google Maps API feature is specifically required and its key is configured.

## Icons

Several screens use Font Awesome `fa` class names:

```jsx
<i className="fa fa-plus" aria-hidden="true"></i>
```

The repository does not currently provide a single global icon-system wrapper. When an icon is decorative, add `aria-hidden="true"` and keep the action name as visible text or an `aria-label`.

## AI-assisted UI

`SiteEditor.jsx` calls `AiController.js` for generated site content, and `VoiceInput.jsx` uses OpenAI audio transcription. UI code should:

1. Disable repeat actions while a request is running.
2. Render API errors without discarding the current form state.
3. Let the user review generated content before publishing.
4. Treat generated HTML or URLs as untrusted input.

The current OpenAI requests run in the browser. Do not add new privileged AI operations to frontend components; route them through Firebase Cloud Functions.

## Responsive UI

Add a mobile layout with the component stylesheet:

```css
.business-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 900px) {
  .business-grid {
    grid-template-columns: 1fr;
  }
}
```

Avoid fixed widths for dashboard content. Existing dashboard layouts use a full-width container with a maximum width.

## Testing a component

The project uses Jest and React Testing Library through Create React App:

```jsx
import { fireEvent, render, screen } from "@testing-library/react";
import BusinessCard from "./BusinessCard";

test("opens the selected business", () => {
  const onOpen = jest.fn();
  const business = { id: "business-1", name: "Thandi's Kitchen" };

  render(<BusinessCard business={business} onOpen={onOpen} />);
  fireEvent.click(screen.getByRole("button", { name: "Open" }));

  expect(onOpen).toHaveBeenCalledWith(business);
});
```

Run tests with:

```bash
npm test
```

## Current conventions

- Use functional React components and hooks.
- Use `.jsx` for components and `.js` for controllers, services, and contexts.
- Import component CSS directly from the component.
- Prefix CSS classes by feature to reduce global collisions.
- Reuse the existing theme variables where available.
- Use Framer Motion for structural animation.
- Use `RequireAuth` for protected routes.
- Use `useAuth()` instead of creating additional auth subscriptions.
- Keep Firebase and external API operations in controllers or services.
- Include loading, empty, error, keyboard, and accessible-label behavior.

## Known limitations

The `lib/styles/` library supplies reusable CSS classes but not React component wrappers. Existing screens still use feature-specific styles and separate theme variables. Adopt the `wb-` classes incrementally, and extract React wrappers when a pattern needs shared behavior as well as shared styling.
