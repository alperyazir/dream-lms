# Epic 13: Teacher Supplementary Materials

**Status:** Draft
**Type:** Brownfield Enhancement
**Created:** 2025-12-09
**Author:** John (PM Agent)

---

## Epic Goal

Enable teachers to upload and manage their own supplementary materials in a personal storage space, and attach these materials to assignments so students have all necessary resources in one place.

---

## Epic Description

### Existing System Context

- **Current functionality:** Teachers can attach videos from the book's DCS folder to assignments (Story 10.3)
- **Technology stack:** FastAPI backend, React/TypeScript frontend, MinIO-based Dream Central Storage (DCS)
- **Integration points:**
  - Assignment creation flow (StepConfigureSettings, ResourceSidebar)
  - Existing `AdditionalResources` model supports multiple video attachments
  - DCS media proxy endpoint (`/api/v1/books/{book_id}/media/{path}`)

### Enhancement Details

**What's being added:**
1. Personal storage space for each teacher in DCS (500MB quota)
2. "My Materials" section in teacher profile to upload/manage files
3. Support for multiple material types: documents, images, audio, video, URLs, and in-app text notes
4. Ability to attach teacher's own materials to assignments (extending existing ResourceSidebar)

**How it integrates:**
- New MinIO bucket "teachers" with folder structure: `teachers/{teacher_unique_id}/`
- New API endpoints for teacher material CRUD operations
- Extends existing `AdditionalResources` to support teacher-uploaded materials alongside book videos
- Reuses existing media components (VideoPlayer, AudioPlayer) where applicable

**Success criteria:**
- Teachers can upload files up to 100MB each, with 500MB total quota
- Teachers can view storage usage and manage their materials
- Teachers can attach their materials to any assignment they create
- Students can view/download attached materials in the assignment view
- System gracefully handles deleted materials (shows "unavailable" message)

---

## Stories

### Story 13.1: Backend - Teacher Storage Infrastructure

**Description:** Set up DCS bucket structure, storage quota tracking, and CRUD API endpoints for teacher materials.

**Key deliverables:**
- MinIO bucket "teachers" with folder per teacher
- Database model for tracking materials and quota usage
- Upload, list, download, delete API endpoints
- Quota enforcement (500MB limit, 100MB per file)
- Warning threshold at 80% usage

---

### Story 13.2: Frontend - My Materials Management

**Description:** Add "Supplementary Materials" section to teacher profile for uploading and managing personal materials.

**Key deliverables:**
- New profile tab/section "My Materials"
- File upload with drag-and-drop support
- In-app text editor for creating text notes
- URL link saving
- Storage usage indicator with quota warning
- Material list with preview, download, delete actions
- File type icons and metadata display

---

### Story 13.3: Assignment Integration - Attach Teacher Materials

**Description:** Extend assignment creation to allow attaching materials from teacher's personal storage alongside book resources.

**Key deliverables:**
- Material picker showing teacher's uploaded materials
- Integration with existing ResourceSidebar component
- Student view for all material types (documents, images, audio, video, URLs, text notes)
- "Material unavailable" fallback for deleted materials
- Preview capabilities for each material type

---

## Technical Specifications

### Supported Material Types

| Type | Extensions | Max Size | Viewer |
|------|------------|----------|--------|
| Documents | .txt, .pdf, .docx | 100MB | PDF viewer / Download |
| Images | .jpg, .jpeg, .png, .gif, .webp | 100MB | Image viewer |
| Audio | .mp3, .wav, .ogg, .m4a | 100MB | AudioPlayer component |
| Video | .mp4, .webm, .mov | 100MB | VideoPlayer component |
| URLs | N/A | N/A | External link |
| Text Notes | N/A (stored in DB) | 50KB | In-app text viewer |

### DCS Bucket Structure

```
MinIO Bucket: "teachers"
└── {teacher_uuid}/
    ├── documents/
    │   ├── worksheet.pdf
    │   └── notes.docx
    ├── images/
    │   └── diagram.png
    ├── audio/
    │   └── pronunciation.mp3
    └── video/
        └── tutorial.mp4
```

**Note:** The folder structure within teacher's space is flat (no user-created subfolders). The type-based folders (documents/, images/, etc.) are for organization only and managed automatically based on file type.

### Database Schema

