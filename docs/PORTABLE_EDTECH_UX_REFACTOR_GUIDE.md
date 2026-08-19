# Portable UX refactor guide for an educational web app

This guide extracts transferable design principles from Webilo and adapts them for an educational product. It is written so it can be copied into another repository and used as the UX/UI brief before refactoring.

The goal is not to copy Webilo’s exact screens. The goal is to copy the product discipline:

- users should always know what to do next;
- screens should feel calm, focused, and professional;
- mobile should work as a first-class experience;
- AI/help features should guide the user, not dominate the interface;
- actions should connect to real product outcomes.

---

## 1. Product principle

> Do not make the learner think about the interface. Make them think about learning.

For an educational app, the interface should answer three questions immediately:

1. What am I learning?
2. What should I do next?
3. How do I know I am making progress?

Avoid home screens that simply list every feature. A learner opening the app should land on a focused “Today” or “Continue learning” view, not a generic dashboard.

---

## 2. Recommended app structure

Use a simple hierarchy:

```text
Today
├─ Continue current lesson
├─ Next recommended action
├─ Progress snapshot
└─ Recent activity

Learn
├─ Courses / modules
├─ Lessons
├─ Practice
└─ Assessments

Progress
├─ Completed lessons
├─ Weak areas
├─ Scores
└─ Streak / consistency

Resources
├─ Notes
├─ Downloads
├─ Saved explanations
└─ Help

Account
├─ Profile
├─ Plan
├─ Preferences
└─ Support
```

On mobile, keep the bottom navigation to four or five stable destinations:

- Today
- Learn
- Practice
- Progress
- More

Do not use a long horizontal tab bar on mobile for primary navigation. It creates confusion and makes the UI feel unstable.

---

## 3. First-run journey

The first session should guide users through setup without feeling like admin work.

Recommended flow:

1. Ask what they want to achieve.
2. Ask their current level.
3. Ask how much time they can commit.
4. Generate a learning path.
5. Start the first useful activity immediately.

Example:

```text
Tell us your goal
→ Improve maths marks for Grade 10

Tell us your confidence level
→ I understand basics but struggle with exams

Choose your pace
→ 20 minutes per day

Result
→ Your 2-week algebra recovery path is ready
```

Do not end onboarding with “You’re all set” and leave the user on a blank dashboard. End with the first meaningful task.

---

## 4. “Today” screen pattern

The Today screen should be the learner’s command centre.

It should show:

- one primary recommended action;
- the reason that action matters;
- progress toward a visible goal;
- one or two secondary actions only.

Example layout:

```text
Today

Continue: Algebra equations
You are 2 lessons away from finishing this topic.

[Resume lesson]

Progress
6 of 10 lessons complete

Secondary actions:
[Practice weak areas] [Review notes]
```

Rules:

- Only one primary button.
- Do not explain the same thing in multiple sections.
- Empty states must suggest the next action.
- Every action must open a real working view.

---

## 5. Progressive disclosure

Do not show every form, tool, and setting at once.

Use collapsed sections, plus buttons, or focused task cards.

Good:

```text
Assignments
[+ Add assignment]

No assignments yet.
Create one when you are ready to track homework.
```

Bad:

```text
Assignments
[Title input]
[Due date input]
[Description input]
[Upload input]
[Save button]

No assignments yet.
```

Forms should open when the user asks for them. They should not permanently consume the screen.

---

## 6. Visual style direction

Use a calm, premium, readable visual system.

Avoid:

- loud purple AI-style buttons;
- heavy gradients everywhere;
- too much text;
- crowded cards;
- multiple competing CTAs;
- “dashboard SaaS clutter”.

Prefer:

- soft neutral canvas;
- light glassmorphism only where useful;
- deep teal or ink primary actions;
- warm accent colours used sparingly;
- large readable headings;
- generous spacing;
- subtle borders;
- clear state badges.

Suggested design tokens:

```css
:root {
  --app-ink-1: #15211e;
  --app-ink-2: #32443f;
  --app-ink-3: #687a75;
  --app-ink-4: #91a09c;

  --app-canvas: #f3f7f5;
  --app-surface: rgba(255, 255, 255, 0.82);
  --app-border: rgba(35, 67, 59, 0.13);

  --app-primary: #176b5d;
  --app-primary-hover: #105347;
  --app-primary-soft: #e5f2ee;

  --app-success: #16a34a;
  --app-warning: #d97706;
  --app-danger: #dc2626;

  --app-font: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --app-radius-sm: 6px;
  --app-radius: 10px;
  --app-radius-lg: 16px;
  --app-radius-xl: 24px;

  --app-shadow-sm: 0 8px 24px rgba(29, 63, 54, 0.06);
  --app-shadow-md: 0 18px 48px rgba(29, 63, 54, 0.10);

  --app-control-h: 44px;
}
```

