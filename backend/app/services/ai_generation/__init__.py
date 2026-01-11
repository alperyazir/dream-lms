"""
AI Generation Services.

This package provides AI-powered content generation services including:
- Vocabulary quiz generation from book modules
- AI-powered MCQ quiz generation using LLM
- Reading comprehension activity generation
- Quiz storage and submission handling
- Short answer grading
"""

from app.services.ai_generation.ai_quiz_service import (
    AIQuizService,
    QuizGenerationError,
)
from app.services.ai_generation.quiz_storage_service import (
    QuizStorageService,
    get_quiz_storage_service,
    reset_quiz_storage_service,
)
from app.services.ai_generation.reading_comprehension_service import (
    ReadingComprehensionError,
    ReadingComprehensionService,
)
from app.services.ai_generation.short_answer_grader import (
    ShortAnswerGrader,
    grade_short_answer,
    grade_short_answer_with_alternatives,
    normalize_text,
)
from app.services.ai_generation.vocabulary_quiz_service import (
    InsufficientVocabularyError,
    VocabularyQuizService,
    get_adjacent_cefr_levels,
    get_vocabulary_quiz_service,
    reset_vocabulary_quiz_service,
)
from app.services.ai_generation.sentence_builder_service import (
    InsufficientSentencesError,
    SentenceBuilderError,
    SentenceBuilderService,
    get_sentence_builder_service,
    reset_sentence_builder_service,
)
from app.services.ai_generation.word_builder_service import (
    InsufficientVocabularyError as WordBuilderInsufficientVocabularyError,
    WordBuilderError,
    WordBuilderService,
    get_word_builder_service,
    reset_word_builder_service,
    scramble_letters,
    calculate_points,
)

__all__ = [
    # AI Quiz Service
    "AIQuizService",
    "QuizGenerationError",
    # Reading Comprehension Service
    "ReadingComprehensionService",
    "ReadingComprehensionError",
    # Short Answer Grader
    "ShortAnswerGrader",
    "grade_short_answer",
    "grade_short_answer_with_alternatives",
    "normalize_text",
    # Vocabulary Quiz Service
    "VocabularyQuizService",
    "InsufficientVocabularyError",
    "get_adjacent_cefr_levels",
    "get_vocabulary_quiz_service",
    "reset_vocabulary_quiz_service",
    # Quiz Storage Service
    "QuizStorageService",
    "get_quiz_storage_service",
    "reset_quiz_storage_service",
    # Sentence Builder Service
    "SentenceBuilderService",
    "InsufficientSentencesError",
    "SentenceBuilderError",
    "get_sentence_builder_service",
    "reset_sentence_builder_service",
    # Word Builder Service
    "WordBuilderService",
    "WordBuilderInsufficientVocabularyError",
    "WordBuilderError",
    "get_word_builder_service",
    "reset_word_builder_service",
    "scramble_letters",
    "calculate_points",
]
