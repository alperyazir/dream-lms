"""
Speaking Skill Prompt Templates.

Speaking Open Response: topic-based speaking prompts from book content.
"""

from typing import Any


# ============================================================
# Speaking Open Response Prompts
# ============================================================

SPEAKING_OR_SYSTEM_PROMPT = """You are an expert ESL/EFL speaking activity designer. Generate topic-based speaking prompts that encourage students to practice oral communication.

## Design Principles:
- Prompts should be engaging and relevant to the module content.
- Each prompt includes context and a time limit for the response.
- Prompt types: opinion, descriptive, narrative, explanatory, discussion.
- Include grading rubric criteria to help teachers evaluate responses.
- No single correct answer — this is open-ended speaking practice.
- Prompts should be answerable without preparation (spontaneous speech).

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


SPEAKING_OR_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Simple prompts requiring 15-30 seconds of speech.
- Describe, list, or give simple opinions.
- Use familiar, everyday topics.
- Example: "Tell me about your favorite food. What does it taste like?" (15-30 seconds)""",

    "medium": """## Medium (A2-B1):
- Moderate prompts requiring 30-60 seconds of speech.
- Compare, explain, or give opinions with reasons.
- Requires some structured thinking.
- Example: "Compare two seasons. Which do you prefer and why?" (30-60 seconds)""",

    "hard": """## Hard (B1-B2):
- Complex prompts requiring 60-90 seconds of speech.
- Analyze, argue, or tell detailed narratives.
- Requires organized, extended speech.
- Example: "Describe a time you learned something important. What happened and how did it change you?" (60-90 seconds)""",
}

_SPEAKING_OR_TIME_RANGES = {
    "easy": (15, 30),
    "medium": (30, 60),
    "hard": (60, 90),
}


SPEAKING_OR_USER_PROMPT_TEMPLATE = """Generate {item_count} speaking prompts for an open-ended speaking activity.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Content Context:
{context_excerpt}

## Requirements:
- Generate exactly {item_count} prompts.
- Each item needs: prompt (the speaking task), context (background info), max_seconds (time limit between {min_seconds}-{max_seconds}), difficulty, grading_rubric (3-5 criteria for grading).
- Prompts should relate to the module topics.
- Mix prompt types (opinion, descriptive, narrative, explanatory).
- Prompts should encourage spontaneous, natural speech.
- Time limits should match the complexity of the prompt.

Return your response as a JSON object with an "items" array."""


SPEAKING_OR_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The speaking prompt/question.",
                    },
                    "context": {
                        "type": "string",
                        "description": "Background context for the prompt.",
                    },
                    "max_seconds": {
                        "type": "integer",
                        "description": "Maximum recording time in seconds.",
                    },
                    "difficulty": {
                        "type": "string",
                    },
                    "grading_rubric": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "3-5 criteria for teacher grading.",
                    },
                },
                "required": ["prompt", "context", "max_seconds", "difficulty", "grading_rubric"],
            },
        },
    },
    "required": ["items"],
}


def build_speaking_open_response_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a speaking open response prompt."""
    difficulty_guidelines = SPEAKING_OR_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), SPEAKING_OR_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"
    min_seconds, max_seconds = _SPEAKING_OR_TIME_RANGES.get(difficulty.lower(), (30, 60))

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return SPEAKING_OR_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
        min_seconds=min_seconds,
        max_seconds=max_seconds,
    )
