# Epic 27: DreamAI - AI-Powered Content Generation

**Estimated Effort:** 4-5 weeks | **Status:** Planning

Enable teachers to generate educational content (questions, activities, vocabulary quizzes) using AI. Integrates with DCS pre-processed book data and supports teacher-uploaded materials. Features a dedicated DreamAI section in the sidebar with abstracted LLM and TTS provider layers for flexibility.

**What Currently Exists:** Manual activity creation, no AI assistance, no vocabulary audio
**What We Build:** AI content generation + TTS audio + DreamAI UI + Provider abstraction layers

**Dependencies:**
- DCS Epic 10 (AI Book Processing Pipeline) - provides pre-processed book data
- Existing book/activity infrastructure in LMS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DREAMAI PLATFORM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    LLM Provider Layer                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │ DeepSeek │  │  Gemini  │  │  OpenAI  │                   │   │
│  │  │ (Primary)│  │(Fallback)│  │(Premium) │                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    TTS Provider Layer                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │ Edge TTS │  │Azure TTS │  │Google TTS│                   │   │
│  │  │ (Primary)│  │(Fallback)│  │(Optional)│                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    AI Service Layer                          │   │
│  │  • Fetches pre-processed data from DCS                      │   │
│  │  • Generates questions/activities                            │   │
│  │  • Processes teacher materials                               │   │
│  │  • Manages audio playback                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DCS Integration Reference

### DCS AI-Data Storage Structure
```
{publisher_name}/books/{book_name}/ai-data/
├── metadata.json           # Processing status, totals, stages
├── text/                   # Extracted text per page
├── modules/                # Segmented modules
│   ├── module_1.json
│   ├── module_2.json
│   └── ...
├── vocabulary.json         # All extracted vocabulary
└── audio/
    └── vocabulary/         # TTS audio files
        ├── en/{word}.mp3
        ├── tr/{word}.mp3
        └── ...
```

### DCS API Endpoints (Already Implemented)

| Method | DCS Endpoint | Description |
|--------|--------------|-------------|
| GET | `/books/{book_id}/ai-data/metadata` | Processing metadata, status, totals |
| GET | `/books/{book_id}/ai-data/modules` | List all modules (module_id, title, pages, word_count) |
| GET | `/books/{book_id}/ai-data/modules/{module_id}` | Full module (text, topics, vocabulary_ids, language, difficulty) |
| GET | `/books/{book_id}/ai-data/vocabulary?module={id}` | Vocabulary words with audio paths |
| GET | `/books/{book_id}/ai-data/audio/vocabulary/{lang}/{word}.mp3` | Presigned audio URL |
| GET | `/books/{book_id}/process-ai/status` | Processing job status |

### DCS Data Models

**ProcessingMetadata:**
```json
{
  "book_id": "123",
  "processing_status": "completed",  // pending, processing, completed, partial, failed
  "total_pages": 120,
  "total_modules": 12,
  "total_vocabulary": 450,
  "total_audio_files": 900,
  "languages": ["en", "tr"],
  "primary_language": "en",
  "difficulty_range": ["A1", "A2", "B1"],
  "stages": { ... }
}
```

**VocabularyWord:**
```json
{
  "id": "vocab_123",
  "word": "accomplish",
  "translation": "başarmak",
  "definition": "to succeed in doing something",
  "part_of_speech": "verb",
  "level": "B1",
  "example": "She accomplished her goal.",
  "module_id": 3,
  "module_title": "Unit 3: Achievements",
  "page": 45,
  "audio": {
    "word": "audio/vocabulary/en/accomplish.mp3",
    "translation": "audio/vocabulary/tr/accomplish.mp3"
  }
}
```

---

## User Access

| Role | Access Level |
|------|--------------|
| Admin | Full access - all features + usage monitoring |
| Supervisor | Full access - all generation features |
| Teacher | Full access - generate for own classes |
| Publisher | Read-only - view generated content |
| Student | No access to generation; access to Vocabulary Study Tab |

---

## Content Storage Architecture

### Book-Based Generated Content
- **Location:** Stored under book domain in DCS or LMS cache
- **Access:** Shared among all teachers
- **Use Case:** Pre-generated content from book modules
- **Caching:** Long TTL, invalidated on book reprocessing

### Teacher-Specific Generated Content
- **Location:** Teacher's personal area in LMS
- **Access:** Isolated per teacher
- **Use Case:** Content from teacher's uploaded materials
- **Storage:** Dedicated teacher content table

---

## Stories

### Infrastructure Stories

