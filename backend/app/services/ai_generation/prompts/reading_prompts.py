"""
Reading Comprehension Prompt Templates.

Contains system prompts, user prompt templates, and JSON schemas
for generating reading comprehension questions from passages.

Story 27.10: Reading Comprehension Generation
"""

from typing import Any


# System prompt for reading comprehension generation (passage + questions)
READING_SYSTEM_PROMPT = """You are an expert educational content creator specializing in creating engaging reading passages and comprehension questions for language learners.

Your task is to:
1. FIRST: Create an original, engaging reading passage based on the provided topics and context
2. THEN: Generate comprehension questions about YOUR passage

The passage should be appropriate for the specified difficulty level and cover the given topics naturally.

## Question Types:

### MCQ (Multiple Choice Questions):
- Create 4 answer options (A, B, C, D)
- Only one option should be clearly correct
- Distractors should be plausible but definitively wrong
- Include a passage quote that supports the correct answer

### True/False:
- Create clear, unambiguous statements about the passage
- The answer must be definitively true or false based on the passage
- Avoid partially true statements or opinion-based claims
- Include the passage quote that proves true/false

### Short Answer:
- Ask questions with brief, specific answers (1-5 words typically)
- The expected answer should be found in or derived from the passage
- Avoid questions with multiple valid phrasings unless all are accepted
- Include the passage quote where the answer can be found

## Bloom's Taxonomy Alignment:

### Easy (Literal Comprehension):
- Focus on explicit information stated directly in the passage
- "Find in text" answers
- Who, what, when, where questions
- Vocabulary in context

### Medium (Inferential Comprehension):
- Require understanding relationships between ideas
- Draw conclusions from evidence
- Understand cause and effect
- Identify main ideas and supporting details

### Hard (Evaluative/Critical):
- Require synthesis of multiple parts of the passage
- Analyze author's purpose or perspective
- Evaluate arguments or evidence
- Make connections and generalizations

## Output Requirements:
- Return ONLY valid JSON matching the specified schema
- All passage_reference quotes must be EXACT text from the passage
- Explanations should help reinforce learning
- Questions should be clear, unambiguous, and grammatically correct
- Do not include any text outside the JSON object"""


# Difficulty-specific guidelines
READING_DIFFICULTY_GUIDELINES = {
    "easy": """## Easy Difficulty Guidelines (Literal Comprehension):
- Questions should have answers directly stated in the passage
- Focus on explicit facts and vocabulary
- MCQ distractors should be clearly distinguishable
- True/False statements should be obviously true or false from the text
- Short answers should be single words or simple phrases from the passage""",
    "medium": """## Medium Difficulty Guidelines (Inferential Comprehension):
- Questions require some inference or connection-making
- Test understanding of relationships and main ideas
- MCQ distractors should be plausible, requiring careful reading
- True/False may require combining information from different parts
- Short answers may require paraphrasing or summarizing""",
    "hard": """## Hard Difficulty Guidelines (Evaluative/Critical):
- Questions require synthesis and analysis
- Test deeper understanding and critical thinking
- MCQ distractors should be very plausible, requiring careful analysis
- True/False may test subtle distinctions or author's intent
- Short answers may require evaluation or interpretation""",
}


# User prompt template for passage + questions generation
READING_USER_PROMPT_TEMPLATE = """Create a reading comprehension exercise with an original passage and questions.

{difficulty_guidelines}

## Module Context (use as thematic inspiration, do NOT copy):
{summaries}

## Vocabulary Pool (pick 8-10 words for this passage):
{vocabulary}

## Grammar Structures (demonstrate through usage, NEVER name them):
{grammar_section}

## Requirements:
- **Language:** {language}
- **Passage Length:** approximately {passage_length} words
- **Total questions:** {question_count}
- **Question types:** {question_types}
- **Difficulty level:** {difficulty}

## Step 1: Create the Passage
{variation_instruction}Write an engaging, original passage. Follow these rules strictly:
- Is about {passage_length} words long
- Use the module context above as **thematic inspiration** — draw on the themes and situations described, but create a completely NEW story with original characters and settings
- Pick only **8-10 words** from the vocabulary pool and weave them naturally into the story
- Do NOT try to use every vocabulary word — fewer words used well is better than many words forced in
- **DEMONSTRATE** grammar structures through natural sentences — NEVER mention grammar rule names (e.g. write "I'm meeting her tomorrow" instead of "She uses Present Continuous for future arrangements")
- Invent **original characters, settings, and situations** — be creative
- Is appropriate for {difficulty} difficulty ({language} learners)
- Reads like a real text, not a vocabulary exercise

## Step 2: Generate Questions
Create {question_count} comprehension questions about YOUR passage.

## Distribution:
{type_distribution}

## Critical Requirements:
1. The passage must read naturally — NOT like a vocabulary list disguised as a story
2. Every question must include a "passage_reference" - an EXACT quote from YOUR passage
3. MCQ questions must have exactly 4 options with one correct answer
4. True/False questions must have exactly 2 options: ["True", "False"]
5. Short answer questions should have brief expected answers (1-5 words)
6. All questions must be answerable from the passage you create

Return your response as a JSON object with "passage" and "questions" fields."""


