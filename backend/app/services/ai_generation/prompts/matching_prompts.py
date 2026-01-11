"""
Matching Activity Prompt Templates.

Contains prompt templates for generating synonyms and antonyms
for vocabulary matching activities.
"""


# Synonym generation prompt template
SYNONYM_PROMPT_TEMPLATE = """Given the word "{word}" at CEFR level {level}:
Generate one clear synonym at the same difficulty level.

Requirements:
- Synonym should be commonly used
- Should match the CEFR level
- If the word is a {pos}, the synonym must be a {pos}
- Return ONLY the synonym word, nothing else
- If no suitable synonym exists, respond with exactly "NONE"

Word: {word}
Part of speech: {pos}
CEFR Level: {level}

Synonym:"""


# Antonym generation prompt template
ANTONYM_PROMPT_TEMPLATE = """Given the word "{word}" at CEFR level {level}:
Generate one clear antonym at the same difficulty level.

Requirements:
- Antonym should be a direct opposite
- Should match the CEFR level
- If the word is a {pos}, the antonym must be a {pos}
- Return ONLY the antonym word, nothing else
- If no clear antonym exists, respond with exactly "NONE"

Word: {word}
Part of speech: {pos}
CEFR Level: {level}

Antonym:"""


def build_synonym_prompt(
    word: str,
    part_of_speech: str,
    level: str,
) -> str:
    """
    Build a prompt for generating a synonym.

    Args:
        word: The vocabulary word.
        part_of_speech: Grammatical category (noun, verb, etc.).
        level: CEFR difficulty level (A1, A2, B1, B2, C1, C2).

    Returns:
        Formatted prompt string.
    """
    return SYNONYM_PROMPT_TEMPLATE.format(
        word=word,
        pos=part_of_speech,
        level=level,
    )


def build_antonym_prompt(
    word: str,
    part_of_speech: str,
    level: str,
) -> str:
    """
    Build a prompt for generating an antonym.

    Args:
        word: The vocabulary word.
        part_of_speech: Grammatical category (noun, verb, etc.).
        level: CEFR difficulty level (A1, A2, B1, B2, C1, C2).

    Returns:
        Formatted prompt string.
    """
    return ANTONYM_PROMPT_TEMPLATE.format(
        word=word,
        pos=part_of_speech,
        level=level,
    )
