"""Grammar-Focused MCQ Generation Prompt Templates (Epic 30 - Story 30.3).

Forked from mcq_prompts.py to create grammar-specific quiz prompts.
Questions focus on grammar rules, tense usage, sentence structure,
and common grammar mistakes — NOT general CLIL topic knowledge.
"""

from typing import Any


GRAMMAR_SYSTEM_PROMPT = """You are an expert English grammar teacher specializing in creating targeted grammar assessment questions for language learners.

Your task is to generate multiple-choice questions that TEST GRAMMAR KNOWLEDGE — specifically grammar rules, tense usage, sentence structure, and common errors.

## CRITICAL: Grammar-Focused Questions Only
- Every question MUST test a specific grammar concept (tense, articles, prepositions, word order, etc.)
- DO NOT create general knowledge or topic-based questions
- Questions should identify common grammar mistakes students make

## Question Types (use a MIX):
1. **Error correction** — "Which sentence is grammatically correct?"
2. **Fill-in-the-blank** — "She _______ to school every day." (goes/go/going/went)
3. **Tense identification** — "Which tense is used in: 'I have been waiting'?"
4. **Transformation** — "Choose the correct passive form of..."
5. **Word order** — "Which is the correct order?"

## Grammar Topics to Cover:
- Verb tenses (present simple, past simple, present perfect, etc.)
- Articles (a/an/the/zero article)
- Prepositions
- Subject-verb agreement
- Conditionals
- Comparatives/superlatives
- Modal verbs
- Relative clauses
- Reported speech

## Question Quality Guidelines:
1. Each question should test ONE specific grammar point
2. Include 4 options: 1 correct + 3 plausible grammar errors
3. Distractors should reflect COMMON mistakes learners make
4. Avoid ambiguous questions with multiple correct answers
5. Use vocabulary appropriate to the specified CEFR level
6. Include a brief grammar rule explanation in the explanation field
7. Tag each question with the grammar_topic being tested

## Output Format:
- Return ONLY valid JSON matching the specified schema
- Do not include any text outside the JSON object
- Ensure all strings are properly escaped"""


GRAMMAR_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy Difficulty (A1-A2) Guidelines:
- Focus on: present simple, past simple, basic articles, basic prepositions
- Sentences should be short (5-8 words)
- Distractors should test common beginner errors
- Example: "She _______ to school every day." (goes/go/going/went)""",

    "medium": """## Medium Difficulty (A2-B1) Guidelines:
- Focus on: present perfect, past continuous, comparatives, conditionals (type 1)
- Include more complex sentence structures
- Distractors require understanding of tense differences
- Example: "I _______ in London for five years." (have lived/lived/am living/was living)""",

    "hard": """## Hard Difficulty (B1-B2) Guidelines:
- Focus on: past perfect, conditionals (type 2/3), passive voice, reported speech
- Include complex or compound sentences
- Distractors should be very close to correct, testing nuanced understanding
- Example: "If I _______ about the meeting, I would have attended." (had known/knew/have known/would know)""",
}


GRAMMAR_USER_PROMPT_TEMPLATE = """Generate {question_count} grammar-focused multiple-choice questions.

{difficulty_guidelines}

## Source Context (for vocabulary and topic relevance):
Title: {module_title}
Topics: {topics}
CEFR Level: {cefr_level}

## Key Vocabulary (use in example sentences):
{vocabulary}

## Requirements:
- Language: {language}
- Number of questions: {question_count}
- Difficulty level: {difficulty}
- CEFR Level: {cefr_level}

## Important Instructions:
1. Every question MUST test a specific grammar point
2. Tag each question with a "grammar_topic" (e.g., "present_simple", "articles", "conditionals")
3. Use the vocabulary words in question sentences for context relevance
4. Explanations should state the grammar rule being tested
5. Mix question types: fill-in-blank, error correction, tense choice

Return your response as a JSON object with a "questions" array."""


# JSON Schema for grammar quiz output — includes grammar_topic field
GRAMMAR_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The grammar question text",
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 4,
                        "maxItems": 4,
                        "description": "Exactly 4 answer options",
                    },
                    "correct_index": {
                        "type": "integer",
                        "minimum": 0,
                        "maximum": 3,
                        "description": "Index of the correct answer (0-3)",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Grammar rule explanation",
                    },
                    "grammar_topic": {
                        "type": "string",
                        "description": "Grammar topic being tested (e.g., present_simple, articles)",
                    },
                },
                "required": ["question", "options", "correct_index", "explanation", "grammar_topic"],
            },
        }
    },
    "required": ["questions"],
}


def build_grammar_prompt(
    question_count: int,
    difficulty: str,
    language: str,
    topics: list[str] | None = None,
    vocabulary: list[str] | None = None,
    module_title: str | None = None,
    cefr_level: str | None = None,
) -> str:
    """Build a grammar-focused MCQ generation prompt.

    Args:
        question_count: Number of questions to generate.
        difficulty: Difficulty level (easy, medium, hard).
        language: Language for the questions.
        topics: Topic keywords for contextual sentences.
        vocabulary: Vocabulary words to use in sentences.
        module_title: Title of the source module.
        cefr_level: CEFR difficulty level.

    Returns:
        Formatted user prompt string.
    """
    difficulty_guidelines = GRAMMAR_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), GRAMMAR_DIFFICULTY_GUIDELINES["medium"]
    )

    topics_str = "\n".join(f"- {t}" for t in (topics or ["General"]))

    if vocabulary:
        vocab_str = ", ".join(vocabulary[:30])
        if len(vocabulary) > 30:
            vocab_str += f" (and {len(vocabulary) - 30} more)"
    else:
        vocab_str = "(Use vocabulary appropriate to the CEFR level)"

    return GRAMMAR_USER_PROMPT_TEMPLATE.format(
        question_count=question_count,
        difficulty=difficulty,
        difficulty_guidelines=difficulty_guidelines,
        language=language,
        topics=topics_str,
        vocabulary=vocab_str,
        module_title=module_title or "Grammar Practice",
        cefr_level=cefr_level or difficulty.upper(),
    )