```python
# New model: TeacherMaterial
class TeacherMaterial(SQLModel, table=True):
    __tablename__ = "teacher_material"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    teacher_id: int = Field(foreign_key="user.id", index=True)

    # Material info
    name: str = Field(max_length=255)  # Display name
    type: MaterialType  # enum: document, image, audio, video, url, text_note

    # Storage info (null for URLs and text notes)
    storage_path: str | None = Field(max_length=500)  # Path in DCS
    file_size: int | None = Field(default=None)  # Size in bytes
    mime_type: str | None = Field(max_length=100)

    # For URLs
    url: str | None = Field(max_length=2000)

    # For text notes
    text_content: str | None = Field(default=None)  # Max ~50KB

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    teacher: "User" = Relationship(back_populates="materials")


# New model: TeacherStorageQuota
class TeacherStorageQuota(SQLModel, table=True):
    __tablename__ = "teacher_storage_quota"

    teacher_id: int = Field(foreign_key="user.id", primary_key=True)
    used_bytes: int = Field(default=0)
    quota_bytes: int = Field(default=524288000)  # 500MB default

    teacher: "User" = Relationship(back_populates="storage_quota")


# Extend AdditionalResources to support teacher materials
class TeacherMaterialResource(BaseModel):
    type: Literal["teacher_material"] = "teacher_material"
    material_id: uuid.UUID
    # Denormalized for display (in case material is deleted)
    name: str
    material_type: MaterialType


class AdditionalResources(BaseModel):
    videos: list[VideoResource] = []  # Existing
    teacher_materials: list[TeacherMaterialResource] = []  # NEW
```

### API Endpoints

```python
# Teacher Materials CRUD
POST   /api/v1/teachers/materials/upload      # Upload file
POST   /api/v1/teachers/materials/text        # Create text note
POST   /api/v1/teachers/materials/url         # Save URL
GET    /api/v1/teachers/materials             # List all materials
GET    /api/v1/teachers/materials/{id}        # Get material details
GET    /api/v1/teachers/materials/{id}/download  # Download/stream file
DELETE /api/v1/teachers/materials/{id}        # Delete material

# Storage quota
GET    /api/v1/teachers/storage/quota         # Get usage and quota info

# For assignments - material lookup
GET    /api/v1/teachers/materials/{id}/public # Public info for student view
```

### DCS Integration Prompt

For setting up the "teachers" bucket in Dream Central Storage:

```
## DCS Configuration Request: Teacher Materials Bucket

### Bucket Name
`teachers`

### Purpose
Personal storage space for teachers to upload supplementary materials
(documents, images, audio, video) that can be attached to assignments.

### Folder Structure
Each teacher gets a unique folder based on their UUID:
- `teachers/{teacher_uuid}/documents/`
- `teachers/{teacher_uuid}/images/`
- `teachers/{teacher_uuid}/audio/`
- `teachers/{teacher_uuid}/video/`

### Access Control
- Teachers can only access their own folder (read/write)
- Students get read-only access to specific files via signed URLs (when attached to their assignments)
- No cross-teacher access

### Storage Policies
- Per-teacher quota: 500MB (configurable)
- Max file size: 100MB
- Allowed MIME types:
  - Documents: application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - Images: image/jpeg, image/png, image/gif, image/webp
  - Audio: audio/mpeg, audio/wav, audio/ogg, audio/mp4
  - Video: video/mp4, video/webm, video/quicktime

### Lifecycle Rules
- No automatic deletion (teacher manages their own files)
- Consider: Archive files not accessed in 1 year (future optimization)

### CORS Configuration
- Allow uploads from Dream LMS frontend origin
- Allow range requests for media streaming
```

---

## Compatibility Requirements

- [x] Existing assignment APIs remain unchanged (backward compatible)
- [x] Existing video attachment functionality (10.3) continues to work
- [x] ResourceSidebar component extended, not replaced
- [x] No changes to student assignment completion flow
- [x] Database schema changes are additive (new tables only)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large file uploads fail | Medium | Medium | Chunked upload, resume capability, progress indicator |
| Storage quota abuse | Low | Low | Hard limit enforcement, admin visibility |
| Deleted material breaks assignments | Medium | Low | Graceful "unavailable" fallback, denormalized names |
| DCS connectivity issues | Low | High | Error handling, retry logic, user feedback |
| Performance with many materials | Low | Medium | Pagination, lazy loading, consider search later |

---

## Definition of Done

- [ ] Teachers can upload files (documents, images, audio, video) up to 100MB each
- [ ] Teachers can create in-app text notes
- [ ] Teachers can save URL links
- [ ] Storage quota (500MB) is enforced with 80% warning
- [ ] Teachers can view, preview, and delete their materials
- [ ] Teachers can attach their materials to assignments
- [ ] Students can view/access attached materials in assignments
- [ ] Deleted materials show "unavailable" in assignments
- [ ] All new endpoints have unit tests
- [ ] Frontend components have unit tests
- [ ] Integration tests for upload and attachment flows
- [ ] No regression in existing video attachment functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to Dream LMS running FastAPI (Python) backend and React/TypeScript frontend
- Integration points:
  - Teacher profile (new "My Materials" section)
  - Assignment creation flow (extend existing AdditionalResources step)
  - ResourceSidebar component (add teacher material types)
  - DCS MinIO storage (new "teachers" bucket)
- Existing patterns to follow:
  - File upload: Reference existing profile image upload pattern
  - Media playback: Reuse VideoPlayer and AudioPlayer components from Epic 10
  - Resource attachment: Extend existing AdditionalResources model from Story 10.3
