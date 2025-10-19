# ADHD Parent Coach — AI-Agent Product Brief (MVP)

**Audience:** internal AI agents (code assistants, content generators, QA bots) that will help engineers/designers ship and operate the app.  
**Status:** v1 (MVP) plan aligned on a no-tab UI and **onboarding before auth**.

---

## 1) What this app is

A **parent-first coaching app** (React Native + Django REST) inspired by the Barkley program to help manage a child’s daily routines and behaviors—especially those consistent with ADHD (TDAH). It provides:

- A short **pre-auth onboarding** and screener to recommend modules.
- A **single Home hub** with the next best action, daily toggles, and quick tools.
- **Behavioral modules** (e.g., Special Time, Effective Commands, Anger Management) with clear **unlock criteria**.
- A light **Toolbox** (breathing, timer, emotion thermometer, calm corner).
- **Daily check-ins** and a simple dashboard (progress vs mood).
- Optional **Rewards system** (tokens/points) and **printable PDFs**.
- Optional **Q&A** with a neuropsychologist (value-gated login).

> **Not a diagnostic tool.** It offers coaching & habit scaffolding, not medical advice.

---

## 2) Users & outcomes

- **Primary user:** a parent/caregiver.  
- **Secondary:** clinicians replying to Q&A (later).  
- **Core outcomes for MVP:**  
  - Parent can pick **3 behaviors** to improve and track them daily.  
  - Parent can complete **Special Time** module and unlock **Effective Commands**.  
  - Parent can view a **7-day chart** of routine success vs child mood.  
  - If screener is **Orange/Rouge**, show “**Who to consult**” panel.

---

## 3) Core principles the agent should preserve

- **Tiny daily loop** (≤60s).  
- **Onboarding before login** (anonymous guest session).  
- **One main screen** (Home); everything else is a pushed screen or a sheet.  
- **Crystal unlock rules** for modules; celebrate wins.  
- **Safety & clarity**: “support tool, not diagnosis”; show pro contacts for Rouge.

---

## 4) High-level flows (what to build)

### 4.1 Pre-auth onboarding (5 steps)
1. **Age/Class** → adapt tone & module availability.  
2. **Mini-screener** (10–12 Likert items) → **Vert/Orange/Rouge** + “Who to consult”.  
3. **Pick 3 behaviors** to improve (e.g., brush teeth, bedtime, homework).  
4. **Starter plan** → preselect **Special Time**, propose a weekly goal.  
5. **Notifications opt-in** (morning/evening reminders) → **Home**.

**Agent helps with:** screener copy, result messaging, recommendations.

### 4.2 Home (single hub)
- **Next Best Action** card (dynamic CTA).  
- **Today’s 3 routines** (big toggles).  
- **Mini chart** (7 days): routine success vs mood.  
- **Current module** card with **Start/Log** button.  
- **Tools access**:  
  - **FAB → Command Palette** (Log Special Time, Start Time-out, Log Anger episode; open Breathing/Timer/Thermometer; Generate PDF).  
  - **Bottom sheet Tools** (Breathing, Timer, Thermometer, Calm corner).

**Agent helps with:** NBA logic hints, microcopy, coach tips.

### 4.3 Modules (Barkley-inspired)
Each module has the same scaffold: **Learn → Goal → Practice → Review**.

**MVP modules & unlock rules**
- **Special Time (Moment spécial)**  
  - **Pass** when ≥ **6 sessions** in last 21d **AND** child enjoyed ≥ **4/6**.  
  - Unlocks **Effective Commands**.
- **Effective Commands (Ordres efficaces)**  
  - Parent defines up to **3 objectives** (e.g., “Brush teeth”).  
  - **Pass** when ≥ **3 objectives** each have **≥5 days** marked “satisfying”.  
- (Optional in v1) **Anger Management**, **Time-out**, **Rewards**, **Time management**, **Homework** (skeletons only).

**Agent helps with:** concise “Learn” content, age-specific examples, dos/don’ts.

### 4.4 Daily check-in (evening)
- Mood slider (1–5), today’s 3 routines (done/not yet), optional note.  
- Updates the Home chart.  
- Write-once per date (idempotent).

**Agent helps with:** supportive copy, nudge timing.

### 4.5 Rewards & PDFs (optional for v1)
- Simple **Earn/Spend** with points and parent-configured tasks/rewards.  
- **Generate PDF** of the reward chart for printing.

---

## 5) Technical skeleton the agent should assume

### 5.1 Backend (Django REST)
- **Auth:** `POST /auth/guest/` → JWT for **is_guest** user; `POST /auth/convert/` → convert to full account (email/password) preserving data.
- **Core models (minimal MVP):**
  - `Child(parent, schooling_stage, diagnosed_adhd)`
  - `Screener(child, instrument, answers JSON, total_score, zone)`
  - `TargetBehavior(child, name, active)`
  - `DailyCheckin(child, date, mood, behaviors JSON)`
  - `Module(key, title, order_index)`
  - `ModuleProgress(child, module, state, counters JSON)`
  - `SpecialTimeSession(child, datetime, duration_min, activity, child_enjoyed)`
  - (Optional) `EffectiveCommandObjective(child, label, satisfied_days Array/JSON)`
