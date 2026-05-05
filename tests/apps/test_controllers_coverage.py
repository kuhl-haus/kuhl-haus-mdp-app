"""Coverage tests for missing paths in apps/_default/controllers.py.

test_default_controllers.py is FROZEN — this file covers the remaining
branches that were not covered there:
  - get_versions() when importlib.metadata.version() raises (lines 54-56)
  - get_versions() when version.txt exists with a valid version (lines 59-60)
  - get_versions() when version.txt contains 'latest' (lines 61-63: fallback to IMAGE_VERSION)
"""
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch
import pytest


# ---------------------------------------------------------------------------
# py4web / app import scaffolding (mirrors test_market_data.py pattern)
# ---------------------------------------------------------------------------

def _stub_py4web():
    py4web = MagicMock()
    _passthrough = lambda *a, **kw: (lambda f: f)
    _passthrough.uses = lambda *a, **kw: (lambda f: f)
    py4web.action = _passthrough
    stubs = {
        "py4web": py4web,
        "py4web.core": MagicMock(required_folder=lambda *a: "/tmp"),
        "py4web.utils": MagicMock(),
        "py4web.utils.auth": MagicMock(),
        "py4web.utils.factories": MagicMock(),
        "py4web.utils.form": MagicMock(),
        "py4web.utils.grid": MagicMock(),
        "py4web.utils.downloader": MagicMock(),
        "py4web.utils.mailer": MagicMock(),
        "py4web.server_adapters": MagicMock(),
        "py4web.server_adapters.logging_utils": MagicMock(
            make_logger=MagicMock(return_value=MagicMock())
        ),
        "pydal": MagicMock(),
        "pydal.tools": MagicMock(),
        "pydal.tools.scheduler": MagicMock(),
        "pydal.tools.tags": MagicMock(),
        "yatl": MagicMock(),
        "yatl.helpers": MagicMock(),
    }
    for key, val in stubs.items():
        sys.modules[key] = val


def _import_controllers(
    app_folder="/tmp",
    env_vars=None,
):
    """Import controllers fresh each call, with a stubbed py4web environment."""
    _stub_py4web()

    # Remove previously cached modules
    for mod in list(sys.modules.keys()):
        if "apps._default" in mod or "apps._dashboard" in mod:
            del sys.modules[mod]

    # Build settings stub
    settings_stub = MagicMock()
    settings_stub.APP_FOLDER = app_folder
    settings_stub.FINLIGHT_API_KEY = "fl-test"
    settings_stub.MASSIVE_API_KEY = "ms-test"
    settings_stub.WDS_API_KEY = "wds-test"
    settings_stub.WDS_ENDPOINT = "ws://localhost:4202/ws"
    sys.modules["apps._default.settings"] = settings_stub

    common_stub = MagicMock()
    sys.modules["apps._default.common"] = common_stub

    # Stub market_data to avoid double-importing its heavy deps
    sys.modules["apps._default.api"] = MagicMock()
    sys.modules["apps._default.api.market_data"] = MagicMock()

    # Stub kuhl_haus to satisfy any transitive imports
    sys.modules.setdefault("kuhl_haus", MagicMock())
    sys.modules.setdefault("kuhl_haus.mdp", MagicMock())
    sys.modules.setdefault("kuhl_haus.mdp.enum", MagicMock())
    sys.modules.setdefault("kuhl_haus.mdp.enum.widget_data_cache_keys", MagicMock(WidgetDataCacheKeys=MagicMock()))
    sys.modules.setdefault("kuhl_haus.mdp.enum.widget_data_cache_ttl", MagicMock(WidgetDataCacheTTL=MagicMock(NEWS_TICKER=MagicMock(value=604800))))
    sys.modules.setdefault("kuhl_haus.mdp.helpers", MagicMock())
    sys.modules.setdefault("kuhl_haus.mdp.helpers.structured_logging", MagicMock(setup_logging=MagicMock()))
    sys.modules.setdefault("kuhl_haus.mdp.analyzers", MagicMock())
    sys.modules.setdefault("kuhl_haus.mdp.analyzers.analyzer", MagicMock())

    # Stub py4web.Cache to avoid needing a real py4web Cache
    cache_stub = MagicMock()
    # Cache.memoize() returns the original function unchanged
    cache_stub.memoize.return_value = lambda f: f
    sys.modules["py4web"].Cache.return_value = cache_stub

    from apps._default import controllers
    return controllers


# ---------------------------------------------------------------------------
# get_versions() tests
# ---------------------------------------------------------------------------

def test_get_versions_with_importlib_error_expect_unknown_py4web_version(monkeypatch):
    """When importlib.metadata.version() raises, py4web_version becomes 'Unknown'."""
    with tempfile.TemporaryDirectory() as tmpdir:
        controllers = _import_controllers(app_folder=tmpdir)
        monkeypatch.setenv("IMAGE_VERSION", "1.0.0")
        monkeypatch.setenv("CONTAINER_IMAGE", "ghcr.io/test:1.0.0")

        # Arrange — make importlib raise
        with patch("apps._default.controllers.version", side_effect=Exception("pkg not found")):
            result = controllers.get_versions()

        # Assert
        assert result["py4web version:"] == "Unknown"


def test_get_versions_with_version_txt_expect_image_version_from_file(monkeypatch):
    """When version.txt exists with a real version string, image_version is read from it."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write a valid version.txt
        version_txt = os.path.join(tmpdir, "version.txt")
        with open(version_txt, "w") as f:
            f.write("2.3.4\n")

        controllers = _import_controllers(app_folder=tmpdir)
        monkeypatch.setenv("IMAGE_VERSION", "should-not-be-used")

        with patch("apps._default.controllers.version", return_value="0.99"):
            result = controllers.get_versions()

        # Assert — read from file, not from env var
        assert result["image version:"] == "2.3.4"


def test_get_versions_with_version_txt_latest_expect_image_version_env_fallback(monkeypatch):
    """When version.txt contains 'latest', falls back to IMAGE_VERSION env var."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Write version.txt with 'latest'
        version_txt = os.path.join(tmpdir, "version.txt")
        with open(version_txt, "w") as f:
            f.write("latest\n")

        controllers = _import_controllers(app_folder=tmpdir)
        monkeypatch.setenv("IMAGE_VERSION", "env-fallback-version")

        with patch("apps._default.controllers.version", return_value="0.99"):
            result = controllers.get_versions()

        # Assert — 'latest' sentinel triggers fallback to IMAGE_VERSION
        assert result["image version:"] == "env-fallback-version"
