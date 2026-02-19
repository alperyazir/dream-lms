"""
Listening Fill-in-the-Blank Prompt Templates.

Multi-blank sentences with word bank (correct words + distractors).

Epic 30 - Story 30.5: Listening Skill — Fill-in-the-Blank Format
"""

from typing import Any


LISTENING_FB_SYSTEM_PROMPT = """You are an expert ESL/EFL activity designer specializing in listening-based fill-in-the-blank exercises.

## Activity Design:
Students hear a COMPLETE sentence via audio (TTS), then see a written version with 1-3 words replaced by blanks. They must fill in the missing words by selecting from a word bank that includes the correct answers plus distractors.

## Blank Count Rules:
- Vary the number of blanks across items: some with 1, some with 2, some with 3.
- A1-A2 (easy): Prefer 1-2 blanks per sentence.
- A2-B1 (medium): Use 1-3 blanks per sentence.
- B1-B2 (hard): Prefer 2-3 blanks per sentence.

## Word Selection Rules:
- Remove pedagogically meaningful CONTENT words, not function words.
- A1-A2 (easy): Remove high-frequency NOUNS and VERBS (concrete, familiar).
  - Good: "The ___ is sleeping on the ___." (cat, bed)
  - Bad: "The cat ___ sleeping." (is) / "___ cat is sleeping." (The)
- A2-B1 (medium): Remove NOUNS, VERBS, and common ADJECTIVES.
  - Good: "The ___ weather made us feel very ___." (cold, happy)
- B1-B2 (hard): Remove ADJECTIVES, ADVERBS, abstract NOUNS, less common VERBS.
  - Good: "She ___ showed great ___ during the ___." (remarkably, determination, challenge)
- NEVER remove: articles (a, an, the), prepositions (in, on, at, to), conjunctions (and, but, or), pronouns (he, she, it).

## Distractor Rules:
- Provide 3-5 distractor words per item.
- Distractors must be plausible (same part of speech, similar topic) but clearly wrong in context.
- Distractors must NOT be correct answers for ANY blank in the same item.
- Mix difficulty: some distractors should be close synonyms, others less related.

## Sentence Guidelines:
- Each sentence should be natural, conversational, and contextually rich.
- Sentences should be 8-18 words long (longer sentences support more blanks).
- The missing words should be clearly identifiable from listening to the audio.
- Use _______ (7 underscores) for each blank in display_sentence.

## Output:
Return ONLY valid JSON matching the schema. No text outside the JSON."""


LISTENING_FB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Short sentences (6-12 words) with basic vocabulary.
- Missing words are common nouns or simple verbs.
- Prefer 1-2 blanks per sentence.
- Distractors should be clearly different from correct answers.""",

    "medium": """## Medium (A2-B1):
- Medium sentences (8-15 words) with intermediate vocabulary.
- Missing words can be nouns, verbs, or common adjectives.
- Use 1-3 blanks per sentence (vary across items).
- Distractors should be plausible but distinguishable.""",

    "hard": """## Hard (B1-B2):
- Longer sentences (10-18 words) with advanced vocabulary.
- Missing words can be adjectives, adverbs, or abstract nouns.
- Prefer 2-3 blanks per sentence.
- Distractors should be challenging (near-synonyms, confusable words).""",
}


LISTENING_FB_USER_PROMPT_TEMPLATE = """Generate {item_count} fill-in-the-blank listening items based on the following module content.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Content Context:
{context_excerpt}

## Requirements:
- Generate exactly {item_count} items.
- Each item needs:
  - `full_sentence`: the complete sentence (spoken via TTS)
  - `display_sentence`: sentence with _______ for each blank (1-3 blanks)
  - `missing_words`: array of correct words IN ORDER of appearance in the sentence
  - `acceptable_answers`: array of arrays — each inner array has acceptable variants for that blank position
  - `distractors`: array of 3-5 plausible but wrong words
  - `difficulty`: CEFR level (A1, A2, B1, B2)
- Vary the number of blanks across items (not all the same).
- Match language complexity to {cefr_level} level.
- NEVER remove articles, prepositions, conjunctions, or pronouns.

Return your response as a JSON object with an "items" array."""


LISTENING_FB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "full_sentence": {
                        "type": "string",
                        "description": "Complete sentence (spoken via TTS).",
                    },
                    "display_sentence": {
                        "type": "string",
                        "description": "Sentence with _______ replacing each missing word.",
                    },
                    "missing_words": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Correct missing words, ordered by blank position.",
                    },
                    "acceptable_answers": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "description": "Per-blank acceptable answer variants.",
                    },
                    "distractors": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "3-5 plausible but wrong distractor words.",
                    },
                    "difficulty": {
                        "type": "string",
                        "description": "CEFR level (A1, A2, B1, B2).",
                    },
                },
                "required": [
                    "full_sentence",
                    "display_sentence",
                    "missing_words",
                    "acceptable_answers",
                    "distractors",
                    "difficulty",
                ],
            },
        },
    },
    "required": ["items"],
}


def build_listening_fill_blank_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a listening fill-blank generation prompt."""
    difficulty_guidelines = LISTENING_FB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), LISTENING_FB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"
    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(No additional context — generate based on topics)"

    return LISTENING_FB_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
    )
