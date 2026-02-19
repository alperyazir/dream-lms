from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import (
    ActivityFormat,
    SkillCategory,
    SkillFormatCombination,
    User,
    UserCreate,
    UserRole,
)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

# Async engine for async operations (e.g., BookService)
async_engine: AsyncEngine = create_async_engine(
    str(settings.SQLALCHEMY_DATABASE_URI).replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
    future=True,
)


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    # 1. Create admin user
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            username="admin",
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            role=UserRole.admin,
        )
        user = crud.create_user(session=session, user_create=user_in)

    # 2. Seed skill categories, activity formats, and valid combinations
    _seed_skill_data(session)


def _seed_skill_data(session: Session) -> None:
    """Seed SkillCategory, ActivityFormat, and SkillFormatCombination tables (idempotent)."""

    # --- Skill Categories ---
    skill_defs = [
        ("Listening", "listening", "ear", "blue", 1, True),
        ("Reading", "reading", "book-open", "green", 2, True),
        ("Writing", "writing", "pencil", "orange", 3, True),
        ("Speaking", "speaking", "mic", "purple", 4, False),
        ("Vocabulary", "vocabulary", "text", "teal", 5, True),
        ("Grammar", "grammar", "braces", "indigo", 6, True),
    ]
    skills: dict[str, SkillCategory] = {}
    for name, slug, icon, color, order, active in skill_defs:
        existing = session.exec(
            select(SkillCategory).where(SkillCategory.slug == slug)
        ).first()
        if existing:
            skills[slug] = existing
        else:
            sc = SkillCategory(
                name=name, slug=slug, icon=icon, color=color,
                display_order=order, is_active=active,
            )
            session.add(sc)
            skills[slug] = sc

    # --- Activity Formats ---
    format_defs = [
        ("Quiz (MCQ)", "multiple_choice", "Multiple choice questions"),
        ("Word Builder", "word_builder", "Build words from scrambled letters"),
        ("Matching", "matching", "Match items from two columns"),
        ("Fill-in-the-blank", "fill_blank", "Fill in missing words"),
        ("Sentence Builder", "sentence_builder", "Arrange words to form sentences"),
        ("Comprehension", "comprehension", "Reading or listening comprehension"),
    ]
    formats: dict[str, ActivityFormat] = {}
    for name, slug, desc in format_defs:
        existing = session.exec(
            select(ActivityFormat).where(ActivityFormat.slug == slug)
        ).first()
        if existing:
            formats[slug] = existing
        else:
            af = ActivityFormat(name=name, slug=slug, description=desc)
            session.add(af)
            formats[slug] = af

    session.flush()  # Assign IDs before creating combinations

    # --- Skill × Format Combinations (v1 matrix from Epic 30) ---
    combo_defs = [
        # (skill_slug, format_slug, display_order, prompt_key)
        ("listening", "multiple_choice", 1, "listening_quiz"),
        ("listening", "fill_blank", 2, "listening_fill_blank"),
        ("listening", "sentence_builder", 3, "listening_sentence_builder"),
        ("listening", "word_builder", 4, "listening_word_builder"),
        ("reading", "comprehension", 1, "reading_comprehension"),
        ("writing", "sentence_builder", 1, "writing_sentence_builder"),
        ("writing", "fill_blank", 2, "writing_fill_blank"),
        ("vocabulary", "multiple_choice", 1, "vocabulary_quiz"),
        ("vocabulary", "word_builder", 2, "vocabulary_word_builder"),
        ("vocabulary", "matching", 3, "vocabulary_matching"),
        ("vocabulary", "fill_blank", 4, "vocabulary_fill_blank"),
        ("grammar", "multiple_choice", 1, "grammar_quiz"),
        ("grammar", "fill_blank", 2, "grammar_fill_blank"),
    ]
    for skill_slug, fmt_slug, order, prompt_key in combo_defs:
        existing = session.exec(
            select(SkillFormatCombination).where(
                SkillFormatCombination.skill_id == skills[skill_slug].id,
                SkillFormatCombination.format_id == formats[fmt_slug].id,
            )
        ).first()
        if existing:
            continue
        combo = SkillFormatCombination(
            skill_id=skills[skill_slug].id,
            format_id=formats[fmt_slug].id,
            display_order=order,
            generation_prompt_key=prompt_key,
        )
        session.add(combo)

    session.commit()
