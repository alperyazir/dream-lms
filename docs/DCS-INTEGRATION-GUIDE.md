# Dream Central Storage (DCS) Integration Guide

This guide documents how to integrate with Dream Central Storage (DCS) for the Online Flowbook project. It covers authentication, API endpoints, data structures, and asset management.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Config.json Structure](#configjson-structure)
6. [Asset Management](#asset-management)
7. [Activity Types](#activity-types)
8. [Implementation Examples](#implementation-examples)

---

## Overview

DCS (Dream Central Storage) is the central repository for all book content including:
- Book metadata (title, publisher, cover)
- Book pages (images)
- Audio files
- Video files
- Activity configurations (config.json)
- Subtitles (.srt files)

### Base URL
```
Production: https://your-dcs-domain.com
Development: http://localhost:8081
```

---

## Authentication

DCS uses JWT (JSON Web Token) authentication.

### Login Endpoint

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@admin.com",
  "password": "admin"
}
```

### Response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in all subsequent requests:

```http
Authorization: Bearer <access_token>
```

### Token Management

- Default expiry: 30 minutes (1800 seconds)
- Refresh token 5 minutes before expiry
- Store token in memory, not localStorage (for security)

---

## API Endpoints

### Books

#### List All Books
```http
GET /books/
Authorization: Bearer <token>
```

Response:
```json
[
  {
    "id": 30,
    "publisher": "Universal ELT",
    "publisher_id": 8,
    "book_name": "Countdown 1 SB",
    "book_title": "Countdown 1 SB",
    "book_cover": "images/book_cover.png",
    "activity_count": 45,
    "activity_details": {
      "matchTheWords": 10,
      "dragdroppicture": 15,
      "circle": 20
    },
    "language": "en",
    "category": "coursebook",
    "status": "published",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Single Book
```http
GET /books/{book_id}
Authorization: Bearer <token>
```

### Publishers

#### List Publishers
```http
GET /publishers/
Authorization: Bearer <token>
```

#### Get Publisher Logo
```http
GET /publishers/{publisher_id}/logo
Authorization: Bearer <token>
```

### Storage (Book Assets)

#### Get Book Directory Tree
```http
GET /storage/books/{publisher}/{book_name}
Authorization: Bearer <token>
```

Returns nested tree structure of all files in the book.

#### Get Specific File/Asset
```http
GET /storage/books/{publisher}/{book_name}/object?path={relative_path}
Authorization: Bearer <token>
```

Examples:
- Config: `/storage/books/Universal ELT/Countdown 1 SB/object?path=config.json`
- Page image: `/storage/books/Universal ELT/Countdown 1 SB/object?path=images/M1/p7m5.jpg`
- Audio: `/storage/books/Universal ELT/Countdown 1 SB/object?path=audio/M1/p10_1.mp3`
- Video: `/storage/books/Universal ELT/Countdown 1 SB/object?path=video/1.mp4`
- Cover: `/storage/books/Universal ELT/Countdown 1 SB/object?path=images/book_cover.png`

---

## Data Models

### Book

```typescript
interface Book {
  id: number;
  book_name: string;           // Internal name (folder name)
  book_title: string | null;   // Display title
  publisher: string;           // Publisher name
  publisher_id: number | null;
  book_cover: string | null;   // Relative path to cover
  activity_count: number | null;
  activity_details: Record<string, number> | null;
  language: string | null;
  category: string | null;
  status: string | null;       // "draft" | "published" | "archived"
  created_at: string;
  updated_at: string;
}
```

### Publisher

```typescript
interface Publisher {
  id: number;
  name: string;
  contact_email: string | null;
  logo_url: string | null;
}
```

---

## Config.json Structure

The `config.json` file defines the entire book structure including pages, modules, and activities.

### Top-Level Structure

```json
{
  "books": [
    {
      "name": "Countdown 1 SB",
      "modules": [
        {
          "name": "Module 1",
          "pages": [
            {
              "page_number": 7,
              "sections": [...]
            }
          ]
        }
      ]
    }
  ]
}
```

### Page Structure

```json
{
  "page_number": 7,
  "sections": [
    {
      "type": "image",
      "image": "images/M1/p7m5.jpg"
    },
    {
      "type": "activity",
      "activity": {
        "type": "matchTheWords",
        "headerText": "Match the words",
        "items": [...],
        "options": [...]
      },
      "audio_extra": {
        "audio": "audio/M1/p10_1.mp3",
        "coords": { "x": 100, "y": 200, "width": 50, "height": 50 }
      }
    },
    {
      "type": "video",
      "video_path": "video/1.mp4"
    },
    {
      "type": "audio",
      "audio": "audio/M1/intro.mp3",
      "coords": { "x": 50, "y": 100, "width": 40, "height": 40 }
    }
  ]
}
```

### Section Types

| Type | Description | Has Activity |
|------|-------------|--------------|
| `image` | Page background image | No |
| `activity` | Interactive activity | Yes |
| `video` | Embedded video | No |
| `audio` | Audio decoration/button | No |

### Activity Detection Rule

**A section is an activity if and only if it contains an `"activity"` field.**

```javascript
// This is an activity
{
  "type": "activity",
  "activity": {
    "type": "matchTheWords",
    ...
  }
}

// This is NOT an activity (just decoration)
{
  "type": "audio",
  "audio": "audio/intro.mp3",
  "coords": { ... }
}
```

---

## Asset Management

### URL Construction

```typescript
function getAssetUrl(
  baseUrl: string,
  publisher: string,
  bookName: string,
  assetPath: string
): string {
  return `${baseUrl}/storage/books/${encodeURIComponent(publisher)}/${encodeURIComponent(bookName)}/object?path=${encodeURIComponent(assetPath)}`;
}
```

### Asset Types and Paths

| Asset Type | Path Pattern | Example |
|------------|--------------|---------|
| Book Cover | `images/book_cover.png` | `images/book_cover.png` |
| Page Image | `images/{module}/{filename}` | `images/M1/p7m5.jpg` |
| Audio | `audio/{module}/{filename}` | `audio/M1/p10_1.mp3` |
| Video | `video/{filename}` | `video/1.mp4` |
| Subtitles | `video/{filename}.srt` | `video/1.srt` |

### Authenticated Asset Requests

For fetching assets, you need to include the Authorization header:

```typescript
async function fetchAsset(url: string, token: string): Promise<Blob> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.blob();
}
```

### Caching Strategy

- Book list: Cache for 10-15 minutes
- Config.json: Cache for 30-60 minutes (rarely changes)
- Assets (images, audio): Cache aggressively (1+ hours)
- Videos: Stream, don't cache entirely

---

## Activity Types

### Supported Activity Types

```typescript
enum ActivityType {
  // DCS Book Activities
  matchTheWords = "matchTheWords",
  dragdroppicture = "dragdroppicture",
  dragdroppicturegroup = "dragdroppicturegroup",
  fillSentencesWithDots = "fillSentencesWithDots",
  fillpicture = "fillpicture",
  circle = "circle",
  puzzleFindWords = "puzzleFindWords",
  markwithx = "markwithx",

  // AI-Generated Activities
  vocabulary_quiz = "vocabulary_quiz",
  ai_quiz = "ai_quiz",
  reading_comprehension = "reading_comprehension",
  sentence_builder = "sentence_builder",
  word_builder = "word_builder",
  vocabulary_matching = "vocabulary_matching"
}
```

### Activity Config Examples

#### matchTheWords
```json
{
  "type": "matchTheWords",
  "headerText": "Match the words with pictures",
  "items": [
    { "id": 1, "text": "apple", "image": "images/activities/apple.png" },
    { "id": 2, "text": "banana", "image": "images/activities/banana.png" }
  ]
}
```

#### dragdroppicture
```json
{
  "type": "dragdroppicture",
  "headerText": "Drag items to correct positions",
  "backgroundImage": "images/M1/background.png",
  "items": [
    { "id": 1, "image": "images/M1/item1.png", "correctX": 100, "correctY": 200 }
  ],
  "dropZones": [
    { "id": 1, "x": 100, "y": 200, "width": 50, "height": 50 }
  ]
}
```

#### circle
```json
{
  "type": "circle",
  "headerText": "Circle the correct answers",
  "backgroundImage": "images/M1/p15.jpg",
  "items": [
    { "id": 1, "x": 150, "y": 200, "radius": 30, "correct": true },
    { "id": 2, "x": 250, "y": 200, "radius": 30, "correct": false }
  ]
}
```

#### puzzleFindWords (Word Search)
```json
{
  "type": "puzzleFindWords",
  "headerText": "Find the hidden words",
  "grid": [
    ["A", "P", "P", "L", "E"],
    ["B", "A", "N", "A", "N"],
    ["O", "R", "A", "N", "G"]
  ],
  "words": ["APPLE", "BANANA", "ORANGE"]
}
```

---

## Implementation Examples

### TypeScript/JavaScript Client

```typescript
class DCSClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async authenticate(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    this.token = data.access_token;
    // Set expiry to 25 minutes from now (5 min buffer)
    this.tokenExpiry = new Date(Date.now() + 25 * 60 * 1000);
  }

  private async ensureToken(): Promise<string> {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate(
        process.env.DCS_EMAIL!,
        process.env.DCS_PASSWORD!
      );
    }
    return this.token!;
  }

  async getBooks(): Promise<Book[]> {
    const token = await this.ensureToken();
    const response = await fetch(`${this.baseUrl}/books/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getBookConfig(publisher: string, bookName: string): Promise<BookConfig> {
    const token = await this.ensureToken();
    const url = `${this.baseUrl}/storage/books/${encodeURIComponent(publisher)}/${encodeURIComponent(bookName)}/object?path=config.json`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  getAssetUrl(publisher: string, bookName: string, path: string): string {
    return `${this.baseUrl}/storage/books/${encodeURIComponent(publisher)}/${encodeURIComponent(bookName)}/object?path=${encodeURIComponent(path)}`;
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useBookConfig(publisher: string, bookName: string) {
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        const client = new DCSClient(process.env.REACT_APP_DCS_URL!);
        const config = await client.getBookConfig(publisher, bookName);
        setConfig(config);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [publisher, bookName]);

  return { config, loading, error };
}
```

### Parsing Config for Pages

```typescript
interface PageData {
  pageNumber: number;
  backgroundImage: string | null;
  activities: ActivityData[];
  audioButtons: AudioButton[];
  videos: VideoData[];
}

function parseConfigForPages(config: BookConfig): PageData[] {
  const pages: PageData[] = [];

  const book = config.books[0];
  for (const module of book.modules) {
    for (const page of module.pages) {
      const pageData: PageData = {
        pageNumber: page.page_number,
        backgroundImage: null,
        activities: [],
        audioButtons: [],
        videos: []
      };

      for (const section of page.sections) {
        // Background image
        if (section.type === 'image' && section.image) {
          pageData.backgroundImage = section.image;
        }

        // Activity
        if (section.activity) {
          pageData.activities.push({
            type: section.activity.type,
            config: section.activity,
            audioExtra: section.audio_extra || null
          });
        }

        // Audio decoration (not activity)
        if (section.type === 'audio' && section.audio && !section.activity) {
          pageData.audioButtons.push({
            audio: section.audio,
            coords: section.coords
          });
        }

        // Video
        if (section.type === 'video' && section.video_path) {
          pageData.videos.push({
            path: section.video_path
          });
        }
      }

      pages.push(pageData);
    }
  }

  return pages;
}
```

---

## Additional Features for Online Flowbook

### Recommended Libraries for New Features

#### Pinch Zoom
```bash
npm install react-zoom-pan-pinch
# or
npm install @panzoom/panzoom
```

#### Drawing/Annotation
```bash
npm install react-canvas-draw
# or
npm install fabric  # More powerful, supports shapes
# or
npm install excalidraw  # Full drawing tool
```

### Example: Pinch Zoom Implementation

```tsx
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

function BookPage({ imageUrl }: { imageUrl: string }) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.5}
      maxScale={4}
      centerOnInit
    >
      <TransformComponent>
        <img src={imageUrl} alt="Book page" />
      </TransformComponent>
    </TransformWrapper>
  );
}
```

### Example: Drawing Overlay

```tsx
import CanvasDraw from 'react-canvas-draw';
import { useRef, useState } from 'react';

function DrawableBookPage({ imageUrl }: { imageUrl: string }) {
  const canvasRef = useRef<CanvasDraw>(null);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushRadius, setBrushRadius] = useState(3);

  const saveDrawing = () => {
    const data = canvasRef.current?.getSaveData();
    // Save to localStorage or backend
    localStorage.setItem(`drawing-${pageId}`, data);
  };

  const loadDrawing = () => {
    const data = localStorage.getItem(`drawing-${pageId}`);
    if (data) {
      canvasRef.current?.loadSaveData(data);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <img src={imageUrl} style={{ position: 'absolute' }} />
      <CanvasDraw
        ref={canvasRef}
        brushColor={brushColor}
        brushRadius={brushRadius}
        canvasWidth={800}
        canvasHeight={600}
        hideGrid
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <div className="toolbar">
        <button onClick={() => canvasRef.current?.clear()}>Clear</button>
        <button onClick={() => canvasRef.current?.undo()}>Undo</button>
        <button onClick={saveDrawing}>Save</button>
      </div>
    </div>
  );
}
```

---

## Environment Variables

```bash
# DCS Connection
DCS_URL=http://localhost:8081
DCS_EMAIL=admin@admin.com
DCS_PASSWORD=admin
DCS_TOKEN_EXPIRY=1800  # seconds

# For frontend (Vite)
VITE_DCS_URL=http://localhost:8081
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Retry with backoff |

### Retry Strategy

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 401) {
        // Re-authenticate and retry
        await authenticate();
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Summary

Key points for implementing Online Flowbook:

1. **Authentication**: Use JWT tokens, refresh before expiry
2. **Book Data**: Fetch from `/books/` endpoint
3. **Config**: Fetch `config.json` to get book structure
4. **Assets**: Use `/storage/books/{publisher}/{book}/object?path=` pattern
5. **Activities**: Look for sections with `"activity"` field
6. **Caching**: Cache config and assets aggressively
7. **New Features**: Use react-zoom-pan-pinch for zoom, react-canvas-draw for annotations

The DCS API is RESTful and straightforward. Most complexity is in parsing the config.json structure correctly.
