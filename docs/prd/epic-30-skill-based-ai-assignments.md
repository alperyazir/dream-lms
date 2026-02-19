# Epic 30: Skill-Based AI Assignment Generation & Reporting

**Type:** Brownfield Enhancement
**Status:** Draft
**Created:** 2026-02-12

---

## Epic Goal

Restructure AI-generated assignments from a mechanical activity-type-first model to a pedagogically-driven skill-first model, where teachers select a primary language skill (Listening, Reading, Writing, Vocabulary, Grammar) and then choose an activity format within that skill. Include a Mix mode for balanced multi-skill assignments. Introduce skill-based score attribution and analytics to track student proficiency across language skills over time.

---

## Epic Description

### Existing System Context

| Aspect | Details |
|--------|---------|
| **Current Functionality** | Epic 27 DreamAI system: teachers select book + module, then choose from 5 activity types (vocabulary_quiz, ai_quiz, reading_comprehension, sentence_builder, word_builder). No skill classification exists. |
| **Technology Stack** | Backend: FastAPI + SQLModel + PostgreSQL. Frontend: React 19, TanStack Router/Query, Zustand, Tailwind, Shadcn UI. AI: LLM provider layer (DeepSeek/Gemini), TTS provider layer (Edge TTS/Azure). |
| **Integration Points** | DCS AI-data endpoints (modules, vocabulary, audio), existing assignment/activity infrastructure, Content Library, Activity Player components. |

### Enhancement Details

**What's being changed:**

1. **Skill-first generation model:** Replace the current activity-type selector with a two-step flow: Skill → Format. The teacher's pedagogical intent (which skill to practice) drives content generation, not the mechanical activity format.

2. **Five active skills:** Listening, Reading, Writing, Vocabulary, Grammar. Speaking is deferred (requires audio recording infrastructure — future epic).

3. **Mix mode:** A dedicated "Mix" option that generates a balanced multi-skill assignment, with each question tagged to its respective skill for reporting.

4. **New activity combinations:** Listening-specific activities (audio-first generation using TTS), Writing-focused variations, Grammar fill-in-the-blank — expanding beyond the original 5 types.

5. **Skill-based reporting:** Score attribution per skill, student skill profiles (radar chart), class skill heatmaps, and skill trend tracking over time.

**How it integrates:**

- Replaces the activity type selector in the DreamAI Question Generator UI (Story 27.17)
- Extends the existing LLM generation pipeline with skill-aware prompts
- Adds new database tables (SkillCategory, ActivityFormat, SkillFormatCombination) without modifying existing assignment/activity tables
- Adds `primary_skill_id` and `activity_format` fields to Assignment model for AI-generated assignments
- Builds on existing TTS infrastructure for Listening activities
- Reporting integrates with existing assignment analytics (Epic 5 patterns)

**Success Criteria:**

- Teachers create AI assignments by selecting skill first, then format
- Mix mode generates balanced multi-skill assignments
- All generated content is skill-tagged for reporting
- Student skill profiles show proficiency across 5 skills
- Teachers can view class-level and student-level skill analytics
- Existing AI-generated assignments remain accessible (backward compatible)
- Speaking skill visible in UI as "Coming Soon"

---

## Skill × Format Matrix (v1)

### Valid Combinations

| Skill | Format | Status | Generation Strategy |
|-------|--------|--------|-------------------|
| **Vocabulary** | Quiz (MCQ) | Remap from `vocabulary_quiz` | Definition/synonym → select correct word |
| **Vocabulary** | Word Builder | Remap from `word_builder` | Scrambled letters → spell vocabulary word |
| **Vocabulary** | Matching | Remap from `vocabulary_matching` | Word ↔ definition/synonym/antonym pairs |
| **Grammar** | Quiz (MCQ) | Remap from `ai_quiz` | Grammar rule application, tense selection |
| **Grammar** | Sentence Builder | Remap from `sentence_builder` | Reorder words into grammatically correct sentence |
| **Grammar** | Fill-in-the-blank | **New** | Complete sentence with correct form/tense/preposition |
| **Reading** | Comprehension | Remap from `reading_comprehension` | Read passage → answer MCQ/T-F questions |
| **Listening** | Quiz (MCQ) | **New** | Listen to TTS audio → select correct answer (no text prompt) |
| **Listening** | Fill-in-the-blank | **New** | Listen to TTS sentence → type the missing word |
| **Writing** | Sentence Builder | Remap variant of `sentence_builder` | Build sentences with expression/composition focus |
| **Writing** | Fill-in-the-blank | **New** | Complete sentences focusing on written expression |
| **Mix** | Auto-selected | **New** | System selects skill + format per question for balanced coverage |

