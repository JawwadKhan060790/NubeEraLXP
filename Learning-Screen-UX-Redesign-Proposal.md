# Redesigning the LMS Learning Screen: From Video-First to Workspace-First

**Prepared for:** NubeEra LMS — Student Learning Experience
**Subject:** `StudentLearning.tsx` redesign
**Author:** UX Architecture Review

---

## 1. Why the Current Layout Fails (First-Principles Diagnosis)

The current screen treats the lesson as **a video with attachments**. Structurally, that's the root problem — everything else follows from it:

The video player is sized and positioned as the hero element, which is a holdover from passive media consumption (YouTube, Netflix). But this is not a media-consumption product — it's a *practice* product. Students here write Python in Monaco, run robotics code, inspect diagrams, and take notes. Those are first-class learning activities, not "extras under the fold." By stacking them vertically below a large video, the interface is making an implicit editorial judgment — "watching matters most, doing matters less" — that is backwards for a STEM-oriented LMS that has clearly invested in building a Pyodide-powered code runtime and a robotics code viewer. The product *has* a workspace; the layout just hides it.

This also creates a discoverability failure that compounds over time. A first-time user has no peripheral-vision cue that Notes, the Python Editor, or the Browser exist — they only appear after a deliberate scroll. In UX terms, this is a violation of the **visibility of system status / match between system and real world** heuristic: the interface doesn't represent the full capability set it has. Every returning student who never scrolls is a student who never discovers half the product.

Finally, vertical stacking forces **context-switching cost**. To go from "watch a concept explained" to "try it in the Python editor" the student must scroll away from the video (losing the visual reference), interact with the tool, then scroll back. Each switch taxes working memory — the opposite of what a learning interface should do, which is to keep the *source* (video/explanation) and the *practice surface* (editor, notes, diagram) in joint view so the student can move between them with eye movement, not page movement.

The fix is not "rearrange the boxes." It's to stop treating the lesson as a video page and start treating it as **an integrated learning workspace** — the same conceptual leap VS Code made over a single-pane text editor, and the leap DataCamp/Codecademy made over "watch then separately go do an exercise."

---

## 2. Benchmarking: What Modern EdTech Actually Does

A quick pattern scan across the named references clarifies what "modern" means here in concrete layout terms, not just vibes:

**DataCamp and Codecademy** never show video alone. The instructional content (video or text) and the practice surface (code editor + console) are *simultaneously visible*, typically in a left/right or top/bottom split within the same viewport — because their core insight is that learning-by-doing requires the "doing" to be one glance away from the "explaining," not one scroll away.

**Coursera and Khan Academy** keep a persistent, collapsible curriculum rail so learners always have a sense of "where am I in the journey" — wayfinding reduces anxiety and supports self-paced navigation. Notes/transcript panels live alongside video, not beneath it.

**Pluralsight and Microsoft Learn** lean into a *workbench* metaphor for technical content: video/article in a primary pane, with exercises, code sandboxes, and resources docked to the side or bottom, switchable via tabs that are *always visible in the chrome*, never requiring a scroll to find.

**Brilliant** demonstrates that even highly visual, interactive content can fit a single viewport by being ruthless about what's "always on" (the interactive itself) versus "on demand" (hints, explanations) via slide-over panels rather than page scroll.

The common thread: **primary modalities (watch + do + note) coexist in the viewport at all times; secondary tools are one click away via a docked, labeled, persistent control — never hidden by scroll position.**

---

## 3. Evaluating the Three Options