#### Story 27.1: LLM Provider Abstraction Layer

**Description:** Create an abstracted LLM service layer that supports multiple providers with automatic fallback.

**Acceptance Criteria:**
- [ ] Abstract base class/interface for LLM providers
- [ ] Provider configuration via environment variables
- [ ] Automatic fallback when primary provider fails
- [ ] Request/response logging for debugging
- [ ] Token usage tracking per request
- [ ] Rate limiting support
- [ ] Async/await support for non-blocking calls

**Technical Notes:**
```python
class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, options: GenerationOptions) -> GenerationResult:
        pass

    @abstractmethod
    async def generate_structured(self, prompt: str, schema: dict) -> dict:
        pass
```

---

#### Story 27.2: DeepSeek Provider Integration

**Description:** Implement DeepSeek as the primary LLM provider.

**Acceptance Criteria:**
- [ ] DeepSeek API client implementation
- [ ] Support for DeepSeek-V3 model
- [ ] Structured JSON output support
- [ ] Error handling and retry logic
- [ ] Cost tracking per request
- [ ] Environment-based API key configuration

**Technical Notes:**
- API: `https://api.deepseek.com/v1/chat/completions`
- Model: `deepseek-chat` (V3)
- Cost: ~$0.14/1M input, $0.28/1M output

---

#### Story 27.3: Gemini Provider Integration

**Description:** Implement Google Gemini as fallback LLM provider with vision capabilities.

**Acceptance Criteria:**
- [ ] Gemini API client implementation
- [ ] Support for Gemini 1.5 Flash model
- [ ] Vision/image analysis support (for Phase 2)
- [ ] PDF native processing support
- [ ] Free tier usage optimization
- [ ] Fallback activation when DeepSeek fails

**Technical Notes:**
- Model: `gemini-1.5-flash`
- Free tier: 60 requests/minute
- Supports direct PDF/image input

---

#### Story 27.4: TTS Provider Abstraction Layer

**Description:** Create an abstracted TTS service layer for audio generation.

**Acceptance Criteria:**
- [ ] Abstract base class/interface for TTS providers
- [ ] Language detection and voice selection
- [ ] Audio format configuration (MP3, WAV)
- [ ] Caching layer for generated audio
- [ ] Provider fallback support
- [ ] Batch generation support

**Technical Notes:**
```python
class TTSProvider(ABC):
    @abstractmethod
    async def generate_audio(self, text: str, language: str, voice: str) -> bytes:
        pass

    @abstractmethod
    def get_available_voices(self, language: str) -> List[Voice]:
        pass
```

---

#### Story 27.5: Edge TTS Provider Integration

**Description:** Implement Edge TTS as the primary (free) TTS provider.

**Acceptance Criteria:**
- [ ] Edge TTS library integration (`edge-tts`)
- [ ] Turkish voice support (`tr-TR-AhmetNeural`, `tr-TR-EmelNeural`)
- [ ] English voice support (multiple accents)
- [ ] Async audio generation
- [ ] Audio file caching
- [ ] Batch processing for vocabulary lists

**Technical Notes:**
- Library: `edge-tts` (Python)
- Cost: FREE
- Quality: Very good for most languages

---

#### Story 27.6: Azure TTS Provider (Fallback)

**Description:** Implement Azure TTS as premium fallback option.

**Acceptance Criteria:**
- [ ] Azure Cognitive Services TTS integration
- [ ] Turkey region configuration for KVKK
- [ ] Neural voice support
- [ ] SSML support for advanced pronunciation
- [ ] Cost tracking
- [ ] Activation only when Edge TTS fails

**Technical Notes:**
- Region: `turkeycentral` (for KVKK compliance)
- Cost: ~$4/1M characters

---

### DCS Integration Stories

#### Story 27.7: DCS AI Service Client

**Description:** Create service layer to consume DCS AI data endpoints.

**Acceptance Criteria:**
- [ ] HTTP client for DCS `/books/{book_id}/ai-data/*` endpoints
- [ ] Authentication using LMS API key or JWT
- [ ] Fetch processing metadata and status
- [ ] Fetch module list and details (text, topics, vocabulary_ids)
- [ ] Fetch vocabulary with audio paths
- [ ] Resolve presigned audio URLs
- [ ] Handle 404 for unprocessed books gracefully
- [ ] Cache responses with appropriate TTL:
  - Metadata: 1 minute (may change during processing)
  - Modules: 5 minutes (relatively static)
  - Vocabulary: 5 minutes
  - Audio URLs: 1 hour (presigned URLs valid for 1 hour)

