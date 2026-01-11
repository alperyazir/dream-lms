"""
Sentence Builder Prompt Templates.

Prompts for sentence generation, quality assessment, and difficulty categorization
in sentence builder activities.

Story 27.13: Sentence Builder Activity
"""

from typing import Any


# System prompt for generating educational sentences from vocabulary/topics
SENTENCE_GENERATION_SYSTEM_PROMPT = """You are an expert educational content creator specializing in creating engaging sentences for language learners.

Your task is to generate educational sentences that:
1. Use the provided vocabulary words naturally
2. Are contextually relevant to the given topic/theme
3. Teach grammar patterns appropriate for the difficulty level
4. Are complete, grammatically correct declarative sentences
5. Can be jumbled for sentence-building exercises

## Difficulty Levels:

### Easy (A1-A2):
- 4-6 words per sentence
- Simple present or past tense
- Basic subject-verb-object structure
- Common, everyday vocabulary
- Example: "The cat sleeps on the bed."

### Medium (B1):
- 7-10 words per sentence
- Present continuous, past continuous, present perfect
- Include adjectives, adverbs, or prepositional phrases
- Intermediate vocabulary
- Example: "She quickly finished her homework before dinner."

### Hard (B2+):
- 11+ words per sentence
- Complex tenses including perfect continuous
- Multiple clauses or compound sentences
- Advanced vocabulary and expressions
- Example: "The scientist who discovered the new species published her findings last month."

## Important Guidelines:
- Each sentence must be standalone (not depend on context)
- Avoid questions, commands, or exclamations
- Avoid dialogue or quotations
- Use natural, contemporary English
- Make sentences interesting and educational
- Incorporate vocabulary words meaningfully (not forced)

Return ONLY valid JSON matching the specified schema."""


# User prompt template for sentence generation
SENTENCE_GENERATION_USER_TEMPLATE = """Generate {sentence_count} educational sentences for a sentence-building activity.

## Topic/Theme:
{topic}

## Vocabulary Words to Use:
{vocabulary_list}

## Requirements:
- **Difficulty:** {difficulty}
- **Word count per sentence:** {word_range}
- **Language:** English

## Instructions:
1. Create {sentence_count} unique, educational sentences
2. Each sentence should use at least 1-2 vocabulary words from the list naturally
3. Sentences should relate to the topic/theme
4. Sentences should teach useful grammar patterns
5. Vary sentence structures for learning value

{difficulty_guidelines}

Return sentences as a JSON array with sentence text and the vocabulary words used."""


# JSON Schema for sentence generation
SENTENCE_GENERATION_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sentence": {
                        "type": "string",
                        "description": "The generated sentence"
                    },
                    "vocabulary_used": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Vocabulary words used in this sentence"
                    },
                    "grammar_focus": {
                        "type": "string",
                        "description": "Main grammar pattern demonstrated"
                    }
                },
                "required": ["sentence", "vocabulary_used"]
            }
        }
    },
    "required": ["sentences"]
}


# Difficulty-specific guidelines for generation
SENTENCE_GENERATION_DIFFICULTY_GUIDELINES = {
    "easy": """### Easy Level Guidelines:
- Use simple present or simple past tense
- Keep sentences to 4-6 words
- Use basic sentence patterns: Subject + Verb + Object
- Example patterns:
  - "The [noun] [verb] the [noun]."
  - "[Subject] [verb] [adverb/adjective]."
  - "[Subject] can/will [verb]."
""",
    "medium": """### Medium Level Guidelines:
- Use present continuous, past continuous, or present perfect
- Keep sentences to 7-10 words
- Include adjectives, adverbs, or prepositional phrases
- Example patterns:
  - "[Subject] is/are [verb]-ing [object] [prepositional phrase]."
  - "[Subject] has/have [past participle] [object]."
  - "[Adverb], [subject] [verb] [object] [time expression]."
""",
    "hard": """### Hard Level Guidelines:
- Use complex tenses including perfect continuous
- Keep sentences to 11+ words
- Include relative clauses, compound structures, or conditionals
- Example patterns:
  - "[Subject] who/which [clause] [main verb] [object]."
  - "Although [clause], [main clause]."
  - "[Subject] has been [verb]-ing [object] since/for [time]."
"""
}