### Deferred Combinations (Future Epics)

| Skill | Format | Reason |
|-------|--------|--------|
| Speaking | All formats | Requires audio recording infrastructure |
| Listening | Matching, Ordering | Add after Quiz + Fill-blank are validated |
| Reading | Matching, Ordering | Limited value over Comprehension in v1 |
| Writing | Free composition | Requires LLM-based evaluation engine |
| Grammar | Ordering (word order) | Nice-to-have, not critical for v1 |

---

## Stories

### Foundation

#### Story 30.1: Skill Category & Activity Format Data Model

**Description:**
Create the database tables for SkillCategory and ActivityFormat. Seed with the 6 skill categories (5 active + Speaking as inactive) and all activity formats. These are database-managed entities (not enums) to allow future additions without migrations.

**Key Tasks:**
- Create `SkillCategory` table: id, name, slug, icon, color, display_order, is_active, parent_id (self-ref, nullable), created_at
- Create `ActivityFormat` table: id, name, slug, description, created_at
- Create `SkillFormatCombination` table: skill_id, format_id, is_available, display_order, generation_prompt_key
- Seed 6 skills: Listening, Reading, Writing, Speaking (is_active=false), Vocabulary, Grammar
- Seed formats: multiple_choice, word_builder, matching, fill_blank, sentence_builder, comprehension
- Seed valid combinations per the matrix above
- Create CRUD API endpoints: `GET /api/v1/skills/` (list active skills with available formats)

**Acceptance Criteria:**
- [ ] SkillCategory table created with 6 seeded skills
- [ ] ActivityFormat table created with seeded formats
- [ ] SkillFormatCombination table maps valid skill-format pairs
- [ ] Speaking skill exists but is_active=false
- [ ] GET /api/v1/skills/ returns active skills with their available formats
- [ ] Alembic migration is backward compatible (additive only)

---

#### Story 30.2: Extend Assignment Model for Skill Classification

**Description:**
Add skill and format references to the Assignment model for AI-generated assignments. Existing book-based assignments are unaffected (fields are nullable). Add per-question skill tagging for Mix mode assignments.

**Key Tasks:**
- Add `primary_skill_id` (FK → SkillCategory, nullable) to Assignment model
- Add `activity_format_id` (FK → ActivityFormat, nullable) to Assignment model
- Add `is_mix_mode` boolean field (default false) to Assignment model
- Define JSON schema for per-question skill tags in `activity_content`
- Update AssignmentCreate schema to accept `skill_id` and `format_id` instead of `activity_type` for AI assignments
- Maintain backward compatibility: existing `activity_type` field still works for old assignments

**Acceptance Criteria:**
- [ ] New fields added to Assignment model (nullable, no breaking changes)
- [ ] Existing assignments continue to function without modification
- [ ] AssignmentCreate accepts new skill-first fields for AI assignments
- [ ] Per-question skill tagging schema defined for Mix mode content
- [ ] Migration is backward compatible

---

### Generation Refactoring

#### Story 30.3: Refactor AI Generation API to Skill-First Model

**Description:**
Restructure the generation endpoint to accept skill + format instead of activity_type. Remap existing generation logic under the new model. The old activity_type-based generation is retired for new assignments; existing content remains accessible.

**Key Tasks:**
- Create new generation endpoint: `POST /api/v1/ai/generate-v2` accepting `skill_slug` + `format_slug`
- Route requests to existing generators based on skill-format mapping:
  - (vocabulary, multiple_choice) → existing vocabulary_quiz generator
  - (vocabulary, word_builder) → existing word_builder generator
  - (vocabulary, matching) → existing vocabulary_matching generator
  - (grammar, multiple_choice) → existing ai_quiz generator (with grammar-focused prompt)
  - (grammar, sentence_builder) → existing sentence_builder generator
  - (reading, comprehension) → existing reading_comprehension generator