- **Key endpoints:**
  - `POST /children/`
  - `POST /children/{id}/screener/` → `{score, zone, recommendations, consult}`
  - `POST /children/{id}/targets/` (≤3)
  - `POST /children/{id}/checkins/` (unique per date)
  - `GET /children/{id}/dashboard?range=7d`
  - `GET /modules/` + child progress
  - `POST /modules/special_time/sessions/`
  - (Optional) `POST /modules/effective_commands/objectives/`
- **Rules engine (MVP):** evaluate unlocks **synchronously on write** (e.g., after logging a Special Time session).

### 5.2 Frontend (Expo, no tabs)
```
app/
  (public)/onboarding/{age.tsx,screener.tsx,priorities.tsx,plan.tsx,notifications.tsx}
  (authed)/_layout.tsx    // stack-only
  (authed)/home.tsx
  (authed)/program/[key].tsx
  (authed)/messages/{index.tsx,thread/[id].tsx}     // optional
  (authed)/settings/index.tsx
  modals/{command.tsx,checkin.tsx,pdf.tsx}
```
- **State:** TanStack Query (server), Zustand (UI).  
- **Charts:** `victory-native`.  
- **Tools:** Lottie (breathing), local notifications (timers).  
- **Persistence:** secure tokens; restart returns to Home with current child loaded.

---

## 6) Milestones (the “big steps”)

### M0 — Foundations
- FE libs, router skeleton, providers.  
- BE DRF setup, CORS, Postgres. **✅ App boots; healthcheck 200.**

### M1 — Anonymous session
- `POST /auth/guest/`, token storage, refresh. **✅ Onboarding works pre-auth.**

### M2 — Onboarding (5 screens)
- Create `Child`, screener scoring & result, pick 3 behaviors, starter plan, notif opt-in. **✅ Land on Home with data persisted.**

### M3 — Home + Command Palette + Tools
- NBA card, Today toggles, mini chart, current module card.  
- FAB palette + Tools bottom sheet (Breathing, Timer, Thermometer).  
- `GET /dashboard`. **✅ Tools open; palette actions present.**

### M4 — Daily Check-in
- 60s modal; unique per date; chart updates. **✅ Check-in idempotent; chart accurate.**

### M5 — Module: Special Time
- Log sessions; unlock when criteria met; celebrate; suggest next. **✅ Passing flips state and updates Home.**

### M6 — Module: Effective Commands (lean)
- Define objectives; mark “satisfying” days; pass rule. **✅ Home NBA updates.**

### M7 — Toolbox polish + Time-out timer
- Full-screen ring timer (2/3/4/5 min), background safe; breathing presets; thermo saves mood. **✅ Reliable timers & saves.**

### (Optional) M8 — Rewards
- Tasks, rewards, token transactions. **✅ Award/spend with balance history.**

### (Optional) M9 — PDF
- Generate/share reward chart (server-rendered). **✅ File downloadable.**

### (Optional) M10 — Q&A (value-gated auth)
- Threads & messages; convert guest on first send. **✅ Data preserved post-signup.**

---

## 7) Acceptance checks the agent can auto-suggest

- Onboarding path completes in **≤3 min** with network hiccups (retry/backoff).  
- After reinstall (same device), guest session resumes and Home loads cached data.  
- Special Time unlocks with a deterministic test dataset (6 sessions, 4 enjoyed).  
- Evening notification opens **Check-in** directly and submits offline (queued sync).  
- Rouge screener shows **“Who to consult”** until dismissed.

---

## 8) Copy & tone guardrails (for generated text)

- **Supportive, non-judgmental, actionable.**  
- Avoid medical claims; include: “Cet outil ne remplace pas un avis médical.”  
- For Rouge: “Consultez rapidement un professionnel” + list (pédiatre, neuropsychologue, orthophoniste, psychomotricien, ergothérapeute, orthoptiste).  
- Micro-copy celebrates effort (e.g., “Bravo pour 3 jours de suite !”).

---

## 9) Privacy & safety constraints

- Process child data as **sensitive** (GDPR/CNIL/CNDP): consent, deletion, export.  
- Encrypt in transit (TLS) and at rest (DB).  
- No crisis handling; show local emergency resources for danger signals.  
- Keep YouTube content optional; prefer first-party audio (no ads).

---

## 10) Analytics (light, privacy-aware)

- Events: `onboarding_completed`, `checkin_submitted`, `special_time_logged`, `module_passed`, `timer_started`.  
- KPIs: D7 retention, % completing Special Time, avg routine success, mood trend.

---

## 11) Glossary (for the agent)

- **NBA:** Next Best Action on Home.  
- **Special Time / Moment spécial:** 10–20 min 1-to-1 child-led activity.  
- **Effective Commands:** clear, single, direct directives; reduced repetition.  
- **Zone Vert/Orange/Rouge:** screener impact tiers (guidance, not diagnosis).  
- **Check-in:** daily mood + routine completion entry.  
- **Pass/Unlock:** module meets criteria and the next module becomes available.

---

### What the agent should produce on request

- Short educational copy blocks per module (age-aware).  
- Unlock rule explanations in plain language.  
- NBA suggestions based on last events.  
- Test fixtures (JSON) to simulate passing modules.  
- Acceptance test scripts (steps & expected API payloads).

This document is the contract: keep the MVP small, the loop fast, and the unlocks obvious.
