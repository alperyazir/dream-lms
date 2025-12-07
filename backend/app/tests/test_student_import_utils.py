"""Unit tests for student import utility functions (Story 9.9)."""
import pytest

from app.utils import (
    TURKISH_CHAR_MAP,
    ensure_unique_username,
    generate_student_password,
    generate_username_from_fullname,
    turkish_to_ascii,
)


class TestTurkishToAscii:
    """Tests for Turkish character mapping."""

    def test_converts_turkish_lowercase(self) -> None:
        """Test conversion of Turkish lowercase characters."""
        assert turkish_to_ascii("ığüşöç") == "igusoc"

    def test_converts_turkish_uppercase(self) -> None:
        """Test conversion of Turkish uppercase characters."""
        assert turkish_to_ascii("İĞÜŞÖÇ") == "IGUSOC"

    def test_preserves_ascii_characters(self) -> None:
        """Test that ASCII characters are not modified."""
        assert turkish_to_ascii("Hello World 123") == "Hello World 123"

    def test_mixed_content(self) -> None:
        """Test mixed Turkish and ASCII content."""
        assert turkish_to_ascii("Öğrenci") == "Ogrenci"
        assert turkish_to_ascii("Şehir") == "Sehir"

    def test_empty_string(self) -> None:
        """Test empty string handling."""
        assert turkish_to_ascii("") == ""

    def test_all_mappings_present(self) -> None:
        """Verify all Turkish characters are in the mapping."""
        expected_chars = ['ı', 'İ', 'ğ', 'Ğ', 'ü', 'Ü', 'ş', 'Ş', 'ö', 'Ö', 'ç', 'Ç']
        for char in expected_chars:
            assert char in TURKISH_CHAR_MAP


class TestGenerateUsernameFromFullname:
    """Tests for username generation from full name."""

    def test_simple_name(self) -> None:
        """Test basic name conversion."""
        assert generate_username_from_fullname("John Doe") == "john.doe"

    def test_turkish_name(self) -> None:
        """Test Turkish name conversion (Story 9.9 AC 22)."""
        assert generate_username_from_fullname("Ahmet Yılmaz") == "ahmet.yilmaz"

    def test_multiple_parts_turkish(self) -> None:
        """Test name with multiple parts and Turkish characters."""
        assert generate_username_from_fullname("Ömer Faruk Şahin") == "omer.faruk.sahin"

    def test_lowercase_conversion(self) -> None:
        """Test that result is lowercase."""
        assert generate_username_from_fullname("JOHN DOE") == "john.doe"

    def test_removes_special_characters(self) -> None:
        """Test removal of special characters."""
        assert generate_username_from_fullname("John O'Brien") == "john.obrien"

    def test_handles_multiple_spaces(self) -> None:
        """Test handling of multiple spaces."""
        assert generate_username_from_fullname("John   Doe") == "john.doe"

    def test_trims_whitespace(self) -> None:
        """Test trimming of leading/trailing whitespace."""
        assert generate_username_from_fullname("  John Doe  ") == "john.doe"

    def test_empty_string(self) -> None:
        """Test empty string returns empty."""
        assert generate_username_from_fullname("") == ""

    def test_none_returns_empty(self) -> None:
        """Test None input returns empty."""
        assert generate_username_from_fullname(None) == ""  # type: ignore

    def test_whitespace_only(self) -> None:
        """Test whitespace-only string returns empty."""
        assert generate_username_from_fullname("   ") == ""

    def test_single_name(self) -> None:
        """Test single name (no spaces)."""
        assert generate_username_from_fullname("Madonna") == "madonna"

    def test_numbers_preserved(self) -> None:
        """Test that numbers in names are preserved."""
        assert generate_username_from_fullname("John Doe3") == "john.doe3"

    def test_ibrahim_celik(self) -> None:
        """Test specific Turkish name case."""
        assert generate_username_from_fullname("İbrahim Çelik") == "ibrahim.celik"

    def test_zeynep_ozturk(self) -> None:
        """Test specific Turkish name case."""
        assert generate_username_from_fullname("Zeynep Öztürk") == "zeynep.ozturk"


class TestEnsureUniqueUsername:
    """Tests for ensuring username uniqueness."""

    def test_unique_username_returned_as_is(self) -> None:
        """Test that unique username is not modified."""
        existing = {"alice.smith", "bob.jones"}
        assert ensure_unique_username("john.doe", existing) == "john.doe"

    def test_appends_number_for_duplicate(self) -> None:
        """Test that duplicate gets number appended (Story 9.9 AC 22)."""
        existing = {"john.doe"}
        assert ensure_unique_username("john.doe", existing) == "john.doe2"

    def test_increments_until_unique(self) -> None:
        """Test incrementing until finding unique username."""
        existing = {"john.doe", "john.doe2", "john.doe3"}
        assert ensure_unique_username("john.doe", existing) == "john.doe4"

    def test_empty_existing_set(self) -> None:
        """Test with empty existing usernames set."""
        assert ensure_unique_username("john.doe", set()) == "john.doe"

    def test_starts_at_2_not_1(self) -> None:
        """Test that first duplicate suffix is 2, not 1."""
        existing = {"john.doe"}
        result = ensure_unique_username("john.doe", existing)
        assert result == "john.doe2"
        assert result != "john.doe1"

    def test_raises_after_max_attempts(self) -> None:
        """Test that ValueError is raised after too many attempts."""
        # Create set with 1000+ variations
        existing = {"john.doe"} | {f"john.doe{i}" for i in range(2, 1002)}
        with pytest.raises(ValueError, match="Could not generate unique username"):
            ensure_unique_username("john.doe", existing)


class TestGenerateStudentPassword:
    """Tests for student password generation."""

    def test_default_length(self) -> None:
        """Test default password length is 8 (Story 9.9 AC 23)."""
        password = generate_student_password()
        assert len(password) == 8

    def test_custom_length(self) -> None:
        """Test custom password length."""
        password = generate_student_password(length=12)
        assert len(password) == 12

    def test_contains_lowercase(self) -> None:
        """Test password contains lowercase letters."""
        password = generate_student_password()
        assert any(c.islower() for c in password)

    def test_contains_uppercase(self) -> None:
        """Test password contains uppercase letters."""
        password = generate_student_password()
        assert any(c.isupper() for c in password)

    def test_contains_digit(self) -> None:
        """Test password contains at least one digit."""
        password = generate_student_password()
        assert any(c.isdigit() for c in password)

    def test_no_confusing_characters(self) -> None:
        """Test password excludes confusing characters (Story 9.9 AC 23)."""
        # Generate many passwords to ensure consistent behavior
        confusing_chars = {'0', 'O', '1', 'l', 'I'}
        for _ in range(100):
            password = generate_student_password()
            assert not any(c in confusing_chars for c in password), \
                f"Password '{password}' contains confusing characters"

    def test_only_alphanumeric(self) -> None:
        """Test password contains only alphanumeric characters."""
        for _ in range(50):
            password = generate_student_password()
            assert password.isalnum(), \
                f"Password '{password}' contains non-alphanumeric characters"

    def test_uniqueness(self) -> None:
        """Test that generated passwords are unique (probabilistic)."""
        passwords = {generate_student_password() for _ in range(100)}
        # With 8 characters from ~50 chars, collisions in 100 samples should be rare
        assert len(passwords) >= 95  # Allow for rare collisions

    def test_minimum_length_works(self) -> None:
        """Test password generation with minimum length (3 chars for mixed)."""
        password = generate_student_password(length=3)
        assert len(password) == 3
        # Should still have mixed characters
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        assert has_lower and has_upper and has_digit
