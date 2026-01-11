"""
DCS AI Service Exceptions.

Custom exceptions for the DCS AI Service Client.
These exceptions provide specific error handling for AI data operations.
"""


class DCSAIDataError(Exception):
    """
    Base exception for DCS AI data operations.

    All DCS AI-related exceptions inherit from this class.

    Attributes:
        message: Human-readable error description.
        book_id: Optional book ID related to the error.
    """

    def __init__(self, message: str, book_id: int | None = None) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            book_id: Optional book ID related to the error.
        """
        self.message = message
        self.book_id = book_id
        super().__init__(self.message)


class DCSAIDataNotFoundError(DCSAIDataError):
    """
    Raised when AI data is not found for a book (404).

    This typically occurs when:
    - The book has not been processed by the AI extraction pipeline.
    - The requested module or vocabulary does not exist.
    - The audio file has not been generated.

    This is a recoverable error - the caller should handle this gracefully
    by returning None or an appropriate fallback.

    Attributes:
        message: Human-readable error description.
        book_id: Book ID that was not found.
        resource: Optional resource type (module, vocabulary, audio).
    """

    def __init__(
        self,
        message: str = "AI data not found",
        book_id: int | None = None,
        resource: str | None = None,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            book_id: Book ID that was not found.
            resource: Optional resource type (module, vocabulary, audio).
        """
        self.resource = resource
        super().__init__(message, book_id)


class DCSAIDataNotReadyError(DCSAIDataError):
    """
    Raised when AI data exists but is not ready for use.

    This occurs when:
    - The book is still being processed (status: pending/processing).
    - The processing failed (status: failed).
    - The data is partially available (status: partial).

    The caller may want to retry after some delay or notify the user.

    Attributes:
        message: Human-readable error description.
        book_id: Book ID with incomplete processing.
        status: Current processing status.
    """

    def __init__(
        self,
        message: str = "AI data not ready",
        book_id: int | None = None,
        status: str | None = None,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            book_id: Book ID with incomplete processing.
            status: Current processing status.
        """
        self.status = status
        super().__init__(message, book_id)


class DCSAIDataAuthError(DCSAIDataError):
    """
    Raised when authentication with DCS fails.

    This occurs when:
    - The DCS credentials are invalid or expired.
    - The LMS does not have permission to access AI data.
    - The JWT token has expired and could not be refreshed.

    This is a critical error that requires administrator attention.

    Attributes:
        message: Human-readable error description.
        book_id: Optional book ID related to the request.
    """

    def __init__(
        self,
        message: str = "DCS authentication failed",
        book_id: int | None = None,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            book_id: Optional book ID related to the request.
        """
        super().__init__(message, book_id)


class DCSAIDataConnectionError(DCSAIDataError):
    """
    Raised when connection to DCS fails.

    This occurs when:
    - The DCS server is unreachable.
    - Network timeout occurs.
    - DCS returns a server error (5xx).

    The caller should implement retry logic with exponential backoff.

    Attributes:
        message: Human-readable error description.
        book_id: Optional book ID related to the request.
        original_error: Optional original exception that caused this error.
    """

    def __init__(
        self,
        message: str = "DCS connection failed",
        book_id: int | None = None,
        original_error: Exception | None = None,
    ) -> None:
        """
        Initialize the exception.

        Args:
            message: Human-readable error description.
            book_id: Optional book ID related to the request.
            original_error: Optional original exception that caused this error.
        """
        self.original_error = original_error
        super().__init__(message, book_id)