- Critical compatibility requirements:
  - Must not break existing video attachment flow
  - Assignment API must remain backward compatible
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering teacher supplementary materials capability."

---

## Appendix: UI Wireframes

### Teacher Profile - My Materials Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Teacher Profile                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ [Profile] [My Materials] [Settings]                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  My Materials                                     Storage: 127MB / 500MB │
│  ───────────────────────────────────────────────  ████████░░░░░░░ 25%   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  ＋ Upload Files    📝 Create Text Note    🔗 Add URL Link          ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Filter: [All Types ▼]                              Search: [____]   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 📄 Chapter 5 Worksheet.pdf                    2.3 MB    Dec 5, 2025 ││
│  │    Document                                    [Preview] [Delete]   ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 🖼️ Cell Diagram.png                           850 KB    Dec 4, 2025 ││
│  │    Image                                       [Preview] [Delete]   ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 🎵 Pronunciation Guide.mp3                    4.2 MB    Dec 3, 2025 ││
│  │    Audio                                       [Play] [Delete]      ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 📝 Grammar Rules Summary                      Text Note  Dec 2, 2025 ││
│  │    Text Note                                   [View] [Edit] [Delete]││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ 🔗 Khan Academy - Fractions                   URL        Dec 1, 2025 ││
│  │    https://khanacademy.org/math/frac...        [Open] [Delete]      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Upload Modal

```
┌────────────────────────────────────────────────────────────────┐
│ Upload Materials                                           [×] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │     ☁️  Drag and drop files here                         │ │
│  │         or click to browse                               │ │
│  │                                                          │ │
│  │     Supported: PDF, DOCX, TXT, Images, Audio, Video      │ │
│  │     Max file size: 100MB                                 │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Uploading:                                                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📄 worksheet.pdf          ████████████░░░░░░░░  67%  [×] │ │
│  │ 🖼️ diagram.png            ████████████████████  Done ✓   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Storage after upload: 145MB / 500MB                           │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                            [Cancel]  [Done]    │
└────────────────────────────────────────────────────────────────┘
```

### Text Note Editor

```
┌────────────────────────────────────────────────────────────────┐
│ Create Text Note                                           [×] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Title *                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Grammar Rules Summary                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Content *                                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [B] [I] [U] │ [•] [1.] │ [Link]                          │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │ 1. Present Simple                                        │ │
│  │    - Used for habits and routines                        │ │
│  │    - Example: "She walks to school every day"            │ │
│  │                                                          │ │
│  │ 2. Present Continuous                                    │ │
│  │    - Used for actions happening now                      │ │
│  │    - Example: "She is walking to school"                 │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                      [Cancel]  [Save Note]     │
└────────────────────────────────────────────────────────────────┘
```

### Assignment Creation - Resource Selection (Extended)

```
┌────────────────────────────────────────────────────────────────┐
│ Step: Additional Resources                                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📚 Book Resources                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Videos from: Switch to CLIL                              │ │
│  │ ┌────────────────────────────────────────────────────┐   │ │
│  │ │ [▼ Select videos to attach...]                     │   │ │
│  │ └────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  📁 My Materials                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ┌────────────────────────────────────────────────────┐   │ │
│  │ │ [▼ Select from your materials...]                  │   │ │
│  │ └────────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │ Selected:                                                │ │
│  │ ┌──────────────────────────────────────────────────────┐ │ │
│  │ │ 📄 Chapter 5 Worksheet.pdf                    [×]    │ │ │
│  │ │ 📝 Grammar Rules Summary                      [×]    │ │ │
│  │ │ 🔗 Khan Academy - Fractions                   [×]    │ │ │
│  │ └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ [← Back]                                           [Next →]    │
└────────────────────────────────────────────────────────────────┘
```

### Student View - ResourceSidebar (Extended)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Chapter 5 Review                              Activity 1 of 3    ⏱ 28:45 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Resources ─────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │  📹 Videos                                                          │ │
│  │  ├─ intro.mp4 (5:45)                              [▶ Play]          │ │
│  │                                                                     │ │
│  │  📁 Materials                                                       │ │
│  │  ├─ 📄 Chapter 5 Worksheet.pdf                    [Download]        │ │
│  │  ├─ 📝 Grammar Rules Summary                      [View]            │ │
│  │  └─ 🔗 Khan Academy - Fractions                   [Open ↗]          │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─ Activity ───────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Fill in the Blanks: The ___ is used for ___ actions.                ││
│  │                                                                      ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [Save & Exit]                                 [← Prev] [Next →] [Submit] │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Story 10.3: Video Attachment to Assignments](./10.3.video-attachment-to-assignments.md)
- [Epic 10: Audio & Video Media Integration](../prd/epic-10-audio-video-media-integration.md)
- [Dream Central Storage Integration](../architecture/dream-central-storage.md)
