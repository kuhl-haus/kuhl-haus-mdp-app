"""Tests for _default app controllers.

Controllers are tested by stubbing the entire py4web + common module
dependency chain and calling the action functions directly. Auth enforcement
(@action.uses(auth.user)) is a decorator-level concern handled by py4web
at runtime; these tests verify the function return values.
"""
import sys
import pytest
from unittest.mock import MagicMock, patch


def _stub_py4web():
    """Inject minimal py4web stubs so controllers.py can be imported."""
    py4web = MagicMock()
    # action must support both @action(...) and @action.uses(...)
    _passthrough = lambda *a, **kw: (lambda f: f)
    _passthrough.uses = lambda *a, **kw: (lambda f: f)
    py4web.action = _passthrough
    py4web.Cache = MagicMock(return_value=MagicMock(
        memoize=lambda **kw: (lambda f: f)
    ))

    stubs = {
        "py4web": py4web,
        "py4web.core": MagicMock(required_folder=lambda *a: '/tmp'),
        "py4web.utils": MagicMock(),
        "py4web.utils.auth": MagicMock(),
        "py4web.utils.factories": MagicMock(),
        "py4web.utils.form": MagicMock(),
        "py4web.utils.grid": MagicMock(),
        "py4web.utils.downloader": MagicMock(),
        "py4web.utils.mailer": MagicMock(),
        "py4web.server_adapters": MagicMock(),
        "py4web.server_adapters.logging_utils": MagicMock(make_logger=MagicMock(return_value=MagicMock())),
        "pydal": MagicMock(),
        "pydal.tools": MagicMock(),
        "pydal.tools.scheduler": MagicMock(),
        "pydal.tools.tags": MagicMock(),
        "yatl": MagicMock(),
        "yatl.helpers": MagicMock(),
    }
    for key, val in stubs.items():
        sys.modules[key] = val  # always override to ensure .uses is available


def _import_controllers(wds_api_key='test-api-key', wds_endpoint='ws://localhost:4202/ws', mock_auth=None):
    """Import controllers with stubbed dependencies."""
    _stub_py4web()

    # Remove cached modules so fresh import picks up patches
    for mod in list(sys.modules.keys()):
        if 'apps._default' in mod:
            del sys.modules[mod]

    if mock_auth is None:
        mock_auth = MagicMock()
        mock_auth.get_user.return_value = None

    # Stub common and settings before controllers imports them
    mock_common = MagicMock()
    mock_common.auth = mock_auth
    mock_common.session = MagicMock()
    mock_common.db = MagicMock()
    mock_common.T = lambda s, **kw: s

    mock_settings = MagicMock()
    mock_settings.WDS_API_KEY = wds_api_key
    mock_settings.WDS_ENDPOINT = wds_endpoint
    mock_settings.MASSIVE_API_KEY = ''
    mock_settings.FINLIGHT_API_KEY = ''
    mock_settings.APP_FOLDER = '/tmp'

    sys.modules['apps._default.common'] = mock_common
    sys.modules['apps._default.settings'] = mock_settings

    import importlib.util, os
    spec = importlib.util.spec_from_file_location(
        'apps._default.controllers_module',
        os.path.join(os.path.dirname(__file__), '../../apps/_default/controllers.py')
    )
    controllers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(controllers)
    # Patch auth and settings used inside the functions
    controllers.auth = mock_auth
    controllers.WDS_API_KEY = wds_api_key
    controllers.WDS_ENDPOINT = wds_endpoint
    return controllers


# ---------------------------------------------------------------------------
# index()
# ---------------------------------------------------------------------------

def test_index_with_unauthenticated_user_expect_hello_message():
    """index() with no logged-in user returns a generic hello message."""
    mock_auth = MagicMock()
    mock_auth.get_user.return_value = None
    controllers = _import_controllers(mock_auth=mock_auth)

    result = controllers.index()

    assert 'message' in result
    # Unauthenticated: generic greeting
    msg = result['message']
    assert 'Hello' in msg or 'there' in msg.lower() or 'Login' in msg


