# Webilo UI design decisions

This document answers the question "which component do I use for this?"
before you write a single line of JSX. Every rule has a reason.
When in doubt, refer here first.

---

## The one rule that governs everything

> **Never make the user think about the interface. Make them think about their business.**

A salon owner should not need to figure out whether clicking something
saves it or whether they need to press a button. Every decision below
follows from this.

---

## 1. Switches vs checkboxes vs radio buttons

This is the most misused group of controls. They look similar but mean
completely different things.

### Switch — for live settings that take effect immediately

Use when toggling changes something *right now*, with no save button.

```jsx
<Switch label="WhatsApp orders enabled" checked={enabled} onChange={setEnabled} />
```

**Use switch for:**
- Enabling/disabling a feature (WhatsApp orders, SMS follow-ups, online store live)
- Toggling visibility of something that's already saved (show business hours, display price)
- Any setting where the user expects the change to take effect on flip

**Rule:** If the user would expect to refresh the page and see the change,
it's a switch.

---

### Checkbox — for selections inside a form with a save/submit step

Use when the checkbox is part of a larger form that hasn't been submitted yet.

```jsx
<label>
  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
  I agree to the terms of service
</label>
```

**Use checkbox for:**
- Agreeing to terms
- Selecting items in a list to bulk-action (delete 3 orders, export 5 contacts)
- A preference inside a modal that has a "Save" button

**Rule:** If there's a Save button somewhere nearby, it's a checkbox.

---

### Radio buttons — for mutually exclusive options (pick one of N)

Use when only one option can be active at a time and all options are
visible at once.

```jsx
<fieldset>
  <legend>Booking confirmation</legend>
  <label><input type="radio" name="confirm" value="auto" /> Confirm automatically</label>
  <label><input type="radio" name="confirm" value="manual" /> I'll confirm each one</label>
</fieldset>
```

**Use radio for:**
- Payment method selection (Paystack / EFT / Cash on delivery)
- Booking confirmation mode (auto / manual)
- Notification frequency (immediately / daily digest / weekly)

**Never use a dropdown for fewer than 5 mutually exclusive options.**
Radio buttons are faster — the user can see all options at a glance.

---

## 2. Dropdowns vs radio vs segmented control

| # options | Visible at once? | Recommendation |
|-----------|-----------------|----------------|
| 2         | Yes             | Toggle / switch |
| 2–4       | Yes             | Radio buttons or segmented control |
| 5–8       | No              | Dropdown (select) |
| 9+        | No              | Searchable dropdown / combobox |

### Segmented control — for view-switching, not data entry

Use when the user is switching between modes of the *same screen*, not
selecting a value to save.

```jsx
<SegmentedControl
  options={['7 days', '30 days', '90 days']}
  value={range}
  onChange={setRange}
/>
```

**Use for:** date range on analytics, list/grid view toggle, order
status filter tabs. Not for forms.

---

## 3. Buttons

Four variants. Use exactly one per action type.

| Variant | Class | When to use | Rule |
|---------|-------|-------------|------|
| Primary | `wb-btn-primary` | The single most important action on the screen | Max **one** per view |
| Default | `wb-btn` | Secondary actions (Cancel, Edit, View) | Default choice |
| Accent | `wb-btn-accent` | Business-creating or revenue-positive actions | Create store, Launch site |
| Ghost | `wb-btn-ghost` | Tertiary, low-risk navigation | Learn more, Skip |
| Danger | `wb-btn-danger` | Destructive actions | Delete, Remove, Disconnect |

### Rules

**Never disable a button silently.** If an action isn't available yet,
keep the button enabled and explain why when clicked. Disabled buttons
give no feedback and feel broken on mobile where there are no tooltips.

```jsx
// Wrong
<button disabled={!formValid}>Save</button>

// Right
<button onClick={() => !formValid ? showErrors() : save()}>Save</button>
```

**Always give immediate visual feedback.** On click: scale down, show
a spinner if the action takes >400ms, then resolve with a success state.
Never leave the button looking the same after clicking.

```jsx
// Pattern: loading → success → reset
const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'done'

async function handleSave() {
  setState('loading');
  await saveToFirebase();
  setState('done');
  setTimeout(() => setState('idle'), 2000);
}
```

**Verb-first labels.** The button says what it does, not what it is.

```
✓ Save changes     ✗ OK
✓ Create product   ✗ Submit
✓ Send invoice     ✗ Continue
✓ Delete order     ✗ Confirm
```

---

## 4. Forms

### Layout

- One column on mobile, always.
- Two columns only on desktop for short, related pairs (First name / Last name,
  City / Province). Never two columns for unrelated fields.
- Group related fields visually with a `<fieldset>` or a section heading,
  not just whitespace.

### Labels

- Always visible. Never placeholder-only labels — they disappear on focus
  and are inaccessible.
- Label above the input, not beside it. Beside breaks on mobile.
- Sentence case: "Business name", not "Business Name" or "BUSINESS NAME".