---

## 7. Typography rules

Use typography to create confidence and calm.

Rules:

- Headings should be short and outcome-focused.
- Body copy should explain value, not repeat the title.
- Labels should be sentence case.
- Avoid all-caps except small metadata labels.
- Keep paragraph widths under roughly 680px.
- Use at least 16px input text on mobile to prevent browser zoom.

Examples:

```text
Good:
Continue algebra
You are 12 minutes away from finishing this lesson.

Bad:
Learning Management Dashboard
This dashboard allows users to access learning management features and continue learning.
```

---

## 8. Button system

Use a small, strict button system.

| Variant | Purpose | Rule |
|---|---|---|
| Primary | Main action on the screen | Maximum one primary button per view |
| Default | Secondary action | Use for normal actions |
| Ghost | Low-emphasis navigation | Use for skip, learn more, back |
| Danger | Destructive action | Delete, remove, reset |

Button labels must be verb-first:

```text
Resume lesson
Start practice
Submit answer
Review mistakes
Save changes
Create study plan
```

Avoid vague labels:

```text
Continue
Submit
OK
Next
Done
```

If “Continue” is used, pair it with context:

```text
Continue lesson
Continue setup
Continue quiz
```

---

## 9. Form rules

Forms should feel lightweight.

Rules:

- Keep forms hidden until needed.
- Use one column on mobile.
- Use two columns on desktop only for related short fields.
- Keep labels visible at all times.
- Do not rely on placeholders as labels.
- Show validation after blur or submit, not while the user is still typing.
- Errors should say how to fix the issue.

Examples:

```text
Bad:
Invalid input

Good:
Enter your email address, like learner@gmail.com
```

```text
Bad:
Required

Good:
Enter the lesson title
```

Use explicit save buttons for multi-field forms. Use autosave only for simple inline preferences where the effect is obvious.

---

## 10. Mobile rules

Mobile should not be a compressed desktop app.

Rules:

- Inputs must be at least 16px font size.
- Tap targets should be at least 44px high.
- Avoid horizontal page overflow.
- Avoid sticky floating tabs that cover content.
- Bottom navigation should be stable and short.
- Primary action buttons should remain visible near the relevant content.
- Modals should become bottom sheets where appropriate.
- Forms should not require two-finger dragging or manual viewport correction.

If focusing an input zooms the page, fix the input font size and viewport/layout before adding more UI.

---

## 11. Empty states

An empty state is not a dead end. It should explain what the user can do next.

Use this structure:

```text
Title: No notes yet
Body: Save useful explanations while studying so you can review them later.
Action: Create first note
```

Rules:

- The action must work.
- Do not show empty tables without guidance.
- Do not show three actions when one is enough.
- Empty states should be specific to the learner’s context.

---

## 12. Progress and motivation

Use progress as guidance, not decoration.

Good motivation patterns:

- completion path: “2 steps left to finish this topic”;
- streaks: only if they encourage consistency without shame;
- weak-area detection: “Practice equations next”;
- visible milestones: “Topic complete”, “Ready for quiz”, “Exam prep started”;
- small wins: “You improved from 60% to 75% on this skill”.

Avoid:

- meaningless badges;
- noisy confetti for basic actions;
- shame-based streak loss;
- progress bars that do not connect to real learning outcomes;
- gamification that hides the next useful task.

Recommended model:

```text
Goal → Path → Current task → Feedback → Next task
```

---

## 13. AI/help principles

AI should feel like a tutor or guide, not the whole product.

Use AI for:

- explaining mistakes;
- generating practice questions;
- summarising notes;
- creating study plans;
- recommending the next lesson;
- converting uploaded material into exercises;
- answering learner questions.

Do not make the main UI say “AI” everywhere. Use benefit-led labels:

```text
Explain this
Create practice
Summarise notes
Help me revise
Make a study plan
```

AI responses should stream when possible, especially for explanations. Show useful loading states:

```text
Reading your answer...
Finding the mistake...
Building a practice set...
```

Track usage quietly in the background if the app has plans or fair usage limits. Do not expose token language to learners unless necessary.

---

## 14. State, feedback, and error handling

