from unittest.mock import MagicMock, patch

from sqlmodel import select

from app.backend_pre_start import init, logger


def test_init_successful_connection() -> None:
    engine_mock = MagicMock()

    # Create a mock for the session that properly handles context manager
    session_instance = MagicMock()
    exec_mock = MagicMock(return_value=True)
    session_instance.exec = exec_mock

    # Mock Session to return our instance when used as context manager
    session_mock = MagicMock()
    session_mock.return_value.__enter__.return_value = session_instance
    session_mock.return_value.__exit__.return_value = None

    with (
        patch("app.backend_pre_start.Session", session_mock),
        patch.object(logger, "info"),
        patch.object(logger, "error"),
        patch.object(logger, "warn"),
    ):
        try:
            init(engine_mock)
            connection_successful = True
        except Exception:
            connection_successful = False

        assert (
            connection_successful
        ), "The database connection should be successful and not raise an exception."

        # Verify exec was called once (select(1) creates different objects each time)
        session_instance.exec.assert_called_once()
