"""
MCQ Generation Prompt Templates.

Contains system prompts, user prompt templates, and JSON schemas
for generating multiple-choice questions from educational content.

Updated for CLIL (Content and Language Integrated Learning) approach:
- Questions focus on topics and subject matter, not text comprehension
- Supports varied question types: standard MCQ, fill-in-blank, paragraph-based
- Uses vocabulary context for appropriate language level
"""

from typing import Any

# System prompt for topic-based MCQ generation
MCQ_SYSTEM_PROMPT = """You are an expert CLIL (Content and Language Integrated Learning) educator specializing in creating engaging, educational multiple-choice questions for language learners.

Your task is to generate MCQ questions about the given TOPICS - NOT comprehension questions about a text. The questions should teach and assess knowledge about the subject matter itself.

## CRITICAL: Topic-Based Questions (NOT Text Comprehension)
- DO NOT create questions like "According to the text..." or "What does the passage say..."
- DO create questions that test KNOWLEDGE about the topics themselves
- Questions should be educational - students learn facts while practicing the language

## Example - If topic is "Colors":
WRONG: "According to the text, what color is mentioned first?" (text comprehension)
RIGHT: "What color do you get when you mix red and yellow?" (topic knowledge)
RIGHT: "Which of these is a primary color?" (topic knowledge)
RIGHT: "A ripe banana is usually _______." (fill-in-blank about topic)

## Question Type Variety:
Create a MIX of question types:
1. **Standard MCQ** - Direct questions about the topic
2. **Fill-in-the-blank** - Sentences with _______ for the correct word
3. **Scenario-based** - Apply knowledge to real situations
4. **Definition match** - "Which word means...?"

## Question Quality Guidelines:
1. Questions should teach something about the topic
2. Each question should have exactly 4 options
3. Only one option should be correct
4. All options should be plausible and similar in length/style
5. Avoid negative phrasing (e.g., "Which is NOT...")
6. Never use "all of the above" or "none of the above"
7. Questions should be clear, unambiguous, and grammatically correct
8. Use vocabulary appropriate to the specified CEFR level

## Distractor Guidelines:
- Distractors must be plausible but clearly incorrect
- Distractors should relate to the topic
- Avoid making correct answers obviously longer or more detailed
- Distractors should be similar in length and grammatical structure

## Output Format:
- Return ONLY valid JSON matching the specified schema
- Do not include any text outside the JSON object
- Ensure all strings are properly escaped"""


# Difficulty-specific guidelines for topic-based questions
DIFFICULTY_GUIDELINES = {
    "easy": """## Easy Difficulty (A1-A2) Guidelines:
- Focus on basic facts and simple concepts
- Use simple, clear language with common vocabulary
- Questions should have obviously wrong distractors
- Test recognition and basic recall of topic knowledge
- Fill-in-blank sentences should be short and straightforward
- Example: "The sky during daytime is usually _______." (blue/red/green/black)""",

    "medium": """## Medium Difficulty (A2-B1) Guidelines:
- Test understanding of concepts and relationships
- Include some application of knowledge
- Distractors should be plausible but distinguishable
- Use vocabulary appropriate to intermediate learners
- Questions may involve making simple connections
- Example: "If you mix blue and yellow paint, what color will you get?" """,

    "hard": """## Hard Difficulty (B1-B2) Guidelines:
- Require deeper understanding and application
- Include inference and analysis questions
- Distractors should be very plausible, requiring careful thought
- Use more sophisticated vocabulary and sentence structures
- Questions may involve comparing concepts or explaining why
- Example: "Which statement best explains why the sky appears blue during the day?" """,
}


# Topic-based user prompt template
MCQ_USER_PROMPT_TEMPLATE = """Generate {question_count} educational multiple-choice questions about the following TOPICS.

{difficulty_guidelines}

## Topics to Cover:
{topics}

## Key Vocabulary (use these words where appropriate):
{vocabulary}

## Context from Module:
Title: {module_title}
Subject areas covered: {topics}
CEFR Level: {cefr_level}

{context_note}

## Requirements:
- Language: {language}
- Number of questions: {question_count}
- Difficulty level: {difficulty}
- CEFR Level: {cefr_level}
- Include explanations: {include_explanations}

## Important Instructions:
1. Create questions about the TOPICS listed above (e.g., if topic is "Education", ask about schools, teachers, learning)
2. DO NOT create text comprehension questions
3. Mix question types: some standard MCQ, some fill-in-the-blank with _______, some scenario-based
4. Use the vocabulary words naturally in questions and options
5. Make questions educational - students should learn facts while answering
6. Match language complexity to the CEFR level

Return your response as a JSON object with a "questions" array."""