- Add `skill_id` and `format_id` to generated content metadata
- Update Content Library save/load to include skill classification
- Deprecate old `POST /api/v1/ai/generate` (keep functional for backward compat)

**Acceptance Criteria:**
- [ ] New endpoint generates content for all remapped combinations
- [ ] Generated content includes skill_id and format_id metadata
- [ ] Content Library displays skill classification
- [ ] Old endpoint still works but is deprecated
- [ ] Grammar quiz generation uses grammar-focused prompt (not generic)

---

#### Story 30.4: Listening Skill — Quiz Format (Audio + MCQ)

**Description:**
New generation type: audio-first multiple choice where students listen to a TTS-generated audio clip and answer comprehension questions. The audio is the primary input — no text transcript shown to students. Uses existing TTS provider layer.

**Key Tasks:**
- Create Listening Quiz generator that:
  - Extracts sentences/dialogues from module content via LLM
  - Generates TTS audio for each question prompt using Edge TTS
  - Creates MCQ options (text-based answers for audio questions)
  - Varies listening sub-skills: gist comprehension, detail extraction, phoneme discrimination
- Store audio URLs in activity_content alongside question data
- Ensure TTS audio is cached for reuse
- LLM prompt should produce questions where audio is REQUIRED to answer (no text alternative)

**Acceptance Criteria:**
- [ ] Generates quiz questions where each question has a TTS audio prompt
- [ ] Student cannot answer without listening (no text transcript of the prompt)
- [ ] Answer options are displayed as text
- [ ] Audio is generated via existing TTS provider layer
- [ ] At least 3 listening sub-skill types (gist, detail, discrimination) are supported
- [ ] Difficulty levels (CEFR-aligned) affect sentence complexity

---

#### Story 30.5: Listening Skill — Fill-in-the-Blank Format

**Description:**
New generation type: students listen to a TTS-generated sentence and type the missing word. Tests word recognition within a speech stream.

**Key Tasks:**
- Create Listening Fill-blank generator that:
  - Selects sentences from module content appropriate for the target CEFR level
  - Removes one key word from each sentence
  - Generates TTS audio of the COMPLETE sentence (including the missing word)
  - Provides the incomplete sentence as visual context (with blank)
- Student hears full sentence, sees sentence with blank, types the missing word
- Support configurable number of items and difficulty

**Acceptance Criteria:**
- [ ] Generates fill-blank items with TTS audio of the complete sentence
- [ ] Student sees partial text with blank + hears full audio
- [ ] Missing word is pedagogically meaningful (not articles/prepositions at easy levels)
- [ ] Scoring accepts minor spelling variations (configurable tolerance)
- [ ] Difficulty scales with CEFR level (word complexity, sentence length)

---

#### Story 30.6: Grammar Skill — Fill-in-the-Blank Format

**Description:**
New generation type: grammar-focused fill-in-the-blank where students complete sentences with the correct grammatical form (verb conjugation, tense, preposition, article, etc.).

**Key Tasks:**
- Create Grammar Fill-blank generator that:
  - Analyzes module content for grammar patterns via LLM
  - Generates sentences testing specific grammar points
  - Provides word bank or free-type input depending on difficulty
  - Includes brief grammar rule hint per question (optional, configurable)
- LLM prompt should target identifiable grammar topics (present simple, past tense, comparatives, etc.)
- Store detected grammar topic per question for future sub-skill reporting

**Acceptance Criteria:**
- [ ] Generates grammar-focused fill-blank items from module content
- [ ] Each question targets a specific grammar point
- [ ] Grammar topic is stored per question (e.g., "present_simple", "comparatives")
- [ ] Supports word bank mode (easier) and free-type mode (harder)
- [ ] Difficulty aligns with module CEFR level

---

#### Story 30.7: Writing Skill — Sentence Builder & Fill-Blank Formats

**Description:**
Adapt existing sentence builder and create new fill-blank with writing-focused prompts. Writing activities emphasize expression, composition, and contextual word choice rather than grammar rules or vocabulary recall.

