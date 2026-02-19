"""
Listening Quiz Prompt Templates.

System prompt, user prompt template, and JSON schema for generating
listening comprehension questions with TTS audio prompts.

Epic 30 - Story 30.4: Listening Skill — Quiz Format (Audio + MCQ)
"""

from typing import Any


LISTENING_SYSTEM_PROMPT = """You are an expert ESL/EFL listening assessment designer. Your task is to create listening comprehension questions where students MUST listen to audio to answer correctly.

## CRITICAL DESIGN PRINCIPLE
The audio is the PRIMARY input. The question text is displayed, but the information needed to answer is ONLY available in the audio. Students who have not listened to the audio should NOT be able to answer correctly.

## Sub-Skill Types (distribute across questions):
1. **gist** (~30%): Tests overall understanding. E.g., "What is the main topic of the announcement?"
   - Audio: a short passage/dialogue. Question asks about the overall meaning.
2. **detail** (~50%): Tests specific information extraction. E.g., "What time does the meeting start?"
   - Audio: contains specific facts (times, numbers, names, places). Question asks for that fact.
3. **discrimination** (~20%): Tests phoneme/word discrimination. E.g., "Which word did you hear?"
   - Audio: contains a word that sounds similar to others. Question asks which word was said.

## Audio Text Guidelines:
- Each `audio_text` should be 1-3 sentences spoken naturally.
- For gist: use 2-3 sentences describing a situation or announcement.
- For detail: use 1-2 sentences with specific facts embedded.
- For discrimination: use 1 sentence with a target word that has minimal pairs (e.g., ship/sheep, fifteen/fifty).

## MCQ Guidelines:
- Exactly 4 options per question, only one correct.
- Distractors should be plausible if you HAVEN'T listened.
- For detail questions, distractors should be similar values (times, numbers, names).
- For discrimination, distractors should be phonetically similar words.

## Output Format:
Return ONLY valid JSON matching the schema. Do not include any text outside the JSON object."""


LISTENING_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Short, simple sentences with common vocabulary.
- Slow, clear speech with familiar topics (greetings, numbers, daily routines).
- Detail questions use simple facts (colors, numbers 1-20, basic times).
- Discrimination uses clearly different words.""",

    "medium": """## Medium (A2-B1):
- Natural-length sentences with intermediate vocabulary.
- Normal speaking pace with everyday topics (shopping, travel, school).
- Detail questions involve dates, prices, addresses, specific instructions.
- Discrimination uses commonly confused pairs (ship/sheep, live/leave).""",

    "hard": """## Hard (B1-B2):
- Complex sentences with advanced vocabulary and idioms.
- Natural pace, may include connected speech features.
- Detail questions require catching subtle information in longer passages.
- Discrimination uses challenging minimal pairs and reduced forms.""",
}


LISTENING_USER_PROMPT_TEMPLATE = """Generate {question_count} listening comprehension questions based on the following module content.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
Language: {language}
CEFR Level: {cefr_level}

## Content Context (use as inspiration for audio texts):
{context_excerpt}

## Sub-Skill Distribution:
- gist: approximately {gist_count} questions
- detail: approximately {detail_count} questions
- discrimination: approximately {disc_count} questions

## Requirements:
- Generate exactly {question_count} questions.
- Each question needs an `audio_text` (what will be spoken aloud via TTS).
- Each question needs a `question_text` (displayed on screen).
- The answer MUST require hearing the audio — it cannot be guessed from the question + options alone.
- Match language complexity to {cefr_level} level.
- Use vocabulary and topics from the module context.

Return your response as a JSON object with a "questions" array."""


LISTENING_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "audio_text": {
                        "type": "string",
                        "description": "Text to be spoken via TTS (1-3 sentences).",
                    },
                    "question_text": {
                        "type": "string",
                        "description": "Question displayed to the student.",
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 4,
                        "maxItems": 4,
                        "description": "Exactly 4 answer options.",
                    },
                    "correct_index": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 3,
                        "description": "Index of the correct answer (0-3).",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Explanation of the correct answer.",
                    },
                    "sub_skill": {
                        "type": "string",
                        "enum": ["gist", "detail", "discrimination"],
                        "description": "Listening sub-skill tested.",
                    },
                    "difficulty": {
                        "type": "string",
                        "description": "CEFR level (A1, A2, B1, B2).",
                    },
                },
                "required": [
                    "audio_text",
                    "question_text",
                    "options",
                    "correct_index",
                    "explanation",
                    "sub_skill",
                    "difficulty",
                ],
            },
        },
    },
    "required": ["questions"],
}


def build_listening_prompt(
    question_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a listening quiz generation prompt.

    Args:
        question_count: Number of questions to generate.
        difficulty: Difficulty level (easy, medium, hard).
        language: Language for the questions.
        topics: List of topic keywords.
        module_title: Title of the source module.
        cefr_level: CEFR difficulty level.
        context_text: Optional context excerpt from module.

    Returns:
        Formatted user prompt string.
    """
    difficulty_guidelines = LISTENING_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), LISTENING_DIFFICULTY_GUIDELINES["medium"]
    )

    topics_str = ", ".join(topics) if topics else "General"

    # Sub-skill distribution: gist 30%, detail 50%, discrimination 20%
    detail_count = max(1, round(question_count * 0.5))
    gist_count = max(1, round(question_count * 0.3))
    disc_count = max(0, question_count - detail_count - gist_count)

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(No additional context available — generate based on topics)"

    return LISTENING_USER_PROMPT_TEMPLATE.format(
        question_count=question_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
        gist_count=gist_count,
        detail_count=detail_count,
        disc_count=disc_count,
    )
