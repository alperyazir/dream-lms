"""Tests for report filename generation - Story 20.7."""

from app.services.report_service import generate_report_filename, sanitize_filename


class TestSanitizeFilename:
    """Test filename sanitization function."""

    def test_basic_sanitization(self):
        """Test basic space to underscore conversion."""
        assert sanitize_filename("John Doe") == "John_Doe"

    def test_special_characters_removed(self):
        """Test that special characters are removed."""
        assert sanitize_filename("Test!@#$%") == "Test"
        # Hyphens are kept as they are filesystem-safe
        assert sanitize_filename("Report: Chapter 5 - Final") == "Report_Chapter_5_-_Final"

    def test_multiple_spaces_collapsed(self):
        """Test that multiple spaces become single underscores."""
        assert sanitize_filename("John    Doe") == "John_Doe"

    def test_leading_trailing_underscores_stripped(self):
        """Test that leading/trailing underscores are removed."""
        assert sanitize_filename("_test_") == "test"
        assert sanitize_filename("___test___") == "test"

    def test_empty_string_returns_unnamed(self):
        """Test that empty strings return 'unnamed'."""
        assert sanitize_filename("") == "unnamed"
        assert sanitize_filename("!!!") == "unnamed"

    def test_max_length_truncation(self):
        """Test that long strings are truncated."""
        long_text = "A" * 100
        result = sanitize_filename(long_text, max_length=50)
        assert len(result) == 50
        assert result == "A" * 50

    def test_max_length_with_spaces(self):
        """Test truncation with spaces."""
        long_text = "Long " * 20  # 100 characters
        result = sanitize_filename(long_text, max_length=50)
        assert len(result) <= 50
        assert not result.endswith("_")  # Should strip trailing underscore

    def test_unicode_characters_preserved(self):
        """Test that Unicode word characters are preserved by default (safe on modern filesystems)."""
        # Python's \w includes Unicode word characters, which is safe for modern systems
        assert sanitize_filename("Über") == "Über"
        assert sanitize_filename("Café") == "Café"
        assert sanitize_filename("Tëst Üser") == "Tëst_Üser"

    def test_ascii_only_transliteration(self):
        """Test that ascii_only=True transliterates Turkish characters."""
        # Turkish characters should be transliterated to ASCII
        assert sanitize_filename("Ahmet Yılmaz", ascii_only=True) == "Ahmet_Yilmaz"
        assert sanitize_filename("Şişli", ascii_only=True) == "Sisli"
        assert sanitize_filename("Çağla Öztürk", ascii_only=True) == "Cagla_Ozturk"
        assert sanitize_filename("IĞDIR", ascii_only=True) == "IGDIR"

    def test_apostrophes_removed(self):
        """Test that apostrophes are removed."""
        assert sanitize_filename("John O'Brien") == "John_OBrien"

    def test_dots_removed(self):
        """Test that dots are removed."""
        assert sanitize_filename("...test...") == "test"

    def test_hyphens_kept(self):
        """Test that hyphens are preserved."""
        assert sanitize_filename("test-file") == "test-file"


class TestGenerateReportFilename:
    """Test report filename generation function."""

    def test_student_report_filename(self):
        """Test student report filename generation."""
        filename = generate_report_filename(
            report_type="student",
            student_name="John Smith",
        )

        assert filename.startswith("John_Smith_Progress_Report_")
        assert filename.endswith(".pdf")
        # Format: John_Smith_Progress_Report_YYYYMMDD.pdf
        assert "Progress_Report" in filename

    def test_class_report_filename(self):
        """Test class report filename generation."""
        filename = generate_report_filename(
            report_type="class",
            class_name="Math 101",
        )

        assert filename.startswith("Math_101_Class_Report_")
        assert filename.endswith(".pdf")

    def test_assignment_report_filename(self):
        """Test assignment report filename generation."""
        filename = generate_report_filename(
            report_type="assignment",
            teacher_name="Jane Doe",
        )

        assert filename.startswith("Jane_Doe_Assignment_Report_")
        assert filename.endswith(".pdf")

    def test_filename_with_special_characters(self):
        """Test filename generation with names containing special characters."""
        filename = generate_report_filename(
            report_type="student",
            student_name="Über Student!",
        )

        # Unsafe special characters should be removed
        assert "!" not in filename
        # Unicode characters are transliterated to ASCII for HTTP headers
        assert filename.endswith(".pdf")

    def test_filename_turkish_characters(self):
        """Test filename generation with Turkish characters."""
        filename = generate_report_filename(
            report_type="student",
            student_name="Ahmet Yılmaz",
        )

        # Turkish 'ı' should be transliterated to 'i' for HTTP header compatibility
        assert filename.startswith("Ahmet_Yilmaz_Progress_Report_")
        assert filename.endswith(".pdf")
        assert "ı" not in filename  # No Turkish characters in final filename

    def test_filename_date_format(self):
        """Test that filename includes date in YYYYMMDD format."""
        filename = generate_report_filename(
            report_type="student",
            student_name="Test Student",
        )

        # Extract date part (last part before .pdf)
        date_part = filename.split("_")[-1].replace(".pdf", "")
        assert len(date_part) == 8  # YYYYMMDD
        assert date_part.isdigit()

    def test_fallback_for_unknown_type(self):
        """Test fallback filename for unknown report type."""
        filename = generate_report_filename(
            report_type="unknown",
        )

        assert filename.startswith("Report_")
        assert filename.endswith(".pdf")

    def test_fallback_for_missing_name(self):
        """Test fallback when required name is missing."""
        # Student report without student name
        filename = generate_report_filename(
            report_type="student",
            student_name=None,
        )

        assert filename.startswith("Report_")
        assert filename.endswith(".pdf")

    def test_long_name_truncation(self):
        """Test that long names are truncated properly."""
        long_name = "A" * 100

        filename = generate_report_filename(
            report_type="student",
            student_name=long_name,
        )

        # Name should be truncated to 40 chars
        name_part = filename.split("_")[0]
        assert len(name_part) <= 40

    def test_filename_cross_platform_safe(self):
        """Test that generated filenames are safe across platforms."""
        # Characters that are problematic on various platforms
        problematic_name = 'Student/Name<>:"|?*\\Test'

        filename = generate_report_filename(
            report_type="student",
            student_name=problematic_name,
        )

        # Should not contain any problematic characters
        assert "/" not in filename
        assert "<" not in filename
        assert ">" not in filename
        assert ":" not in filename
        assert '"' not in filename
        assert "|" not in filename
        assert "?" not in filename
        assert "*" not in filename
        assert "\\" not in filename

    def test_class_with_spaces(self):
        """Test class report with multiple words."""
        filename = generate_report_filename(
            report_type="class",
            class_name="Advanced Mathematics Grade 10",
        )

        assert "Advanced_Mathematics_Grade_10" in filename
        assert filename.endswith(".pdf")

    def test_multiple_underscores_collapsed(self):
        """Test that multiple consecutive underscores are collapsed."""
        filename = generate_report_filename(
            report_type="student",
            student_name="John    Doe",  # Multiple spaces
        )

        # Should not have multiple consecutive underscores
        assert "__" not in filename
