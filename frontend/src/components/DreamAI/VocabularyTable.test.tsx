/**
 * Vocabulary Table Component Tests
 * Story 27.18: Vocabulary Explorer with Audio Player
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { VocabularyWord } from "@/types/vocabulary-explorer"
import { VocabularyTable } from "./VocabularyTable"

// Mock child components
vi.mock("./WordAudioButton", () => ({
  WordAudioButton: ({ wordId, word }: { wordId: string; word: string }) => (
    <button aria-label={`Play audio for ${word}`} data-word-id={wordId}>
      🔊
    </button>
  ),
}))

vi.mock("./CEFRBadge", () => ({
  CEFRBadge: ({ level }: { level: string }) => <span>{level}</span>,
}))

vi.mock("./QuickAddButton", () => ({
  QuickAddButton: ({ word }: { word: VocabularyWord }) => (
    <button>Add {word.word}</button>
  ),
}))

describe("VocabularyTable", () => {
  const mockWords: VocabularyWord[] = [
    {
      id: "1",
      word: "hello",
      translation: "merhaba",
      definition: "a greeting",
      example_sentence: "Hello, world!",
      cefr_level: "A1",
      part_of_speech: "interjection",
      module_name: "Module 1",
      book_id: 1,
      has_audio: true,
    },
    {
      id: "2",
      word: "goodbye",
      translation: "hoşçakal",
      definition: "a farewell",
      example_sentence: "Goodbye, friend!",
      cefr_level: "A2",
      part_of_speech: "interjection",
      module_name: "Module 1",
      book_id: 1,
      has_audio: true,
    },
  ]

  const defaultProps = {
    words: mockWords,
    total: 100,
    page: 1,
    pageSize: 25,
    totalPages: 4,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  }

  it("renders table with vocabulary words", () => {
    render(<VocabularyTable {...defaultProps} />)

    // Use getAllByText since words might appear in mobile and desktop views
    expect(screen.getAllByText("hello").length).toBeGreaterThan(0)
    expect(screen.getAllByText("goodbye").length).toBeGreaterThan(0)
    expect(screen.getAllByText("merhaba").length).toBeGreaterThan(0)
    expect(screen.getAllByText("hoşçakal").length).toBeGreaterThan(0)
  })

  it("displays definitions and examples", () => {
    render(<VocabularyTable {...defaultProps} />)

    // Use getAllByText since content might appear in both mobile and desktop views
    expect(screen.getAllByText("a greeting").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Hello, world!").length).toBeGreaterThan(0)
  })

  it("shows empty state when no words", () => {
    render(<VocabularyTable {...defaultProps} words={[]} total={0} />)

    expect(screen.getByText("No vocabulary words found.")).toBeInTheDocument()
    expect(
      screen.getByText("Try adjusting your filters or search term."),
    ).toBeInTheDocument()
  })

  it("shows loading state", () => {
    render(<VocabularyTable {...defaultProps} isLoading={true} words={[]} />)

    // Use getAllByText since loading message appears in both mobile and desktop views
    expect(screen.getAllByText("Loading vocabulary...").length).toBeGreaterThan(
      0,
    )
  })

  it("displays pagination info correctly", () => {
    render(<VocabularyTable {...defaultProps} />)

    expect(screen.getByText("Showing 1-25 of 100 words")).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument()
  })

  it("calls onPageChange when next button clicked", () => {
    const onPageChange = vi.fn()
    render(<VocabularyTable {...defaultProps} onPageChange={onPageChange} />)

    const nextButton = screen.getByRole("button", { name: /next/i })
    fireEvent.click(nextButton)

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it("calls onPageChange when previous button clicked", () => {
    const onPageChange = vi.fn()
    render(
      <VocabularyTable
        {...defaultProps}
        page={2}
        onPageChange={onPageChange}
      />,
    )

    const prevButton = screen.getByRole("button", { name: /previous/i })
    fireEvent.click(prevButton)

    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it("disables previous button on first page", () => {
    render(<VocabularyTable {...defaultProps} page={1} />)

    const prevButton = screen.getByRole("button", { name: /previous/i })
    expect(prevButton).toBeDisabled()
  })

  it("disables next button on last page", () => {
    render(<VocabularyTable {...defaultProps} page={4} />)

    const nextButton = screen.getByRole("button", { name: /next/i })
    expect(nextButton).toBeDisabled()
  })

  it("shows correct page size options", () => {
    render(<VocabularyTable {...defaultProps} />)

    // Page size selector should be present
    expect(screen.getByText("Per page:")).toBeInTheDocument()
  })

  it("displays em dash when example sentence is null", () => {
    const wordsWithoutExample: VocabularyWord[] = [
      {
        ...mockWords[0],
        example_sentence: null,
        has_audio: true,
      },
    ]

    render(
      <VocabularyTable
        {...defaultProps}
        words={wordsWithoutExample}
        total={1}
      />,
    )

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("updates pagination info for different pages", () => {
    render(<VocabularyTable {...defaultProps} page={2} />)

    expect(screen.getByText("Showing 26-50 of 100 words")).toBeInTheDocument()
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument()
  })

  it("handles last page pagination correctly", () => {
    render(
      <VocabularyTable
        {...defaultProps}
        page={4}
        total={100}
        pageSize={25}
        totalPages={4}
      />,
    )

    expect(screen.getByText("Showing 76-100 of 100 words")).toBeInTheDocument()
  })
})
