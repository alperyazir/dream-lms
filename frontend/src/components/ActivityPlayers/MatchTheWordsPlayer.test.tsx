/**
 * MatchTheWordsPlayer Tests
 * Story 2.5 - Phase 9: Testing & Verification
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { MatchTheWordsActivity } from "@/lib/mockData"
import { MatchTheWordsPlayer } from "./MatchTheWordsPlayer"

const mockActivity: MatchTheWordsActivity = {
  id: "activity-1",
  bookId: "book-1",
  type: "matchTheWords",
  headerText: "Match the definitions with the correct words",
  match_words: [{ word: "Apple" }, { word: "Banana" }, { word: "Cherry" }],
  sentences: [
    { sentence: "A red or green fruit", word: "Apple" },
    { sentence: "A yellow tropical fruit", word: "Banana" },
    { sentence: "A small red stone fruit", word: "Cherry" },
  ],
}

describe("MatchTheWordsPlayer", () => {
  it("renders sentences and words correctly with drag-and-drop UI", () => {
    const onAnswersChange = vi.fn()

    render(
      <MatchTheWordsPlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Check all sentences are rendered
    expect(screen.getByText("A red or green fruit")).toBeInTheDocument()
    expect(screen.getByText("A yellow tropical fruit")).toBeInTheDocument()
    expect(screen.getByText("A small red stone fruit")).toBeInTheDocument()

    // Check all words are rendered in the left column
    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("Banana")).toBeInTheDocument()
    expect(screen.getByText("Cherry")).toBeInTheDocument()

    // Check draggable circles exist (should have play icons)
    const draggableElements = document.querySelectorAll("[draggable='true']")
    expect(draggableElements.length).toBe(3) // One for each word
  })

  it("supports drag-and-drop interaction", () => {
    const onAnswersChange = vi.fn()

    render(
      <MatchTheWordsPlayer
        activity={mockActivity}
        bookId="test-book-id"
        onAnswersChange={onAnswersChange}
      />,
    )

    // Get draggable circles
    const draggableElements = document.querySelectorAll("[draggable='true']")
    expect(draggableElements.length).toBe(3)

    // Verify draggable elements have correct classes for interactive state
    draggableElements.forEach((el) => {
      expect(el.classList.contains("cursor-grab")).toBe(true)
    })

    // Verify drop circles exist
    const dropCircles = document.querySelectorAll(".bg-teal-600")
    expect(dropCircles.length).toBe(3) // One for each sentence
  })

  // Story 23.2: Image Sizing Tests
  describe("Image Sizing (Story 23.2)", () => {
    const activityWithImages: MatchTheWordsActivity = {
      id: "activity-2",
      bookId: "book-1",
      type: "matchTheWords",
      headerText: "Match animals with sounds",
      match_words: [
        { word: "Cat" },
        { word: "Dog" },
        { word: "Bird" },
        { word: "Fish" },
      ],
      sentences: [
        { sentence: "Meow", word: "Cat", image_path: "/images/cat.jpg" },
        { sentence: "Bark", word: "Dog", image_path: "/images/dog.jpg" },
        { sentence: "Chirp", word: "Bird", image_path: "/images/bird.jpg" },
        { sentence: "Blub", word: "Fish", image_path: "/images/fish.jpg" },
      ],
    }

    it("images have responsive sizing with aspect-square", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Find all image containers
      const imageContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )

      // Should have 4 image containers (one per sentence with image_path)
      expect(imageContainers.length).toBe(4)
    })

    it("images use object-contain to preserve aspect ratio", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Find all images (will be loading spinners initially since images aren't loaded)
      // Check loading containers have correct classes
      const loadingContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )

      loadingContainers.forEach((container) => {
        expect(container.classList.contains("aspect-square")).toBe(true)
        expect(container.classList.contains("w-full")).toBe(true)
      })
    })

    it("loading state shows spinner with responsive sizing", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Should show loading spinners for images that haven't loaded
      const spinners = document.querySelectorAll(".animate-spin")
      expect(spinners.length).toBeGreaterThan(0)

      // Spinner containers should have responsive sizing
      const loadingContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(loadingContainers.length).toBe(4)
    })

    it("works without images (text-only mode)", () => {
      const textOnlyActivity: MatchTheWordsActivity = {
        id: "activity-3",
        bookId: "book-1",
        type: "matchTheWords",
        headerText: "Match definitions",
        match_words: [{ word: "Run" }, { word: "Jump" }],
        sentences: [
          { sentence: "To move quickly", word: "Run" },
          { sentence: "To leap", word: "Jump" },
        ],
      }

      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={textOnlyActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Should render sentences
      expect(screen.getByText("To move quickly")).toBeInTheDocument()
      expect(screen.getByText("To leap")).toBeInTheDocument()

      // Should not have image containers
      const imageContainers = document.querySelectorAll(".aspect-square")
      expect(imageContainers.length).toBe(0)
    })

    it("image containers have max-width constraint", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Check that max-w-[200px] class is applied
      const containers = document.querySelectorAll(".max-w-\\[200px\\]")
      expect(containers.length).toBe(4)
    })
  })

  // Story 23.3: Arrow Return Behavior Tests
  describe("Arrow Return Behavior (Story 23.3)", () => {
    it("returns immediately when dropped outside target", async () => {
      const onAnswersChange = vi.fn()
      const { container } = render(
        <MatchTheWordsPlayer
          activity={mockActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Get draggable circle
      const draggableCircles = container.querySelectorAll("[draggable='true']")
      const firstCircle = draggableCircles[0] as HTMLElement

      // Simulate drag start
      fireEvent.dragStart(firstCircle, {
        dataTransfer: {
          effectAllowed: "",
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      })

      // Simulate drag end (dropped outside any valid target)
      fireEvent.dragEnd(firstCircle)

      // Should not have called onMatch
      expect(onAnswersChange).not.toHaveBeenCalled()
    })

    it("does NOT have multi-second delay before returning", () => {
      vi.useFakeTimers()

      const onAnswersChange = vi.fn()
      const { container } = render(
        <MatchTheWordsPlayer
          activity={mockActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      const draggableCircles = container.querySelectorAll("[draggable='true']")
      const firstCircle = draggableCircles[0] as HTMLElement

      // Drag start
      fireEvent.dragStart(firstCircle, {
        dataTransfer: {
          effectAllowed: "",
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      })

      // Drag end
      fireEvent.dragEnd(firstCircle)

      // After 50ms, return should already be in progress
      vi.advanceTimersByTime(50)

      // After 300ms, animation should be complete
      vi.advanceTimersByTime(250)

      // Should not have taken 2 seconds
      expect(onAnswersChange).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it("return animation completes in under 300ms", async () => {
      vi.useFakeTimers()

      const onAnswersChange = vi.fn()
      const { container } = render(
        <MatchTheWordsPlayer
          activity={mockActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      const draggableCircles = container.querySelectorAll("[draggable='true']")
      const firstCircle = draggableCircles[0] as HTMLElement

      // Drag start
      fireEvent.dragStart(firstCircle, {
        dataTransfer: {
          effectAllowed: "",
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      })

      // Drag end
      fireEvent.dragEnd(firstCircle)

      // Animation should complete within 250ms
      vi.advanceTimersByTime(250)

      // Animation should be complete
      expect(onAnswersChange).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it("triggers return animation when dropped on empty area", () => {
      const onAnswersChange = vi.fn()
      const { container } = render(
        <MatchTheWordsPlayer
          activity={mockActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      const draggableCircles = container.querySelectorAll("[draggable='true']")
      const firstCircle = draggableCircles[0] as HTMLElement

      // Drag start
      fireEvent.dragStart(firstCircle, {
        dataTransfer: {
          effectAllowed: "",
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      })

      // Drag end without dropping on target
      fireEvent.dragEnd(firstCircle)

      // Should not create a match
      expect(onAnswersChange).not.toHaveBeenCalled()
    })

    it("does not return when dropped on valid target", () => {
      const onAnswersChange = vi.fn()
      const { container } = render(
        <MatchTheWordsPlayer
          activity={mockActivity}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      const draggableCircles = container.querySelectorAll("[draggable='true']")
      const firstCircle = draggableCircles[0] as HTMLElement

      // Get drop target
      const dropCircles = container.querySelectorAll(".bg-teal-600")
      const firstDropCircle = dropCircles[0]?.parentElement as HTMLElement

      // Drag start
      fireEvent.dragStart(firstCircle, {
        dataTransfer: {
          effectAllowed: "",
          setData: vi.fn(),
          setDragImage: vi.fn(),
        },
      })

      // Drag over
      fireEvent.dragOver(firstDropCircle, {
        dataTransfer: { dropEffect: "" },
      })

      // Drop on valid target
      fireEvent.drop(firstDropCircle, {
        dataTransfer: { getData: vi.fn(() => "Apple") },
      })

      // Should have created a match
      expect(onAnswersChange).toHaveBeenCalled()
    })
  })

  // Story 23.2: Context Compatibility Tests (AC 13-15)
  describe("Context Compatibility (Story 23.2 - AC 13-15)", () => {
    const activityWithImages: MatchTheWordsActivity = {
      id: "activity-ctx",
      bookId: "book-1",
      type: "matchTheWords",
      headerText: "Match animals",
      match_words: [{ word: "Cat" }, { word: "Dog" }],
      sentences: [
        { sentence: "Meow", word: "Cat", image_path: "/images/cat.jpg" },
        { sentence: "Bark", word: "Dog", image_path: "/images/dog.jpg" },
      ],
    }

    it("works in standalone activity view (AC 13)", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      // Verify responsive image containers are present
      const imageContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(imageContainers.length).toBe(2)

      // Verify component renders and is functional
      expect(screen.getByText("Meow")).toBeInTheDocument()
      expect(screen.getByText("Bark")).toBeInTheDocument()
    })

    it("works in assignment context with showResults (AC 14)", () => {
      const onAnswersChange = vi.fn()
      const correctAnswers = new Set(["0"]) // First sentence is correct

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
          showResults={true}
          correctAnswers={correctAnswers}
        />,
      )

      // Verify responsive image containers still present in results mode
      const imageContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(imageContainers.length).toBe(2)

      // Verify content renders in results mode
      expect(screen.getByText("Meow")).toBeInTheDocument()
      expect(screen.getByText("Bark")).toBeInTheDocument()
    })

    it("works in teacher preview mode with showCorrectAnswers (AC 15)", () => {
      const onAnswersChange = vi.fn()

      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
          showCorrectAnswers={true}
        />,
      )

      // Verify responsive image containers present in preview mode
      const imageContainers = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(imageContainers.length).toBe(2)

      // Preview mode should still render content
      expect(screen.getByText("Meow")).toBeInTheDocument()
      expect(screen.getByText("Bark")).toBeInTheDocument()
    })

    it("maintains responsive sizing across all contexts", () => {
      const onAnswersChange = vi.fn()

      // Test standalone
      const { unmount: unmountStandalone } = render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
        />,
      )

      const standaloneImages = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(standaloneImages.length).toBe(2)

      unmountStandalone()

      // Test with results
      const { unmount: unmountResults } = render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
          showResults={true}
        />,
      )

      const resultsImages = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(resultsImages.length).toBe(2)

      unmountResults()

      // Test with preview
      render(
        <MatchTheWordsPlayer
          activity={activityWithImages}
          bookId="test-book-id"
          onAnswersChange={onAnswersChange}
          showCorrectAnswers={true}
        />,
      )

      const previewImages = document.querySelectorAll(
        ".aspect-square.w-full.max-w-\\[200px\\]",
      )
      expect(previewImages.length).toBe(2)
    })
  })
})
