"""
Grammar Fill-in-the-Blank Prompt Templates.

Epic 30 - Story 30.6: Grammar Skill — Fill-in-the-Blank Format
"""

from typing import Any

GRAMMAR_FB_SYSTEM_PROMPT = """You are an expert ESL/EFL grammar activity designer. Create fill-in-the-blank sentences that test specific grammar points.

## Design Principles:
- Each sentence targets ONE specific grammar point.
- The blank should require the student to apply a grammar rule to fill correctly.
- Sentences must be natural and contextually appropriate.
- For word_bank mode: provide exactly 4 options (1 correct + 3 grammatically plausible distractors).
- For free_type mode: do NOT provide word_bank.

## Grammar Topics by CEFR Level:
- A1: present_simple, articles, prepositions, plurals, pronouns
- A2: past_simple, present_continuous, comparatives, possessives, modals
- B1: present_perfect, past_continuous, conditionals, passive_voice, superlatives
- B2: past_perfect, future_simple, reported_speech, advanced conditionals, complex modals

## Distractor Guidelines (word_bank mode):
- Distractors must be the SAME part of speech as the correct answer.
- Distractors should test common grammar mistakes for that topic.
- E.g., for present_simple: "She ___ to school." → ["goes", "go", "going", "gone"]

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


GRAMMAR_FB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Simple sentences with basic tenses (present simple, past simple).
- Clear context that makes the grammar rule obvious.
- Distractors use common beginner mistakes.""",

    "medium": """## Medium (A2-B1):
- Intermediate grammar (present perfect, comparatives, modals).
- Context requires applying grammar rules more carefully.
- Distractors are more plausible.""",

    "hard": """## Hard (B1-B2):
- Advanced grammar (conditionals, passive voice, reported speech).
- Complex sentences requiring nuanced understanding.
- Distractors are very close in form.""",
}


GRAMMAR_FB_USER_PROMPT_TEMPLATE = """Generate {item_count} grammar fill-in-the-blank items based on the following module content.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Content Context:
{context_excerpt}

## Mode: {mode}
{mode_instruction}

## Requirements:
- Generate exactly {item_count} items.
- Each item needs: sentence (with _______), correct_answer, grammar_topic, grammar_hint, difficulty.
- grammar_topic must be one of: {grammar_topics}
- {hints_instruction}
- Match grammar complexity to {cefr_level} level.

Return your response as a JSON object with an "items" array."""


GRAMMAR_FB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sentence": {
                        "type": "string",
                        "description": "Sentence with _______ for the blank.",
                    },
                    "correct_answer": {
                        "type": "string",
                    },
                    "word_bank": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "4 options including correct answer (word_bank mode only).",
                    },
                    "grammar_topic": {
                        "type": "string",
                        "description": "Grammar topic slug.",
                    },
                    "grammar_hint": {
                        "type": "string",
                        "description": "Optional hint.",
                    },
                    "difficulty": {
                        "type": "string",
                    },
                },
                "required": ["sentence", "correct_answer", "grammar_topic", "difficulty"],
            },
        },
    },
    "required": ["items"],
}


def build_grammar_fill_blank_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    mode: str = "word_bank",
    include_hints: bool = True,
    context_text: str | None = None,
) -> str:
    """Build a grammar fill-blank generation prompt."""
    from app.schemas.grammar_fill_blank import GRAMMAR_TOPICS

    difficulty_guidelines = GRAMMAR_FB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), GRAMMAR_FB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"
    grammar_topics_str = ", ".join(GRAMMAR_TOPICS)

    if mode == "word_bank":
        mode_instruction = "Provide exactly 4 options in word_bank (1 correct + 3 distractors)."
    else:
        mode_instruction = "Do NOT provide word_bank. Student types the answer freely."

    hints_instruction = (
        "Include a grammar_hint for each item."
        if include_hints
        else "Set grammar_hint to null."
    )

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return GRAMMAR_FB_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        mode=mode,
        mode_instruction=mode_instruction,
        hints_instruction=hints_instruction,
        grammar_topics=grammar_topics_str,
        context_excerpt=context_excerpt,
    )