# JSON Schema for structured output (passage + questions)
READING_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "passage": {
            "type": "string",
            "description": "The original reading passage created by the LLM",
        },
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question_type": {
                        "type": "string",
                        "enum": ["mcq", "true_false", "short_answer"],
                        "description": "Type of question",
                    },
                    "question": {
                        "type": "string",
                        "description": "The question or statement text",
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Answer options (4 for MCQ, 2 for True/False, null for short_answer)",
                    },
                    "correct_index": {
                        "type": "integer",
                        "description": "Index of correct answer (0-3 for MCQ, 0-1 for True/False)",
                    },
                    "correct_answer": {
                        "type": "string",
                        "description": "The correct answer text",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Explanation of why the answer is correct",
                    },
                    "passage_reference": {
                        "type": "string",
                        "description": "Exact quote from passage supporting the answer",
                    },
                },
                "required": [
                    "question_type",
                    "question",
                    "correct_answer",
                    "explanation",
                    "passage_reference",
                ],
            },
        }
    },
    "required": ["passage", "questions"],
}


def build_reading_prompt(
    module_title: str,
    topics: list[str],
    context_sample: str,
    question_count: int,
    question_types: list[str],
    difficulty: str,
    language: str,
    passage_length: int = 250,
    vocabulary: list[str] | None = None,
    grammar_points: list[str] | None = None,
    passage_index: int | None = None,
    total_passages: int | None = None,
) -> str:
    """
    Build a complete reading comprehension generation prompt.

    The LLM will create an original passage based on the topics,
    module summaries, vocabulary, and grammar points,
    then generate questions about it.

    Args:
        module_title: Title of the source module(s).
        topics: List of topics from the modules.
        context_sample: Module summaries for context.
        question_count: Number of questions to generate.
        question_types: List of question types to include.
        difficulty: Difficulty level (easy, medium, hard).
        language: Language for the passage and questions.
        passage_length: Target word count for the passage.
        vocabulary: Optional list of vocabulary words to incorporate.
        grammar_points: Optional list of grammar structures to incorporate.
        passage_index: Which passage this is (1-based) in a multi-passage set.
        total_passages: Total passages being generated in this set.

    Returns:
        Formatted user prompt string.
    """
    difficulty_guidelines = READING_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), READING_DIFFICULTY_GUIDELINES["medium"]
    )

    # Calculate distribution
    type_count = len(question_types)
    base_per_type = question_count // type_count
    remainder = question_count % type_count

    distribution_parts = []
    for i, qtype in enumerate(question_types):
        count = base_per_type + (1 if i < remainder else 0)
        distribution_parts.append(f"- {qtype}: {count} question(s)")

    type_distribution = "\n".join(distribution_parts)

    # Format topics for display
    topics_str = ", ".join(topics) if topics else "general topics from the module"

    # Format vocabulary for display
    vocab_str = ", ".join(vocabulary[:30]) if vocabulary else "use topic-appropriate vocabulary"

    # Format grammar points section
    if grammar_points:
        grammar_section = ", ".join(grammar_points)
    else:
        grammar_section = "(use grammar appropriate for the difficulty level)"

    # Build variation instruction for multi-passage generation
    PASSAGE_FORMATS = [
        "a personal email or letter to a friend",
        "a short newspaper or magazine article",
        "a diary or journal entry",
        "a dialogue or conversation between two people",
        "an informational text or encyclopedia entry",
        "a travel blog post",
        "a school essay or report",
        "an interview transcript",
        "an advertisement or brochure",
        "a story about an everyday situation",
    ]

    if total_passages and total_passages > 1 and passage_index:
        fmt = PASSAGE_FORMATS[(passage_index - 1) % len(PASSAGE_FORMATS)]
        variation_instruction = (
            f"**IMPORTANT: This is passage {passage_index} of {total_passages}.**\n"
            f"- Write this passage as: **{fmt}**\n"
            f"- Do NOT use the same characters, setting, or storyline as other passages\n"
            f"- Pick a DIFFERENT subset of vocabulary words from the list\n\n"
        )
    else:
        variation_instruction = ""

    # Format summaries
    if context_sample and context_sample.strip() and context_sample != "(Use topics and vocabulary as guidance)":
        summaries_str = context_sample
    else:
        summaries_str = "(No module summaries available — use vocabulary and grammar as guidance)"

    return READING_USER_PROMPT_TEMPLATE.format(
        vocabulary=vocab_str,
        grammar_section=grammar_section,
        summaries=summaries_str,
        passage_length=passage_length,
        question_count=question_count,
        question_types=", ".join(question_types),
        difficulty=difficulty,
        difficulty_guidelines=difficulty_guidelines,
        language=language,
        type_distribution=type_distribution,
        variation_instruction=variation_instruction,
    )


def map_cefr_to_difficulty(cefr_level: str) -> str:
    """
    Map CEFR level to difficulty.

    A1, A2 -> easy
    B1 -> medium
    B2, C1, C2 -> hard

    Args:
        cefr_level: CEFR level string (e.g., "A1", "B1", "C2").

    Returns:
        Difficulty level string.
    """
    cefr_upper = cefr_level.upper().strip()

    if cefr_upper in ("A1", "A2"):
        return "easy"
    elif cefr_upper == "B1":
        return "medium"
    elif cefr_upper in ("B2", "C1", "C2"):
        return "hard"
    else:
        # Default to medium for unknown levels
        return "medium"