**Key Tasks:**
- Writing Sentence Builder: fork sentence_builder generator with writing-focused LLM prompt
  - Emphasize expressive sentences, not just grammatically correct ones
  - Include context/scenario per sentence (e.g., "You are writing a letter to a friend")
- Writing Fill-blank: new generator
  - Sentence completion focusing on contextual expression
  - Multiple acceptable answers (scored by LLM or predefined alternatives)
  - Context-driven prompts (describe, explain, express opinion)
- Both formats should feel distinct from Grammar variants

**Acceptance Criteria:**
- [ ] Writing Sentence Builder generates sentences with expressive/compositional focus
- [ ] Writing Fill-blank accepts multiple valid answers
- [ ] Activities include context/scenario prompts
- [ ] Writing activities feel pedagogically distinct from Grammar activities
- [ ] Difficulty scales with CEFR level

---

#### Story 30.8: Mix Mode Generation

**Description:**
Implement the Mix mode that generates a balanced multi-skill assignment. When teacher selects "Mix," the system automatically selects skills and formats to create a diverse practice set. Each generated question is tagged with its skill for reporting.

**Key Tasks:**
- Define skill distribution strategy for Mix mode:
  - Default: roughly equal distribution across available skills relevant to module content
  - If module is vocabulary-heavy, weight toward Vocabulary + Grammar
  - If module has dialogue content, include Listening questions
- For each skill slot, select an appropriate format from valid combinations
- Generate questions using the respective skill generators (Stories 30.3–30.7)
- Tag each question with skill_id and format_id in the activity_content JSON
- Mix mode skips the format selection step — system handles it
- Total question count is configurable by teacher

**Acceptance Criteria:**
- [ ] Mix mode generates questions spanning at least 3 different skills
- [ ] Each question is individually tagged with skill_id and format_id
- [ ] Distribution is balanced but adapts to module content
- [ ] Teacher configures total question count only (no format selection)
- [ ] Generated assignment has is_mix_mode=true
- [ ] All skill-specific generators are called correctly
- [ ] Works with all CEFR difficulty levels

---

### Frontend

#### Story 30.9: Skill Selection Step UI

**Description:**
Replace the current activity type selector in the DreamAI Question Generator (Story 27.17) with a skill selection grid. This becomes Step 2 of the generation flow (after book + module selection).

**Key Tasks:**
- Replace activity type dropdown/cards with skill selection grid:
  - 5 active skill cards: Listening (ear icon, blue), Reading (book icon, green), Writing (pencil icon, orange), Vocabulary (text icon, teal), Grammar (braces icon, indigo)
  - 1 Mix card: Mix (shuffle icon, gradient)
  - Speaking card shown as disabled with "Coming Soon" badge
- Each skill card shows: icon, name, brief description, number of available formats
- Single selection (radio behavior) — exactly one skill chosen
- Selection state drives which formats appear in next step
- Mix selection skips format step entirely

**Acceptance Criteria:**
- [ ] 6 skill cards displayed (5 active + Mix) plus Speaking as Coming Soon
- [ ] Only one skill can be selected at a time
- [ ] Selected skill visually highlighted
- [ ] Speaking card is visually disabled with "Coming Soon" label
- [ ] Selecting Mix proceeds directly to configuration step (skip format)
- [ ] Responsive layout for different screen sizes

---

#### Story 30.10: Format Selection & Configuration Step

**Description:**
After skill selection, show available activity formats for the chosen skill. Teacher selects one format, then configures difficulty and question count. This replaces the old configuration step.

**Key Tasks:**
- Fetch valid formats for selected skill from `GET /api/v1/skills/`
- Display format cards with: name, description, preview icon
- After format selection, show configuration panel:
  - Difficulty: CEFR level selector (A1, A2, B1, B2) — auto-suggested from module
  - Question count: slider or preset buttons (5, 10, 15, 20)
  - For Listening: audio speed option (normal, slow)
  - Optional secondary skill toggle (collapsed by default): "Also emphasize: □ Vocabulary □ Grammar"
- Generate button triggers generation with skill + format + config
- Mix mode: skip format selection, show only difficulty + total count

