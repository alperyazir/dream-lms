"""
Quiz Storage Service.

Provides temporary storage for generated quizzes and their
submissions. Uses in-memory storage with TTL for simplicity.

Supports vocabulary quizzes, AI-generated MCQ quizzes,
and reading comprehension activities.
"""

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.schemas.ai_quiz import (
    AIQuiz,
    AIQuizPublic,
    AIQuizQuestionPublic,
    AIQuizQuestionResult,
    AIQuizResult,
)
from app.schemas.reading_comprehension import (
    ReadingComprehensionActivity,
    ReadingComprehensionActivityPublic,
    ReadingComprehensionAnswer,
    ReadingComprehensionQuestionPublic,
    ReadingComprehensionQuestionResult,
    ReadingComprehensionResult,
)
from app.schemas.sentence_builder import (
    SentenceBuilderActivity,
    SentenceBuilderActivityPublic,
    SentenceBuilderItemPublic,
    SentenceBuilderResult,
    SentenceBuilderSubmission,
)
from app.schemas.word_builder import (
    WordBuilderActivity,
    WordBuilderActivityPublic,
    WordBuilderItemPublic,
    WordBuilderResult,
    WordBuilderSubmission,
)
from app.schemas.grammar_fill_blank import (
    GrammarFillBlankActivity,
    GrammarFillBlankActivityPublic,
    GrammarFillBlankItemPublic,
)
from app.schemas.writing_fill_blank import (
    WritingFillBlankActivity,
    WritingFillBlankActivityPublic,
    WritingFillBlankItemPublic,
)
from app.schemas.writing_sentence_corrector import (
    WritingSentenceCorrectorActivity,
    WritingSentenceCorrectorActivityPublic,
    WritingSentenceCorrectorItemPublic,
)
from app.schemas.writing_free_response import (
    WritingFreeResponseActivity,
    WritingFreeResponseActivityPublic,
    WritingFreeResponseItemPublic,
)
from app.schemas.speaking_open_response import (
    SpeakingOpenResponseActivity,
    SpeakingOpenResponseActivityPublic,
)
from app.schemas.listening_fill_blank import (
    ListeningFillBlankActivity,
    ListeningFillBlankActivityPublic,
    ListeningFillBlankItemPublic,
)
from app.schemas.mix_mode import (
    MixModeActivity,
    MixModeActivityPublic,
)
from app.schemas.listening_quiz import (
    ListeningQuizActivity,
    ListeningQuizActivityPublic,
    ListeningQuizQuestionPublic,
)
from app.schemas.listening_sentence_builder import (
    ListeningSentenceBuilderActivity,
    ListeningSentenceBuilderActivityPublic,
    ListeningSentenceBuilderItemPublic,
)
from app.schemas.listening_word_builder import (
    ListeningWordBuilderActivity,
    ListeningWordBuilderActivityPublic,
    ListeningWordBuilderItemPublic,
)
from app.schemas.vocabulary_matching import (
    VocabularyMatchingActivity,
    VocabularyMatchingActivityPublic,
    to_public as vocab_matching_to_public,
)
from app.schemas.vocabulary_quiz import (
    QuestionResult,
    VocabularyQuiz,
    VocabularyQuizPublic,
    VocabularyQuizQuestionPublic,
    VocabularyQuizResult,
)

logger = logging.getLogger(__name__)


# Default TTL for stored quizzes (2 hours)
DEFAULT_QUIZ_TTL_SECONDS = 2 * 60 * 60


