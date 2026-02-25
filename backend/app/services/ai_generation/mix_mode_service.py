"""
Mix Mode Generation Service.

Epic 30 - Story 30.8: Mix Mode Generation

Orchestrates multiple skill generators to create balanced multi-skill assignments.
Randomly selects from ALL available formats per skill for maximum variety.
"""

import asyncio
import logging
import random
import re
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.mix_mode import (
    ContentAnalysisResult,
    MixModeActivity,
    MixModeQuestion,
    SkillAllocation,
)
from app.services.dcs_ai import DCSAIServiceClient
from app.services.dcs_ai.exceptions import DCSAIDataNotFoundError
from app.services.dcs_ai_content_client import DCSAIContentClient
from app.services.llm import LLMManager
from app.services.tts import TTSManager

logger = logging.getLogger(__name__)

# All available formats per skill — mix mode randomly picks from these
_SKILL_FORMATS: dict[str, list[str]] = {
    "vocabulary": ["multiple_choice", "word_builder", "matching"],
    "grammar": ["multiple_choice", "fill_blank", "sentence_builder"],
    "reading": ["comprehension"],
    "listening": ["fill_blank", "sentence_builder", "word_builder"],
    "writing": ["fill_blank", "sentence_corrector", "free_response"],
    "speaking": ["open_response"],
}

_DIFFICULTY_TO_CEFR = {"easy": "A1", "medium": "A2", "hard": "B1"}


class MixModeError(Exception):
    def __init__(self, message: str, original_error: Exception | None = None) -> None:
        self.message = message
        self.original_error = original_error
        super().__init__(message)


