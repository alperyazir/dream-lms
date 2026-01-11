"""
LLM Prompt Templates for AI Content Generation.

This module contains prompt templates for various AI generation tasks.
"""

from app.services.ai_generation.prompts.mcq_prompts import (
    DIFFICULTY_GUIDELINES,
    MCQ_JSON_SCHEMA,
    MCQ_SYSTEM_PROMPT,
    MCQ_USER_PROMPT_TEMPLATE,
    build_mcq_prompt,
)
from app.services.ai_generation.prompts.reading_prompts import (
    READING_DIFFICULTY_GUIDELINES,
    READING_JSON_SCHEMA,
    READING_SYSTEM_PROMPT,
    READING_USER_PROMPT_TEMPLATE,
    build_reading_prompt,
    map_cefr_to_difficulty,
)
from app.services.ai_generation.prompts.matching_prompts import (
    ANTONYM_PROMPT_TEMPLATE,
    SYNONYM_PROMPT_TEMPLATE,
    build_antonym_prompt,
    build_synonym_prompt,
)
from app.services.ai_generation.prompts.sentence_prompts import (
    SENTENCE_DIFFICULTY_GUIDELINES,
    SENTENCE_GENERATION_DIFFICULTY_GUIDELINES,
    SENTENCE_GENERATION_JSON_SCHEMA,
    SENTENCE_GENERATION_SYSTEM_PROMPT,
    SENTENCE_QUALITY_JSON_SCHEMA,
    SENTENCE_QUALITY_SYSTEM_PROMPT,
    build_sentence_categorization_prompt,
    build_sentence_generation_prompt,
    build_sentence_quality_prompt,
)

__all__ = [
    # MCQ prompts
    "MCQ_SYSTEM_PROMPT",
    "MCQ_USER_PROMPT_TEMPLATE",
    "MCQ_JSON_SCHEMA",
    "DIFFICULTY_GUIDELINES",
    "build_mcq_prompt",
    # Reading comprehension prompts
    "READING_SYSTEM_PROMPT",
    "READING_USER_PROMPT_TEMPLATE",
    "READING_JSON_SCHEMA",
    "READING_DIFFICULTY_GUIDELINES",
    "build_reading_prompt",
    "map_cefr_to_difficulty",
    # Matching prompts
    "SYNONYM_PROMPT_TEMPLATE",
    "ANTONYM_PROMPT_TEMPLATE",
    "build_synonym_prompt",
    "build_antonym_prompt",
    # Sentence builder prompts
    "SENTENCE_QUALITY_SYSTEM_PROMPT",
    "SENTENCE_QUALITY_JSON_SCHEMA",
    "SENTENCE_DIFFICULTY_GUIDELINES",
    "SENTENCE_GENERATION_SYSTEM_PROMPT",
    "SENTENCE_GENERATION_JSON_SCHEMA",
    "SENTENCE_GENERATION_DIFFICULTY_GUIDELINES",
    "build_sentence_quality_prompt",
    "build_sentence_categorization_prompt",
    "build_sentence_generation_prompt",
]
