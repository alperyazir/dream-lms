"""
Writing Skill Prompt Templates.

Epic 30 - Story 30.7: Writing Skill — Sentence Builder & Fill-Blank Formats
"""

from typing import Any


# ============================================================
# Writing Sentence Builder Prompts
# ============================================================

WRITING_SB_SYSTEM_PROMPT = """You are an expert ESL/EFL writing activity designer. Generate sentences that focus on EXPRESSIVE WRITING, not just grammar.

## Design Principles:
- Sentences should express opinions, describe scenes, or tell short narratives.
- Each sentence includes a brief context/scenario (e.g., "Describing your favorite place").
- Avoid simple factual statements — prefer sentences that require expressive language.
- Sentences should feel like real writing practice, not grammar drills.

## Key Difference from Grammar Activities:
- Grammar Sentence Builder: "The cat sits on the mat." (tests word order for a factual sentence)
- Writing Sentence Builder: "My favorite season is autumn because the leaves change beautiful colors." (tests expressive composition)

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


WRITING_SB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Short expressive sentences (4-6 words).
- Simple opinions and descriptions.
- Example: "I love sunny days." / "The flowers are beautiful." """,

    "medium": """## Medium (A2-B1):
- Moderate expressive sentences (7-10 words).
- Opinions with reasons, descriptions with detail.
- Example: "I think reading books is very relaxing." """,

    "hard": """## Hard (B1-B2):
- Complex expressive sentences (11+ words).
- Narratives with subordinate clauses, nuanced opinions.
- Example: "Although the weather was cold, we enjoyed walking along the beautiful riverbank." """,
}


WRITING_SB_USER_PROMPT_TEMPLATE = """Generate {sentence_count} expressive writing sentences for a sentence-building activity.

{difficulty_guidelines}

## Module Context:
Title: {module_title}
Topics: {topics}
CEFR Level: {cefr_level}

## Content Context:
{context_excerpt}

## Requirements:
- Generate exactly {sentence_count} sentences.
- Each sentence needs: sentence (the complete correct sentence), context (a brief scenario or writing situation).
- Sentences must express opinions, describe scenes, or narrate events — NOT simple facts.
- Match complexity to {cefr_level} level.
- Include vocabulary from the module content where possible.

Return your response as a JSON object with a "sentences" array."""


WRITING_SB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sentence": {
                        "type": "string",
                        "description": "The complete correct sentence.",
                    },
                    "context": {
                        "type": "string",
                        "description": "Brief writing scenario/context.",
                    },
                },
                "required": ["sentence", "context"],
            },
        },
    },
    "required": ["sentences"],
}


# ============================================================
# Writing Fill-Blank Prompts
# ============================================================

WRITING_FB_SYSTEM_PROMPT = """You are an expert ESL/EFL writing activity designer. Create fill-in-the-blank sentences that test EXPRESSIVE WORD CHOICE, not grammar forms.

## Design Principles:
- The blank should require the student to choose an expressive/descriptive word.
- Multiple valid answers should exist (synonyms, stylistic variations).
- Each item includes a writing context/scenario.
- This is NOT grammar practice — do NOT test verb conjugation or article usage.

## Key Difference from Grammar Fill-Blank:
- Grammar: "She _______ to school." → Tests verb form (one answer: "goes")
- Writing: "The sunset was _______." → Tests word choice (many answers: "beautiful", "amazing", "stunning")

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


WRITING_FB_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Simple descriptive blanks (adjectives, common nouns).
- 3-4 acceptable answers.
- Clear context that guides word choice.""",

    "medium": """## Medium (A2-B1):
- More nuanced blanks (adverbs, expressive verbs, varied adjectives).
- 4-5 acceptable answers.
- Context requires more precise word choice.""",

    "hard": """## Hard (B1-B2):
- Complex blanks (idiomatic expressions, register-appropriate words, nuanced vocabulary).
- 3-5 acceptable answers.
- Context requires stylistic awareness.""",
}