class MixModeService:
    """Service for generating mix-mode multi-skill activities."""

    def __init__(
        self,
        dcs_client: DCSAIServiceClient,
        llm_manager: LLMManager,
        tts_manager: TTSManager | None = None,
        dcs_ai_content_client: DCSAIContentClient | None = None,
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        self._tts_manager = tts_manager
        self._dcs_ai_content_client = dcs_ai_content_client

    async def generate_activity(
        self,
        book_id: int,
        module_ids: list[int],
        total_count: int = 10,
        difficulty: str = "auto",
        language: str | None = None,
    ) -> MixModeActivity:
        logger.info(
            f"Generating mix mode: book_id={book_id}, modules={module_ids}, "
            f"count={total_count}, difficulty={difficulty}"
        )

        # Fetch module content for analysis
        module = await self._dcs_client.get_module_detail(book_id, module_ids[0])
        if module is None:
            raise DCSAIDataNotFoundError(
                message=f"Module {module_ids[0]} not found in book {book_id}",
                book_id=book_id,
            )

        context_text = module.text or ""
        if not context_text.strip():
            raise MixModeError(f"Module {module_ids[0]} has no text content.")

        lang = language or module.language or "en"

        if difficulty == "auto":
            cefr_level = module.difficulty or "A2"
            difficulty = self._cefr_to_difficulty(cefr_level)
        else:
            cefr_level = _DIFFICULTY_TO_CEFR.get(difficulty, "A2")

        # Step 1: Analyze content for skill weights
        analysis = self._analyze_content(context_text)

        # Step 2: Calculate distribution with random format per skill
        allocations = self._calculate_distribution(analysis, total_count)
        logger.info(
            f"Mix mode distribution: "
            f"{[(a.skill_slug, a.format_slug, a.count) for a in allocations]}"
        )

        # Step 3: Generate questions for each skill in parallel
        all_questions: list[MixModeQuestion] = []
        tasks = []

        for alloc in allocations:
            if alloc.count <= 0:
                continue
            tasks.append(
                self._generate_skill_questions(
                    skill_slug=alloc.skill_slug,
                    format_slug=alloc.format_slug,
                    book_id=book_id,
                    module_ids=module_ids,
                    count=alloc.count,
                    difficulty=difficulty,
                    language=lang,
                    cefr_level=cefr_level,
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful_skills: list[SkillAllocation] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                skill = allocations[i].skill_slug if i < len(allocations) else "unknown"
                logger.warning(f"Mix mode: {skill} generator failed: {result}")
                continue
            all_questions.extend(result)
            if i < len(allocations):
                successful_skills.append(allocations[i])

        if not all_questions:
            raise MixModeError("No questions could be generated for any skill.")

        # Backfill: if we got fewer than requested, generate more from successful skills
        shortfall = total_count - len(all_questions)
        if shortfall > 0 and successful_skills:
            logger.info(f"Mix mode: backfilling {shortfall} questions from successful skills")
            backfill_tasks = []
            for idx in range(shortfall):
                alloc = successful_skills[idx % len(successful_skills)]
                backfill_tasks.append(
                    self._generate_skill_questions(
                        skill_slug=alloc.skill_slug,
                        format_slug=alloc.format_slug,
                        book_id=book_id,
                        module_ids=module_ids,
                        count=1,
                        difficulty=difficulty,
                        language=lang,
                        cefr_level=cefr_level,
                    )
                )
            backfill_results = await asyncio.gather(*backfill_tasks, return_exceptions=True)
            for br in backfill_results:
                if not isinstance(br, Exception):
                    all_questions.extend(br)

        # Trim to exact count if we overshot
        all_questions = all_questions[:total_count]

        # Group by skill_slug then format_slug (no shuffle — groups stay together)
        skill_order = ["vocabulary", "grammar", "reading", "listening", "writing", "speaking"]
        all_questions.sort(
            key=lambda q: (
                skill_order.index(q.skill_slug) if q.skill_slug in skill_order else 99,
                q.format_slug,
            )
        )

        # Build skill distribution summary (actual counts)
        skill_distribution: dict[str, dict] = {}
        for q in all_questions:
            key = q.skill_slug
            if key not in skill_distribution:
                skill_distribution[key] = {"count": 0, "formats": []}
            skill_distribution[key]["count"] += 1
            if q.format_slug not in skill_distribution[key]["formats"]:
                skill_distribution[key]["formats"].append(q.format_slug)

        skills_present = set(q.skill_slug for q in all_questions)

        return MixModeActivity(
            activity_id=str(uuid4()),
            book_id=book_id,
            module_ids=module_ids,
            is_mix_mode=True,
            skill_distribution=skill_distribution,
            questions=all_questions,
            total_questions=len(all_questions),
            skills_covered=len(skills_present),
            difficulty=difficulty,
            language=lang,
            created_at=datetime.now(timezone.utc),
        )

    def _analyze_content(self, text: str) -> ContentAnalysisResult:
        """Analyze module text to determine skill weights."""
        words = text.split()
        word_count = len(words)
        unique_words = len(set(w.lower() for w in words))

        result = ContentAnalysisResult()

        # Vocabulary weight: higher for rich vocabulary
        if word_count > 0:
            vocab_density = unique_words / word_count
            if vocab_density > 0.6:
                result.vocabulary_weight = 1.5
            elif vocab_density < 0.3:
                result.vocabulary_weight = 0.7

        # Reading weight: higher for longer texts
        if word_count > 200:
            result.reading_weight = 1.5
        elif word_count < 50:
            result.reading_weight = 0.5

        # Listening weight: higher for dialogue content
        dialogue_markers = len(re.findall(r'["\'](.*?)["\']|said|asked|told|replied', text, re.IGNORECASE))
        if dialogue_markers > 3:
            result.listening_weight = 1.5

        # Grammar weight: steady default (always relevant)
        result.grammar_weight = 1.0

        # Writing weight: higher for expressive/topic-rich content
        expressive_markers = len(re.findall(
            r'\b(opinion|describe|explain|imagine|think|feel|believe|prefer)\b',
            text, re.IGNORECASE,
        ))
        if expressive_markers > 2:
            result.writing_weight = 1.3

        return result

    def _calculate_distribution(
        self, analysis: ContentAnalysisResult, total_count: int
    ) -> list[SkillAllocation]:
        """Calculate question distribution across skills with random format selection."""
        weights = {
            "vocabulary": analysis.vocabulary_weight,
            "grammar": analysis.grammar_weight,
            "reading": analysis.reading_weight,
            "listening": analysis.listening_weight,
            "writing": analysis.writing_weight,
        }

        total_weight = sum(weights.values())

        # Proportional allocation
        raw_allocs: dict[str, float] = {}
        for skill, weight in weights.items():
            raw_allocs[skill] = (weight / total_weight) * total_count

        # Integer allocation with at least 1 per skill
        int_allocs: dict[str, int] = {}
        for skill in weights:
            int_allocs[skill] = max(1, round(raw_allocs[skill]))

        # Adjust to match total_count
        current_total = sum(int_allocs.values())
        if current_total > total_count:
            sorted_skills = sorted(int_allocs, key=int_allocs.get, reverse=True)
            for skill in sorted_skills:
                if current_total <= total_count:
                    break
                if int_allocs[skill] > 1:
                    int_allocs[skill] -= 1
                    current_total -= 1
        elif current_total < total_count:
            sorted_skills = sorted(weights, key=weights.get, reverse=True)
            for skill in sorted_skills:
                if current_total >= total_count:
                    break
                int_allocs[skill] += 1
                current_total += 1

        # Build allocations with randomly selected formats
        allocations: list[SkillAllocation] = []
        for skill, count in int_allocs.items():
            if count > 0:
                format_slug = random.choice(_SKILL_FORMATS[skill])
                allocations.append(
                    SkillAllocation(
                        skill_slug=skill,
                        format_slug=format_slug,
                        count=count,
                    )
                )

        return allocations

    async def _generate_skill_questions(
        self,
        skill_slug: str,
        format_slug: str,
        book_id: int,
        module_ids: list[int],
        count: int,
        difficulty: str,
        language: str,
        cefr_level: str,
    ) -> list[MixModeQuestion]:
        """Generate questions for a single skill using the appropriate generator."""
        questions: list[MixModeQuestion] = []

        try:
            handler = self._get_handler(skill_slug, format_slug)
            if handler:
                questions = await handler(
                    book_id, module_ids, count, difficulty, language, cefr_level
                )
            else:
                logger.warning(f"Mix mode: no handler for {skill_slug}×{format_slug}")

        except Exception as e:
            logger.warning(f"Mix mode: failed to generate {skill_slug}×{format_slug}: {e}")

        return questions

    def _get_handler(self, skill: str, fmt: str):
        """Return the generator function for a skill×format combo."""
        handlers = {
            # Vocabulary
            ("vocabulary", "multiple_choice"): self._gen_vocabulary_mcq,
            ("vocabulary", "word_builder"): self._gen_word_builder,
            ("vocabulary", "matching"): self._gen_vocabulary_matching,
            # Grammar
            ("grammar", "multiple_choice"): self._gen_grammar_mcq,
            ("grammar", "fill_blank"): self._gen_grammar_fill_blank,
            ("grammar", "sentence_builder"): self._gen_sentence_builder,
            # Reading
            ("reading", "comprehension"): self._gen_reading_comprehension,
            # Listening
            ("listening", "fill_blank"): self._gen_listening_fill_blank,
            ("listening", "sentence_builder"): self._gen_listening_sentence_builder,
            ("listening", "word_builder"): self._gen_listening_word_builder,
            # Writing
            ("writing", "fill_blank"): self._gen_writing_fill_blank,
            ("writing", "sentence_corrector"): self._gen_writing_sentence_corrector,
            ("writing", "free_response"): self._gen_writing_free_response,
            # Speaking
            ("speaking", "open_response"): self._gen_speaking_open_response,
        }
        return handlers.get((skill, fmt))

    # =====================================================================
    # Vocabulary generators
    # =====================================================================

    async def _gen_vocabulary_mcq(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.services.ai_generation.prompts.mcq_prompts import (
            MCQ_JSON_SCHEMA, MCQ_SYSTEM_PROMPT, build_mcq_prompt,
        )
        module = await self._dcs_client.get_module_detail(book_id, module_ids[0])
        if not module or not module.text:
            return []
        topics = module.topics or [module.title]
        prompt = build_mcq_prompt(
            question_count=count, difficulty=difficulty, language=language or "en",
            topics=topics, vocabulary=[], module_title=module.title,
            cefr_level=cefr_level,
        )
        response = await self._llm_manager.generate_structured(
            prompt=f"{MCQ_SYSTEM_PROMPT}\n\n{prompt}", schema=MCQ_JSON_SCHEMA,
        )
        return [
            MixModeQuestion(
                question_id=str(uuid4()), skill_slug="vocabulary",
                format_slug="multiple_choice", question_data=raw,
            )
            for raw in (response.get("questions") or [])[:count]
        ]

    async def _gen_word_builder(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.word_builder import WordBuilderRequest
        from app.services.ai_generation.word_builder_service import WordBuilderService
        service = WordBuilderService(self._dcs_client, self._tts_manager)
        request = WordBuilderRequest(
            book_id=book_id, module_ids=module_ids, word_count=max(3, count),
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="vocabulary",
                format_slug="word_builder", question_data=item.model_dump(),
            )
            for item in activity.words[:count]
        ]

    async def _gen_vocabulary_matching(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.vocabulary_matching import VocabularyMatchingRequest
        from app.services.ai_generation.vocabulary_matching_service import VocabularyMatchingService
        service = VocabularyMatchingService(self._dcs_client)
        request = VocabularyMatchingRequest(
            book_id=book_id, module_ids=module_ids, pair_count=max(2, count),
            include_audio=False,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=pair.pair_id, skill_slug="vocabulary",
                format_slug="matching", question_data=pair.model_dump(),
            )
            for pair in activity.pairs[:count]
        ]

    # =====================================================================
    # Grammar generators
    # =====================================================================

    async def _gen_grammar_mcq(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.services.ai_generation.prompts.mcq_prompts import (
            GRAMMAR_MCQ_SYSTEM_PROMPT, MCQ_JSON_SCHEMA, build_mcq_prompt,
        )
        module = await self._dcs_client.get_module_detail(book_id, module_ids[0])
        if not module or not module.text:
            return []
        topics = module.topics or [module.title]
        prompt = build_mcq_prompt(
            question_count=count, difficulty=difficulty, language=language or "en",
            topics=topics, vocabulary=[], module_title=module.title,
            cefr_level=cefr_level,
        )
        response = await self._llm_manager.generate_structured(
            prompt=f"{GRAMMAR_MCQ_SYSTEM_PROMPT}\n\n{prompt}", schema=MCQ_JSON_SCHEMA,
        )
        return [
            MixModeQuestion(
                question_id=str(uuid4()), skill_slug="grammar",
                format_slug="multiple_choice", question_data=raw,
            )
            for raw in (response.get("questions") or [])[:count]
        ]

    async def _gen_grammar_fill_blank(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.grammar_fill_blank import GrammarFillBlankRequest
        from app.services.ai_generation.grammar_fill_blank_service import GrammarFillBlankService
        service = GrammarFillBlankService(self._dcs_client, self._llm_manager)
        request = GrammarFillBlankRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(5, count), difficulty=difficulty, language=language,
            mode="word_bank",
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="grammar",
                format_slug="fill_blank", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    async def _gen_sentence_builder(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.sentence_builder import SentenceBuilderRequest
        from app.services.ai_generation.sentence_builder_service import SentenceBuilderService
        service = SentenceBuilderService(self._dcs_client, self._llm_manager, self._tts_manager)
        request = SentenceBuilderRequest(
            book_id=book_id, module_ids=module_ids,
            sentence_count=max(3, count), difficulty=difficulty,
            include_audio=False,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="grammar",
                format_slug="sentence_builder", question_data=item.model_dump(),
            )
            for item in activity.sentences[:count]
        ]

    # =====================================================================
    # Reading generators
    # =====================================================================

    async def _gen_reading_comprehension(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.reading_comprehension import ReadingComprehensionRequest
        from app.services.ai_generation.reading_comprehension_service import ReadingComprehensionService
        service = ReadingComprehensionService(self._dcs_client, self._llm_manager)
        request = ReadingComprehensionRequest(
            book_id=book_id, module_id=module_ids[0], module_ids=module_ids,
            question_count=max(3, count), difficulty=difficulty,
        )
        activity = await service.generate_activity(request)
        # Include passage text with each question for context
        passage_text = activity.passage if hasattr(activity, "passage") else ""

        # Pre-generate passage audio and upload to DCS
        passage_audio_url: str | None = None
        word_timestamps: list[dict] | None = None
        if passage_text and self._dcs_ai_content_client:
            try:
                from app.services.tts.providers.edge import EdgeTTSProvider

                provider = EdgeTTSProvider()
                result = await provider.generate_passage_audio(text=passage_text)

                import base64
                audio_bytes = base64.b64decode(result.audio_base64)

                # Create DCS content entry for this passage audio
                dcs_entry = await self._dcs_ai_content_client.create_content(
                    book_id,
                    {
                        "manifest": {
                            "activity_type": "passage_audio",
                            "title": "Reading Passage Audio",
                            "item_count": 1,
                            "has_audio": True,
                            "has_passage": True,
                            "language": language or "en",
                        },
                        "content": {
                            "passage_length": len(passage_text),
                        },
                    },
                )
                content_id = dcs_entry.get("content_id") or dcs_entry.get("id")

                # Upload audio file
                await self._dcs_ai_content_client.upload_audio(
                    book_id, content_id, "passage.mp3", audio_bytes,
                )

                passage_audio_url = f"/api/v1/ai/content/{book_id}/{content_id}/audio/passage.mp3"
                word_timestamps = [ts.model_dump() for ts in result.word_timestamps]
                logger.info(
                    f"Passage audio uploaded to DCS: book_id={book_id}, content_id={content_id}"
                )
            except Exception:
                logger.warning(
                    "Failed to pre-generate passage audio for DCS, "
                    "students will fall back to on-demand TTS",
                    exc_info=True,
                )

        questions = []
        for q in activity.questions[:count]:
            data = q.model_dump()
            data["passage"] = passage_text
            if passage_audio_url:
                data["passage_audio_url"] = passage_audio_url
            if word_timestamps:
                data["word_timestamps"] = word_timestamps
            questions.append(MixModeQuestion(
                question_id=q.question_id, skill_slug="reading",
                format_slug="comprehension", question_data=data,
            ))
        return questions

    # =====================================================================
    # Listening generators
    # =====================================================================

    async def _gen_listening_fill_blank(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.listening_fill_blank import ListeningFillBlankRequest
        from app.services.ai_generation.listening_fill_blank_service import ListeningFillBlankService
        service = ListeningFillBlankService(self._dcs_client, self._llm_manager, self._tts_manager)
        request = ListeningFillBlankRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(5, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="listening",
                format_slug="fill_blank", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    async def _gen_listening_sentence_builder(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.listening_sentence_builder import ListeningSentenceBuilderRequest
        from app.services.ai_generation.listening_sentence_builder_service import ListeningSentenceBuilderService
        service = ListeningSentenceBuilderService(self._dcs_client, self._llm_manager, self._tts_manager)
        request = ListeningSentenceBuilderRequest(
            book_id=book_id, module_ids=module_ids,
            sentence_count=max(3, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="listening",
                format_slug="sentence_builder", question_data=item.model_dump(),
            )
            for item in activity.sentences[:count]
        ]

    async def _gen_listening_word_builder(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.listening_word_builder import ListeningWordBuilderRequest
        from app.services.ai_generation.listening_word_builder_service import ListeningWordBuilderService
        service = ListeningWordBuilderService(self._dcs_client, self._llm_manager, self._tts_manager)
        request = ListeningWordBuilderRequest(
            book_id=book_id, module_ids=module_ids,
            word_count=max(3, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="listening",
                format_slug="word_builder", question_data=item.model_dump(),
            )
            for item in activity.words[:count]
        ]

    # =====================================================================
    # Writing generators
    # =====================================================================

    async def _gen_writing_fill_blank(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.writing_fill_blank import WritingFillBlankRequest
        from app.services.ai_generation.writing_fill_blank_service import WritingFillBlankService
        service = WritingFillBlankService(self._dcs_client, self._llm_manager)
        request = WritingFillBlankRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(5, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="writing",
                format_slug="fill_blank", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    async def _gen_writing_sentence_corrector(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.writing_sentence_corrector import WritingSentenceCorrectorRequest
        from app.services.ai_generation.writing_sentence_corrector_service import WritingSentenceCorrectorService
        service = WritingSentenceCorrectorService(self._dcs_client, self._llm_manager)
        request = WritingSentenceCorrectorRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(3, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="writing",
                format_slug="sentence_corrector", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    async def _gen_writing_free_response(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.writing_free_response import WritingFreeResponseRequest
        from app.services.ai_generation.writing_free_response_service import WritingFreeResponseService
        service = WritingFreeResponseService(self._dcs_client, self._llm_manager)
        request = WritingFreeResponseRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(1, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="writing",
                format_slug="free_response", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    async def _gen_speaking_open_response(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str, cefr_level: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.speaking_open_response import SpeakingOpenResponseRequest
        from app.services.ai_generation.speaking_open_response_service import SpeakingOpenResponseService
        service = SpeakingOpenResponseService(self._dcs_client, self._llm_manager)
        request = SpeakingOpenResponseRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(1, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)
        return [
            MixModeQuestion(
                question_id=item.item_id, skill_slug="speaking",
                format_slug="open_response", question_data=item.model_dump(),
            )
            for item in activity.items[:count]
        ]

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"