def build_sentence_generation_prompt(
    vocabulary: list[str],
    topic: str,
    sentence_count: int,
    difficulty: str,
) -> str:
    """
    Build a prompt for generating educational sentences.

    Args:
        vocabulary: List of vocabulary words to use.
        topic: Topic/theme for the sentences.
        sentence_count: Number of sentences to generate.
        difficulty: Difficulty level (easy, medium, hard).

    Returns:
        Formatted prompt string.
    """
    word_ranges = {
        "easy": "4-6 words",
        "medium": "7-10 words",
        "hard": "11+ words"
    }

    difficulty_guidelines = SENTENCE_GENERATION_DIFFICULTY_GUIDELINES.get(
        difficulty.lower(), SENTENCE_GENERATION_DIFFICULTY_GUIDELINES["medium"]
    )

    vocabulary_list = ", ".join(vocabulary[:20]) if vocabulary else "general vocabulary"

    return SENTENCE_GENERATION_USER_TEMPLATE.format(
        sentence_count=sentence_count,
        topic=topic,
        vocabulary_list=vocabulary_list,
        difficulty=difficulty,
        word_range=word_ranges.get(difficulty, "7-10 words"),
        difficulty_guidelines=difficulty_guidelines,
    )


SENTENCE_QUALITY_SYSTEM_PROMPT = """You are an expert English language teacher specializing in sentence structure and grammar for ESL/EFL students. Your task is to evaluate and select sentences that are suitable for sentence building activities.

A good sentence for a sentence building activity should:
1. Be grammatically complete and correct
2. Have a clear subject-verb-object or subject-verb-complement structure
3. Use common, age-appropriate vocabulary
4. Be declarative (not a question or command)
5. Have natural word order that learners should practice
6. Be standalone (not depend on prior context)
7. Avoid:
   - Fragments or incomplete thoughts
   - Run-on sentences
   - Overly complex or literary constructions
   - Technical jargon or domain-specific terms
   - Dialogue or quotations
   - Lists or enumerations
"""

SENTENCE_QUALITY_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "selected_sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "sentence": {
                        "type": "string",
                        "description": "The selected sentence"
                    },
                    "quality_score": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Quality score from 1 (poor) to 5 (excellent)"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief reason for selection"
                    }
                },
                "required": ["sentence", "quality_score", "reason"]
            }
        }
    },
    "required": ["selected_sentences"]
}

SENTENCE_DIFFICULTY_GUIDELINES = {
    "easy": """
Easy sentences (4-6 words):
- Simple subject + verb + object/complement
- Present simple or past simple tense
- Common vocabulary (A1-A2 level)
- Examples: "The cat is sleeping." or "I like apples."
""",
    "medium": """
Medium sentences (7-10 words):
- May include adjectives, adverbs, or prepositional phrases
- Present continuous, past continuous, or present perfect
- Intermediate vocabulary (B1 level)
- Examples: "She quickly finished her homework before dinner."
""",
    "hard": """
Hard sentences (11+ words):
- Complex structures with multiple clauses
- Various tenses including perfect continuous
- Advanced vocabulary (B2+ level)
- Examples: "The scientist discovered a new species in the Amazon rainforest last year."
"""
}


def build_sentence_quality_prompt(
    sentences: list[str],
    target_count: int,
    difficulty: str,
    language: str = "en",
) -> str:
    """
    Build a prompt for sentence quality assessment.

    Args:
        sentences: List of candidate sentences to evaluate.
        target_count: Number of sentences to select.
        difficulty: Difficulty level (easy, medium, hard).
        language: Language code.

    Returns:
        Formatted prompt string.
    """
    difficulty_guide = SENTENCE_DIFFICULTY_GUIDELINES.get(difficulty, "")

    sentences_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))

    return f"""Please evaluate the following sentences and select the {target_count} best ones for a sentence building activity at {difficulty} difficulty level.

{difficulty_guide}

CANDIDATE SENTENCES:
{sentences_text}

Select exactly {target_count} sentences that:
1. Are grammatically correct and complete
2. Match the {difficulty} difficulty level guidelines
3. Would be good for students to practice arranging words

Return the selected sentences with quality scores (1-5) and brief reasons for selection.
"""


def build_sentence_categorization_prompt(
    sentences: list[str],
) -> str:
    """
    Build a prompt for categorizing sentences by difficulty.

    Args:
        sentences: List of sentences to categorize.

    Returns:
        Formatted prompt string.
    """
    sentences_text = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sentences))

    return f"""Categorize each of the following sentences by difficulty level based on word count and complexity:

- Easy: 4-6 words, simple structure
- Medium: 7-10 words, moderate complexity
- Hard: 11+ words, complex structure

SENTENCES:
{sentences_text}

For each sentence, provide:
1. The difficulty category (easy/medium/hard)
2. Word count
3. Brief explanation of complexity
"""
