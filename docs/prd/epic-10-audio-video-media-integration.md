# Epic 10: Audio & Video Media Integration

**Estimated Effort:** 2-3 weeks | **Status:** In Progress

Enable activities to include audio content from book configurations and allow teachers to attach video content to assignments. Media is streamed efficiently from Dream Central Storage with HTTP Range support for seeking.

**What Currently Exists:** Image asset proxy from DCS, activity players for 6 types, no audio/video support
**What We Build:** Streaming media proxy (Range-aware) + Audio player component + Video attachment system

**Deliverable:** Students can play audio instructions with activities, teachers can attach videos to assignments

---

## Background & Context

### Current Media Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Dream LMS      │     │      DCS        │
│   (Images only) │────▶│   Asset Proxy    │────▶│   MinIO         │
│                 │◀────│  (Full download) │◀────│   (Streaming)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Current Limitations:**
- `book_assets.py` downloads entire file to memory before serving
- No HTTP Range header support (can't seek in media)
- Only images are used; audio paths in config are ignored
- No video attachment capability

### Book Config Audio Structure

Activities in `config.json` can have an `audio_extra` field:

```json
{
  "type": "fill",
  "activity": {
    "type": "dragdroppicture",
    "section_path": "./books/SwitchtoCLIL/images/HB/modules/M1/pages/p8s1.png",
    "words": ["capital", "old", "nice"],
    "answer": [...]
  },
  "audio_extra": {
    "path": "./books/SwitchtoCLIL/audio/08.mp3"
  }
}
```

### Video Storage in DCS

Videos are stored alongside other book assets:
- Location: `{publisher}/{book_name}/{version}/{book_name}/videos/`
- Subtitles: Same location, same name with `.srt` extension (e.g., `1.mp4` → `1.srt`)

---

## Stories

### Story 10.1: Backend Streaming Media Proxy with Range Support

**Points:** 5 | **Priority:** High | **Status:** Done

**User Story:**
As a **student**, I want **audio and video to start playing immediately and allow seeking**, so that **I don't have to wait for full downloads and can replay specific parts**.

**Dependencies:**
- DCS must support HTTP Range requests (see DCS Enhancement section below)

**Acceptance Criteria:**

1. [ ] New streaming endpoint created: `GET /api/v1/books/{book_id}/media/{asset_path:path}`
2. [ ] Endpoint parses `Range` request header (format: `bytes=start-end`)
3. [ ] Returns `206 Partial Content` for range requests with proper headers:
   - `Content-Range: bytes {start}-{end}/{total_size}`
   - `Content-Length: {chunk_size}`
   - `Accept-Ranges: bytes`
4. [ ] Returns `200 OK` for non-range requests (full file)
5. [ ] Returns `416 Range Not Satisfiable` for invalid ranges
6. [ ] Proper MIME types returned:
   - `.mp3` → `audio/mpeg`
   - `.mp4` → `video/mp4`
   - `.webm` → `video/webm`
   - `.ogg` → `audio/ogg`
   - `.wav` → `audio/wav`
   - `.srt` → `text/plain`
7. [ ] Same access control as existing asset proxy (book access validation)
8. [ ] Streams data from DCS (doesn't buffer entire file in memory)
9. [ ] Unit tests verify range parsing and response headers
10. [ ] Integration tests verify streaming with actual DCS

**Technical Notes:**

```python
# Endpoint signature
@router.get("/{book_id}/media/{asset_path:path}")
async def stream_media(
    book_id: UUID,
    asset_path: str,
    range: str | None = Header(None, alias="Range"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    ...
```

**DCS Dependency:**
DCS `/storage/books/{publisher}/{book_name}/object` endpoint must support:
- `Range` header parsing
- `offset` and `length` parameters to MinIO `get_object()`
- Return `206 Partial Content` with `Content-Range` header

---

### Story 10.2: Frontend Audio Player Component

**Points:** 3 | **Priority:** High | **Status:** Done

**User Story:**
As a **student**, I want **to play audio instructions while completing an activity**, so that **I can hear pronunciation, listen to passages, or follow along with audio content**.

**Acceptance Criteria:**

1. [ ] `<AudioPlayer>` component created with:
   - Play/Pause toggle button
   - Progress bar (clickable for seeking)
   - Current time / Total duration display
   - Volume control (optional for MVP)
   - Loading state indicator
2. [ ] Audio icon (🔊) displayed in activity header when `audio_extra` is present
3. [ ] Click audio icon to show/play audio player
4. [ ] Audio player can be minimized/collapsed
5. [ ] Seeking works (user can click progress bar to jump)
6. [ ] Unlimited replays allowed
7. [ ] Audio does NOT auto-play (user must click to start)
8. [ ] Works on desktop and tablet (responsive)
9. [ ] Graceful error handling if audio fails to load
10. [ ] Unit tests for player controls and state management

**UI Design:**

```
Activity Header with Audio
┌────────────────────────────────────────────────────────┐
│ Activity: Fill in the Blanks          [🔊 Listen]      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ▶️  ▬▬▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬▬▬▬▬  1:23 / 2:45       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│         [Activity Content Area]                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Integration Points:**

- Modify `ActivityPlayerHeader.tsx` to detect `audio_extra` in activity config
- Create `AudioPlayer.tsx` in `components/ActivityPlayers/`
- Use HTML5 `<audio>` element with streaming URL
- URL format: `/api/v1/books/{bookId}/media/{audioPath}`

**Technical Notes:**

```typescript
interface AudioPlayerProps {
  audioPath: string;  // From audio_extra.path (cleaned)
  bookId: string;
}

// Transform config path to API URL
// "./books/SwitchtoCLIL/audio/08.mp3" → "audio/08.mp3"
function getAudioUrl(bookId: string, audioPath: string): string {
  const cleanPath = audioPath.replace(/^\.\/books\/[^/]+\//, '');
  return `/api/v1/books/${bookId}/media/${cleanPath}`;
}
```

---

### Story 10.3: Video Attachment to Assignments

**Points:** 5 | **Priority:** Medium | **Status:** Not Started

**User Story:**
As a **teacher**, I want **to attach a video from the book to an assignment**, so that **students can watch instructional content alongside their activities**.

**Scope:**
- Data model: Add `video_path` field to Assignment model
- API: Endpoint to list available videos for a book from DCS
- Teacher UI: Video picker in assignment creation dialog (Step 3)
- Teacher UI: Video preview modal before attaching
- Student UI: Video player displayed alongside activity content
- Video player: Play, pause, seek, fullscreen, playback speed (0.5x-2x), volume, subtitles (.srt)
- Video player: Minimize/expand, persists across multi-activity navigation

**See:** [Story 10.3 Details](../stories/10.3.video-attachment-to-assignments.md)

---

## DCS Enhancement Required

Before Story 10.1 can be fully implemented, Dream Central Storage needs HTTP Range support.

**Endpoint to Modify:** `GET /storage/books/{publisher}/{book_name}/object`

**Required Changes:**
1. Accept `Range` header
2. Parse range format: `bytes=start-end`, `bytes=start-`, `bytes=-end`
3. Use MinIO `get_object(bucket, key, offset=start, length=size)` for partial reads
4. Return `206 Partial Content` with `Content-Range` header
5. Return `416 Range Not Satisfiable` for invalid ranges

**See:** `docs/stories/10.1.backend-streaming-media-proxy.md` for full DCS prompt

---

## Technical Architecture

### Target Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Dream LMS      │     │      DCS        │
│   <audio> tag   │────▶│   Media Proxy    │────▶│   MinIO         │
│   <video> tag   │◀────│  (Range-aware)   │◀────│  (Range-aware)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │                       │
   Range: bytes=0-1024    Range: bytes=0-1024
   ←────────────────────────────────────────
   206 Partial Content    206 Partial Content
   Content-Range: bytes 0-1024/5000000
```

### File Locations

**Backend:**
- `backend/app/api/routes/book_media.py` - New streaming endpoint
- `backend/app/services/dream_storage_client.py` - Add streaming method

**Frontend:**
- `frontend/src/components/ActivityPlayers/AudioPlayer.tsx` - New component
- `frontend/src/components/ActivityPlayers/ActivityPlayerHeader.tsx` - Integrate audio icon

---

## Definition of Done

**Epic Complete When:**
- [x] Audio plays with seeking in all 6 activity types
- [x] Students can replay audio unlimited times
- [x] No full-file downloads (streaming works)
- [x] Works on Chrome, Firefox, Safari (desktop + tablet)
- [x] DCS Range support implemented and deployed
- [x] All acceptance criteria for Stories 10.1 and 10.2 met
- [x] Unit and integration tests passing
- [ ] Teachers can attach videos to assignments
- [ ] Students can watch videos alongside activities
- [ ] Video player has full controls (play, pause, seek, speed, subtitles, fullscreen)
- [ ] All acceptance criteria for Story 10.3 met

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Audio load time (first byte) | < 500ms |
| Seek response time | < 200ms |
| Memory usage (backend) | No increase per request |
| Browser compatibility | Chrome, Firefox, Safari |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DCS Range support delayed | Blocks Story 10.1 | Start with DCS enhancement first |
| Large video files cause timeouts | Poor UX | Implement chunked streaming, timeouts |
| CORS issues with streaming | Audio won't play | Configure proper CORS headers |
| Mobile Safari quirks | Audio may not work | Test early, use standard HTML5 patterns |

---

## Related Documentation

- [Dream Central Storage Integration](../dream-central-storage-integration.md)
- [Story 3.1: Dream Central Storage API Integration](../stories/3.1.dream-central-storage-api-integration.md)
- [Story 4.1: Activity Player Framework](../stories/4.1.activity-player-framework-layout.md)
