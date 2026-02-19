"""
DCS AI Data Schemas.

Pydantic models for Dream Central Storage AI data endpoints.
These models represent pre-processed book data including modules,
vocabulary, and audio information.
"""

from pydantic import BaseModel, Field


class ProcessingMetadata(BaseModel):
    """
    Processing metadata for a book's AI data.

    Contains information about the processing status and totals
    for a book that has been processed by the AI extraction pipeline.

    Attributes:
        book_id: Unique identifier for the book in DCS.
        processing_status: Current processing status
            (pending, processing, completed, partial, failed).
        total_pages: Total number of pages in the book.
        total_modules: Total number of modules extracted.
        total_vocabulary: Total number of vocabulary words extracted.
        total_audio_files: Total number of audio files generated.
        languages: List of language codes found in the book.
        primary_language: Primary language of the book content.
        difficulty_range: List of CEFR difficulty levels covered.
        stages: Optional processing stage information.
    """

    book_id: str
    processing_status: str = Field(
        description="Status: pending, processing, completed, partial, failed"
    )
    total_pages: int = Field(default=0, ge=0)
    total_modules: int = Field(default=0, ge=0)
    total_vocabulary: int = Field(default=0, ge=0)
    total_audio_files: int = Field(default=0, ge=0)
    languages: list[str] = Field(default_factory=list)
    primary_language: str = Field(default="en")
    difficulty_range: list[str] = Field(default_factory=list)
    stages: dict | None = Field(default=None)


class ModuleSummary(BaseModel):
    """
    Summary information for a book module.

    Provides basic information about a module without the full text content.
    Used in module list responses.

    Attributes:
        module_id: Unique identifier for the module within the book.
        title: Display title of the module (e.g., "Unit 1: Introduction").
        pages: List of page numbers included in this module.
        word_count: Total word count in the module text.
    """

    module_id: int
    title: str
    pages: list[int] = Field(default_factory=list)
    word_count: int = Field(default=0, ge=0)


class ModuleMetadata(BaseModel):
    """
    Metadata for a book module including topics and vocabulary info.

    Used in the modules metadata endpoint response. Contains all the
    information needed for topic-based question generation without
    the full text content.

    Attributes:
        module_id: Unique identifier for the module.
        title: Display title of the module.
        start_page: First page number of the module.
        end_page: Last page number of the module.
        page_count: Total number of pages in the module.
        word_count: Total word count in the module text.
        topics: List of topic keywords/phrases for this module.
        difficulty_level: CEFR difficulty level (A1, A2, B1, etc.).
        vocabulary_count: Number of vocabulary words in this module.
    """

    module_id: int
    title: str
    start_page: int = Field(default=0)
    end_page: int = Field(default=0)
    page_count: int = Field(default=0, ge=0)
    word_count: int = Field(default=0, ge=0)
    topics: list[str] = Field(default_factory=list)
    difficulty_level: str = Field(default="A1")
    summary: str = Field(default="")
    vocabulary_count: int = Field(default=0, ge=0)


class ModulesMetadataResponse(BaseModel):
    """
    Response from the modules metadata endpoint.

    Contains book-level metadata and a list of all modules with their
    topics, difficulty levels, and vocabulary counts.

    Attributes:
        book_id: Unique identifier for the book in DCS.
        publisher_id: Publisher identifier.
        book_name: Name/title of the book.
        total_pages: Total number of pages in the book.
        module_count: Total number of modules in the book.
        method: Processing method used (e.g., "chunked_ai").
        primary_language: Primary language code of the book.
        difficulty_range: List of CEFR levels covered in the book.
        modules: List of module metadata objects.
    """

    book_id: str
    publisher_id: str = Field(default="")
    book_name: str = Field(default="")
    total_pages: int = Field(default=0, ge=0)
    module_count: int = Field(default=0, ge=0)
    method: str = Field(default="")
    primary_language: str = Field(default="en")
    difficulty_range: list[str] = Field(default_factory=list)
    modules: list[ModuleMetadata] = Field(default_factory=list)


class ModuleListResponse(BaseModel):
    """
    Response containing list of modules for a book.

    Attributes:
        book_id: Unique identifier for the book.
        total_modules: Total number of modules in the book.
        modules: List of module summaries.
    """

    book_id: str
    total_modules: int = Field(ge=0)
    modules: list[ModuleSummary] = Field(default_factory=list)


class ModuleDetail(BaseModel):
    """
    Full details for a single book module.

    Contains the complete module information including extracted text,
    topics, and vocabulary references.

    Attributes:
        module_id: Unique identifier for the module.
        title: Display title of the module.
        pages: List of page numbers included in this module.
        text: Full extracted text content of the module.
        topics: List of topic keywords/phrases identified in the module.
        vocabulary_ids: List of vocabulary word IDs associated with this module.
        language: Language code of the module content.
        difficulty: CEFR difficulty level of the module.
    """

    module_id: int
    title: str
    pages: list[int] = Field(default_factory=list)
    text: str = Field(default="")
    topics: list[str] = Field(default_factory=list)
    grammar_points: list[str] = Field(default_factory=list)
    vocabulary_ids: list[str] = Field(default_factory=list)
    language: str = Field(default="en")
    summary: str = Field(default="")
    difficulty: str = Field(default="A1")
    word_count: int = Field(default=0, ge=0)
    extracted_at: str | None = Field(default=None)


class VocabularyWord(BaseModel):
    """
    A single vocabulary word with its associated data.

    Contains the word, its translation, definition, and audio paths.

    Attributes:
        id: Unique identifier for the vocabulary word.
        word: The vocabulary word in the source language.
        translation: Translation of the word (optional).
        definition: Definition/meaning of the word.
        part_of_speech: Grammatical category (noun, verb, etc.).
        level: CEFR difficulty level of the word.
        example: Example sentence using the word (optional).
        module_id: ID of the module where this word appears.
        module_title: Title of the module (optional).
        page: Page number where the word appears (optional).
        audio: Dict with audio paths for word and translation (optional).
            Keys: "word" and/or "translation" with relative paths as values.
    """

    id: str
    word: str
    translation: str | None = Field(default=None)
    definition: str
    part_of_speech: str
    level: str = Field(default="A1")
    example: str | None = Field(default=None)
    module_id: int
    module_title: str | None = Field(default=None)
    page: int | None = Field(default=None)
    audio: dict[str, str] | None = Field(default=None)


class VocabularyResponse(BaseModel):
    """
    Response containing vocabulary words for a book.

    Attributes:
        book_id: Unique identifier for the book.
        language: Source language code of the vocabulary.
        translation_language: Target translation language code (optional).
        total_words: Total number of vocabulary words.
        words: List of vocabulary word entries.
        extracted_at: Timestamp when vocabulary was extracted (optional).
    """

    book_id: str
    language: str
    translation_language: str | None = Field(default=None)
    total_words: int = Field(ge=0)
    words: list[VocabularyWord] = Field(default_factory=list)
    extracted_at: str | None = Field(default=None)


class AudioUrlResponse(BaseModel):
    """
    Response containing a presigned audio URL.

    Attributes:
        url: Presigned URL for audio file access.
        expires_in: Seconds until the URL expires.
    """

    url: str
    expires_in: int = Field(default=3600)
