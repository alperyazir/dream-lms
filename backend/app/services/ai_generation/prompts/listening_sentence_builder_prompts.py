"""
Listening Sentence Builder Prompt Templates.

Generates sentences for audio-first word ordering activities.
Students hear a sentence via TTS and arrange shuffled words.

Epic 30 - Listening Skill: Sentence Builder Format
"""

from typing import Any


LISTENING_SB_SYSTEM_PROMPT = """You are an expert ESL/EFL activity designer specializing in listening-based sentence building exercises.

## Activity Design:
Students hear a COMPLETE sentence via audio (TTS). No written text is shown.
They must arrange shuffled words into the correct order to reconstruct the sentence.

## Sentence Guidelines:
- Sentences must be clear, natural, and spoken at a normal pace.
- Each sentence should be self-contained and meaningful.
- Avoid ambiguous word orders (there should be only ONE correct arrangement).
- Use vocabulary and grammar appropriate to the target difficulty level.
- Sentences should relate to the module topics when possible.

## Difficulty Guidelines:
- Easy (A1-A2): 5-8 words, simple structures, basic vocabulary.
  - Example: "She likes to read books at home."
  - Example: "The children played in the garden."
- Medium (A2-B1): 8-12 words, compound sentences, intermediate vocabulary.
  - Example: "The children played in the park after school yesterday."
  - Example: "We should bring an umbrella because it might rain today."
- Hard (B1-B2): 12-18 words, complex sentences, advanced vocabulary.
  - Example: "The scientist carefully examined the results of the experiment before publishing the report."
  - Example: "Although the weather was terrible, they decided to continue the long journey across the mountains."

IMPORTANT: Generate a MIX of sentence lengths within the difficulty range. Do NOT make all sentences the minimum length. Vary the complexity.

## Important Rules:
- Do NOT use contractions (use "do not" instead of "don't") so word boundaries are clear.
- Capitalize only the first word and proper nouns.
- Include proper punctuation at the end of each sentence.
- Vary sentence structures across items.

## Output:
Return ONLY valid JSON matching the schema. No text outside the JSON."""


LISTENING_SB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Sentences with 5-8 words each.
- Simple structures with subject-verb-object + extra phrases.
- Basic, high-frequency vocabulary.
- Present simple or present continuous tense.
- IMPORTANT: Vary lengths — some 5 words, some 7-8 words. Do NOT make all sentences the same short length.""",

    "medium": """## Medium (A2-B1):
- Sentences with 8-12 words each.
- Compound sentences with conjunctions (and, but, because, so).
- Intermediate vocabulary and varied tenses.
- Include prepositional phrases and adverbs.
- IMPORTANT: Vary lengths — some 8 words, some 10-12 words.""",

    "hard": """## Hard (B1-B2):
- Sentences with 12-18 words each.
- Complex sentences with subordinate clauses (although, while, because, if).
- Advanced vocabulary and mixed tenses.
- Include adverbs, complex prepositional phrases, and relative clauses.
- IMPORTANT: Vary lengths — some 12 words, some 15-18 words.""",
}


LISTENING_SB_USER_PROMPT_TEMPLATE = """Generate {sentence_count} sentences for a listening sentence builder activity.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Requirements:
- Generate exactly {sentence_count} sentences.
- Each sentence needs:
  - `sentence`: the complete, correctly ordered sentence
  - `difficulty`: difficulty level (easy, medium, hard)
- Match language complexity to {cefr_level} level.
- Vary sentence structures across items.
- Do NOT use contractions.

Return your response as a JSON object with a "sentences" array."""


LISTENING_SB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sentence": {
                        "type": "string",
                        "description": "Complete sentence to be spoken via TTS.",
                    },
                    "difficulty": {
                        "type": "string",
                        "description": "Difficulty level (easy, medium, hard).",
                    },
                },
                "required": ["sentence", "difficulty"],
            },
        },
    },
    "required": ["sentences"],
}


def build_listening_sentence_builder_prompt(
    sentence_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
) -> str:
    """Build a listening sentence builder generation prompt."""
    difficulty_guidelines = LISTENING_SB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), LISTENING_SB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"

    return LISTENING_SB_USER_PROMPT_TEMPLATE.format(
        sentence_count=sentence_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
    )