class QuizStorageService:
    """
    In-memory storage for quizzes and submissions.

    Stores quizzes temporarily for student access and tracks submissions.
    Quizzes expire after a configurable TTL.

    Supports both vocabulary quizzes and AI-generated MCQ quizzes.

    Note: This is an in-memory implementation suitable for single-instance
    deployments. For production with multiple instances, consider using
    Redis or a database.

    Example:
        storage = QuizStorageService()
        quiz_id = await storage.save_quiz(quiz)
        quiz = await storage.get_quiz(quiz_id)
        result = await storage.save_submission(quiz_id, student_id, answers)
    """

    def __init__(self, ttl_seconds: int = DEFAULT_QUIZ_TTL_SECONDS) -> None:
        """
        Initialize the quiz storage service.

        Args:
            ttl_seconds: Time-to-live for stored quizzes in seconds.
        """
        self._ttl_seconds = ttl_seconds
        # Vocabulary quiz storage
        self._quizzes: dict[str, tuple[VocabularyQuiz, datetime]] = {}
        self._submissions: dict[str, dict[str, VocabularyQuizResult]] = {}
        # AI quiz storage
        self._ai_quizzes: dict[str, tuple[AIQuiz, datetime]] = {}
        self._ai_submissions: dict[str, dict[str, AIQuizResult]] = {}
        # Reading comprehension activity storage
        self._reading_activities: dict[str, tuple[ReadingComprehensionActivity, datetime]] = {}
        self._reading_submissions: dict[str, dict[str, ReadingComprehensionResult]] = {}
        # Sentence builder activity storage
        self._sentence_activities: dict[str, tuple[SentenceBuilderActivity, datetime]] = {}
        self._sentence_submissions: dict[str, dict[str, SentenceBuilderResult]] = {}
        # Word builder activity storage
        self._word_builder_activities: dict[str, tuple[WordBuilderActivity, datetime]] = {}
        self._word_builder_submissions: dict[str, dict[str, WordBuilderResult]] = {}
        # Listening quiz activity storage (Story 30.4)
        self._listening_activities: dict[str, tuple[ListeningQuizActivity, datetime]] = {}
        # Listening fill-blank activity storage (Story 30.5)
        self._listening_fb_activities: dict[str, tuple[ListeningFillBlankActivity, datetime]] = {}
        # Grammar fill-blank activity storage (Story 30.6)
        self._grammar_fb_activities: dict[str, tuple[GrammarFillBlankActivity, datetime]] = {}
        # Writing fill-blank activity storage (Story 30.7)
        self._writing_fb_activities: dict[str, tuple[WritingFillBlankActivity, datetime]] = {}
        # Writing sentence corrector activity storage
        self._writing_sc_activities: dict[str, tuple[WritingSentenceCorrectorActivity, datetime]] = {}
        # Writing free response activity storage
        self._writing_fr_activities: dict[str, tuple[WritingFreeResponseActivity, datetime]] = {}
        # Listening sentence builder activity storage
        self._listening_sb_activities: dict[str, tuple[ListeningSentenceBuilderActivity, datetime]] = {}
        # Listening word builder activity storage
        self._listening_wb_activities: dict[str, tuple[ListeningWordBuilderActivity, datetime]] = {}
        # Vocabulary matching activity storage
        self._vocab_matching_activities: dict[str, tuple[VocabularyMatchingActivity, datetime]] = {}
        # Speaking open response activity storage
        self._speaking_or_activities: dict[str, tuple[SpeakingOpenResponseActivity, datetime]] = {}
        # Mix mode activity storage (Story 30.8)
        self._mix_mode_activities: dict[str, tuple[MixModeActivity, datetime]] = {}
        logger.info(
            f"QuizStorageService initialized with TTL={ttl_seconds}s"
        )

    async def save_quiz(self, quiz: VocabularyQuiz) -> str:
        """
        Save a quiz to storage.

        Args:
            quiz: The quiz to save.

        Returns:
            The quiz_id for retrieval.
        """
        # Clean up expired quizzes periodically
        await self._cleanup_expired()

        self._quizzes[quiz.quiz_id] = (quiz, datetime.now(timezone.utc))
        logger.info(f"Quiz saved: quiz_id={quiz.quiz_id}")
        return quiz.quiz_id

    async def get_quiz(self, quiz_id: str) -> VocabularyQuiz | None:
        """
        Get a quiz by ID (internal version with answers).

        Args:
            quiz_id: The quiz ID.

        Returns:
            VocabularyQuiz if found and not expired, None otherwise.
        """
        entry = self._quizzes.get(quiz_id)
        if entry is None:
            return None

        quiz, stored_at = entry
        if self._is_expired(stored_at):
            await self._remove_quiz(quiz_id)
            return None

        return quiz

    async def get_quiz_public(self, quiz_id: str) -> VocabularyQuizPublic | None:
        """
        Get a quiz by ID (public version without correct answers).

        This version is safe to return to students.

        Args:
            quiz_id: The quiz ID.

        Returns:
            VocabularyQuizPublic if found and not expired, None otherwise.
        """
        quiz = await self.get_quiz(quiz_id)
        if quiz is None:
            return None

        # Convert to public version (strip correct answers)
        public_questions = [
            VocabularyQuizQuestionPublic(
                question_id=q.question_id,
                definition=q.definition,
                options=q.options,
                audio_url=q.audio_url,
                cefr_level=q.cefr_level,
            )
            for q in quiz.questions
        ]

        return VocabularyQuizPublic(
            quiz_id=quiz.quiz_id,
            book_id=quiz.book_id,
            module_ids=quiz.module_ids,
            questions=public_questions,
            created_at=quiz.created_at,
            quiz_length=quiz.quiz_length,
        )

    async def save_submission(
        self,
        quiz_id: str,
        student_id: UUID,
        answers: dict[str, str],
    ) -> VocabularyQuizResult | None:
        """
        Save a student's quiz submission and calculate results.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.
            answers: Dictionary mapping question_id to selected answer.

        Returns:
            VocabularyQuizResult with score and question results,
            None if quiz not found.
        """
        quiz = await self.get_quiz(quiz_id)
        if quiz is None:
            logger.warning(f"Quiz not found for submission: quiz_id={quiz_id}")
            return None

        # Calculate results
        question_results: list[QuestionResult] = []
        correct_count = 0

        for question in quiz.questions:
            student_answer = answers.get(question.question_id)
            is_correct = student_answer == question.correct_answer

            if is_correct:
                correct_count += 1

            question_results.append(
                QuestionResult(
                    question_id=question.question_id,
                    definition=question.definition,
                    correct_answer=question.correct_answer,
                    student_answer=student_answer,
                    is_correct=is_correct,
                    audio_url=question.audio_url,
                )
            )

        total = len(quiz.questions)
        percentage = (correct_count / total * 100) if total > 0 else 0

        result = VocabularyQuizResult(
            quiz_id=quiz_id,
            student_id=student_id,
            score=correct_count,
            total=total,
            percentage=round(percentage, 1),
            question_results=question_results,
            submitted_at=datetime.now(timezone.utc),
        )

        # Store the result
        if quiz_id not in self._submissions:
            self._submissions[quiz_id] = {}
        self._submissions[quiz_id][str(student_id)] = result

        logger.info(
            f"Submission saved: quiz_id={quiz_id}, student_id={student_id}, "
            f"score={correct_count}/{total} ({percentage:.1f}%)"
        )

        return result

    async def get_result(
        self, quiz_id: str, student_id: UUID
    ) -> VocabularyQuizResult | None:
        """
        Get a student's quiz result.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.

        Returns:
            VocabularyQuizResult if found, None otherwise.
        """
        quiz_submissions = self._submissions.get(quiz_id)
        if quiz_submissions is None:
            return None

        return quiz_submissions.get(str(student_id))

    async def has_submitted(self, quiz_id: str, student_id: UUID) -> bool:
        """
        Check if a student has already submitted this quiz.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.

        Returns:
            True if the student has submitted, False otherwise.
        """
        return await self.get_result(quiz_id, student_id) is not None

    # ========== AI Quiz Methods ==========

    async def save_ai_quiz(self, quiz: AIQuiz) -> str:
        """
        Save an AI quiz to storage.

        Args:
            quiz: The AI quiz to save.

        Returns:
            The quiz_id for retrieval.
        """
        await self._cleanup_expired()
        self._ai_quizzes[quiz.quiz_id] = (quiz, datetime.now(timezone.utc))
        logger.info(f"AI Quiz saved: quiz_id={quiz.quiz_id}")
        return quiz.quiz_id

    async def get_ai_quiz(self, quiz_id: str) -> AIQuiz | None:
        """
        Get an AI quiz by ID (internal version with answers).

        Args:
            quiz_id: The quiz ID.

        Returns:
            AIQuiz if found and not expired, None otherwise.
        """
        entry = self._ai_quizzes.get(quiz_id)
        if entry is None:
            return None

        quiz, stored_at = entry
        if self._is_expired(stored_at):
            await self._remove_ai_quiz(quiz_id)
            return None

        return quiz

    async def get_ai_quiz_public(self, quiz_id: str) -> AIQuizPublic | None:
        """
        Get an AI quiz by ID (public version without correct answers).

        This version is safe to return to students.

        Args:
            quiz_id: The quiz ID.

        Returns:
            AIQuizPublic if found and not expired, None otherwise.
        """
        quiz = await self.get_ai_quiz(quiz_id)
        if quiz is None:
            return None

        # Convert to public version (strip correct answers)
        public_questions = [
            AIQuizQuestionPublic(
                question_id=q.question_id,
                question_text=q.question_text,
                options=q.options,
                source_module_id=q.source_module_id,
                difficulty=q.difficulty,
            )
            for q in quiz.questions
        ]

        return AIQuizPublic(
            quiz_id=quiz.quiz_id,
            book_id=quiz.book_id,
            module_ids=quiz.module_ids,
            questions=public_questions,
            difficulty=quiz.difficulty,
            language=quiz.language,
            created_at=quiz.created_at,
            question_count=len(quiz.questions),
        )

    async def save_ai_quiz_submission(
        self,
        quiz_id: str,
        student_id: UUID,
        answers: dict[str, int],
    ) -> AIQuizResult | None:
        """
        Save a student's AI quiz submission and calculate results.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.
            answers: Dictionary mapping question_id to selected answer index.

        Returns:
            AIQuizResult with score and question results,
            None if quiz not found.
        """
        quiz = await self.get_ai_quiz(quiz_id)
        if quiz is None:
            logger.warning(f"AI Quiz not found for submission: quiz_id={quiz_id}")
            return None

        # Calculate results
        question_results: list[AIQuizQuestionResult] = []
        correct_count = 0

        for question in quiz.questions:
            student_answer_index = answers.get(question.question_id)
            student_answer: str | None = None

            if student_answer_index is not None and 0 <= student_answer_index < 4:
                student_answer = question.options[student_answer_index]

            is_correct = student_answer_index == question.correct_index

            if is_correct:
                correct_count += 1

            question_results.append(
                AIQuizQuestionResult(
                    question_id=question.question_id,
                    question_text=question.question_text,
                    options=question.options,
                    correct_answer=question.correct_answer,
                    correct_index=question.correct_index,
                    student_answer_index=student_answer_index,
                    student_answer=student_answer,
                    is_correct=is_correct,
                    explanation=question.explanation,
                    source_module_id=question.source_module_id,
                )
            )

        total = len(quiz.questions)
        percentage = (correct_count / total * 100) if total > 0 else 0

        result = AIQuizResult(
            quiz_id=quiz_id,
            student_id=student_id,
            score=correct_count,
            total=total,
            percentage=round(percentage, 1),
            question_results=question_results,
            submitted_at=datetime.now(timezone.utc),
            difficulty=quiz.difficulty,
        )

        # Store the result
        if quiz_id not in self._ai_submissions:
            self._ai_submissions[quiz_id] = {}
        self._ai_submissions[quiz_id][str(student_id)] = result

        logger.info(
            f"AI Quiz submitted: quiz_id={quiz_id}, student_id={student_id}, "
            f"score={correct_count}/{total} ({percentage:.1f}%)"
        )

        return result

    async def get_ai_quiz_result(
        self, quiz_id: str, student_id: UUID
    ) -> AIQuizResult | None:
        """
        Get a student's AI quiz result.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.

        Returns:
            AIQuizResult if found, None otherwise.
        """
        quiz_submissions = self._ai_submissions.get(quiz_id)
        if quiz_submissions is None:
            return None

        return quiz_submissions.get(str(student_id))

    async def has_submitted_ai_quiz(self, quiz_id: str, student_id: UUID) -> bool:
        """
        Check if a student has already submitted this AI quiz.

        Args:
            quiz_id: The quiz ID.
            student_id: The student's user ID.

        Returns:
            True if the student has submitted, False otherwise.
        """
        return await self.get_ai_quiz_result(quiz_id, student_id) is not None

    async def _remove_ai_quiz(self, quiz_id: str) -> None:
        """Remove an AI quiz and its submissions from storage."""
        self._ai_quizzes.pop(quiz_id, None)
        self._ai_submissions.pop(quiz_id, None)
        logger.debug(f"AI Quiz removed: quiz_id={quiz_id}")

    # ========== Reading Comprehension Activity Methods ==========

    async def save_reading_activity(
        self, activity: ReadingComprehensionActivity
    ) -> str:
        """
        Save a reading comprehension activity to storage.

        Args:
            activity: The reading comprehension activity to save.

        Returns:
            The activity_id for retrieval.
        """
        await self._cleanup_expired()
        self._reading_activities[activity.activity_id] = (
            activity,
            datetime.now(timezone.utc),
        )
        logger.info(f"Reading activity saved: activity_id={activity.activity_id}")
        return activity.activity_id

    async def get_reading_activity(
        self, activity_id: str
    ) -> ReadingComprehensionActivity | None:
        """
        Get a reading comprehension activity by ID (internal version with answers).

        Args:
            activity_id: The activity ID.

        Returns:
            ReadingComprehensionActivity if found and not expired, None otherwise.
        """
        entry = self._reading_activities.get(activity_id)
        if entry is None:
            return None

        activity, stored_at = entry
        if self._is_expired(stored_at):
            await self._remove_reading_activity(activity_id)
            return None

        return activity

    async def get_reading_activity_public(
        self, activity_id: str
    ) -> ReadingComprehensionActivityPublic | None:
        """
        Get a reading comprehension activity by ID (public version without answers).

        This version is safe to return to students.

        Args:
            activity_id: The activity ID.

        Returns:
            ReadingComprehensionActivityPublic if found and not expired, None otherwise.
        """
        activity = await self.get_reading_activity(activity_id)
        if activity is None:
            return None

        # Convert to public version (strip correct answers)
        public_questions = [
            ReadingComprehensionQuestionPublic(
                question_id=q.question_id,
                question_type=q.question_type,
                question_text=q.question_text,
                options=q.options,
            )
            for q in activity.questions
        ]

        return ReadingComprehensionActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_id=activity.module_id,
            module_title=activity.module_title,
            passage=activity.passage,
            passage_pages=activity.passage_pages,
            questions=public_questions,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
            question_count=len(activity.questions),
        )

    async def save_reading_submission(
        self,
        activity_id: str,
        student_id: UUID,
        answers: list[ReadingComprehensionAnswer],
    ) -> ReadingComprehensionResult | None:
        """
        Save a student's reading comprehension submission and calculate results.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.
            answers: List of answers for each question.

        Returns:
            ReadingComprehensionResult with score and question results,
            None if activity not found.
        """
        # Import here to avoid circular imports
        from app.services.ai_generation.short_answer_grader import grade_short_answer

        activity = await self.get_reading_activity(activity_id)
        if activity is None:
            logger.warning(
                f"Reading activity not found for submission: activity_id={activity_id}"
            )
            return None

        # Build answer lookup
        answer_map: dict[str, ReadingComprehensionAnswer] = {
            a.question_id: a for a in answers
        }

        # Calculate results
        question_results: list[ReadingComprehensionQuestionResult] = []
        correct_count = 0
        score_by_type: dict[str, dict[str, int]] = {}

        for question in activity.questions:
            answer = answer_map.get(question.question_id)
            qtype = question.question_type

            # Initialize type score tracking
            if qtype not in score_by_type:
                score_by_type[qtype] = {"correct": 0, "total": 0}
            score_by_type[qtype]["total"] += 1

            # Determine correctness based on question type
            is_correct = False
            similarity_score: float | None = None
            student_answer_index: int | None = None
            student_answer_text: str | None = None

            if answer:
                if qtype in ("mcq", "true_false"):
                    student_answer_index = answer.answer_index
                    if student_answer_index is not None:
                        is_correct = student_answer_index == question.correct_index
                elif qtype == "short_answer":
                    student_answer_text = answer.answer_text
                    if student_answer_text:
                        is_correct, similarity_score = grade_short_answer(
                            student_answer_text, question.correct_answer
                        )

            if is_correct:
                correct_count += 1
                score_by_type[qtype]["correct"] += 1

            question_results.append(
                ReadingComprehensionQuestionResult(
                    question_id=question.question_id,
                    question_type=question.question_type,
                    question_text=question.question_text,
                    options=question.options,
                    correct_answer=question.correct_answer,
                    correct_index=question.correct_index,
                    student_answer_index=student_answer_index,
                    student_answer_text=student_answer_text,
                    is_correct=is_correct,
                    similarity_score=similarity_score,
                    explanation=question.explanation,
                    passage_reference=question.passage_reference,
                )
            )

        total = len(activity.questions)
        percentage = (correct_count / total * 100) if total > 0 else 0

        result = ReadingComprehensionResult(
            activity_id=activity_id,
            student_id=student_id,
            score=correct_count,
            total=total,
            percentage=round(percentage, 1),
            question_results=question_results,
            score_by_type=score_by_type,
            submitted_at=datetime.now(timezone.utc),
            difficulty=activity.difficulty,
            passage=activity.passage,
            module_title=activity.module_title,
        )

        # Store the result
        if activity_id not in self._reading_submissions:
            self._reading_submissions[activity_id] = {}
        self._reading_submissions[activity_id][str(student_id)] = result

        logger.info(
            f"Reading submission saved: activity_id={activity_id}, "
            f"student_id={student_id}, score={correct_count}/{total} ({percentage:.1f}%)"
        )

        return result

    async def get_reading_result(
        self, activity_id: str, student_id: UUID
    ) -> ReadingComprehensionResult | None:
        """
        Get a student's reading comprehension result.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            ReadingComprehensionResult if found, None otherwise.
        """
        activity_submissions = self._reading_submissions.get(activity_id)
        if activity_submissions is None:
            return None

        return activity_submissions.get(str(student_id))

    async def has_submitted_reading(
        self, activity_id: str, student_id: UUID
    ) -> bool:
        """
        Check if a student has already submitted this reading activity.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            True if the student has submitted, False otherwise.
        """
        return await self.get_reading_result(activity_id, student_id) is not None

    async def _remove_reading_activity(self, activity_id: str) -> None:
        """Remove a reading activity and its submissions from storage."""
        self._reading_activities.pop(activity_id, None)
        self._reading_submissions.pop(activity_id, None)
        logger.debug(f"Reading activity removed: activity_id={activity_id}")

    # ========== Sentence Builder Activity Methods ==========

    async def save_sentence_activity(
        self, activity: SentenceBuilderActivity
    ) -> str:
        """
        Save a sentence builder activity to storage.

        Args:
            activity: The sentence builder activity to save.

        Returns:
            The activity_id for retrieval.
        """
        await self._cleanup_expired()
        self._sentence_activities[activity.activity_id] = (
            activity,
            datetime.now(timezone.utc),
        )
        logger.info(f"Sentence builder activity saved: activity_id={activity.activity_id}")
        return activity.activity_id

    async def get_sentence_activity(
        self, activity_id: str
    ) -> SentenceBuilderActivity | None:
        """
        Get a sentence builder activity by ID.

        Args:
            activity_id: The activity ID.

        Returns:
            SentenceBuilderActivity if found and not expired, None otherwise.
        """
        stored = self._sentence_activities.get(activity_id)
        if stored is None:
            return None

        activity, created_at = stored
        if self._is_expired(created_at):
            await self._remove_sentence_activity(activity_id)
            return None

        return activity

    async def get_sentence_activity_public(
        self, activity_id: str
    ) -> SentenceBuilderActivityPublic | None:
        """
        Get a sentence builder activity by ID (public version without correct sentences).

        This version is safe to return to students - it has the word banks
        but not the correct sentence strings.

        Args:
            activity_id: The activity ID.

        Returns:
            SentenceBuilderActivityPublic if found and not expired, None otherwise.
        """
        activity = await self.get_sentence_activity(activity_id)
        if activity is None:
            return None

        # Convert to public version (without correct_sentence)
        public_sentences = [
            SentenceBuilderItemPublic(
                item_id=item.item_id,
                words=item.words,
                word_count=item.word_count,
                difficulty=item.difficulty,
            )
            for item in activity.sentences
        ]

        return SentenceBuilderActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            sentences=public_sentences,
            difficulty=activity.difficulty,
            include_audio=activity.include_audio,
            created_at=activity.created_at,
            sentence_count=len(activity.sentences),
        )

    async def save_sentence_submission(
        self,
        activity_id: str,
        student_id: UUID,
        submission: SentenceBuilderSubmission,
    ) -> SentenceBuilderResult | None:
        """
        Save a student's sentence builder submission and calculate results.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.
            submission: The student's sentence submission.

        Returns:
            SentenceBuilderResult with score and sentence results,
            None if activity not found.
        """
        from app.services.ai_generation.sentence_builder_service import (
            SentenceBuilderService,
        )

        activity = await self.get_sentence_activity(activity_id)
        if activity is None:
            logger.warning(
                f"Sentence activity not found for submission: activity_id={activity_id}"
            )
            return None

        # Use the service to calculate results
        result = SentenceBuilderService._calculate_result_static(
            activity=activity,
            submission=submission,
            student_id=str(student_id),
        )

        # Store the result
        if activity_id not in self._sentence_submissions:
            self._sentence_submissions[activity_id] = {}
        self._sentence_submissions[activity_id][str(student_id)] = result

        logger.info(
            f"Sentence submission saved: activity_id={activity_id}, "
            f"student_id={student_id}, score={result.score}/{result.total} "
            f"({result.percentage:.1f}%)"
        )

        return result

    async def get_sentence_result(
        self, activity_id: str, student_id: UUID
    ) -> SentenceBuilderResult | None:
        """
        Get the result of a submitted sentence builder activity.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            SentenceBuilderResult if found, None otherwise.
        """
        activity_submissions = self._sentence_submissions.get(activity_id)
        if activity_submissions is None:
            return None

        return activity_submissions.get(str(student_id))

    async def has_submitted_sentence(
        self, activity_id: str, student_id: UUID
    ) -> bool:
        """
        Check if a student has already submitted a sentence builder activity.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            True if the student has submitted, False otherwise.
        """
        result = await self.get_sentence_result(activity_id, student_id)
        return result is not None

    async def _remove_sentence_activity(self, activity_id: str) -> None:
        """Remove a sentence builder activity and its submissions from storage."""
        self._sentence_activities.pop(activity_id, None)
        self._sentence_submissions.pop(activity_id, None)
        logger.debug(f"Sentence activity removed: activity_id={activity_id}")

    # ========== Word Builder Activity Storage ==========

    async def save_word_builder_activity(
        self, activity: WordBuilderActivity
    ) -> str:
        """
        Save a word builder activity to storage.

        Args:
            activity: The word builder activity to save.

        Returns:
            The activity_id for retrieval.
        """
        await self._cleanup_expired()
        self._word_builder_activities[activity.activity_id] = (
            activity,
            datetime.now(timezone.utc),
        )
        logger.info(f"Word builder activity saved: activity_id={activity.activity_id}")
        return activity.activity_id

    async def get_word_builder_activity(
        self, activity_id: str
    ) -> WordBuilderActivity | None:
        """
        Get a word builder activity by ID.

        Args:
            activity_id: The activity ID.

        Returns:
            WordBuilderActivity if found and not expired, None otherwise.
        """
        stored = self._word_builder_activities.get(activity_id)
        if stored is None:
            return None

        activity, created_at = stored
        if self._is_expired(created_at):
            await self._remove_word_builder_activity(activity_id)
            return None

        return activity

    async def get_word_builder_activity_public(
        self, activity_id: str
    ) -> WordBuilderActivityPublic | None:
        """
        Get a word builder activity by ID (public version without correct words).

        This version is safe to return to students - it has the scrambled letters
        but not the correct word strings.

        Args:
            activity_id: The activity ID.

        Returns:
            WordBuilderActivityPublic if found and not expired, None otherwise.
        """
        activity = await self.get_word_builder_activity(activity_id)
        if activity is None:
            return None

        # Convert to public version (without correct_word)
        public_words = [
            WordBuilderItemPublic(
                item_id=item.item_id,
                letters=item.letters,
                definition=item.definition if activity.hint_type in ("definition", "both") else "",
                audio_url=item.audio_url if activity.hint_type in ("audio", "both") else None,
                letter_count=len(item.correct_word),
            )
            for item in activity.words
        ]

        return WordBuilderActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            words=public_words,
            hint_type=activity.hint_type,
            created_at=activity.created_at,
            word_count=len(activity.words),
        )

    async def save_word_builder_submission(
        self,
        activity_id: str,
        student_id: UUID,
        submission: WordBuilderSubmission,
    ) -> WordBuilderResult | None:
        """
        Save a student's word builder submission and calculate results.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.
            submission: The student's word builder submission.

        Returns:
            WordBuilderResult with score and word results,
            None if activity not found.
        """
        from app.services.ai_generation.word_builder_service import (
            WordBuilderService,
        )

        activity = await self.get_word_builder_activity(activity_id)
        if activity is None:
            logger.warning(
                f"Word builder activity not found for submission: activity_id={activity_id}"
            )
            return None

        # Use the service to calculate results
        result = WordBuilderService.calculate_result(
            activity=activity,
            submission=submission,
            student_id=str(student_id),
        )

        # Store the result
        if activity_id not in self._word_builder_submissions:
            self._word_builder_submissions[activity_id] = {}
        self._word_builder_submissions[activity_id][str(student_id)] = result

        logger.info(
            f"Word builder submission saved: activity_id={activity_id}, "
            f"student_id={student_id}, score={result.score}/{result.max_score} "
            f"({result.percentage:.1f}%)"
        )

        return result

    async def get_word_builder_result(
        self, activity_id: str, student_id: UUID
    ) -> WordBuilderResult | None:
        """
        Get the result of a submitted word builder activity.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            WordBuilderResult if found, None otherwise.
        """
        activity_submissions = self._word_builder_submissions.get(activity_id)
        if activity_submissions is None:
            return None

        return activity_submissions.get(str(student_id))

    async def has_submitted_word_builder(
        self, activity_id: str, student_id: UUID
    ) -> bool:
        """
        Check if a student has already submitted a word builder activity.

        Args:
            activity_id: The activity ID.
            student_id: The student's user ID.

        Returns:
            True if the student has submitted, False otherwise.
        """
        result = await self.get_word_builder_result(activity_id, student_id)
        return result is not None

    async def _remove_word_builder_activity(self, activity_id: str) -> None:
        """Remove a word builder activity and its submissions from storage."""
        self._word_builder_activities.pop(activity_id, None)
        self._word_builder_submissions.pop(activity_id, None)
        logger.debug(f"Word builder activity removed: activity_id={activity_id}")

    # ---- Grammar Fill-Blank (Story 30.6) ----

    async def save_grammar_fill_blank_activity(
        self, activity: GrammarFillBlankActivity
    ) -> str:
        """Save a grammar fill-blank activity."""
        await self._cleanup_expired()
        self._grammar_fb_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Grammar fill-blank saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_grammar_fill_blank_activity(
        self, activity_id: str
    ) -> GrammarFillBlankActivity | None:
        entry = self._grammar_fb_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._grammar_fb_activities.pop(activity_id, None)
            return None
        return activity

    async def get_grammar_fill_blank_activity_public(
        self, activity_id: str
    ) -> GrammarFillBlankActivityPublic | None:
        activity = await self.get_grammar_fill_blank_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            GrammarFillBlankItemPublic(
                item_id=item.item_id,
                sentence=item.sentence,
                word_bank=item.word_bank,
                grammar_topic=item.grammar_topic,
                grammar_hint=item.grammar_hint,
                difficulty=item.difficulty,
            )
            for item in activity.items
        ]
        return GrammarFillBlankActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            mode=activity.mode,
            items=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Writing Fill-Blank (Story 30.7) ----

    async def save_writing_fill_blank_activity(
        self, activity: WritingFillBlankActivity
    ) -> str:
        """Save a writing fill-blank activity."""
        await self._cleanup_expired()
        self._writing_fb_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Writing fill-blank saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_writing_fill_blank_activity(
        self, activity_id: str
    ) -> WritingFillBlankActivity | None:
        entry = self._writing_fb_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._writing_fb_activities.pop(activity_id, None)
            return None
        return activity

    async def get_writing_fill_blank_activity_public(
        self, activity_id: str
    ) -> WritingFillBlankActivityPublic | None:
        activity = await self.get_writing_fill_blank_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            WritingFillBlankItemPublic(
                item_id=item.item_id,
                context=item.context,
                sentence=item.sentence,
                difficulty=item.difficulty,
            )
            for item in activity.items
        ]
        return WritingFillBlankActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            items=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Writing Sentence Corrector ----

    async def save_writing_sentence_corrector_activity(
        self, activity: WritingSentenceCorrectorActivity
    ) -> str:
        """Save a writing sentence corrector activity."""
        await self._cleanup_expired()
        self._writing_sc_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Writing sentence corrector saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_writing_sentence_corrector_activity(
        self, activity_id: str
    ) -> WritingSentenceCorrectorActivity | None:
        entry = self._writing_sc_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._writing_sc_activities.pop(activity_id, None)
            return None
        return activity

    async def get_writing_sentence_corrector_activity_public(
        self, activity_id: str
    ) -> WritingSentenceCorrectorActivityPublic | None:
        activity = await self.get_writing_sentence_corrector_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            WritingSentenceCorrectorItemPublic(
                item_id=item.item_id,
                context=item.context,
                incorrect_sentence=item.incorrect_sentence,
                error_type=item.error_type,
                difficulty=item.difficulty,
            )
            for item in activity.items
        ]
        return WritingSentenceCorrectorActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            items=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Writing Free Response ----

    async def save_writing_free_response_activity(
        self, activity: WritingFreeResponseActivity
    ) -> str:
        """Save a writing free response activity."""
        await self._cleanup_expired()
        self._writing_fr_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Writing free response saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_writing_free_response_activity(
        self, activity_id: str
    ) -> WritingFreeResponseActivity | None:
        entry = self._writing_fr_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._writing_fr_activities.pop(activity_id, None)
            return None
        return activity

    async def get_writing_free_response_activity_public(
        self, activity_id: str
    ) -> WritingFreeResponseActivityPublic | None:
        activity = await self.get_writing_free_response_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            WritingFreeResponseItemPublic(
                item_id=item.item_id,
                prompt=item.prompt,
                context=item.context,
                min_words=item.min_words,
                max_words=item.max_words,
                difficulty=item.difficulty,
            )
            for item in activity.items
        ]
        return WritingFreeResponseActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            items=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            requires_manual_grading=activity.requires_manual_grading,
            created_at=activity.created_at,
        )

    # ---- Listening Fill-Blank (Story 30.5) ----

    async def save_listening_fill_blank_activity(
        self, activity: ListeningFillBlankActivity
    ) -> str:
        """Save a listening fill-blank activity."""
        await self._cleanup_expired()
        self._listening_fb_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Listening fill-blank saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_listening_fill_blank_activity(
        self, activity_id: str
    ) -> ListeningFillBlankActivity | None:
        entry = self._listening_fb_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._listening_fb_activities.pop(activity_id, None)
            return None
        return activity

    async def get_listening_fill_blank_activity_public(
        self, activity_id: str
    ) -> ListeningFillBlankActivityPublic | None:
        activity = await self.get_listening_fill_blank_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            ListeningFillBlankItemPublic(
                item_id=item.item_id,
                display_sentence=item.display_sentence,
                audio_url=item.audio_url,
                audio_status=item.audio_status,
                difficulty=item.difficulty,
            )
            for item in activity.items
        ]
        return ListeningFillBlankActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            items=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Listening Quiz (Story 30.4) ----

    async def save_listening_activity(
        self, activity: ListeningQuizActivity
    ) -> str:
        """Save a listening quiz activity to storage."""
        await self._cleanup_expired()
        self._listening_activities[activity.activity_id] = (
            activity,
            datetime.now(timezone.utc),
        )
        logger.info(f"Listening activity saved: activity_id={activity.activity_id}")
        return activity.activity_id

    async def get_listening_activity(
        self, activity_id: str
    ) -> ListeningQuizActivity | None:
        """Get a listening activity by ID (internal version with answers + audio_text)."""
        entry = self._listening_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._listening_activities.pop(activity_id, None)
            return None
        return activity

    async def get_listening_activity_public(
        self, activity_id: str
    ) -> ListeningQuizActivityPublic | None:
        """Get a listening activity by ID (public version — no audio_text, no answers)."""
        activity = await self.get_listening_activity(activity_id)
        if activity is None:
            return None
        public_questions = [
            ListeningQuizQuestionPublic(
                question_id=q.question_id,
                audio_url=q.audio_url,
                audio_status=q.audio_status,
                question_text=q.question_text,
                options=q.options,
                sub_skill=q.sub_skill,
                difficulty=q.difficulty,
            )
            for q in activity.questions
        ]
        return ListeningQuizActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            questions=public_questions,
            total_questions=activity.total_questions,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Vocabulary Matching ----

    async def save_vocabulary_matching_activity(
        self, activity: VocabularyMatchingActivity
    ) -> str:
        """Save a vocabulary matching activity."""
        await self._cleanup_expired()
        self._vocab_matching_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Vocabulary matching saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_vocabulary_matching_activity(
        self, activity_id: str
    ) -> VocabularyMatchingActivity | None:
        entry = self._vocab_matching_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._vocab_matching_activities.pop(activity_id, None)
            return None
        return activity

    async def get_vocabulary_matching_activity_public(
        self, activity_id: str
    ) -> VocabularyMatchingActivityPublic | None:
        activity = await self.get_vocabulary_matching_activity(activity_id)
        if activity is None:
            return None
        return vocab_matching_to_public(activity)

    # ---- Speaking Open Response ----

    async def save_speaking_open_response_activity(
        self, activity: SpeakingOpenResponseActivity
    ) -> str:
        """Save a speaking open response activity."""
        await self._cleanup_expired()
        self._speaking_or_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Speaking open response saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_speaking_open_response_activity(
        self, activity_id: str
    ) -> SpeakingOpenResponseActivity | None:
        entry = self._speaking_or_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._speaking_or_activities.pop(activity_id, None)
            return None
        return activity

    async def get_speaking_open_response_activity_public(
        self, activity_id: str
    ) -> SpeakingOpenResponseActivityPublic | None:
        activity = await self.get_speaking_open_response_activity(activity_id)
        if activity is None:
            return None
        return SpeakingOpenResponseActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            items=activity.items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            requires_manual_grading=activity.requires_manual_grading,
            created_at=activity.created_at,
        )

    # ---- Mix Mode (Story 30.8) ----

    async def save_mix_mode_activity(
        self, activity: MixModeActivity
    ) -> str:
        """Save a mix mode activity."""
        await self._cleanup_expired()
        self._mix_mode_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Mix mode activity saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_mix_mode_activity(
        self, activity_id: str
    ) -> MixModeActivity | None:
        entry = self._mix_mode_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._mix_mode_activities.pop(activity_id, None)
            return None
        return activity

    async def get_mix_mode_activity_public(
        self, activity_id: str
    ) -> MixModeActivityPublic | None:
        activity = await self.get_mix_mode_activity(activity_id)
        if activity is None:
            return None
        return MixModeActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            is_mix_mode=activity.is_mix_mode,
            skill_distribution=activity.skill_distribution,
            questions=activity.questions,
            total_questions=activity.total_questions,
            skills_covered=activity.skills_covered,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Listening Sentence Builder ----

    async def save_listening_sentence_builder_activity(
        self, activity: ListeningSentenceBuilderActivity
    ) -> str:
        """Save a listening sentence builder activity."""
        await self._cleanup_expired()
        self._listening_sb_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Listening sentence builder saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_listening_sentence_builder_activity(
        self, activity_id: str
    ) -> ListeningSentenceBuilderActivity | None:
        entry = self._listening_sb_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._listening_sb_activities.pop(activity_id, None)
            return None
        return activity

    async def get_listening_sentence_builder_activity_public(
        self, activity_id: str
    ) -> ListeningSentenceBuilderActivityPublic | None:
        activity = await self.get_listening_sentence_builder_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            ListeningSentenceBuilderItemPublic(
                item_id=item.item_id,
                words=item.words,
                word_count=item.word_count,
                audio_url=item.audio_url,
                audio_status=item.audio_status,
                difficulty=item.difficulty,
            )
            for item in activity.sentences
        ]
        return ListeningSentenceBuilderActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            sentences=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    # ---- Listening Word Builder ----

    async def save_listening_word_builder_activity(
        self, activity: ListeningWordBuilderActivity
    ) -> str:
        """Save a listening word builder activity."""
        await self._cleanup_expired()
        self._listening_wb_activities[activity.activity_id] = (
            activity, datetime.now(timezone.utc),
        )
        logger.info(f"Listening word builder saved: id={activity.activity_id}")
        return activity.activity_id

    async def get_listening_word_builder_activity(
        self, activity_id: str
    ) -> ListeningWordBuilderActivity | None:
        entry = self._listening_wb_activities.get(activity_id)
        if entry is None:
            return None
        activity, stored_at = entry
        if self._is_expired(stored_at):
            self._listening_wb_activities.pop(activity_id, None)
            return None
        return activity

    async def get_listening_word_builder_activity_public(
        self, activity_id: str
    ) -> ListeningWordBuilderActivityPublic | None:
        activity = await self.get_listening_word_builder_activity(activity_id)
        if activity is None:
            return None
        public_items = [
            ListeningWordBuilderItemPublic(
                item_id=item.item_id,
                letters=item.letters,
                letter_count=item.letter_count,
                definition=item.definition,
                audio_url=item.audio_url,
                audio_status=item.audio_status,
                difficulty=item.difficulty,
            )
            for item in activity.words
        ]
        return ListeningWordBuilderActivityPublic(
            activity_id=activity.activity_id,
            book_id=activity.book_id,
            module_ids=activity.module_ids,
            words=public_items,
            total_items=activity.total_items,
            difficulty=activity.difficulty,
            language=activity.language,
            created_at=activity.created_at,
        )

    def _is_expired(self, stored_at: datetime) -> bool:
        """Check if a quiz has expired based on its stored timestamp."""
        age = (datetime.now(timezone.utc) - stored_at).total_seconds()
        return age > self._ttl_seconds

    async def _remove_quiz(self, quiz_id: str) -> None:
        """Remove a quiz and its submissions from storage."""
        self._quizzes.pop(quiz_id, None)
        self._submissions.pop(quiz_id, None)
        logger.debug(f"Quiz removed: quiz_id={quiz_id}")

    async def _cleanup_expired(self) -> int:
        """
        Remove all expired quizzes and activities from storage.

        Returns:
            Number of items removed.
        """
        # Cleanup vocabulary quizzes
        expired = [
            quiz_id
            for quiz_id, (_, stored_at) in self._quizzes.items()
            if self._is_expired(stored_at)
        ]

        for quiz_id in expired:
            await self._remove_quiz(quiz_id)

        # Cleanup AI quizzes
        expired_ai = [
            quiz_id
            for quiz_id, (_, stored_at) in self._ai_quizzes.items()
            if self._is_expired(stored_at)
        ]

        for quiz_id in expired_ai:
            await self._remove_ai_quiz(quiz_id)

        # Cleanup reading activities
        expired_reading = [
            activity_id
            for activity_id, (_, stored_at) in self._reading_activities.items()
            if self._is_expired(stored_at)
        ]

        for activity_id in expired_reading:
            await self._remove_reading_activity(activity_id)

        # Cleanup listening activities
        expired_listening = [
            activity_id
            for activity_id, (_, stored_at) in self._listening_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_listening:
            self._listening_activities.pop(activity_id, None)

        # Cleanup listening fill-blank activities
        expired_lfb = [
            activity_id
            for activity_id, (_, stored_at) in self._listening_fb_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_lfb:
            self._listening_fb_activities.pop(activity_id, None)

        # Cleanup grammar fill-blank activities
        expired_gfb = [
            activity_id
            for activity_id, (_, stored_at) in self._grammar_fb_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_gfb:
            self._grammar_fb_activities.pop(activity_id, None)

        # Cleanup writing fill-blank activities
        expired_wfb = [
            activity_id
            for activity_id, (_, stored_at) in self._writing_fb_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_wfb:
            self._writing_fb_activities.pop(activity_id, None)

        # Cleanup writing sentence corrector activities
        expired_wsc = [
            activity_id
            for activity_id, (_, stored_at) in self._writing_sc_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_wsc:
            self._writing_sc_activities.pop(activity_id, None)

        # Cleanup writing free response activities
        expired_wfr = [
            activity_id
            for activity_id, (_, stored_at) in self._writing_fr_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_wfr:
            self._writing_fr_activities.pop(activity_id, None)

        # Cleanup listening sentence builder activities
        expired_lsb = [
            activity_id
            for activity_id, (_, stored_at) in self._listening_sb_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_lsb:
            self._listening_sb_activities.pop(activity_id, None)

        # Cleanup listening word builder activities
        expired_lwb = [
            activity_id
            for activity_id, (_, stored_at) in self._listening_wb_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_lwb:
            self._listening_wb_activities.pop(activity_id, None)

        # Cleanup vocabulary matching activities
        expired_vm = [
            activity_id
            for activity_id, (_, stored_at) in self._vocab_matching_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_vm:
            self._vocab_matching_activities.pop(activity_id, None)

        # Cleanup speaking open response activities
        expired_sor = [
            activity_id
            for activity_id, (_, stored_at) in self._speaking_or_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_sor:
            self._speaking_or_activities.pop(activity_id, None)

        # Cleanup mix mode activities
        expired_mix = [
            activity_id
            for activity_id, (_, stored_at) in self._mix_mode_activities.items()
            if self._is_expired(stored_at)
        ]
        for activity_id in expired_mix:
            self._mix_mode_activities.pop(activity_id, None)

        total_expired = len(expired) + len(expired_ai) + len(expired_reading) + len(expired_listening) + len(expired_lfb) + len(expired_gfb) + len(expired_wfb) + len(expired_lsb) + len(expired_lwb) + len(expired_vm) + len(expired_mix)
        if total_expired:
            logger.info(
                f"Cleaned up {len(expired)} vocabulary quizzes, "
                f"{len(expired_ai)} AI quizzes, "
                f"{len(expired_reading)} reading activities, "
                f"{len(expired_listening)} listening activities"
            )

        return total_expired


# Singleton instance
_storage_instance: QuizStorageService | None = None


def get_quiz_storage_service() -> QuizStorageService:
    """
    Get the global quiz storage service instance.

    Returns:
        QuizStorageService singleton instance.
    """
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = QuizStorageService()
    return _storage_instance


def reset_quiz_storage_service() -> None:
    """Reset the storage instance (for testing)."""
    global _storage_instance
    _storage_instance = None