### Validation

Show errors **after** the user has left a field (on blur), not while
they're typing. Exception: password strength can show live.

```jsx
const [touched, setTouched] = useState(false);
const error = touched && !value ? 'Business name is required' : null;

<input
  className={`wb-input ${error ? 'wb-input--error' : ''}`}
  onBlur={() => setTouched(true)}
  value={value}
  onChange={e => setValue(e.target.value)}
/>
{error && <span className="wb-field-error">{error}</span>}
```

**Error messages say what to do, not what went wrong.**

```
✗ Invalid email
✓ Enter a valid email, like sipho@gmail.com

✗ Field required
✓ Enter your business name

✗ Error: value too long
✓ Keep your tagline under 80 characters
```

### Save behaviour

- **Auto-save** for profile fields the user edits inline (business name,
  description, address). Show a small "Saved" confirmation that fades out.
- **Explicit save button** for forms with multiple fields or any
  irreversible action.
- Never silently discard unsaved changes. If the user navigates away from
  an unsaved form, ask: "Leave without saving?"

---

## 5. Empty states

Every list, table, and dashboard section has a zero state. Don't leave
it blank or show a generic "No data".

Structure: **headline → one-line explanation → single CTA**

```jsx
// Orders, no orders yet
<EmptyState
  icon={<ShoppingBagIcon />}
  title="No orders yet"
  body="Orders from your website, WhatsApp, and walk-ins will appear here."
  action={<button className="wb-btn wb-btn-primary">Share your business link</button>}
/>
```

**Webilo-specific empty states:**

| Screen | Headline | CTA |
|--------|----------|-----|
| Orders | No orders yet | Share your business link |
| Products | Add your first product | Add product |
| Customers | No customers yet | Import contacts |
| Messages | You're all caught up | — |
| Analytics | Not enough data yet | View your site |
| Bookings | No bookings today | Set your hours |

---

## 6. Loading states

Three levels of loading. Use the right one.

**Skeleton** — for initial page/section load when you know the layout.
Renders the shape of the content with a shimmer. Never show a spinner
in the middle of a page.

```jsx
{loading ? (
  <div className="wb-skeleton" style={{ height: 22, width: '60%' }} />
) : (
  <h2 className="wb-heading">{businessName}</h2>
)}
```

**Button spinner** — for actions triggered by the user (save, send,
publish). Replace the button label, don't put the spinner next to it.

**Toast** — for background operations that complete asynchronously
(SMS delivered, export ready). Show once, auto-dismiss after 3–4s.

**Never block the whole screen** with a full-page spinner unless the
user triggered something that genuinely prevents all interaction
(payment processing). Even then, timeout after 10s with an error state.

---

## 7. Feedback and notifications

### Toast messages (transient feedback)

Show after a user action. Auto-dismiss. Never require a click to close
unless it contains an action.

```
✓ Changes saved          (dismiss after 2.5s)
✓ Invoice sent to Sipho  (dismiss after 3s)
✓ Product added          (dismiss after 2.5s)
✗ Could not send SMS. Retry  (stays until dismissed — has an action)
```

Position: bottom-right on desktop, bottom-center on mobile.
Stack up to 3, newest on top.

### Badges on nav items

Use a numeric badge for actionable counts: unread messages, pending
orders. Never badge analytics or completed items.

```jsx
<NavItem icon={<InboxIcon />} label="Inbox" badge={unreadCount} />
```

Cap display at 99. Show `99+` beyond that.

### Inline alerts (persistent context)

For conditions that need attention but don't block the user.

```jsx
<Alert variant="warning">
  Your Paystack account is not connected. Customers can't pay online.
  <a href="/settings/payments">Connect now</a>
</Alert>
```

Use sparingly — one per screen maximum. If you find yourself adding
two alerts to one screen, you have a UX problem, not an alert problem.

---

## 8. Data display

### Tables vs lists vs cards

| Content type | Use |
|---|---|
| Structured rows with multiple comparable columns (orders, products, contacts) | Table |
| Feed of items with varied content (messages, activity, notifications) | List |
| Showcasing items visually (products with images, staff cards) | Card grid |
| Summary numbers | Metric cards |

**Tables** need: sortable columns (at least date and amount),
row hover state, and a row click that opens the detail view.
Never open a new page from a table row — open a side panel or modal.

**Mobile tables:** On screens narrower than 640px, collapse table rows
into stacked key-value cards. A 6-column table does not fit on a phone.

### Numbers

Always format South African currency with `R` prefix and no decimal
for whole amounts:

```js
// Use this everywhere
function formatZAR(amount) {
  return `R ${amount.toLocaleString('en-ZA')}`;
}
// R 8,460  not  R8460.00  not  ZAR 8460
```

Dates: relative for recent (`2 min ago`, `Today at 14:30`),
absolute for older (`12 May`, `12 May 2024` for cross-year).

