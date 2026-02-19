"""
Context Helpers for AI Generation Services.

Provides metadata-only context fetching for all AI generation services.
Uses a single get_modules_metadata() call + vocabulary fetches instead
of fetching full module text, reducing bandwidth and token usage.
"""

import logging
from dataclasses import dataclass, field

from app.services.dcs_ai import DCSAIServiceClient

logger = logging.getLogger(__name__)


@dataclass
class MetadataContext:
    """Metadata-only context for topic-based generation."""

    topics: list[str]
    vocabulary_words: list[str]
    module_titles: list[str]
    module_summaries: list[str]
    grammar_points: list[str]
    difficulty_level: str
    language: str
    primary_module_title: str


async def get_metadata_context(
    dcs_client: DCSAIServiceClient,
    book_id: int,
    module_ids: list[int],
    language: str | None = None,
) -> MetadataContext:
    """
    Fetch metadata-only context for all AI generation services.

    Uses a single get_modules_metadata() call + vocabulary fetches.
    No full text is fetched, saving bandwidth and tokens.

    Args:
        dcs_client: DCS AI service client.
        book_id: The book ID.
        module_ids: List of module IDs to get context for.
        language: Override language (uses metadata if None).

    Returns:
        MetadataContext with topics, vocabulary, summaries, grammar points.

    Raises:
        ValueError: If no modules found for the given IDs.
    """
    modules_metadata = await dcs_client.get_modules_metadata(book_id)
    if modules_metadata is None:
        raise ValueError(f"Book {book_id} AI data not found")

    requested_modules = [
        m for m in modules_metadata.modules
        if m.module_id in module_ids
    ]

    if not requested_modules:
        raise ValueError(
            f"None of the requested modules {module_ids} found in book {book_id}"
        )

    # Extract topics, summaries, grammar points from all selected modules
    all_topics: list[str] = []
    module_titles: list[str] = []
    module_summaries: list[str] = []
    all_grammar_points: list[str] = []
    difficulty_level: str | None = None

    for module in requested_modules:
        module_titles.append(module.title)
        if module.topics:
            all_topics.extend(module.topics)
        else:
            all_topics.append(module.title)
        if module.summary:
            module_summaries.append(f"{module.title}: {module.summary}")
        if difficulty_level is None:
            difficulty_level = module.difficulty_level

    # Grammar points come from ModuleDetail — fetch only for selected modules
    # (metadata endpoint may not include them)
    for module_id in module_ids:
        detail = await dcs_client.get_module_detail(book_id, module_id)
        if detail and detail.grammar_points:
            all_grammar_points.extend(detail.grammar_points)

    # Deduplicate preserving order
    all_topics = list(dict.fromkeys(all_topics))
    all_grammar_points = list(dict.fromkeys(all_grammar_points))

    # Fetch vocabulary for selected modules
    all_vocabulary: list[str] = []
    for module_id in module_ids:
        vocab_response = await dcs_client.get_vocabulary(book_id, module_id)
        if vocab_response and vocab_response.words:
            all_vocabulary.extend(w.word for w in vocab_response.words)

    # Deduplicate vocabulary preserving order
    all_vocabulary = list(dict.fromkeys(all_vocabulary))

    lang = language or modules_metadata.primary_language or "en"

    logger.info(
        f"Metadata context: book_id={book_id}, modules={len(requested_modules)}, "
        f"topics={len(all_topics)}, vocab={len(all_vocabulary)}, "
        f"summaries={len(module_summaries)}, grammar_points={len(all_grammar_points)}"
    )

    return MetadataContext(
        topics=all_topics,
        vocabulary_words=all_vocabulary,
        module_titles=module_titles,
        module_summaries=module_summaries,
        grammar_points=all_grammar_points,
        difficulty_level=difficulty_level or "A1",
        language=lang,
        primary_module_title=module_titles[0],
    )