**Acceptance Criteria:**
- [ ] Only valid formats for selected skill are shown
- [ ] Format cards show clear descriptions of what the format produces
- [ ] Configuration options adapt to selected skill (e.g., audio speed for Listening)
- [ ] Secondary skill selection available but not required
- [ ] Mix mode shows simplified configuration (difficulty + count only)
- [ ] Generate button is disabled until all required fields are set

---

#### Story 30.11: Activity Player Updates for New Formats

**Description:**
Extend the Activity Player to support the new activity formats: Listening Quiz, Listening Fill-blank, Grammar Fill-blank, Writing Fill-blank. Listening activities require an integrated audio player as the primary input mechanism.

**Key Tasks:**
- Listening Quiz player: audio play button (prominent), no text transcript, MCQ answer options
- Listening Fill-blank player: audio play button + partial sentence display + text input
- Grammar Fill-blank player: sentence with blank + word bank or free-type input
- Writing Fill-blank player: context prompt + sentence with blank + free-type input
- All new players follow existing player patterns (scoring, progress save, submission)
- Audio replay controls for Listening (play, replay, playback count tracking)

**Acceptance Criteria:**
- [ ] Listening Quiz renders audio control as primary element, no text transcript visible
- [ ] Listening Fill-blank shows partial sentence + audio control + text input
- [ ] Grammar Fill-blank supports word bank mode and free-type mode
- [ ] Writing Fill-blank displays context prompt and accepts free-text input
- [ ] All players integrate with existing scoring and progress tracking
- [ ] Audio replay limit is configurable (default: unlimited)

---

### Reporting & Analytics

#### Story 30.12: Skill Score Attribution Engine

**Description:**
Build the backend engine that attributes assignment scores to individual skills. When a student completes a skill-tagged assignment, their score is decomposed into per-skill contributions for aggregation.

**Key Tasks:**
- Create `StudentSkillScore` table:
  - student_id, skill_id, assignment_id, assignment_student_id
  - attributed_score, attributed_max_score, weight
  - cefr_level (from assignment difficulty)
  - recorded_at
- Single-skill assignments: full score attributed to primary skill
- Mix mode assignments: per-question scores attributed to each question's tagged skill
- Attribution runs automatically on assignment submission (post-scoring hook)
- Support recalculation if skill tags are corrected retroactively

**Acceptance Criteria:**
- [ ] StudentSkillScore records created on every AI assignment submission
- [ ] Single-skill assignments attribute 100% of score to primary skill
- [ ] Mix mode assignments attribute per-question scores to respective skills
- [ ] Attribution includes CEFR level for difficulty-aware reporting
- [ ] Recalculation endpoint available for admin corrections

---

#### Story 30.13: Assignment Skill Breakdown View (Teacher)

**Description:**
On the assignment detail/analytics page, show which skills the assignment tested and per-skill performance breakdown.

**Key Tasks:**
- Add skill breakdown section to existing assignment analytics page
- Show: primary skill badge, format badge, skill distribution (for Mix mode)
- Per-skill average score across all students
- Per-skill completion rates
- Highlight weakest skill in the assignment

**Acceptance Criteria:**
- [ ] Assignment detail page shows skill and format classification
- [ ] Mix mode assignments show per-skill score distribution chart
- [ ] Per-skill class average is displayed
- [ ] Weakest skill is visually highlighted
- [ ] Integrates with existing analytics UI patterns

---

#### Story 30.14: Student Skill Profile with Radar Chart

**Description:**
Create a student skill profile view showing proficiency across all 5 skills as a radar/spider chart. Accessible from the teacher's student detail view and the student's own dashboard.

**Key Tasks:**
- Aggregate StudentSkillScore data per student across all assignments
- Calculate per-skill proficiency: weighted average score (weighted by attributed_max_score)
- Render radar chart with 5 axes (Listening, Reading, Writing, Vocabulary, Grammar)
- Show data confidence indicators:
  - Insufficient (< 3 data points): greyed out axis, "Not enough data"
  - Low (3-5 data points): dashed line, "Early estimate"
  - Moderate (6-10): solid line
  - High (10+): solid line + trend indicator
- Teacher view: accessible from student detail page
- Student view: accessible from student dashboard

