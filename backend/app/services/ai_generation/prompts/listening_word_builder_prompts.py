"""
Listening Word Builder Prompt Templates.

Generates vocabulary words with definitions for audio-first spelling activities.
Students hear a word via TTS and arrange scrambled letters to spell it.

Epic 30 - Listening Skill: Word Builder Format
"""

from typing import Any


LISTENING_WB_SYSTEM_PROMPT = """You are an expert ESL/EFL activity designer specializing in listening-based spelling exercises.

## Activity Design:
Students hear a WORD spoken via audio (TTS). No written text is shown initially.
They must arrange scrambled letters into the correct order to spell the word.
A definition may be provided as an optional hint.

## Word Selection Guidelines:
- Words must be clearly pronounceable and unambiguous when spoken aloud.
- Each word should have a clear, concise definition.
- Avoid homophones (words that sound the same but are spelled differently) unless the definition disambiguates.
- Words should relate to the module topics when possible.
- Choose words with varied letter patterns for good spelling practice.

## Difficulty Guidelines:
- Easy (A1-A2): 4-5 letters, common words, regular spelling.
  - Examples: "book" (a written text), "happy" (feeling good)
- Medium (A2-B1): 6-8 letters, intermediate vocabulary, some irregular spelling.
  - Examples: "weather" (atmospheric conditions), "believe" (to think something is true)
- Hard (B1-B2): 9+ letters, advanced vocabulary, complex spelling patterns.
  - Examples: "beautiful" (very attractive), "knowledge" (facts and information)

## Important Rules:
- Words must be single words (no spaces, no hyphens).
- All words should be common English words (not obscure).
- Definitions should be brief (under 15 words) and clear.
- Vary the letter patterns across items.

## Output:
Return ONLY valid JSON matching the schema. No text outside the JSON."""


LISTENING_WB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Short words with 4-5 letters.
- Common, high-frequency vocabulary.
- Regular spelling patterns.
- Concrete nouns and simple adjectives.""",

    "medium": """## Medium (A2-B1):
- Medium words with 6-8 letters.
- Intermediate vocabulary.
- Some irregular spelling patterns (silent letters, double consonants).
- Include abstract nouns and verbs.""",

    "hard": """## Hard (B1-B2):
- Longer words with 9+ letters.
- Advanced vocabulary.
- Complex spelling patterns.
- Include academic and formal vocabulary.""",
}


LISTENING_WB_USER_PROMPT_TEMPLATE = """Generate {word_count} vocabulary words for a listening word builder activity.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Requirements:
- Generate exactly {word_count} words.
- Each word needs:
  - `word`: the correctly spelled word (lowercase)
  - `definition`: a brief, clear definition (under 15 words)
  - `difficulty`: difficulty level (easy, medium, hard)
- Match vocabulary complexity to {cefr_level} level.
- Vary letter patterns across items.
- Use only single words (no spaces or hyphens).

Return your response as a JSON object with a "words" array."""


LISTENING_WB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "words": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "word": {
                        "type": "string",
                        "description": "Correctly spelled word (lowercase).",
                    },
                    "definition": {
                        "type": "string",
                        "description": "Brief definition of the word.",
                    },
                    "difficulty": {
                        "type": "string",
                        "description": "Difficulty level (easy, medium, hard).",
                    },
                },
                "required": ["word", "definition", "difficulty"],
            },
        },
    },
    "required": ["words"],
}


def build_listening_word_builder_prompt(
    word_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
) -> str:
    """Build a listening word builder generation prompt."""
    difficulty_guidelines = LISTENING_WB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), LISTENING_WB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"

    return LISTENING_WB_USER_PROMPT_TEMPLATE.format(
        word_count=word_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
    )