def test_index_with_authenticated_user_expect_personalized_message():
    """index() with a logged-in user returns a personalized hello."""
    mock_auth = MagicMock()
    mock_auth.get_user.return_value = {'first_name': 'Tom', 'last_name': 'Pounders'}
    controllers = _import_controllers(mock_auth=mock_auth)

    result = controllers.index()

    assert 'message' in result
    assert 'Tom' in result['message']


# ---------------------------------------------------------------------------
# app()
# ---------------------------------------------------------------------------

def test_app_with_authenticated_user_expect_no_api_key_in_context():
    """app() no longer returns api_key (moved to /api/get_config)."""
    controllers = _import_controllers(
        wds_api_key='app-api-key',
        wds_endpoint='ws://app:4202/ws',
    )

    result = controllers.app()

    assert 'api_key' not in result, (
        "api_key must not be returned by app() -- credentials must not be "
        "embedded in the HTML response. Use /api/get_config instead."
    )


def test_app_with_authenticated_user_expect_no_ws_endpoint_in_context():
    """app() no longer returns ws_endpoint (moved to /api/get_config)."""
    controllers = _import_controllers(
        wds_api_key='app-api-key',
        wds_endpoint='ws://app:4202/ws',
    )

    result = controllers.app()

    assert 'ws_endpoint' not in result, (
        "ws_endpoint must not be returned by app() -- credentials must not be "
        "embedded in the HTML response. Use /api/get_config instead."
    )


# ---------------------------------------------------------------------------
# get_config()
# ---------------------------------------------------------------------------

def test_get_config_with_authenticated_user_expect_api_key_and_endpoint():
    """get_config() returns WDS api_key, ws_endpoint, massive_api_key, finlight_api_key."""
    controllers = _import_controllers(
        wds_api_key='config-api-key',
        wds_endpoint='ws://config:4202/ws',
    )
    controllers.MASSIVE_API_KEY = 'massive-key'
    controllers.FINLIGHT_API_KEY = 'finlight-key'

    result = controllers.get_config()

    assert result['api_key'] == 'config-api-key'
    assert result['ws_endpoint'] == 'ws://config:4202/ws'
    assert result['massive_api_key'] == 'massive-key'
    assert result['finlight_api_key'] == 'finlight-key'


def test_get_config_with_none_optional_keys_expect_none_in_response():
    """get_config() returns None for massive_api_key and finlight_api_key when not configured."""
    controllers = _import_controllers(
        wds_api_key='test-key',
        wds_endpoint='ws://localhost:4202/ws',
    )
    controllers.MASSIVE_API_KEY = None
    controllers.FINLIGHT_API_KEY = None

    result = controllers.get_config()

    assert result['massive_api_key'] is None
    assert result['finlight_api_key'] is None


def test_get_config_response_shape_expect_all_four_required_keys():
    """get_config() response contains all four keys required by useConfig() composable.

    useConfig() in the frontend maps:
      api_key          → config.apiKey
      ws_endpoint      → config.wsEndpoint
      massive_api_key  → config.massiveApiKey
      finlight_api_key → config.finlightApiKey

    """
    controllers = _import_controllers()

    result = controllers.get_config()

    expected_keys = {'api_key', 'ws_endpoint', 'massive_api_key', 'finlight_api_key'}
    assert expected_keys <= set(result.keys()), (
        f"Response shape mismatch. Got {set(result.keys())} expected {expected_keys}. "
        "Frontend useConfig() depends on all four keys being present."
    )


def test_get_config_with_empty_wds_api_key_expect_empty_string_in_response():
    """get_config() passes through empty string api_key without modification."""
    controllers = _import_controllers(wds_api_key='', wds_endpoint='ws://localhost:4202/ws')

    result = controllers.get_config()

    assert result['api_key'] == ''