**DCS Response Schemas:**
```typescript
// ModuleListResponse
interface ModuleListResponse {
  book_id: string;
  total_modules: number;
  modules: ModuleSummary[];
}

interface ModuleSummary {
  module_id: number;
  title: string;
  pages: number[];
  word_count: number;
}

// VocabularyResponse
interface VocabularyResponse {
  book_id: string;
  language: string;
  translation_language: string;
  total_words: number;
  words: VocabularyWord[];
  extracted_at: string | null;
}
```

---

### Content Generation Stories

#### Story 27.8: Vocabulary Quiz Generation (Definition-Based)

**Description:** Generate vocabulary quizzes using English definitions (not translations).

**Acceptance Criteria:**
- [ ] Select module(s) for vocabulary source
- [ ] Quiz type: Show definition → Student selects correct word
- [ ] Use ENGLISH definitions from DCS vocabulary, NOT translations
- [ ] Plausible distractors from same difficulty level
- [ ] Include audio for word pronunciation
- [ ] Show answer only after quiz submission (not immediately)
- [ ] Configurable quiz length (5, 10, 15, 20 words)
- [ ] CEFR level filtering (A1, A2, B1, B2, C1)

**Quiz Flow:**
1. Display English definition
2. Show 4 word options (1 correct, 3 distractors)
3. Student selects answer
4. Move to next question (no immediate feedback)
5. Show all results at end with correct answers

---

#### Story 27.9: AI Quiz Generation (MCQ)

**Description:** Generate multiple choice questions from book modules.

**Acceptance Criteria:**
- [ ] Select one or multiple modules as source
- [ ] Difficulty level selection (easy, medium, hard)
- [ ] Question count configuration (1-20)
- [ ] Language detection and matching
- [ ] Plausible distractor generation
- [ ] Output in activity-compatible JSON format
- [ ] Include explanations for correct answers
- [ ] **Show answers only after entire quiz is submitted**

**Quiz Behavior:**
- No immediate answer feedback during quiz
- Student completes all questions first
- Results shown after submission with correct/incorrect indicators
- Include explanations for each question

---

#### Story 27.10: Reading Comprehension Generation

**Description:** Generate reading comprehension activities from book content.

**Acceptance Criteria:**
- [ ] **MUST use actual book module content** (not AI-generated passages)
- [ ] Display passage from selected module
- [ ] Generate comprehension questions about the passage
- [ ] Question types: MCQ, True/False, Short Answer
- [ ] Source reference (module, page numbers)
- [ ] Difficulty based on module's CEFR level
- [ ] Configurable number of questions per passage

---

#### Story 27.11: Vocabulary Flashcards (Permanent Study Tab)

**Description:** Create a permanent vocabulary study section for students.

**Acceptance Criteria:**
- [ ] **Permanent "Study" tab in student view** (not assignment-based)
- [ ] Teachers can add flashcard sets from book vocabulary
- [ ] Students can practice any time (not deadline-bound)
- [ ] Flashcard front: Word with audio
- [ ] Flashcard back: Definition + Example + Translation
- [ ] Spaced repetition tracking (known/unknown marking)
- [ ] Progress tracking per vocabulary set
- [ ] Teachers can also add custom flashcards

**UI Location:**
- Student sidebar: 📚 Study > Vocabulary Flashcards
- Always accessible, not tied to assignments

---

#### Story 27.12: Vocabulary Matching Activity

**Description:** Generate vocabulary matching activities with multiple formats.

**Acceptance Criteria:**
- [ ] **Match Types:**
  - Word → Synonym matching
  - Word → Antonym matching
  - Audio → Word matching (listen and select)
  - Word → Definition matching
- [ ] Use DCS vocabulary and audio
- [ ] Configurable number of pairs (5, 8, 10)
- [ ] Timer option for timed challenges
- [ ] Shuffle order on each attempt

**Matching Interface:**
- Two columns layout
- Click to select, click to match
- Visual feedback on correct/incorrect pairs

---

#### Story 27.13: Sentence Builder Activity (Duolingo-Style)

**Description:** Create word ordering activities where students build sentences.

**Acceptance Criteria:**
- [ ] Display jumbled words from a sentence
- [ ] **CLICK to place words** (not drag-drop) - word moves to first empty slot
- [ ] Click placed word to remove it back to word bank
- [ ] Sentences extracted from book modules
- [ ] Focus on grammar and sentence structure
- [ ] Audio playback of correct sentence
- [ ] Configurable sentence count
- [ ] Difficulty levels:
  - Easy: 4-6 words
  - Medium: 7-10 words
  - Hard: 11+ words with complex structure