Every action needs a visible state.

Minimum states:

- idle;
- loading;
- success;
- error;
- empty;
- unavailable.

Rules:

- Never leave a clicked button visually unchanged during a long action.
- If something fails, keep the user’s input.
- Error messages should explain the next step.
- Success messages should be local to the action, not global across unrelated tabs.
- Messages from one tab/screen should not carry into another unless intentionally global.

Example:

```text
Could not save the lesson.
Check your connection and try again.
```

Better:

```text
Could not save the lesson.
Your changes are still here. Check your connection, then try again.
```

---

## 15. Navigation and orientation

Users should always know:

- where they are;
- what this screen is for;
- what to do next;
- how to get back.

Patterns:

- Use clear page titles.
- Highlight the active destination.
- Keep primary navigation stable.
- Use breadcrumbs only for deep content hierarchies.
- Avoid multiple tab systems on the same page.
- Do not mix “settings”, “content”, and “learning activity” in the same visual level.

For learners, navigation should be task-based:

```text
Today
Learn
Practice
Progress
More
```

Not admin-based:

```text
Dashboard
Management
Configuration
Resources
Modules
```

---

## 16. Data model mindset

Design the UI around real learning objects, not random form submissions.

Core objects may include:

- learner;
- course;
- module;
- lesson;
- exercise;
- quiz;
- attempt;
- answer;
- feedback;
- note;
- goal;
- study plan;
- progress event.

This matters because the UX depends on relationships:

```text
Learner → Goal → Study plan → Module → Lesson → Exercise → Attempt → Feedback → Next recommendation
```

Avoid storing important learning activity as generic text blobs only. The app should be able to answer:

- what did the learner attempt?
- how did they perform?
- what did they struggle with?
- what should they do next?

---

## 17. Refactor checklist

Use this checklist when improving the educational app.

### Product flow

- [ ] The home screen shows one recommended next action.
- [ ] New users are guided to their first meaningful activity.
- [ ] Advanced users can still access all tools quickly.
- [ ] Empty states have working actions.
- [ ] No screen repeats the same explanation three times.

### Navigation

- [ ] Mobile navigation has four or five stable destinations.
- [ ] Desktop navigation does not fight with mobile navigation.
- [ ] Active states are clear.
- [ ] There are no floating tabs that disturb reading or form entry.

### Forms

- [ ] Forms are collapsed until needed.
- [ ] Inputs use visible labels.
- [ ] Mobile input font size is at least 16px.
- [ ] Validation messages explain how to fix the issue.
- [ ] Unsaved data is not lost silently.

### Visual design

- [ ] One primary colour system is used consistently.
- [ ] Purple/AI-looking accents are avoided unless they are part of the brand.
- [ ] Buttons, cards, inputs, and badges share the same tokens.
- [ ] Cards use subtle borders and spacing instead of heavy shadows.
- [ ] Typography is readable and calm.

### Learning experience

- [ ] Progress is tied to real learning outcomes.
- [ ] Practice is available from weak areas.
- [ ] Feedback explains mistakes.
- [ ] AI helps with learning tasks instead of becoming the product label.
- [ ] The next recommended action updates as the learner progresses.

### Technical UX

- [ ] Loading, empty, success, and error states are implemented per screen.
- [ ] Local screen messages do not leak into other tabs.
- [ ] Public/client-facing actions actually write to the right data model.
- [ ] Mobile layout has no horizontal overflow.
- [ ] Accessibility basics are covered: labels, focus states, keyboard navigation, contrast.

---

## 18. Suggested implementation sequence

Refactor in this order:

1. Define design tokens.
2. Fix global layout, typography, buttons, inputs, and cards.
3. Replace the home dashboard with a Today screen.
4. Simplify mobile navigation.
5. Collapse large forms behind plus/add actions.
6. Add proper empty/loading/error/success states.
7. Connect actions to real data flows.
8. Add progress and next-action logic.
9. Improve AI/help features once the core journey is clear.

Do not start with animations, badges, or advanced AI. The strongest UX improvement usually comes from orientation, hierarchy, and working actions.

---

## 19. Acceptance criteria

The refactor is successful when:

- a new learner knows what to do within five seconds;
- a returning learner can resume learning in one tap/click;
- mobile users can complete a lesson or form without zoom/drag issues;
- every main action has loading, success, and error feedback;
- the UI feels consistent across mobile and desktop;
- progress reflects real learning activity;
- advanced users can still reach deeper tools without fighting the guided flow.

