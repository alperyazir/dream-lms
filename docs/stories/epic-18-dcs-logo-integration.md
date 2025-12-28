# Epic 18: DCS Logo Integration

**Status:** Stories Created
**Type:** Brownfield Enhancement
**Created:** 2025-12-19
**Author:** John (PM Agent)

---

## Epic Goal

Integrate Dream Central Storage (DCS) as the source for publisher logos, automatically fetching logos from DCS instead of storing them locally, and removing manual logo upload functionality from publisher management.

---

## Epic Description

### Existing System Context

- **Current functionality:** Publishers have logos that may be uploaded/stored locally
- **Technology stack:** FastAPI backend with MinIO/DCS integration, React/TypeScript frontend
- **Integration points:**
  - Publisher model and API
  - DCS client service (existing from Epic 3)
  - Publisher management screens (Admin)
  - Publisher-facing screens

### Enhancement Details

**What's being added/changed:**
1. New API endpoint to fetch publisher logo from DCS
2. Update Admin Publishers table to display logos from DCS
3. Remove logo upload section from Publisher edit dialog
4. Auto-fetch and display publisher logo on Publisher dashboard/screens
5. Fallback placeholder when logo not available in DCS

**How it integrates:**
- New `/api/v1/publishers/{id}/logo` endpoint proxying to DCS
- DCS expected path: `publishers/{publisher_unique_id}/logo.*` (jpg, png, svg)
- Reuse existing DCS client and media proxy patterns
- Frontend uses new logo endpoint for all publisher logo displays

**Success criteria:**
- Publisher logos load from DCS in Admin table
- Publisher logos display correctly on Publisher's own screens
- No logo upload UI in edit dialogs
- Graceful fallback for publishers without DCS logos
- Performance acceptable (caching considered)

---

## Stories

### Story 18.1: Backend - Publisher Logo Endpoint

**Story File:** [18.1.backend-publisher-logo-endpoint.md](./18.1.backend-publisher-logo-endpoint.md)

**Description:** Create API endpoint to fetch publisher logos from Dream Central Storage.

**Key deliverables:**
- `GET /api/v1/publishers/{id}/logo` - Proxy logo from DCS
- DCS path resolution: `publishers/{publisher.unique_id}/logo.{ext}`
- Support multiple extensions: .png, .jpg, .jpeg, .svg
- Return 404 with empty placeholder data if no logo found
- Set appropriate cache headers for browser caching
- Handle DCS connection errors gracefully

**Acceptance Criteria:**
- [ ] Endpoint returns logo image when available in DCS
- [ ] Correct MIME type returned based on file extension
- [ ] 404 returned when logo not in DCS (with cache headers)
- [ ] DCS errors don't crash the endpoint (return fallback)
- [ ] Response includes cache headers for client-side caching

---

### Story 18.2: Frontend - Display Logos from DCS

**Story File:** [18.2.frontend-display-logos-from-dcs.md](./18.2.frontend-display-logos-from-dcs.md)

**Description:** Update all publisher logo displays to use the new DCS logo endpoint.

**Key deliverables:**
- Update Admin Publishers table to use new logo endpoint
- Create `PublisherLogo` component with:
  - Loading state
  - Error/fallback handling (placeholder icon)
  - Proper sizing props
- Update Publisher dashboard to show their logo from DCS
- Remove logo upload section from Publisher edit dialog
- Remove any local logo storage references

**Acceptance Criteria:**
- [ ] Admin Publishers table shows logos from DCS
- [ ] Publisher dashboard shows their logo
- [ ] Fallback placeholder shown when no logo available
- [ ] Logo upload UI removed from edit dialog
- [ ] No console errors when logo unavailable
- [ ] Logos sized appropriately in each context

---

## Technical Specifications

### DCS Logo Path Convention

```
MinIO Bucket: "publishers"
Path: publishers/{publisher_unique_id}/logo.{ext}

Example:
- publishers/dream-publishing/logo.png
- publishers/edu-press/logo.svg
```

### Backend Endpoint

