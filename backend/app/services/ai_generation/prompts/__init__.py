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
from app.services.ai_generation.prompts.grammar_prompts import (
    GRAMMAR_DIFFICULTY_GUIDELINES,
    GRAMMAR_JSON_SCHEMA,
    GRAMMAR_SYSTEM_PROMPT,
    GRAMMAR_USER_PROMPT_TEMPLATE,
    build_grammar_prompt,
)
from app.services.ai_generation.prompts.listening_prompts import (
    LISTENING_DIFFICULTY_GUIDELINES,
    LISTENING_JSON_SCHEMA,
    LISTENING_SYSTEM_PROMPT,
    LISTENING_USER_PROMPT_TEMPLATE,
    build_listening_prompt,
)
from app.services.ai_generation.prompts.grammar_fill_blank_prompts import (
    GRAMMAR_FB_DIFFICULTY_GUIDELINES,
    GRAMMAR_FB_JSON_SCHEMA,
    GRAMMAR_FB_SYSTEM_PROMPT,
    build_grammar_fill_blank_prompt,
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
    # Grammar-focused MCQ prompts
    "GRAMMAR_SYSTEM_PROMPT",
    "GRAMMAR_USER_PROMPT_TEMPLATE",
    "GRAMMAR_JSON_SCHEMA",
    "GRAMMAR_DIFFICULTY_GUIDELINES",
    "build_grammar_prompt",
    # Listening quiz prompts
    "LISTENING_SYSTEM_PROMPT",
    "LISTENING_USER_PROMPT_TEMPLATE",
    "LISTENING_JSON_SCHEMA",
    "LISTENING_DIFFICULTY_GUIDELINES",
    "build_listening_prompt",
    # Grammar fill-blank prompts
    "GRAMMAR_FB_SYSTEM_PROMPT",
    "GRAMMAR_FB_JSON_SCHEMA",
    "GRAMMAR_FB_DIFFICULTY_GUIDELINES",
    "build_grammar_fill_blank_prompt",
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
