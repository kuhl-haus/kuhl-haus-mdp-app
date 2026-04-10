"""Tests for the health endpoint.

The health action function is called directly — no server required.
"""
import sys
from unittest.mock import MagicMock

# Stub py4web so health can be imported without a full py4web install
py4web_stub = MagicMock()
py4web_stub.action = lambda *args, **kwargs: (lambda f: f)
sys.modules.setdefault("py4web", py4web_stub)

import apps.health as health


def test_health_index_with_defaults_expect_ok_string():
    """GET /health returns the string 'OK'."""
    # Act
    result = health.page()

    # Assert
    assert result == "OK"