WRITING_FB_USER_PROMPT_TEMPLATE = """Generate {item_count} writing fill-in-the-blank items based on the following module content.

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
- Each item needs: context (writing scenario), sentence (with _______), correct_answer, acceptable_answers (3-5 valid alternatives), difficulty.
- The blank must test EXPRESSIVE word choice, not grammar forms.
- acceptable_answers MUST include the correct_answer plus 2-4 additional valid options.
- Match vocabulary complexity to {cefr_level} level.

Return your response as a JSON object with an "items" array."""


WRITING_FB_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "context": {
                        "type": "string",
                        "description": "Brief writing scenario/context.",
                    },
                    "sentence": {
                        "type": "string",
                        "description": "Sentence with _______ for the blank.",
                    },
                    "correct_answer": {
                        "type": "string",
                        "description": "The best/primary answer.",
                    },
                    "acceptable_answers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "All valid answers (3-5), including correct_answer.",
                    },
                    "difficulty": {
                        "type": "string",
                    },
                },
                "required": ["context", "sentence", "correct_answer", "acceptable_answers", "difficulty"],
            },
        },
    },
    "required": ["items"],
}


def build_writing_sentence_builder_prompt(
    sentence_count: int,
    difficulty: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a writing sentence builder prompt."""
    difficulty_guidelines = WRITING_SB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), WRITING_SB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return WRITING_SB_USER_PROMPT_TEMPLATE.format(
        sentence_count=sentence_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
    )


# ============================================================
# Writing Sentence Corrector Prompts
# ============================================================

WRITING_SC_SYSTEM_PROMPT = """You are an expert ESL/EFL writing activity designer. Generate intentionally INCORRECT sentences that students must correct.

## Design Principles:
- Each item has a context scenario, an incorrect sentence, and the correct version.
- Error types: word_order (scrambled syntax), grammar (tense/agreement), spelling (misspelled words), mixed (combination).
- Errors should be plausible mistakes a language learner would make.
- The correct sentence should be natural and expressive.
- Include a variety of error types across items.

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


WRITING_SC_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- One obvious error per sentence.
- Short sentences (5-8 words).
- Common vocabulary. Clear error type.
- Example incorrect: "She go to school every day." → correct: "She goes to school every day." """,

    "medium": """## Medium (A2-B1):
- 1-2 errors per sentence.
- Moderate sentences (8-12 words).
- Errors require some thought to identify.
- Example incorrect: "Yesterday I have went to the park." → correct: "Yesterday I went to the park." """,

    "hard": """## Hard (B1-B2):
- 2-3 subtle errors per sentence.
- Complex sentences (12+ words).
- Errors in nuanced grammar, spelling, or word order.
- Example incorrect: "Although he studyed hard, he didn't past the examinaton." → correct: "Although he studied hard, he didn't pass the examination." """,
}


WRITING_SC_USER_PROMPT_TEMPLATE = """Generate {item_count} sentence correction items for a writing activity.

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
- Each item needs: context (scenario), incorrect_sentence, correct_sentence, error_type (word_order|grammar|spelling|mixed), difficulty.
- Include a mix of error types.
- Sentences should relate to the module topics.
- Match complexity to {cefr_level} level.

Return your response as a JSON object with an "items" array."""


WRITING_SC_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "context": {
                        "type": "string",
                        "description": "Brief writing scenario/context.",
                    },
                    "incorrect_sentence": {
                        "type": "string",
                        "description": "The intentionally incorrect sentence.",
                    },
                    "correct_sentence": {
                        "type": "string",
                        "description": "The correct version.",
                    },
                    "error_type": {
                        "type": "string",
                        "enum": ["word_order", "grammar", "spelling", "mixed"],
                    },
                    "difficulty": {
                        "type": "string",
                    },
                },
                "required": ["context", "incorrect_sentence", "correct_sentence", "error_type", "difficulty"],
            },
        },
    },
    "required": ["items"],
}


# ============================================================
# Writing Free Response Prompts
# ============================================================

WRITING_FR_SYSTEM_PROMPT = """You are an expert ESL/EFL writing activity designer. Generate open-ended writing prompts that encourage creative, descriptive, or analytical writing.

## Design Principles:
- Prompts should be engaging and relevant to the module content.
- Each prompt includes context and word count guidance.
- Prompt types: opinion, descriptive, analytical, creative, narrative.
- Include rubric hints to help teachers grade responses.
- No single correct answer — this is open-ended writing.

## Output:
Return ONLY valid JSON. No text outside the JSON object."""


WRITING_FR_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy (A1-A2):
- Simple prompts requiring 15-40 words.
- Describe, list, or give simple opinions.
- Example: "Describe your favorite food. What does it taste like?" (15-40 words)""",

    "medium": """## Medium (A2-B1):
- Moderate prompts requiring 30-80 words.
- Compare, explain, or give opinions with reasons.
- Example: "Compare two seasons. Which do you prefer and why?" (30-80 words)""",

    "hard": """## Hard (B1-B2):
- Complex prompts requiring 60-150 words.
- Analyze, argue, or write creative narratives.
- Example: "Write about a time you learned something important. What happened and how did it change you?" (60-150 words)""",
}

