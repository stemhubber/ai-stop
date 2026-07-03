# Webilo product rebuild

## Audit

The previous application had capable individual features, but the website-builder journey was split across unrelated systems:

- `/app` opened a business-operations workspace rather than the website projects a user had created.
- Website generation lived inside one large `SiteEditor` component and produced a single HTML string.
- Projects, pages, sections, themes, preview, and publishing did not share a canonical model.
- Generation jumped from a free-form prompt directly to a loading message, without a plan review or clear progress.
- Editor state was local and scattered. There was no predictable save boundary, unsaved state, history, or shared activity.
- The landing page, dashboard, studio, authentication, and business tools used different visual languages.
- Navigation labels and route destinations did not describe one coherent product.
- Empty, loading, success, error, and publish states were inconsistent or missing.
- The old editor was desktop-shaped; its panels and actions did not adapt into a deliberate phone workflow.
- The existing design tokens were useful, but the builder did not consistently consume one component or spacing system.

The rebuild keeps legacy business, billing, messaging, publishing, and Firebase features available. It changes the primary Webilo journey to a connected website-builder experience.

## Product flow

```text
Landing
  -> Sign in / create account
  -> Website dashboard
  -> Guided business brief
  -> Goal, tone, and brand direction
  -> Page selection
  -> Website plan review
  -> Explained generation progress
  -> Visual editor
      -> sections
      -> content
      -> theme
      -> device preview
      -> undo / redo
      -> save
  -> Publish or export
  -> Dashboard activity and project status
```

The AI plan is reviewed before content generation. Generated work always begins as a private draft.

## Information architecture

| Area | Route | Responsibility |
| --- | --- | --- |
| Welcome | `/` | Explain the product and lead to account creation |
| Authentication | `/login`, `/register` | Enter or create a workspace |
| Websites | `/app` | Project list, status, recent activity, new-project entry |
| Create | `/create`, `/studio/new` | Guided brief, plan review, generation |
| Editor | `/editor/:projectId` | Content, structure, theme, preview, save, publish |
| Published website | `/w/:publishedSlug` | Public, shareable multi-page website snapshot |
| Business tools | `/business` | Preserved operational workspace |
| Account | `/profile` | Existing account management |
| Legacy editor | `/studio/edit/:siteName` | Preserved compatibility route |

## State architecture

`WebsiteProvider` is the single client store for website projects and activity. Firestore is the durable source of truth; user-scoped local storage is retained as an immediate cache and offline fallback.

```text
AuthProvider
  -> WebsiteProvider
      -> projects[]
      -> activity[]
      -> createProject()
      -> saveProject()
      -> deleteProject()
      -> getProject()
```

- The reducer owns predictable project mutations.
- Each project is stored in `websites/{websiteId}` with its authenticated `ownerId`.
- Publishing writes an immutable public-facing snapshot to `publishedWebsites/{publishedSlug}`.
- Activity is stored in `users/{userId}/websiteActivity/{activityId}`.
- Existing browser-only projects are migrated into Firestore on the first authenticated load.
- Local persistence is namespaced by authenticated user and reconciled by the most recent update time.
- Offline deletions retain tombstones so removed projects are not restored during later reconciliation.
- The editor uses a local draft and explicit save boundary.
- A serialized saved snapshot determines unsaved state.
- Bounded `past` and `future` stacks provide undo and redo.
- `beforeunload` protects unsaved browser navigation.
- Save, create, and publish operations generate dashboard activity.
- Page components remain isolated from Firestore through `WebsiteContext` and `websiteRepository`.

## Data model

```js
website = {
  id,
  ownerId,
  name,
  slug,
  status, // draft | published
  createdAt,
  updatedAt,
  publishedAt,
  theme: {
    primary,
    background,
    surface,
    text,
    muted,
    font,
    radius
  },
  pages: [{
    id,
    title,
    slug,
    seo,
    sections: [{
      id,
      type,
      order,
      content,
      styles,
      visibility
    }]
  }],
  assets: [],
  seo,
  settings
}
```

Pages own their ordered sections. Sections use type-specific `content` while retaining common visibility, order, and style properties.

## Component structure

```text
src/
  context/
    WebsiteContext.jsx
  features/websites/
    websiteModel.js
    WebsiteDashboard.jsx
    CreateWebsiteFlow.jsx
    WebsiteEditor.jsx
    webilo-builder.css
    components/
      WebiloUI.jsx
      WebsitePreview.jsx
```

`WebiloUI.jsx` contains the small shared primitives currently needed by the rebuilt flow: app layout, navigation, buttons, page headers, empty/loading states, modal, toast, stepper, device toggle, and icons. These can be split into one-file components when their APIs expand.

## Responsive strategy

- Below `640px`: single-column pages, fixed bottom application navigation, bottom editor inspector, full-width actions, stacked website cards, and simplified generated-site navigation.
- From `640px` to `820px`: mobile application navigation with a two-surface editor.
- From `820px` to `1080px`: two-column project grids and a compact editor toolbar.
- Above `1080px`: full sidebar, three-column project grid, persistent inspector, and desktop device controls.
- Touch controls are at least 40–44px where they are primary interactions.
- The preview frame explicitly supports desktop, tablet, and mobile widths.
- Reduced-motion preferences disable non-essential animation.

## Implementation phases

1. **Product structure and layout system — complete.** Primary routes now describe the website-builder journey; legacy tools have explicit secondary routes.
2. **Design system and reusable components — complete.** Builder primitives, tokens, spacing, controls, status, feedback, and navigation are shared.
3. **Dashboard and project flow — complete.** Projects, empty state, status, deletion, and real activity use shared project data.
4. **AI creation flow — complete.** Guided inputs, recommendation, plan review, authenticated OpenAI blueprint generation, schema-constrained content, useful progress, and visible retry errors are connected.
5. **Website editor and preview — complete.** Section selection, direct and form content editing, reorder, add/remove/hide, theme editing, undo/redo, and device preview are functional.
6. **State management and persistence — complete.** Reducer state, authenticated Firestore CRUD, local fallback, migration, reconciliation, deletion tombstones, save state, activity, and publish state are implemented.
7. **Responsiveness and polish — complete.** Landing, auth, dashboard, creation, editor, modals, and previews have deliberate mobile layouts.
8. **Final QA and cleanup — complete for the implemented scope.** Production build and six unit tests pass; the core browser journey and desktop/mobile landing layouts were exercised.

## Recommended next backend phase

Firestore project persistence is now implemented. The next backend phase should:

1. Add evaluation fixtures for representative South African business types before changing prompts or models.
2. Connect a custom domain to the existing `/w/{publishedSlug}` public route if desired.
3. Store export jobs and generated assets separately from editable project data.
4. Split very large sites into page or section subcollections before a project approaches Firestore's document-size limit.
