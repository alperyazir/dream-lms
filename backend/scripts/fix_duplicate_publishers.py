"""
Script to fix duplicate publisher records.

Problem: After book sync auto-creates publishers (user_id=None),
admin creates new publishers with same name but with user accounts.
Result: Books linked to auto-created publishers, users linked to admin-created ones.

Solution:
1. Find auto-created publishers (user_id=None) that have books
2. Find admin-created publishers with user accounts but no books
3. DELETE duplicates first (to avoid unique constraint violation)
4. Then link users to the publishers with books

Usage:
    cd backend
    python scripts/fix_duplicate_publishers.py
"""

import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from sqlalchemy import func

from app.core.db import engine
from app.models import Publisher, Book, BookAccess, User


def fix_duplicate_publishers():
    """Fix duplicate publisher records by linking users to publishers with books."""
    with Session(engine) as session:
        # Get all publishers
        all_publishers = session.exec(select(Publisher)).all()

        print(f"📊 Found {len(all_publishers)} total publisher records\n")

        # Group publishers by name
        publishers_by_name: dict[str, list[Publisher]] = {}
        for pub in all_publishers:
            if pub.name not in publishers_by_name:
                publishers_by_name[pub.name] = []
            publishers_by_name[pub.name].append(pub)

        # Find duplicates (same name, multiple records)
        duplicates = {name: pubs for name, pubs in publishers_by_name.items() if len(pubs) > 1}

        if not duplicates:
            print("✅ No duplicate publishers found. Database is clean.")
            return

        print(f"🔍 Found {len(duplicates)} publisher names with duplicates:\n")

        # Analyze duplicates
        fixes_to_apply = []  # List of (pub_with_books, users_to_link, pubs_to_delete)

        for name, pubs in duplicates.items():
            print(f"  Publisher: '{name}' ({len(pubs)} records)")

            pub_with_books = None
            pubs_with_users = []

            for pub in pubs:
                # Count books for this publisher
                book_count = session.exec(
                    select(func.count()).select_from(Book).where(Book.publisher_id == pub.id)
                ).one()

                # Get user if exists
                user = session.get(User, pub.user_id) if pub.user_id else None

                print(f"    - ID: {pub.id}")
                print(f"      user_id: {pub.user_id or 'None (auto-created)'}")
                if user:
                    print(f"      username: {user.username}")
                print(f"      books: {book_count}")

                if book_count > 0 and pub_with_books is None:
                    pub_with_books = pub
                if pub.user_id and book_count == 0:
                    pubs_with_users.append((pub, user))

            print()

            if pub_with_books and pubs_with_users:
                fixes_to_apply.append((pub_with_books, pubs_with_users))

        if not fixes_to_apply:
            print("⚠️  No fixes to apply (no publisher with both books and users to link)")
            return

        # Now apply fixes
        print("\n" + "="*60)
        print("🔧 FIXING DUPLICATES")
        print("="*60 + "\n")

        for pub_with_books, pubs_with_users in fixes_to_apply:
            print(f"Fixing publisher: '{pub_with_books.name}'")
            print(f"  Target (has books): {pub_with_books.id}")

            # Get the first user to link
            first_dup, first_user = pubs_with_users[0]
            user_id_to_link = first_user.id
            username_to_link = first_user.username

            print(f"  Will link user: {username_to_link} ({user_id_to_link})")

            # Step 1: DELETE all duplicate publishers (the ones with users but no books)
            print(f"\n  Step 1: Deleting {len(pubs_with_users)} duplicate publisher(s)...")
            for dup_pub, dup_user in pubs_with_users:
                print(f"    → Deleting publisher {dup_pub.id} (linked to {dup_user.username})")
                session.delete(dup_pub)

            # Flush deletes to clear the unique constraint
            session.flush()
            print("    ✓ Duplicates deleted")

            # Step 2: Now link the user to the publisher with books
            print(f"\n  Step 2: Linking user '{username_to_link}' to publisher {pub_with_books.id}...")
            pub_with_books.user_id = user_id_to_link
            session.flush()
            print("    ✓ User linked")

            if len(pubs_with_users) > 1:
                print(f"\n  ⚠️  Warning: Only first user linked. Orphaned users:")
                for _, extra_user in pubs_with_users[1:]:
                    print(f"     - {extra_user.username} (needs new publisher record)")

        # Commit all changes
        session.commit()
        print("\n✅ All changes committed successfully!")

        # Show final state
        print("\n" + "="*60)
        print("📊 FINAL STATE")
        print("="*60 + "\n")

        final_publishers = session.exec(select(Publisher)).all()
        for pub in final_publishers:
            book_count = session.exec(
                select(func.count()).select_from(Book).where(Book.publisher_id == pub.id)
            ).one()
            user = session.get(User, pub.user_id) if pub.user_id else None

            print(f"  {pub.name}")
            print(f"    ID: {pub.id}")
            print(f"    User: {user.username if user else 'None'}")
            print(f"    Books: {book_count}")
            print()


if __name__ == "__main__":
    try:
        fix_duplicate_publishers()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
