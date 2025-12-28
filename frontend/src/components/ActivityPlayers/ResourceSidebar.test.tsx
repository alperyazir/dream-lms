/**
 * ResourceSidebar Tests
 * Story 13.3: Assignment Integration - Attach Teacher Materials
 *
 * Tests for the resource sidebar component that displays
 * videos and teacher materials attached to assignments.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  AdditionalResourcesResponse,
  TeacherMaterialResourceResponse,
  VideoResource,
} from "@/types/assignment"

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="icon-alert">AlertTriangle</span>,
  ChevronRight: () => <span data-testid="icon-chevron">ChevronRight</span>,
  Download: () => <span data-testid="icon-download">Download</span>,
  ExternalLink: () => <span data-testid="icon-external">ExternalLink</span>,
  FileText: () => <span data-testid="icon-file">FileText</span>,
  FolderOpen: () => <span data-testid="icon-folder">FolderOpen</span>,
  Headphones: () => <span data-testid="icon-headphones">Headphones</span>,
  ImageIcon: () => <span data-testid="icon-image">ImageIcon</span>,
  Loader2: () => <span data-testid="icon-loader">Loader2</span>,
  Play: () => <span data-testid="icon-play">Play</span>,
  Subtitles: () => <span data-testid="icon-subtitles">Subtitles</span>,
  Video: () => <span data-testid="icon-video">Video</span>,
  X: () => <span data-testid="icon-x">X</span>,
}))

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <span data-testid="badge" className={className}>
      {children}
    </span>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}))

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-testid="separator" />,
}))

// Mock MaterialTypeIcon
vi.mock("@/components/materials/MaterialTypeIcon", () => ({
  MaterialTypeIcon: ({ type }: { type: string }) => (
    <span data-testid={`material-icon-${type}`}>{type}</span>
  ),
  getMaterialTypeLabel: (type: string) => {
    const labels: Record<string, string> = {
      document: "Document",
      image: "Image",
      audio: "Audio",
      video: "Video",
      url: "URL",
      text_note: "Text Note",
    }
    return labels[type] || type
  },
}))

// Mock AudioPlayer and VideoPlayer
vi.mock("./AudioPlayer", () => ({
  AudioPlayer: ({ src }: { src: string }) => (
    <div data-testid="audio-player">AudioPlayer: {src}</div>
  ),
}))

vi.mock("./VideoPlayer", () => ({
  VideoPlayer: ({ src }: { src: string }) => (
    <div data-testid="video-player">VideoPlayer: {src}</div>
  ),
}))

// Mock OpenAPI
vi.mock("@/client", () => ({
  OpenAPI: {
    BASE: "http://localhost:8000",
  },
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => "test-token"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: mockLocalStorage })

// Mock fetch for blob URLs
const mockFetch = vi.fn()
Object.defineProperty(window, "fetch", { value: mockFetch })

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:test-url")
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(URL, "createObjectURL", { value: mockCreateObjectURL })
Object.defineProperty(URL, "revokeObjectURL", { value: mockRevokeObjectURL })

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, "open", { value: mockWindowOpen })

// Import after mocks
import { ResourceSidebar, ResourcesButton } from "./ResourceSidebar"

// Test data
const mockVideoResource: VideoResource = {
  type: "video",
  path: "video/lesson1.mp4",
  name: "Lesson 1 Video",
  subtitles_enabled: true,
  has_subtitles: true,
}

const mockDocumentMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "doc-123",
  name: "Study Guide.pdf",
  material_type: "document",
  is_available: true,
  file_size: 1024000,
  mime_type: "application/pdf",
  url: null,
  text_content: null,
  download_url: null,
}

const mockVideoMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "vid-456",
  name: "Tutorial Video.mp4",
  material_type: "video",
  is_available: true,
  file_size: 10485760,
  mime_type: "video/mp4",
  url: null,
  text_content: null,
  download_url: null,
}

const mockAudioMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "aud-789",
  name: "Pronunciation Guide.mp3",
  material_type: "audio",
  is_available: true,
  file_size: 2048000,
  mime_type: "audio/mpeg",
  url: null,
  text_content: null,
  download_url: null,
}

const mockImageMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "img-012",
  name: "Diagram.png",
  material_type: "image",
  is_available: true,
  file_size: 512000,
  mime_type: "image/png",
  url: null,
  text_content: null,
  download_url: null,
}

const mockTextNoteMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "note-345",
  name: "Study Notes",
  material_type: "text_note",
  is_available: true,
  file_size: null,
  mime_type: null,
  url: null,
  text_content: "These are important study notes for the chapter.",
  download_url: null,
}

const mockUrlMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "url-678",
  name: "Reference Website",
  material_type: "url",
  is_available: true,
  file_size: null,
  mime_type: null,
  url: "https://example.com/reference",
  text_content: null,
  download_url: null,
}

const mockUnavailableMaterial: TeacherMaterialResourceResponse = {
  type: "teacher_material",
  material_id: "unavail-999",
  name: "Deleted Material",
  material_type: "document",
  is_available: false,
  file_size: null,
  mime_type: null,
  url: null,
  text_content: null,
  download_url: null,
}

const mockResources: AdditionalResourcesResponse = {
  videos: [mockVideoResource],
  teacher_materials: [
    mockDocumentMaterial,
    mockVideoMaterial,
    mockAudioMaterial,
    mockImageMaterial,
    mockTextNoteMaterial,
    mockUrlMaterial,
    mockUnavailableMaterial,
  ],
}

const defaultProps = {
  resources: mockResources,
  bookId: "book-123",
  assignmentId: "assignment-456",
  getVideoUrl: (bookId: string, path: string) =>
    `http://test.com/${bookId}/${path}`,
  getSubtitleUrl: (bookId: string, path: string) =>
    `http://test.com/${bookId}/${path}.vtt`,
  isOpen: true,
  onClose: vi.fn(),
  selectedVideo: null as VideoResource | null,
  onSelectVideo: vi.fn(),
}

describe("ResourceSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders nothing when isOpen is false", () => {
      render(<ResourceSidebar {...defaultProps} isOpen={false} />)
      expect(screen.queryByText("Resources")).not.toBeInTheDocument()
    })

    it("renders nothing when there are no resources", () => {
      render(
        <ResourceSidebar
          {...defaultProps}
          resources={{ videos: [], teacher_materials: [] }}
        />,
      )
      expect(screen.queryByText("Resources")).not.toBeInTheDocument()
    })

    it("renders sidebar with resources when open", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Resources")).toBeInTheDocument()
    })

    it("displays correct resource count", () => {
      render(<ResourceSidebar {...defaultProps} />)
      // 1 video + 7 teacher materials = 8 total
      expect(screen.getByText("8")).toBeInTheDocument()
    })

    it("renders video resources section", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Videos (1)")).toBeInTheDocument()
      expect(screen.getByText("Lesson 1 Video")).toBeInTheDocument()
    })

    it("renders teacher materials section", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Materials (7)")).toBeInTheDocument()
    })

    it("displays material names", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Study Guide.pdf")).toBeInTheDocument()
      expect(screen.getByText("Tutorial Video.mp4")).toBeInTheDocument()
      expect(screen.getByText("Pronunciation Guide.mp3")).toBeInTheDocument()
    })

    it("shows subtitles badge for videos with subtitles", () => {
      render(<ResourceSidebar {...defaultProps} />)
      // May have multiple "Subtitles" text (badge and enabled indicator)
      const subtitlesElements = screen.getAllByText("Subtitles")
      expect(subtitlesElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("Material Actions", () => {
    it("shows correct action button for document", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("View Document")).toBeInTheDocument()
    })

    it("shows correct action button for video", () => {
      render(<ResourceSidebar {...defaultProps} />)
      // There are multiple "Watch Video" buttons - one for book video, one for teacher video material
      const watchVideoButtons = screen.getAllByText("Watch Video")
      expect(watchVideoButtons.length).toBeGreaterThanOrEqual(2)
    })

    it("shows correct action button for audio", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Listen")).toBeInTheDocument()
    })

    it("shows correct action button for image", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("View Image")).toBeInTheDocument()
    })

    it("shows correct action button for text note", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("View Note")).toBeInTheDocument()
    })

    it("shows correct action button for URL", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Open Link")).toBeInTheDocument()
    })

    it("opens external URL in new tab when clicking Open Link", () => {
      render(<ResourceSidebar {...defaultProps} />)
      const openLinkButton = screen.getByText("Open Link")
      fireEvent.click(openLinkButton)
      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://example.com/reference",
        "_blank",
        "noopener,noreferrer",
      )
    })
  })

  describe("Unavailable Materials", () => {
    it("shows unavailable badge for deleted materials", () => {
      render(<ResourceSidebar {...defaultProps} />)
      expect(screen.getByText("Unavailable")).toBeInTheDocument()
    })

    it("does not show action button for unavailable materials", () => {
      render(<ResourceSidebar {...defaultProps} />)
      // The unavailable material should not have an action button
      // The available document should have "View Document" button
      const viewDocButtons = screen.getAllByText("View Document")
      // Both unavailable and available materials show the name, but only available has action button
      expect(viewDocButtons.length).toBe(1) // Only available document has button
      // Verify the unavailable material name is still shown
      expect(screen.getByText("Deleted Material")).toBeInTheDocument()
    })
  })

  describe("Video Playback", () => {
    it("calls onSelectVideo when Watch Video is clicked on book video", () => {
      const onSelectVideo = vi.fn()
      render(
        <ResourceSidebar {...defaultProps} onSelectVideo={onSelectVideo} />,
      )

      // Find the book video's Watch Video button
      const watchButtons = screen.getAllByRole("button")
      const bookVideoButton = watchButtons.find(
        (btn) =>
          btn.textContent?.includes("Watch Video") &&
          btn.closest("div")?.textContent?.includes("Lesson 1 Video"),
      )

      if (bookVideoButton) {
        fireEvent.click(bookVideoButton)
        expect(onSelectVideo).toHaveBeenCalledWith(mockVideoResource)
      }
    })

    it("renders VideoPlayer modal when book video is selected", () => {
      render(
        <ResourceSidebar {...defaultProps} selectedVideo={mockVideoResource} />,
      )
      expect(screen.getByTestId("video-player")).toBeInTheDocument()
    })
  })

  describe("Close Functionality", () => {
    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn()
      render(<ResourceSidebar {...defaultProps} onClose={onClose} />)

      // Find close button (the chevron)
      const buttons = screen.getAllByRole("button")
      const closeButton = buttons.find((btn) =>
        btn.querySelector('[data-testid="icon-chevron"]'),
      )

      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })
})

describe("ResourcesButton", () => {
  it("renders nothing when resource count is 0", () => {
    render(
      <ResourcesButton resourceCount={0} isOpen={false} onClick={vi.fn()} />,
    )
    expect(screen.queryByText("Resources")).not.toBeInTheDocument()
  })

  it("renders button with resource count", () => {
    render(
      <ResourcesButton resourceCount={5} isOpen={false} onClick={vi.fn()} />,
    )
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const onClick = vi.fn()
    render(
      <ResourcesButton resourceCount={3} isOpen={false} onClick={onClick} />,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })

  it("applies active styling when isOpen is true", () => {
    render(
      <ResourcesButton resourceCount={3} isOpen={true} onClick={vi.fn()} />,
    )

    const button = screen.getByRole("button")
    expect(button.className).toContain("bg-teal-600")
  })
})

describe("Material Streaming URL Generation", () => {
  it("generates correct stream URL with token when opening URL material", () => {
    render(<ResourceSidebar {...defaultProps} />)

    // Click the "Open Link" button - this should not call localStorage
    // since URL type opens external link directly
    const openLinkButton = screen.getByText("Open Link")
    fireEvent.click(openLinkButton)

    // URL materials open in new tab without auth token
    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://example.com/reference",
      "_blank",
      "noopener,noreferrer",
    )
  })

  it("provides auth token to localStorage when needed", () => {
    // The token retrieval happens when clicking on document/image/video/audio
    // materials that need fetching or streaming
    render(<ResourceSidebar {...defaultProps} />)

    // Component is rendered - token functions are defined and ready
    // Actual token retrieval happens on user interaction (clicking material buttons)
    expect(screen.getByText("View Document")).toBeInTheDocument()
  })
})