### Option 1 — IDE-Style Learning Workspace (VS Code / DataCamp / Codecademy model)
Curriculum tree on the left, video center, dockable/resizable panels for tools at the bottom or right, split-pane throughout. This is the most powerful and most "future-proof" — it scales gracefully as more tools are added (the prompt explicitly asks for this), and it signals "serious workspace" rather than "media player," which is a strong premium-positioning move. The cost is implementation complexity: resizable/dockable panes need careful state management, persistence (remembering a student's preferred split), and more rigorous responsive fallbacks for small screens.

### Option 2 — Three-Column Learning Experience
Curriculum / Video+Notes / Tools. This is simpler to build and very effective on large monitors (≥1440px), but three fixed columns get cramped fast on laptops (1280–1366px is still extremely common in schools), and it under-utilizes vertical space — video, notes, and tools all compete for the same horizontal real estate rather than using the natural top/bottom rhythm of "watch, then practice."

### Option 3 — Professional EdTech Dashboard
A softer, card-like dashboard arrangement that keeps everything "reachable." This is the most visually approachable for non-technical learners and translates well to tablets, but on its own it risks becoming "Option 1 without the power-user ergonomics" — good wayfinding, weaker deep-work ergonomics for the coding-heavy activities this LMS actually has (Monaco + Pyodide + robotics code).

### Verdict
None of the three should be shipped "as named." The right answer is a **hybrid: Option 1's structural skeleton (resizable IDE-style workspace) wrapped in Option 3's visual language (premium dashboard polish, card surfaces, soft elevation, generous spacing) and informed by Option 2's instinct to keep Notes glued to the video rather than sequestered in a tab.** This gets the scalability and power-user ergonomics of a workspace, the approachability of a dashboard, and solves the exact "Notes are hidden" complaint at its root by making Notes a permanent citizen of the primary view, not a tab competing with five others.

---

## 4. Recommended Final Layout — "The Adaptive Learning Workbench"

### 4.1 Structural concept

Three structural zones, all visible without scrolling on a standard laptop viewport (1280×720 and up):

```
┌──────────────┬──────────────────────────────────────┬───────────────────┐
│              │   PRIMARY STAGE                       │                   │
│  CURRICULUM  │   ┌─────────────────────────────┐     │   WORKSPACE DOCK   │
│  RAIL        │   │       Video Player          │     │   (tabbed,         │
│  (collapsible│   │   (16:9, fluid, capped ht)  │     │    resizable,      │
│   tree,      │   └─────────────────────────────┘     │    persistent)     │
│   progress   │   ┌─────────────────────────────┐     │                    │
│   indicators)│   │   Persistent Notes Strip /  │     │  Python Editor     │
│              │   │   "Continue where you left  │     │  Robotics Code     │
│              │   │   off" + quick-note capture │     │  Reference Diagram │
│              │   └─────────────────────────────┘     │  Browser           │
│              │                                       │  + future tools    │
└──────────────┴──────────────────────────────────────┴───────────────────┘
        ↕ collapsible                                        ↕ resizable, dockable
```

Three coexisting, simultaneously visible regions:

1. **Curriculum Rail (left, collapsible to icon-only)** — same job as today's syllabus panel, but redesigned as a true navigation spine: module accordion, per-lesson completion state, current-position highlight, and a collapse toggle that shrinks it to a slim icon rail (≈56px) so power users can reclaim width for the workspace. This mirrors VS Code's Activity Bar / Explorer relationship and Coursera's persistent-but-collapsible course outline.

2. **Primary Stage (center)** — video on top, but *capped* in height (e.g., `max-height: 50vh` or an aspect-ratio-locked fluid box) rather than allowed to dominate. Directly beneath it, a **persistent Notes strip** that is always present — not a tab. This is the single highest-leverage change in the whole redesign: it converts Notes from "a thing you might find" into "a thing that's always there while you watch," which is exactly the DataCamp/Option-2 instinct, and it directly answers the brief's complaint that Notes get lost. The strip can expand into a full editor in place (the existing `PremiumRichTextEditor`) without leaving the stage.

3. **Workspace Dock (right or bottom, resizable + dockable)** — Python Editor, Robotics Code, Reference Diagram, Browser, and "Other Learning Tools" live here as a **persistent, labeled tab rail with icons** (reusing the Lucide icon language already in the app), not as content that requires scrolling to reach. Critically, the dock is *resizable* (drag the divider) and *dockable* (a control lets the student flip it from a right-side panel to a bottom panel — useful when a student wants a wide code editor instead of a tall one). This is the VS Code panel model, and it's the part of Option 1 that makes the design "future-proof": adding a tenth tool later is just adding a tab, not redesigning the page.

### 4.2 Why this specific arrangement, and not a simple reflow

The deliberate choices worth calling out: the video is *capped*, not maximized — because in a workspace, video is an input to learning, not the destination. Notes are *promoted out of the tab strip* into a persistent strip — because notes are the connective tissue between "what I watched" and "what I'm building," and burying that connective tissue is what caused the original complaint. And the tools dock is *resizable and dockable* rather than fixed — because a Python exercise needs width, a robotics code review needs height, and a reference diagram needs to sit beside the video for comparison; one fixed proportion can't serve all three well, but a student-controlled, remembered split can.

### 4.3 Wireframe-style walkthrough (annotated)

**Top chrome bar** (full width, ~56px): breadcrumb (Course → Module → Lesson), lesson title, progress ring, and a global "Focus Mode" toggle that hides the curriculum rail for distraction-free deep work — a pattern borrowed from VS Code's Zen Mode and Brilliant's immersive interactive views.

**Left rail** (default ~280px, collapsible to ~56px): search/filter at top, module accordion below, each lesson row showing a completion check, lock state (if sequential unlocking is used), and estimated duration — small additions that help students plan a study session, a Khan-Academy-style affordance.

**Center stage**: video in a 16:9 box that never exceeds ~50% of viewport height; immediately below it, a slim "Notes" affordance that's *always rendered* — either as a compact live-editable strip (3–4 lines, expandable) or, on smaller viewports, a prominent pinned card. A small "expand to full editor" control opens the existing rich-text Notes experience as an overlay/modal without losing place in the video.

**Right/bottom dock**: a vertical (or horizontal, if docked to bottom) tab rail with icons + labels for Python Editor, Robotics Code, Reference Diagram, Browser, and an overflow "+" for future tools — directly solving "support future expansion." Each tab keeps its own scroll position and state when switched away from (no re-mounting Monaco on every click — see Performance, §8).

**Drag handles** between rail/stage and stage/dock let the student reallocate space; the app remembers the chosen split per student (localStorage or backend preference) so the layout adapts to *them* over time — a small but high-impact personalization touch.

---

## 5. Responsive Behavior

Rather than "shrink everything," each breakpoint should *change which zones are simultaneously visible*, preserving the core promise (video + notes + one tool reachable in ≤1 interaction) at every size:

**Large desktop / ultra-wide (≥1440px):** Full three-zone layout as described, generous gutters, dock can sit beside the stage at a comfortable width (e.g., 420px+).

**Laptop (1024–1439px):** Same three zones, but the curriculum rail defaults to its collapsed icon state and the dock defaults to a slightly narrower width; the student can expand either on demand. This keeps the "everything visible" promise intact on the most common classroom/home laptop resolutions.

**Tablet, landscape (768–1023px):** Curriculum rail becomes an overlay drawer (slide-in from a hamburger/menu control) rather than a persistent column — freeing horizontal space for stage + dock, which remain side by side. This mirrors how Coursera and Khan Academy degrade gracefully on iPads.

**Tablet, portrait / large phone (≤767px):** The three-zone idea shifts from *side-by-side* to *switchable full-screen panes* governed by a persistent bottom tab bar: "Learn" (video + notes), "Practice" (the tools dock), "Curriculum." This is the same content, re-projected into a navigation pattern appropriate for narrow viewports — not a cramped shrink of the desktop layout. Notes remain reachable via a floating action button from the video pane so they're never more than one tap away, preserving the "Notes are always discoverable" principle even here.

**General rule across all sizes:** nothing that was simultaneously visible on desktop should require *more than one tap/click* to reach on a smaller device — the redesign's core promise (no hidden tools) must degrade to "one tap away," never to "scroll to discover."

---

## 6. React Component Architecture

The current `StudentLearning.tsx` is a ~900-line monolith that owns video state, tab state, editor state, notes state, and curriculum state all at once. The redesign is also an opportunity to decompose it into a maintainable, testable tree that mirrors the new visual zones — each zone becomes its own subtree with its own local state, coordinated through a shared lesson context rather than prop drilling.

```
LearningWorkspace/                      (replaces monolithic StudentLearning.tsx)
│
├── LearningWorkspace.tsx               Top-level layout shell; owns panel-split
│                                       state (rail width, dock width/position),
│                                       reads/writes layout prefs to localStorage
│                                       + backend; provides LessonContext
│
├── context/
│   └── LessonContext.tsx               Shares selectedLesson, completion state,
│                                       activeDockTab, notes draft — replaces the
│                                       current giant useState block
│
├── chrome/
│   ├── TopBar.tsx                      Breadcrumb, progress ring, Focus Mode toggle
│   └── FocusModeToggle.tsx
│
├── curriculum/
│   ├── CurriculumRail.tsx              Collapsible container (expanded/icon states)
│   ├── ModuleAccordion.tsx             Module → lesson tree (extracted from current
│   │                                   sidebar logic)
│   ├── LessonListItem.tsx              Single lesson row: status, lock, duration
│   └── CurriculumSearchFilter.tsx      New: quick search/filter across modules
│
├── stage/
│   ├── PrimaryStage.tsx                Composes VideoPanel + NotesStrip
│   ├── VideoPanel.tsx                  YouTube/custom video, height-capped,
│   │                                   collapsible (logic largely portable from
│   │                                   current video block)
│   ├── NotesStrip.tsx                  NEW — persistent compact notes surface;
│   │                                   "expand" opens NotesEditorModal
│   └── NotesEditorModal.tsx            Wraps existing PremiumRichTextEditor in
│                                       an overlay for full-screen note-taking
│
├── dock/
│   ├── ToolsDock.tsx                   Resizable + dockable container; manages
│   │                                   position (right|bottom), width/height,
│   │                                   and the active-tab tab-strip
│   ├── DockTabStrip.tsx                Icon+label tab rail (Lucide icons),
│   │                                   keyboard-navigable, ARIA tablist
│   ├── panels/
│   │   ├── AttachmentPanel.tsx         (today's "Notes"/attachment PDF viewer
│   │   │                               — react-pdf, kept but relocated)
│   │   ├── PythonEditorPanel.tsx       Monaco + Pyodide runtime (extracted as-is,
│   │   │                               kept mounted across tab switches — see §8)
│   │   ├── RoboticsCodePanel.tsx       Syntax-highlighted snippet viewer + copy
│   │   ├── ReferenceDiagramPanel.tsx   HTML diagram viewer
│   │   ├── BrowserPanel.tsx            Embedded/AI-tool browser
│   │   └── OtherToolsPanel.tsx         Extensible registry-driven panel for
│   │                                   future tools (see "future expansion")
│   └── DockResizeHandle.tsx            Drag handle; persists chosen size
│
├── shared/
│   ├── ResizableSplitPane.tsx          Generic reusable split-pane primitive
│   │                                   (used for rail|stage and stage|dock)
│   ├── CollapsiblePanel.tsx            Generic expand/collapse wrapper w/ ARIA
│   └── ProgressRing.tsx                Lesson/course completion indicator
│
└── hooks/
    ├── usePanelLayout.ts               Persisted split sizes & dock position
    ├── useLessonProgress.ts            Completion tracking (extracted from
    │                                   current completedLessons logic)
    └── useToolRegistry.ts              NEW — declarative registry so adding a
                                        tool = adding a config entry, not editing
                                        the layout (the "future expansion" lever)
```

The key architectural shift is the **`useToolRegistry`** hook: instead of hardcoding "Notes / Python / Robotics / Diagram / Browser / Other" as conditional JSX (as the current dynamic-tab logic does), each tool becomes a small descriptor — `{ id, label, icon, component, availability(lessonType) }` — and `ToolsDock` simply renders whatever the registry says is relevant for the current lesson. Adding a future tool (say, a "Simulation Sandbox") becomes a one-entry registration, not a layout change — directly satisfying "support future expansion of learning tools" as a structural property rather than a promise.

---

## 7. Suggested Folder Structure

Building on the project's existing conventions (`pages/`, `components/`, `contexts/`, `hooks/`, `services/`, `types/`):

```
src/
├── pages/
│   └── StudentLearning.tsx              Thin route wrapper: fetches lesson data,
│                                         renders <LearningWorkspace />
│
├── features/
│   └── learning-workspace/               NEW feature module — keeps the large
│       │                                 surface area self-contained instead of
│       │                                 sprawling across /components
│       ├── LearningWorkspace.tsx
│       ├── context/
│       ├── chrome/
│       ├── curriculum/
│       ├── stage/
│       ├── dock/
│       │   └── panels/
│       ├── shared/
│       ├── hooks/
│       ├── registry/
│       │   └── toolRegistry.ts           Tool descriptors (id, icon, component,
│       │                                  availability rules)
│       └── types/
│           └── learning-workspace.types.ts
│
├── components/                            Existing shared components stay; the
│   ├── PremiumRichTextEditor.tsx          rich-text editor and AIChat are reused
│   └── AIChat/                            by the new feature, not duplicated
│
├── contexts/
│   └── ThemeContext.tsx                   Existing — workspace theme reads from it
│
├── hooks/
│   └── useConfirm.ts                      Existing — reused for "unsaved notes" prompts
│
├── services/
│   └── learningWorkspaceService.ts        NEW — isolates API calls (lesson fetch,
│                                           notes save, progress update, layout prefs)
│                                           from the existing generic services/
│
└── styles/
    └── (existing Tailwind setup — extend tailwind.css with workspace-specific
        design tokens: panel elevation, focus rings, dock shadows)
```

This keeps the redesign additive and low-risk: the existing route (`/student/learning`) keeps working, `StudentLearning.tsx` becomes a thin data-fetching wrapper, and all new complexity lives in a clearly bounded `features/learning-workspace/` module that can be developed, tested, and rolled out independently (e.g., behind a feature flag) without destabilizing the rest of the app.

---

## 8. Accessibility Considerations

Treat the redesigned workspace as a multi-region application interface, not a single document — which means region semantics, keyboard parity, and state announcements all matter more than they did in a simple stacked layout:

Use proper landmark roles and `aria-label`s for each zone (`<nav aria-label="Curriculum">`, `<main aria-label="Lesson stage">`, `<aside aria-label="Learning tools">`) so screen-reader users can jump directly between regions via landmark navigation rather than tabbing through the whole page. The dock's tab strip should be a true ARIA `tablist`/`tab`/`tabpanel` set with arrow-key navigation and `aria-selected` state — not a row of styled `<div>`s — and each panel should announce its load state (`aria-busy`) while Monaco/Pyodide initialize, since those can take a perceptible moment.

Every interactive control that changes layout (collapse rail, resize dock, switch dock position, enter Focus Mode) needs a keyboard equivalent and a visible focus ring — resizing must not be mouse-only (provide e.g. `Ctrl+[`/`Ctrl+]` to step the divider, mirroring VS Code's keyboard-driven panel resize). The persistent Notes strip should be reachable via a documented keyboard shortcut (e.g., `Ctrl+Shift+N`) so it's discoverable without a mouse, reinforcing the "Notes are always available" principle for keyboard and screen-reader users alike.

Respect `prefers-reduced-motion` for panel transitions and Focus Mode animations, maintain WCAG AA contrast for all text-over-video and text-over-panel surfaces (the current emoji-as-icon labels — 🐍, 🤖, 🌐 — should be paired with real text labels and `aria-hidden` on the decorative emoji, since emoji glyphs render inconsistently across screen readers). Finally, persist and respect a user-level "reduced layout" preference that defaults to the simpler stacked arrangement for students who find multi-pane interfaces overwhelming — accessibility here also means cognitive accessibility, not just sensory.

---

## 9. Performance Considerations

The biggest real risk in this redesign is **accidentally re-mounting heavy tools** (Monaco editor, Pyodide's WASM runtime, react-pdf) every time a student switches dock tabs — which is exactly what naive conditional rendering (`{activeTab === 'python' && <PythonEditor />}`) would do, and would make the new, more-discoverable tools feel *slower* than the old buried ones. The fix is to **keep mounted panels alive and toggle visibility with CSS** (`display: none` / `visibility: hidden` via a small `KeepAlive`-style wrapper) rather than unmounting — Monaco and Pyodide should initialize once per lesson session and persist across tab switches, exactly as VS Code keeps editors warm in the background.

Lazy-load each dock panel's *code* (via `React.lazy`/dynamic import) so a student who never opens the Robotics or Browser tab never pays for that bundle weight — the registry-driven architecture in §6 makes this natural, since each registry entry can simply point to a lazy-loaded component. Pyodide's WASM payload in particular should only fetch when the Python tab is first activated (it likely already does this; preserve that behavior and consider a subtle "warming up" indicator rather than a blank wait).

Debounce and batch the things that now happen more often in a persistent-Notes world: autosave Notes on a debounce (e.g., 1.5s after the last keystroke) rather than on every keystroke, and likewise debounce layout-preference writes (panel sizes, dock position) so dragging a divider doesn't spam the backend. Virtualize the curriculum tree if courses can have large module/lesson counts (the existing accordion likely renders fine at current scale, but a virtualized list — e.g., `react-window` — future-proofs it). And memoize the heavier panels (`React.memo` + stable callbacks via `useCallback`/context selectors) so a Notes keystroke doesn't trigger a Monaco re-render three panels away — a classic monolith-to-modular performance win that falls out naturally from the decomposition in §6.

---

## 10. Modern UI Patterns to Adopt

A short set of patterns, each chosen because it solves a specific problem named in the brief rather than as decoration: **resizable split panes with persisted state** (solves "tools feel cramped or oversized depending on the activity"); **a docked, iconed, always-visible tab rail** instead of inline content tabs (solves "students don't know these tools exist" — the rail is visible *before* any tab is opened, unlike today's tabs that only appear after scrolling to them); **Focus/Zen Mode** for deep-work sessions (borrowed from VS Code/Brilliant, supports the "reduce cognitive load" goal by letting students deliberately simplify their own view); **soft elevation and glassmorphism-lite surfaces** (subtle shadows/blur to separate zones — delivers the "premium, futuristic" feel the brief asks for without resorting to gimmicks); **command-palette-style quick navigation** (`Ctrl+K` to jump to a lesson, tool, or note — a Linear/VS Code pattern that rewards power users and scales well as course catalogs grow); and **inline progress micro-feedback** (a slim progress bar under the video, a completion pulse on the curriculum rail) that keeps motivation visible without needing a separate dashboard visit.

---

## 11. Maximizing Engagement and Learning Outcomes

The single highest-leverage move is **proximity**: placing Notes and tools in the same glance-radius as the video converts passive watching into active, looped practice — watch a concept, immediately try it in the Python editor, jot a note, glance back at the video to confirm — without the friction of scrolling resetting the student's mental state each time. Friction is the enemy of habit formation; every scroll a student has to perform to reach a tool is a small tax that, multiplied across a semester, measurably suppresses tool usage (this is precisely the failure the brief describes).

Second, **make progress and capability visible at all times**. A persistent progress ring, a visibly "always there" Notes affordance, and an always-rendered tools dock all serve the same psychological function: they tell the student, continuously, "there is more here for you, and here's exactly where it is." This converts curiosity into action far more reliably than a one-time onboarding tour ever could (tours are forgotten; persistent affordances are not).

Third, **let students personalize their workspace** (panel sizes, dock position, Focus Mode, theme) and *remember* those choices. Personal investment in a workspace's configuration is a known driver of return engagement — it's part of why developers feel ownership over their VS Code setup. A learning workspace that adapts to the student, rather than forcing the student to adapt to it, measurably increases time-on-task and session frequency.

Finally, treat the **registry-driven tool architecture** (§6) as a pedagogical lever, not just an engineering convenience: it lets the product team introduce new tools, experiment with which tools appear for which lesson types, and A/B test dock arrangements — all without re-architecting the page. That experimentation capacity is what ultimately compounds into better learning outcomes over time, because it turns "what helps students learn best" from a one-time design guess into an ongoing, measurable, iterable question.

---

## 12. Summary Recommendation

Replace the current "video page with tabs beneath it" with an **Adaptive Learning Workbench**: a three-zone, resizable, IDE-inspired workspace (collapsible curriculum rail, height-capped video stage with a *persistent* Notes strip, and a dockable, registry-driven tools panel) wrapped in a premium dashboard visual language. This single structural change directly resolves every symptom in the brief — discoverability (tools are visible in the chrome, not buried in scroll), cognitive load (watch and do coexist, no context-switch tax), responsiveness (zones reflow into drawers and tab bars rather than cramping), and future-proofing (new tools are registry entries, not redesigns) — while remaining buildable as an additive, feature-flagged module that doesn't destabilize the existing `StudentLearning.tsx` route.
