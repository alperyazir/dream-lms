"""
Mix Mode Generation Service.

Epic 30 - Story 30.8: Mix Mode Generation

Orchestrates multiple skill generators to create balanced multi-skill assignments.
"""

import asyncio
import logging
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
from app.services.llm import LLMManager
from app.services.tts import TTSManager

logger = logging.getLogger(__name__)

# Default format to use per skill when mixing
_DEFAULT_FORMATS: dict[str, str] = {
    "vocabulary": "multiple_choice",
    "grammar": "fill_blank",
    "reading": "multiple_choice",
    "listening": "multiple_choice",
    "writing": "fill_blank",
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
    ) -> None:
        self._dcs_client = dcs_client
        self._llm_manager = llm_manager
        self._tts_manager = tts_manager

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

        # Step 2: Calculate distribution
        allocations = self._calculate_distribution(analysis, total_count)
        logger.info(f"Mix mode distribution: {[(a.skill_slug, a.count) for a in allocations]}")

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

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                skill = allocations[i].skill_slug if i < len(allocations) else "unknown"
                logger.warning(f"Mix mode: {skill} generator failed: {result}")
                continue
            all_questions.extend(result)

        if not all_questions:
            raise MixModeError("No questions could be generated for any skill.")

        # Ensure at least 3 skills
        skills_present = set(q.skill_slug for q in all_questions)
        if len(skills_present) < 3:
            logger.warning(
                f"Mix mode: only {len(skills_present)} skills generated "
                f"(target 3+). Skills: {skills_present}"
            )

        # Build skill distribution summary
        skill_distribution: dict[str, dict] = {}
        for alloc in allocations:
            actual_count = sum(1 for q in all_questions if q.skill_slug == alloc.skill_slug)
            if actual_count > 0:
                skill_distribution[alloc.skill_slug] = {
                    "count": actual_count,
                    "format": alloc.format_slug,
                }

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
        """Calculate question distribution across skills."""
        weights = {
            "vocabulary": analysis.vocabulary_weight,
            "grammar": analysis.grammar_weight,
            "reading": analysis.reading_weight,
            "listening": analysis.listening_weight,
            "writing": analysis.writing_weight,
        }

        total_weight = sum(weights.values())
        allocations: list[SkillAllocation] = []

        # First pass: proportional allocation
        remaining = total_count
        raw_allocs: dict[str, float] = {}
        for skill, weight in weights.items():
            raw_allocs[skill] = (weight / total_weight) * total_count

        # Second pass: integer allocation with at least 1 per skill
        int_allocs: dict[str, int] = {}
        for skill in weights:
            int_allocs[skill] = max(1, round(raw_allocs[skill]))

        # Adjust to match total_count
        current_total = sum(int_allocs.values())
        if current_total > total_count:
            # Reduce from highest allocations
            sorted_skills = sorted(int_allocs, key=int_allocs.get, reverse=True)
            for skill in sorted_skills:
                if current_total <= total_count:
                    break
                if int_allocs[skill] > 1:
                    int_allocs[skill] -= 1
                    current_total -= 1
        elif current_total < total_count:
            # Add to highest weighted skills
            sorted_skills = sorted(weights, key=weights.get, reverse=True)
            for skill in sorted_skills:
                if current_total >= total_count:
                    break
                int_allocs[skill] += 1
                current_total += 1

        for skill, count in int_allocs.items():
            if count > 0:
                allocations.append(
                    SkillAllocation(
                        skill_slug=skill,
                        format_slug=_DEFAULT_FORMATS[skill],
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
            if skill_slug == "vocabulary" and format_slug == "multiple_choice":
                questions = await self._gen_vocabulary_mcq(
                    book_id, module_ids, count, difficulty, language
                )
            elif skill_slug == "grammar" and format_slug == "fill_blank":
                questions = await self._gen_grammar_fill_blank(
                    book_id, module_ids, count, difficulty, language
                )
            elif skill_slug == "reading" and format_slug == "multiple_choice":
                questions = await self._gen_reading_mcq(
                    book_id, module_ids, count, difficulty, language
                )
            elif skill_slug == "listening" and format_slug == "multiple_choice":
                questions = await self._gen_listening_mcq(
                    book_id, module_ids, count, difficulty, language
                )
            elif skill_slug == "writing" and format_slug == "fill_blank":
                questions = await self._gen_writing_fill_blank(
                    book_id, module_ids, count, difficulty, language
                )
            else:
                logger.warning(f"Mix mode: no handler for {skill_slug}×{format_slug}")

        except Exception as e:
            logger.warning(f"Mix mode: failed to generate {skill_slug}: {e}")

        return questions

    async def _gen_vocabulary_mcq(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str,
    ) -> list[MixModeQuestion]:
        from app.services.ai_generation.prompts.mcq_prompts import (
            MCQ_JSON_SCHEMA,
            MCQ_SYSTEM_PROMPT,
            build_mcq_prompt,
        )

        module = await self._dcs_client.get_module_detail(book_id, module_ids[0])
        if not module or not module.text:
            return []

        topics = module.topics or [module.title]
        prompt = build_mcq_prompt(
            question_count=count,
            difficulty=difficulty,
            language=language or "en",
            topics=topics,
            vocabulary=[],
            module_title=module.title,
            cefr_level=_DIFFICULTY_TO_CEFR.get(difficulty, "A2"),
        )

        response = await self._llm_manager.generate_structured(
            prompt=f"{MCQ_SYSTEM_PROMPT}\n\n{prompt}",
            schema=MCQ_JSON_SCHEMA,
        )

        questions = []
        for raw in (response.get("questions") or [])[:count]:
            questions.append(MixModeQuestion(
                question_id=str(uuid4()),
                skill_slug="vocabulary",
                format_slug="multiple_choice",
                question_data=raw,
            ))
        return questions

    async def _gen_grammar_fill_blank(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str,
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

        questions = []
        for item in activity.items[:count]:
            questions.append(MixModeQuestion(
                question_id=item.item_id,
                skill_slug="grammar",
                format_slug="fill_blank",
                question_data=item.model_dump(),
            ))
        return questions

    async def _gen_reading_mcq(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str,
    ) -> list[MixModeQuestion]:
        from app.services.ai_generation.prompts.mcq_prompts import (
            MCQ_JSON_SCHEMA,
            MCQ_SYSTEM_PROMPT,
            build_mcq_prompt,
        )

        module = await self._dcs_client.get_module_detail(book_id, module_ids[0])
        if not module or not module.text:
            return []

        topics = module.topics or [module.title]
        prompt = build_mcq_prompt(
            question_count=count,
            difficulty=difficulty,
            language=language or "en",
            topics=topics,
            vocabulary=[],
            module_title=module.title,
            cefr_level=_DIFFICULTY_TO_CEFR.get(difficulty, "A2"),
        )

        response = await self._llm_manager.generate_structured(
            prompt=f"{MCQ_SYSTEM_PROMPT}\n\n{prompt}",
            schema=MCQ_JSON_SCHEMA,
        )

        questions = []
        for raw in (response.get("questions") or [])[:count]:
            questions.append(MixModeQuestion(
                question_id=str(uuid4()),
                skill_slug="reading",
                format_slug="multiple_choice",
                question_data=raw,
            ))
        return questions

    async def _gen_listening_mcq(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.listening_quiz import ListeningQuizRequest
        from app.services.ai_generation.listening_quiz_service import ListeningQuizService

        service = ListeningQuizService(
            self._dcs_client, self._llm_manager, self._tts_manager,
        )
        request = ListeningQuizRequest(
            book_id=book_id, module_ids=module_ids,
            question_count=max(3, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)

        questions = []
        for q in activity.questions[:count]:
            questions.append(MixModeQuestion(
                question_id=q.question_id,
                skill_slug="listening",
                format_slug="multiple_choice",
                question_data=q.model_dump(),
            ))
        return questions

    async def _gen_writing_fill_blank(
        self, book_id: int, module_ids: list[int], count: int,
        difficulty: str, language: str,
    ) -> list[MixModeQuestion]:
        from app.schemas.writing_fill_blank import WritingFillBlankRequest
        from app.services.ai_generation.writing_fill_blank_service import WritingFillBlankService

        service = WritingFillBlankService(self._dcs_client, self._llm_manager)
        request = WritingFillBlankRequest(
            book_id=book_id, module_ids=module_ids,
            item_count=max(5, count), difficulty=difficulty, language=language,
        )
        activity = await service.generate_activity(request)

        questions = []
        for item in activity.items[:count]:
            questions.append(MixModeQuestion(
                question_id=item.item_id,
                skill_slug="writing",
                format_slug="fill_blank",
                question_data=item.model_dump(),
            ))
        return questions

    @staticmethod
    def _cefr_to_difficulty(cefr: str) -> str:
        cefr_upper = (cefr or "").upper()
        if cefr_upper in ("A1",):
            return "easy"
        if cefr_upper in ("A2", "B1"):
            return "medium"
        return "hard"