**UI Behavior:**
```
Word Bank: [quickly] [ran] [dog] [the] [away]

Sentence:  [ the ] [ dog ] [ ran ] [      ] [      ]
                                    ↑ First empty slot
```
- Tap "quickly" → moves to first empty slot
- Tap placed word → returns to word bank

---

#### Story 27.14: Word Builder (Spelling Activity)

**Description:** Spelling practice activity with letter arrangement.

**Acceptance Criteria:**
- [ ] Show word definition or image/audio hint
- [ ] Display scrambled letters
- [ ] **CLICK to place letters** (not drag-drop)
- [ ] Letter moves to first empty position
- [ ] Use vocabulary from DCS
- [ ] Audio pronunciation after correct spelling
- [ ] Configurable word count
- [ ] Track attempts and accuracy

---

#### Story 27.15: Teacher Materials Processing

**Description:** Allow teachers to upload their own materials for question generation.

**Acceptance Criteria:**
- [ ] PDF upload and text extraction
- [ ] Direct text/paste input
- [ ] Document preview before processing
- [ ] Same generation options as book-based
- [ ] Save generated content to teacher's personal library (isolated)
- [ ] Material history/library
- [ ] Content NOT shared with other teachers

**Supported Formats:**
- PDF (text-based and scanned via Gemini Vision)
- Plain text
- Word documents (.docx) - Phase 2

---

### Frontend Stories

#### Story 27.16: DreamAI Sidebar Section

**Description:** Add DreamAI section to sidebar for Admin, Supervisor, and Teacher roles.

**Acceptance Criteria:**
- [ ] New sidebar item with AI icon
- [ ] Role-based visibility (Admin, Supervisor, Teacher)
- [ ] Sub-navigation: Generator, Vocabulary Explorer, Content Library
- [ ] Badge for pending generated content
- [ ] Consistent with existing sidebar design

**Sidebar Structure:**
```
🤖 DreamAI
├── Question Generator
├── Vocabulary Explorer
└── Content Library
```

---

#### Story 27.17: Question Generator UI

**Description:** Build the main UI for AI content generation.

**Acceptance Criteria:**
- [ ] Source selection: Book Module / My Materials
- [ ] Book and module picker (multi-select)
- [ ] Activity type selection:
  - Vocabulary Quiz
  - AI Quiz (MCQ)
  - Reading Comprehension
  - Vocabulary Matching
  - Sentence Builder
  - Word Builder
- [ ] Difficulty selector (Easy, Medium, Hard)
- [ ] Count selector (varies by activity type)
- [ ] Language indicator
- [ ] Generate button with loading state
- [ ] Preview generated content before saving

**UI Flow:**
```
Select Source → Configure Options → Generate → Review → Save to Assignment
```

---

#### Story 27.18: Vocabulary Explorer with Audio Player

**Description:** Browse and explore book vocabulary with audio playback.

**Acceptance Criteria:**
- [ ] Book selector dropdown
- [ ] Module filter
- [ ] Search/filter vocabulary
- [ ] Audio playback button for each word
- [ ] Show: word, translation, definition, example, CEFR level
- [ ] Quick-add to quiz functionality
- [ ] Pagination for large vocabulary lists

---

#### Story 27.19: Generated Content Review Flow

**Description:** Allow teachers to review, edit, and save AI-generated content.

**Acceptance Criteria:**
- [ ] Display generated questions in editable form
- [ ] Edit question text, options, correct answer
- [ ] Delete individual questions
- [ ] Regenerate single question
- [ ] Regenerate all with same parameters
- [ ] Save to new assignment or existing
- [ ] Save to content library for reuse

---

#### Story 27.20: Unified Activity Player Integration

**Description:** Extend existing Activity Player to support new AI activity types.

**Acceptance Criteria:**
- [ ] Use same Assignment entity for AI-generated content
- [ ] Add new activity type handlers to existing Activity Player:
  - `vocabulary_quiz` - Definition-based quiz
  - `vocabulary_matching` - Matching pairs
  - `sentence_builder` - Click-to-place word ordering
  - `word_builder` - Letter spelling
- [ ] Consistent scoring and progress tracking
- [ ] Unified student assignment view
- [ ] Same grading and reporting interface

**NOT a separate system - extends existing Activity Player**

---

#### Story 27.21: Content Library UI

**Description:** Manage saved AI-generated content for reuse.