# Legacy template for backwards compatibility (text-based)
MCQ_USER_PROMPT_TEMPLATE_LEGACY = """Generate {question_count} multiple-choice questions based on the following educational content.

{difficulty_guidelines}

## Source Content:
{source_text}

## Requirements:
- Language: {language}
- Number of questions: {question_count}
- Difficulty level: {difficulty}
- Include explanations: {include_explanations}

Generate questions that comprehensively cover the key concepts, vocabulary, and information in the source content. Distribute questions evenly across the content where possible.

Return your response as a JSON object with a "questions" array."""


# JSON Schema for structured output
MCQ_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question text",
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
                        "description": "Explanation for the correct answer",
                    },
                },
                "required": ["question", "options", "correct_index", "explanation"],
            },
        }
    },
    "required": ["questions"],
}


def build_mcq_prompt(
    question_count: int,
    difficulty: str,
    language: str,
    include_explanations: bool = True,
    # New topic-based parameters
    topics: list[str] | None = None,
    vocabulary: list[str] | None = None,
    module_title: str | None = None,
    cefr_level: str | None = None,
    context_text: str | None = None,
    # Legacy parameter for backwards compatibility
    source_text: str | None = None,
) -> str:
    """
    Build a complete MCQ generation prompt.

    For topic-based generation (recommended):
        - Provide topics, vocabulary, module_title, cefr_level
        - context_text is optional additional context

    For legacy text-comprehension generation:
        - Provide source_text only

    Args:
        question_count: Number of questions to generate.
        difficulty: Difficulty level (easy, medium, hard).
        language: Language for the questions.
        include_explanations: Whether to request explanations.
        topics: List of topic keywords/phrases to base questions on.
        vocabulary: List of vocabulary words to use in questions.
        module_title: Title of the module for context.
        cefr_level: CEFR difficulty level (A1, A2, B1, etc.).
        context_text: Optional context from module text.
        source_text: Legacy parameter - full text for comprehension questions.

    Returns:
        Formatted user prompt string.
    """
    difficulty_guidelines = DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), DIFFICULTY_GUIDELINES["medium"]
    )

    # Use topic-based template if topics are provided
    if topics:
        # Format topics as bullet list
        topics_str = "\n".join(f"- {topic}" for topic in topics)

        # Format vocabulary
        if vocabulary:
            vocab_str = ", ".join(vocabulary[:30])  # Limit to 30 words
            if len(vocabulary) > 30:
                vocab_str += f" (and {len(vocabulary) - 30} more)"
        else:
            vocab_str = "(Use vocabulary appropriate to the CEFR level)"

        # Context note
        if context_text:
            # Include a summary of context, not the full text
            context_note = f"""## Additional Context (for understanding the module scope):
The module covers content related to the topics above. Use this context to understand
what aspects of the topics are relevant, but DO NOT create text-comprehension questions.

Brief context excerpt:
{context_text[:1000]}{"..." if len(context_text) > 1000 else ""}"""
        else:
            context_note = ""

        return MCQ_USER_PROMPT_TEMPLATE.format(
            question_count=question_count,
            difficulty=difficulty,
            difficulty_guidelines=difficulty_guidelines,
            language=language,
            include_explanations="yes" if include_explanations else "no",
            topics=topics_str,
            vocabulary=vocab_str,
            module_title=module_title or "Educational Module",
            cefr_level=cefr_level or difficulty.upper(),
            context_note=context_note,
        )

    # Fallback to legacy text-based template
    if source_text:
        return MCQ_USER_PROMPT_TEMPLATE_LEGACY.format(
            source_text=source_text,
            question_count=question_count,
            difficulty=difficulty,
            difficulty_guidelines=difficulty_guidelines,
            language=language,
            include_explanations="yes" if include_explanations else "no",
        )

    # If neither topics nor source_text provided, raise error
    raise ValueError("Either 'topics' or 'source_text' must be provided")