---

## 9. Navigation

### Sidebar nav items — active state

The active state must be unambiguous. Use a filled background on the
active item, not just a colour change or underline.

### Page hierarchy

```
Dashboard          ← always the home
├── Commerce
│   ├── Products
│   ├── Orders
│   └── Bookings
├── Customers
│   ├── Contacts
│   └── Messages
├── Marketing
├── Operations
├── Analytics
└── Settings
```

Never nest navigation more than two levels deep. If you need a third
level, use tabs inside the page, not more sidebar nesting.

### Breadcrumbs

Show on detail pages only (Order #1024, Product: Cappuccino).
Not on top-level section pages.

---

## 10. Modals and side panels

### Use a modal for:
- Confirming a destructive action (delete product, cancel subscription)
- A short form that creates something new (add product, invite staff)
- Maximum 3–4 fields

### Use a side panel (drawer) for:
- Viewing and editing a record inline (order detail, customer profile,
  message thread)
- Content that benefits from seeing the list behind it

### Never:
- Open a modal from inside another modal
- Put a table or long scrollable list inside a modal
- Use a modal for informational content that doesn't require a decision

### Confirmation dialogs

Only for irreversible destructive actions.

```jsx
<ConfirmDialog
  title="Delete product?"
  body="Cappuccino will be removed from your store. This can't be undone."
  confirmLabel="Delete product"
  confirmVariant="danger"
  onConfirm={deleteProduct}
/>
```

The confirm button is always the danger variant and echoes the action
("Delete product", not "Yes" or "Confirm").

---

## 11. Responsiveness rules

**Design mobile-first.** Webilo's users run their businesses from their
phones during service hours. The desktop dashboard is for setup and
review; mobile is for live operations.

| Breakpoint | Rule |
|---|---|
| < 640px (mobile) | Single column. Nav collapses to bottom tab bar. Tables become stacked cards. Sidebar hidden. |
| 640–1024px (tablet) | Two columns max. Sidebar as overlay drawer. |
| > 1024px (desktop) | Full sidebar. Multi-column layouts allowed. |

Touch targets minimum 44×44px. Never rely on hover-only affordances — hover doesn't exist on touch.

---

## 12. Accessibility minimums

These are not optional. Your users include owners working in bright
sunlight on low-end phones.

- All interactive elements reachable and operable by keyboard
- All form inputs have associated `<label>` elements
- Colour is never the only way to convey meaning (badge dot + text,
  not badge colour alone)
- Images have `alt` text (product images, profile pictures)
- Error messages are linked to their input via `aria-describedby`
- Minimum contrast 4.5:1 for body text, 3:1 for large text

---

## 13. Webilo-specific patterns

### Business link display

Always show as: `yourbusiness.webilo.co.za`
Never show raw Firebase URLs to the user.

### Order status progression

```
Pending → Confirmed → Preparing → Ready → Out for delivery → Delivered
                                        → Collected
```

Each status has one badge colour. Never deviate:

| Status | Badge |
|---|---|
| Pending | `wb-badge-warning` |
| Confirmed | `wb-badge-neutral` |
| Preparing | `wb-badge-warning` |
| Ready / Collected | `wb-badge-success` |
| Out for delivery | `wb-badge-accent` |
| Delivered | `wb-badge-success` |
| Cancelled | `wb-badge-danger` |

### AI-generated content indicators

When displaying AI-generated text (website copy, product descriptions,
suggested replies), mark it subtly:

```jsx
<div className="wb-card">
  <span className="wb-label" style={{ color: 'var(--wb-accent)' }}>
    AI suggestion
  </span>
  <p className="wb-body">{generatedText}</p>
  <div className="wb-row" style={{ marginTop: 'var(--wb-space-3)' }}>
    <button className="wb-btn wb-btn-primary wb-btn-sm">Use this</button>
    <button className="wb-btn wb-btn-sm">Edit</button>
    <button className="wb-btn wb-btn-ghost wb-btn-sm">Regenerate</button>
  </div>
</div>
```

Never auto-apply AI content without user confirmation.

### South African phone numbers

Always display in the format: `071 234 5678` (spaces, no country code
in the UI). Store in E.164 (`+27712345678`) in Firestore.

---

## Quick decision flowchart

```
Is the user choosing between two states that take effect immediately?
  → Switch

Is it part of a form with a Save button?
  → Checkbox (single) or Radio (one of many)

Is the user switching between 2–4 views or modes?
  → Segmented control

Is the user selecting one from 5+ options?
  → Dropdown

Is this the primary action on the page?
  → wb-btn-primary (max one per page)

Does clicking this create something or generate revenue?
  → wb-btn-accent

Does clicking this destroy something?
  → wb-btn-danger + confirmation dialog

Is something loading for the first time?
  → Skeleton

Did the user trigger an action that's running?
  → Button spinner

Did something finish in the background?
  → Toast
```