**Acceptance Criteria:**
- [ ] List all saved generated content
- [ ] Filter by type, date, book, module
- [ ] Preview content details
- [ ] Add to assignment action
- [ ] Delete from library
- [ ] Book-based content shared, teacher content isolated

---

### Admin Stories

#### Story 27.22: AI Usage Dashboard

**Description:** Admin dashboard for monitoring AI usage and costs.

**Acceptance Criteria:**
- [ ] Total generations by type
- [ ] Usage by teacher
- [ ] Estimated costs (LLM + TTS)
- [ ] Provider usage breakdown
- [ ] Error rate monitoring
- [ ] Date range filtering
- [ ] Export usage report

---

## Data Models

### GenerationRequest
```python
class GenerationRequest(BaseModel):
    source_type: Literal["book_module", "teacher_material"]
    book_id: Optional[UUID]
    module_ids: Optional[List[int]]
    material_text: Optional[str]
    activity_type: Literal[
        "vocabulary_quiz",
        "ai_quiz",
        "reading_comprehension",
        "vocabulary_matching",
        "sentence_builder",
        "word_builder"
    ]
    difficulty: Literal["easy", "medium", "hard"]
    count: int = 10
    language: Optional[str]  # Auto-detect if not provided
    include_audio: bool = True
```

### GeneratedContent
```python
class GeneratedContent(BaseModel):
    id: UUID
    teacher_id: UUID
    source_type: str  # "book" or "teacher_material"
    book_id: Optional[UUID]
    module_ids: Optional[List[int]]
    activity_type: str
    content: dict  # Activity-specific content
    is_shared: bool  # True for book-based, False for teacher materials
    created_at: datetime
    used_in_assignments: List[UUID]
```

---

## API Endpoints (LMS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/generate` | Generate content |
| GET | `/api/v1/ai/books/{book_id}/modules` | Proxy to DCS - get modules with AI data |
| GET | `/api/v1/ai/books/{book_id}/vocabulary` | Proxy to DCS - get vocabulary |
| GET | `/api/v1/ai/books/{book_id}/status` | Check if book has AI data |
| POST | `/api/v1/ai/materials/process` | Process uploaded material |
| GET | `/api/v1/ai/library` | Get saved generated content |
| POST | `/api/v1/ai/library` | Save to library |
| DELETE | `/api/v1/ai/library/{id}` | Delete from library |
| GET | `/api/v1/ai/usage` | Get usage statistics (admin) |

---

## Environment Variables

```bash
# LLM Providers
DEEPSEEK_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
OPENAI_API_KEY=sk-xxx  # Optional, premium

# TTS Providers
AZURE_TTS_KEY=xxx  # Optional, fallback
AZURE_TTS_REGION=turkeycentral

# Provider Selection (same as DCS for consistency)
LLM_PRIMARY_PROVIDER=deepseek
LLM_FALLBACK_PROVIDER=gemini
TTS_PRIMARY_PROVIDER=edge
TTS_FALLBACK_PROVIDER=azure

# DCS Integration
DCS_API_URL=http://dcs-api:8000
DCS_API_KEY=xxx

# Feature Flags
AI_GENERATION_ENABLED=true
AI_MAX_QUESTIONS_PER_REQUEST=20
AI_DAILY_LIMIT_PER_TEACHER=100
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Generation success rate | > 95% |
| Average generation time | < 10 seconds |
| Teacher adoption rate | > 50% within 3 months |
| Questions used in assignments | > 70% of generated |
| Cost per question | < $0.01 |

---

## Phase 2 Features (Not in Scope)

- Image generation for activities
- Image analysis for question generation
- Full audiobook generation
- Student-facing AI tutor
- Automatic difficulty adjustment
- AI-powered grading for open-ended questions

---

## Deliverables

1. Abstracted LLM provider layer (DeepSeek + Gemini)
2. Abstracted TTS provider layer (Edge TTS + Azure)
3. DCS AI Service Client for consuming `/ai-data/` endpoints
4. Activity generation for 6 activity types:
   - Vocabulary Quiz (definition-based)
   - AI Quiz (MCQ with delayed answers)
   - Reading Comprehension (book content)
   - Vocabulary Matching
   - Sentence Builder (click-to-place)
   - Word Builder (spelling)
5. Vocabulary Explorer with audio
6. Vocabulary Flashcards (permanent student study tab)
7. Unified Activity Player integration (extended, not separate)
8. DreamAI sidebar section and UI
9. Content library (shared for book content, isolated for teacher materials)
10. Admin usage dashboard