**Acceptance Criteria:**
- [ ] Radar chart renders with 5 skill axes
- [ ] Proficiency values calculated from aggregated skill scores
- [ ] Confidence levels visually distinguished (grey/dashed/solid)
- [ ] "Not enough data" shown for skills with < 3 data points
- [ ] Teacher can view any student's profile
- [ ] Student can view their own profile
- [ ] Chart is responsive and accessible

---

#### Story 30.15: Class Skill Heatmap (Teacher)

**Description:**
Provide a heatmap view showing all students in a class mapped against the 5 skills. Enables teachers to quickly identify skill-level weaknesses across the class.

**Key Tasks:**
- Create heatmap component: rows = students, columns = 5 skills
- Cells colored by proficiency (red < 50%, yellow 50-70%, green > 70%)
- Sortable by any skill column
- Filter by class
- Summary row showing class averages per skill
- Clickable cells navigate to student skill detail

**Acceptance Criteria:**
- [ ] Heatmap displays students × skills matrix
- [ ] Color coding reflects proficiency levels
- [ ] Sortable by any skill column
- [ ] Filterable by class
- [ ] Class average summary row displayed
- [ ] Clicking a cell navigates to student detail

---

#### Story 30.16: Skill Trend Over Time (Teacher & Student)

**Description:**
Show how a student's skill proficiency changes over time. Line chart per skill showing score trajectory across assignments.

**Key Tasks:**
- Query StudentSkillScore grouped by skill and ordered by date
- Plot line chart with one line per skill over time (x-axis: date, y-axis: score %)
- Apply minimum data threshold: only show trend line for skills with 3+ data points
- Date range selector (last 30 days, last 3 months, semester, all time)
- Teacher view: select any student in their classes
- Student view: own data only

**Acceptance Criteria:**
- [ ] Line chart renders per-skill trend lines over time
- [ ] Date range filtering works correctly
- [ ] Skills with insufficient data show "Not enough data" instead of a misleading trend
- [ ] Teacher can view any student's trends
- [ ] Student can view own trends
- [ ] Chart handles gaps in data gracefully

---

#### Story 30.17: Student Skill Summary (Student-Facing)

**Description:**
Age-appropriate skill summary for students. Instead of raw percentages and complex charts, show simplified visual indicators (stars, levels, or progress bars) with encouraging language.

**Key Tasks:**
- Design simplified skill cards for student dashboard
- Each skill shows: icon, name, progress indicator (stars 1-5 or level bar)
- Map proficiency percentage to stars/levels: 0-20%=1, 21-40%=2, 41-60%=3, 61-80%=4, 81-100%=5
- Show "Keep practicing!" for low skills, "Great job!" for high skills
- Optional: "Most improved skill" badge
- No raw numbers shown to students — only visual indicators

**Acceptance Criteria:**
- [ ] Student dashboard shows 5 skill cards with visual indicators
- [ ] No raw percentages or complex charts shown to students
- [ ] Encouraging language per skill level
- [ ] Skills with insufficient data show "Start practicing!" message
- [ ] Responsive and visually engaging for younger learners

---

## Technical Notes

### Generation Prompt Architecture

Each skill-format combination has a dedicated prompt template. The prompt includes:
- Skill intent declaration (e.g., "Generate a LISTENING comprehension activity")
- Format specification (e.g., "in multiple-choice format")
- Module content (text from DCS)
- CEFR difficulty target
- Language specification
- Output JSON schema

Prompt templates are stored as configurable strings (not hardcoded) to allow refinement without code changes.

### Listening Activity Audio Pipeline

```
Module Text → LLM extracts question-worthy sentences/dialogues
  → TTS generates audio for each prompt
  → Audio stored in DCS or local cache with presigned URLs
  → Activity content JSON references audio URLs
  → Student player loads audio as primary input
```

Uses existing TTS provider layer (Edge TTS primary, Azure fallback). Audio is cached with 1-hour presigned URLs, regenerated on demand.

### Mix Mode Distribution Algorithm

