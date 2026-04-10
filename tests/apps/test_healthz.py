"""Tests for the healthz endpoint.

The healthz action function is called directly — no server required.
os.environ is patched to control IMAGE_VERSION and CONTAINER_IMAGE.
"""
import importlib
import sys
from unittest.mock import MagicMock
import pytest

# Stub py4web so healthz can be imported without a full py4web install
# The @action decorator is a no-op in tests — we call page() directly.
py4web_stub = MagicMock()
py4web_stub.action = lambda *args, **kwargs: (lambda f: f)
sys.modules.setdefault("py4web", py4web_stub)


def _load_healthz(monkeypatch, env=None):
    """Import the healthz module with a clean environment.

    Removes any cached import so env patches take effect on module-level
    reads (os.environ.get at import time is not used here — the function
    reads os.environ at call time, so no reload needed).
    """
    if env:
        for key, value in env.items():
            monkeypatch.setenv(key, value)
    # Remove cached module so a fresh import picks up patched env
    for mod in list(sys.modules.keys()):
        if 'healthz' in mod:
            del sys.modules[mod]
    import apps.healthz as healthz
    return healthz


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_healthz_index_with_defaults_expect_status_ok(monkeypatch):
    """GET /healthz returns status OK with default env vars."""
    # Arrange — clear any IMAGE_VERSION / CONTAINER_IMAGE from environment
    monkeypatch.delenv('IMAGE_VERSION', raising=False)
    monkeypatch.delenv('CONTAINER_IMAGE', raising=False)
    healthz = _load_healthz(monkeypatch)

    # Act
    result = healthz.page()

    # Assert
    assert result['status'] == 'OK'
    assert 'version' in result
    assert result['image_version'] == 'Unknown'
    assert result['container_image'] == 'Unknown'


def test_healthz_index_with_image_version_env_expect_version_in_response(monkeypatch):
    """IMAGE_VERSION env var is reflected in the response."""
    # Arrange
    healthz = _load_healthz(monkeypatch, {'IMAGE_VERSION': '1.2.3'})

    # Act
    result = healthz.page()

    # Assert
    assert result['image_version'] == '1.2.3'
    assert result['status'] == 'OK'


def test_healthz_index_with_container_image_env_expect_image_in_response(monkeypatch):
    """CONTAINER_IMAGE env var is reflected in the response."""
    # Arrange
    healthz = _load_healthz(monkeypatch, {'CONTAINER_IMAGE': 'ghcr.io/kuhl-haus/kuhl-haus-mdp-app:1.2.3'})

    # Act
    result = healthz.page()

    # Assert
    assert result['container_image'] == 'ghcr.io/kuhl-haus/kuhl-haus-mdp-app:1.2.3'
    assert result['status'] == 'OK'


def test_healthz_index_with_all_env_vars_expect_all_reflected(monkeypatch):
    """All env vars reflected in a single response."""
    # Arrange
    healthz = _load_healthz(monkeypatch, {
        'IMAGE_VERSION': '2.0.0',
        'CONTAINER_IMAGE': 'ghcr.io/kuhl-haus/kuhl-haus-mdp-app:2.0.0',
    })

    # Act
    result = healthz.page()

    # Assert
    assert result['status'] == 'OK'
    assert result['image_version'] == '2.0.0'
    assert result['container_image'] == 'ghcr.io/kuhl-haus/kuhl-haus-mdp-app:2.0.0'
    assert 'version' in result  # py4web version — present but value not asserted
