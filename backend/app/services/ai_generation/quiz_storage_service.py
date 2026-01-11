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

        total_expired = len(expired) + len(expired_ai) + len(expired_reading)
        if total_expired:
            logger.info(
                f"Cleaned up {len(expired)} vocabulary quizzes, "
                f"{len(expired_ai)} AI quizzes, "
                f"{len(expired_reading)} reading activities"
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