_WRITING_FR_WORD_RANGES = {
    "easy": (15, 40),
    "medium": (30, 80),
    "hard": (60, 150),
}


WRITING_FR_USER_PROMPT_TEMPLATE = """Generate {item_count} open-ended writing prompts.

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
- Each item needs: prompt (the question/task), context (background info), min_words, max_words, difficulty, rubric_hints (3-5 criteria for grading).
- Prompts should relate to the module topics.
- Use word count range: {min_words}-{max_words} words.
- Mix prompt types (opinion, descriptive, analytical, creative).

Return your response as a JSON object with an "items" array."""


WRITING_FR_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "The writing prompt/question.",
                    },
                    "context": {
                        "type": "string",
                        "description": "Background context for the prompt.",
                    },
                    "min_words": {
                        "type": "integer",
                        "description": "Minimum word count.",
                    },
                    "max_words": {
                        "type": "integer",
                        "description": "Maximum word count.",
                    },
                    "difficulty": {
                        "type": "string",
                    },
                    "rubric_hints": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "3-5 criteria for teacher grading.",
                    },
                },
                "required": ["prompt", "context", "min_words", "max_words", "difficulty", "rubric_hints"],
            },
        },
    },
    "required": ["items"],
}


def build_writing_sentence_corrector_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a writing sentence corrector prompt."""
    difficulty_guidelines = WRITING_SC_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), WRITING_SC_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return WRITING_SC_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
    )


def build_writing_free_response_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a writing free response prompt."""
    difficulty_guidelines = WRITING_FR_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), WRITING_FR_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"
    min_words, max_words = _WRITING_FR_WORD_RANGES.get(difficulty.lower(), (30, 80))

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return WRITING_FR_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
        min_words=min_words,
        max_words=max_words,
    )


def build_writing_fill_blank_prompt(
    item_count: int,
    difficulty: str,
    language: str,
    topics: list[str],
    module_title: str,
    cefr_level: str,
    context_text: str | None = None,
) -> str:
    """Build a writing fill-blank prompt."""
    difficulty_guidelines = WRITING_FB_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), WRITING_FB_DIFFICULTY_GUIDELINES["medium"]
    )
    topics_str = ", ".join(topics) if topics else "General"

    context_excerpt = ""
    if context_text:
        context_excerpt = context_text[:1500]
        if len(context_text) > 1500:
            context_excerpt += "..."
    else:
        context_excerpt = "(Generate based on topics)"

    return WRITING_FB_USER_PROMPT_TEMPLATE.format(
        item_count=item_count,
        difficulty_guidelines=difficulty_guidelines,
        module_title=module_title,
        topics=topics_str,
        language=language,
        cefr_level=cefr_level,
        context_excerpt=context_excerpt,
    )