```python
# backend/app/api/routes/publishers.py

@router.get("/{publisher_id}/logo")
async def get_publisher_logo(
    publisher_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    dcs_client: DCSClient = Depends(get_dcs_client)
):
    """Fetch publisher logo from DCS."""
    publisher = await get_publisher_by_id(session, publisher_id)
    if not publisher:
        raise HTTPException(404, "Publisher not found")

    # Try different extensions
    extensions = ["png", "jpg", "jpeg", "svg"]
    for ext in extensions:
        logo_path = f"publishers/{publisher.unique_id}/logo.{ext}"
        try:
            content, mime_type = await dcs_client.get_file(logo_path)
            return Response(
                content=content,
                media_type=mime_type,
                headers={
                    "Cache-Control": "public, max-age=86400",  # 24 hour cache
                    "ETag": hashlib.md5(content).hexdigest()
                }
            )
        except FileNotFoundError:
            continue
        except Exception as e:
            logger.error(f"Error fetching logo for {publisher_id}: {e}")
            continue

    # No logo found - return 404 with cache header
    return Response(
        status_code=404,
        headers={"Cache-Control": "public, max-age=3600"}  # Cache 404 for 1 hour
    )
```

### Frontend Component

```typescript
// frontend/src/components/ui/publisher-logo.tsx
import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublisherLogoProps {
  publisherId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function PublisherLogo({ publisherId, size = 'md', className }: PublisherLogoProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const logoUrl = `/api/v1/publishers/${publisherId}/logo`;

  if (error) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded",
        sizeClasses[size],
        className
      )}>
        <Building2 className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], "relative", className)}>
      {loading && (
        <div className="absolute inset-0 bg-muted rounded animate-pulse" />
      )}
      <img
        src={logoUrl}
        alt="Publisher logo"
        className={cn("object-contain rounded", sizeClasses[size])}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}
```

### Remove Upload UI

```typescript
// In PublisherEditDialog - REMOVE this section:
// <FormField name="logo">
//   <FormLabel>Logo</FormLabel>
//   <Input type="file" accept="image/*" ... />
// </FormField>
```

---

## Compatibility Requirements

- [x] Publisher CRUD APIs unchanged (except new logo endpoint)
- [x] Existing publisher data unaffected
- [x] DCS integration patterns reused from book assets
- [x] Fallback ensures UI doesn't break without logos

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DCS unavailable | Low | Medium | Fallback placeholder; cache existing logos |
| Logo not in DCS for some publishers | High | Low | Graceful fallback to placeholder icon |
| Performance issues loading many logos | Medium | Medium | Browser caching via headers; lazy loading in tables |

**Rollback Plan:**
- Keep local logo field in database (don't delete)
- Revert frontend to use local logo if DCS integration fails
- Can be reverted independently of DCS setup

---

## Definition of Done

- [ ] Logo endpoint created and functional
- [ ] Admin Publishers table displays logos from DCS
- [ ] Publisher dashboard shows logo from DCS
- [ ] Logo upload removed from edit dialog
- [ ] Fallback placeholder works correctly
- [ ] Cache headers implemented
- [ ] Unit tests for logo endpoint
- [ ] No regression in publisher management functionality

---

## Story Manager Handoff

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to Dream LMS integrating with Dream Central Storage
- Integration points:
  - Existing DCS client (from Epic 3)
  - Publisher management in Admin views
  - Publisher dashboard view
- Existing patterns to follow:
  - DCS media proxy pattern from book assets
  - Image component patterns in existing UI
- Critical compatibility requirements:
  - Publisher CRUD must continue working
  - Graceful degradation when logos unavailable
- Each story must include verification of fallback behavior

The epic should provide seamless logo integration with DCS while maintaining system stability."

---

## DCS Setup Requirements

For this feature to work, ensure DCS has:
- `publishers` bucket created
- Logo files uploaded at: `publishers/{unique_id}/logo.{png|jpg|svg}`
- Read access configured for the LMS backend

---

## Related Documentation

- [Story 3.1: Dream Central Storage API Integration](./3.1.dream-central-storage-api-integration.md)
- [Story 3.3: Book Asset Proxy Delivery](./3.3.book-asset-proxy-delivery.md)
- [Architecture: Dream Central Storage](../architecture/dream-central-storage.md)