```
Input: module_content, total_questions, difficulty

1. Analyze module content for skill signals:
   - Vocabulary richness → Vocabulary weight
   - Dialogue/audio references → Listening weight
   - Grammar pattern density → Grammar weight
   - Passage length/complexity → Reading weight
   - Expressive language examples → Writing weight

2. Distribute questions proportionally (min 1 per skill if weight > 0)
   - Example: 10 questions → 2 Listening, 2 Reading, 2 Writing, 2 Vocab, 2 Grammar

3. For each question slot: select best format for the skill
4. Generate using respective skill generators
5. Tag each question with (skill_id, format_id)
6. Shuffle question order
```

### Score Attribution Calculation

**Single-skill assignment:**
```
score = student's total score on the assignment
StudentSkillScore: (skill=primary_skill, score=score, max=100, weight=1.0)
```

**Mix mode assignment:**
```
For each question q in assignment:
  StudentSkillScore: (skill=q.skill_id, score=q.score, max=q.max_score, weight=1.0)

Student proficiency for skill S = sum(attributed_scores for S) / sum(attributed_max_scores for S) × 100
```

### Backward Compatibility

| Aspect | Approach |
|--------|----------|
| Existing AI assignments | Remain accessible with original activity_type. New fields (primary_skill_id, activity_format_id) are NULL for old assignments. |
| Old generation endpoint | `POST /api/v1/ai/generate` kept functional but deprecated. Returns deprecation header. |
| Content Library | Existing saved content displays without skill tags. New saves include skill metadata. |
| Activity players | Existing players unchanged. New format players added alongside. |
| Student scores | Existing scores not retroactively attributed to skills. Only new assignments produce skill data. |

---

## Compatibility Requirements

- [x] Existing AI-generated assignments remain fully functional
- [x] Existing activity players unchanged (new players added alongside)
- [x] Database changes are additive only (new tables + nullable columns)
- [x] Existing Content Library entries remain accessible
- [x] No changes to book-based (DCS) assignment flow
- [x] No changes to student assignment completion flow for existing types

---

## Risk Mitigation

| Risk | Mitigation | Rollback Plan |
|------|------------|---------------|
| Listening TTS quality insufficient for comprehension testing | Test with multiple voices/speeds; allow teacher preview before assigning | Disable Listening skill (is_active=false) without affecting other skills |
| Mix mode distribution produces unbalanced assignments | Tunable weights + teacher preview step; start with equal distribution | Allow teacher to manually adjust skill distribution before generation |
| Writing fill-blank with multiple valid answers is hard to score | Predefined answer alternatives from LLM; flexible matching with normalized comparison | Fall back to word bank mode (finite options) instead of free-type |
| Skill reporting misleading with small data sets | Minimum data thresholds (3+ activities per skill before showing proficiency) | Show "Not enough data" instead of inaccurate numbers |
| Migration confusion — teachers expect old UI | In-app notification explaining the new flow; keep old endpoint temporarily | Feature flag to revert to old activity-type flow |

---

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] 5 skills active with valid format combinations functional
- [ ] Mix mode generates balanced multi-skill assignments
- [ ] All new activity format players rendering and scoring correctly
- [ ] Skill score attribution running on every AI assignment submission
- [ ] Radar chart, heatmap, and trend views functional
- [ ] Student-facing skill summary displaying correctly
- [ ] Existing AI assignment flow unaffected (backward compatible)
- [ ] Speaking skill shown as "Coming Soon"
- [ ] No regression in existing features (book assignments, DCS integration, analytics)

---

## Dependencies

- **Epic 27 (DreamAI):** This epic extends Epic 27's generation infrastructure, LLM/TTS providers, Content Library, and Activity Player
- **DCS AI-Data Pipeline:** Module text, vocabulary, and audio endpoints must be available
- **TTS Provider Layer:** Required for Listening skill activities (Stories 30.4, 30.5)
- **Existing Assignment Infrastructure:** Multi-activity support, scoring engine, analytics patterns

---

## Affected Roles

| Role | Impact |
|------|--------|
| Teacher | New skill-first generation flow, skill-based analytics dashboards |
| Student | New activity format players (Listening, Writing, Grammar fill-blank), skill profile on dashboard |
| Admin | Skill category management (future), no immediate changes |
| Supervisor | Access to skill-based reporting across teachers |
| Publisher | No direct impact (book-based activity skill tagging is a separate epic) |
