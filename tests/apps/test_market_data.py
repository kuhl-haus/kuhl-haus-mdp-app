"""Tests for market data enrichment endpoints.

Strategy: stub py4web, common, and settings at import time; mock Redis and
Massive REST client per test. Auth enforcement (@action.uses(auth.user)) is a
decorator-level concern handled by py4web at runtime — these tests verify the
action function return values directly.
"""
import json
import sys
import pytest
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# py4web / app import scaffolding (mirrors test_default_controllers.py pattern)
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


def _import_market_data(
    massive_api_key="test-key",
    wdc_redis_url="redis://localhost:6379/0",
):
    _stub_py4web()

    # Remove cached module so fresh import picks up patches
    for mod in list(sys.modules.keys()):
        if "apps._default" in mod:
            del sys.modules[mod]

    settings_stub = MagicMock()
    settings_stub.MASSIVE_API_KEY = massive_api_key
    settings_stub.FINLIGHT_API_KEY = "fl-test"
    settings_stub.WDC_REDIS_URL = wdc_redis_url
    sys.modules["apps._default.settings"] = settings_stub

    common_stub = MagicMock()
    sys.modules["apps._default.common"] = common_stub

    # Stub kuhl_haus.mdp imports
    mdp_stub = MagicMock()
    mdp_stub.WidgetDataCacheKeys = MagicMock()
    mdp_stub.WidgetDataCacheTTL = MagicMock()
    mdp_stub.WidgetDataCacheTTL.NEWS_TICKER = MagicMock(value=604800)
    sys.modules["kuhl_haus"] = MagicMock()
    sys.modules["kuhl_haus.mdp"] = MagicMock()
    sys.modules["kuhl_haus.mdp.analyzers"] = MagicMock()
    sys.modules["kuhl_haus.mdp.analyzers.analyzer"] = MagicMock()
    sys.modules["kuhl_haus.mdp.enum"] = MagicMock()
    sys.modules["kuhl_haus.mdp.enum.widget_data_cache_keys"] = MagicMock(
        WidgetDataCacheKeys=MagicMock()
    )
    sys.modules["kuhl_haus.mdp.enum.widget_data_cache_ttl"] = MagicMock(
        WidgetDataCacheTTL=MagicMock(NEWS_TICKER=MagicMock(value=604800))
    )
    sys.modules["kuhl_haus.mdp.helpers"] = MagicMock()
    sys.modules["kuhl_haus.mdp.helpers.structured_logging"] = MagicMock(
        setup_logging=MagicMock()
    )

    from apps._default.api import market_data
    return market_data


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_redis_mock(cached_value=None):
    """Return a mock Redis client. cached_value is the raw JSON string to return."""
    mock = MagicMock()
    mock.get.return_value = cached_value
    mock.setex.return_value = True
    return mock


def _make_short_interest_record(
    short_interest=12_000_000,
    days_to_cover=2.5,
    avg_daily_volume=5_000_000,
    settlement_date="2026-03-28",
):
    r = MagicMock()
    r.short_interest = short_interest
    r.days_to_cover = days_to_cover
    r.avg_daily_volume = avg_daily_volume
    r.settlement_date = settlement_date
    return r


def _make_short_volume_record(
    short_volume=8_000_000,
    total_volume=20_000_000,
    short_volume_ratio=40.0,
    date="2026-04-11",
    nyse_short_volume=3_000_000,
    nasdaq_carteret_short_volume=5_000_000,
):
    r = MagicMock()
    r.short_volume = short_volume
    r.total_volume = total_volume
    r.short_volume_ratio = short_volume_ratio
    r.date = date
    r.nyse_short_volume = nyse_short_volume
    r.nasdaq_carteret_short_volume = nasdaq_carteret_short_volume
    return r


# ---------------------------------------------------------------------------
# short_interest tests
# ---------------------------------------------------------------------------

class TestShortInterest:
    def test_with_cache_hit_expect_cache_returned(self):
        md = _import_market_data()
        cached_data = {"short_interest": 12_000_000, "days_to_cover": 2.5,
                       "avg_daily_volume": 5_000_000, "settlement_date": "2026-03-28"}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.short_interest("TSLA")

        assert result["symbol"] == "TSLA"
        assert result["source"] == "cache"
        assert result["data"]["short_interest"] == 12_000_000
        assert result["data"]["days_to_cover"] == 2.5
        mock_client.assert_not_called()

    def test_with_cache_hit_symbol_uppercased(self):
        md = _import_market_data()
        cached_data = {"short_interest": 5_000_000, "days_to_cover": 1.0,
                       "avg_daily_volume": 2_000_000, "settlement_date": "2026-03-28"}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        with patch.object(md, "_get_wdc", return_value=mock_redis):
            result = md.short_interest("tsla")

        assert result["symbol"] == "TSLA"

    def test_with_empty_sentinel_expect_available_false(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(json.dumps({}))

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.short_interest("TSLA")

        assert result["available"] is False
        assert result["source"] == "cache"
        mock_client.assert_not_called()

    def test_with_cache_miss_expect_api_called(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        record = _make_short_interest_record()
        mock_massive = MagicMock()
        mock_massive.list_short_interest.return_value = iter([record])

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_interest("AAPL")

        assert result["symbol"] == "AAPL"
        assert result["source"] == "api"
        assert result["data"]["short_interest"] == 12_000_000
        assert result["data"]["days_to_cover"] == 2.5
        assert result["data"]["settlement_date"] == "2026-03-28"
        mock_massive.list_short_interest.assert_called_once_with(
            ticker="AAPL", limit=1, order="desc", sort="settlement_date"
        )
        mock_redis.setex.assert_called_once()

    def test_with_api_returns_empty_expect_no_data_sentinel_written(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_massive = MagicMock()
        mock_massive.list_short_interest.return_value = iter([])

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_interest("UNKN")

        assert result["available"] is False
        assert result["source"] == "api"
        mock_redis.setex.assert_called_once()
        # sentinel written is empty dict
        _, ttl, payload = mock_redis.setex.call_args[0]
        assert json.loads(payload) == {}

    def test_with_api_failure_expect_graceful_error(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_massive = MagicMock()
        mock_massive.list_short_interest.side_effect = RuntimeError("API down")

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_interest("TSLA")

        assert "error" in result
        assert result["data"] == {}
        # retry sentinel written
        mock_redis.setex.assert_called_once()
        _, ttl, _ = mock_redis.setex.call_args[0]
        assert ttl == 60  # _RETRY_TTL


# ---------------------------------------------------------------------------
# short_volume tests
# ---------------------------------------------------------------------------

class TestShortVolume:
    def test_with_cache_hit_expect_cache_returned(self):
        md = _import_market_data()
        cached_data = {"short_volume": 8_000_000, "total_volume": 20_000_000,
                       "short_volume_ratio": 40.0, "date": "2026-04-11",
                       "nyse_short_volume": 3_000_000,
                       "nasdaq_carteret_short_volume": 5_000_000}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.short_volume("TSLA")

        assert result["symbol"] == "TSLA"
        assert result["source"] == "cache"
        assert result["data"]["short_volume_ratio"] == 40.0
        assert result["data"]["date"] == "2026-04-11"
        mock_client.assert_not_called()

    def test_with_cache_hit_symbol_uppercased(self):
        md = _import_market_data()
        cached_data = {"short_volume": 1_000_000, "total_volume": 3_000_000,
                       "short_volume_ratio": 33.3, "date": "2026-04-11",
                       "nyse_short_volume": None, "nasdaq_carteret_short_volume": None}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        with patch.object(md, "_get_wdc", return_value=mock_redis):
            result = md.short_volume("aapl")

        assert result["symbol"] == "AAPL"

    def test_with_empty_sentinel_expect_available_false(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(json.dumps({}))

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.short_volume("TSLA")

        assert result["available"] is False
        assert result["source"] == "cache"
        mock_client.assert_not_called()

    def test_with_cache_miss_expect_api_called(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        record = _make_short_volume_record()
        mock_massive = MagicMock()
        mock_massive.list_short_volume.return_value = iter([record])

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_volume("AAPL")

        assert result["symbol"] == "AAPL"
        assert result["source"] == "api"
        assert result["data"]["short_volume"] == 8_000_000
        assert result["data"]["short_volume_ratio"] == 40.0
        assert result["data"]["date"] == "2026-04-11"
        assert result["data"]["nyse_short_volume"] == 3_000_000
        assert result["data"]["nasdaq_carteret_short_volume"] == 5_000_000
        mock_massive.list_short_volume.assert_called_once_with(
            ticker="AAPL", limit=1, order="desc", sort="date"
        )
        mock_redis.setex.assert_called_once()

    def test_with_api_returns_empty_expect_no_data_sentinel_written(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_massive = MagicMock()
        mock_massive.list_short_volume.return_value = iter([])

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_volume("UNKN")

        assert result["available"] is False
        assert result["source"] == "api"
        mock_redis.setex.assert_called_once()
        _, ttl, payload = mock_redis.setex.call_args[0]
        assert json.loads(payload) == {}

    def test_with_api_failure_expect_graceful_error(self):
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_massive = MagicMock()
        mock_massive.list_short_volume.side_effect = RuntimeError("timeout")

        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.short_volume("TSLA")

        assert "error" in result
        assert result["data"] == {}
        mock_redis.setex.assert_called_once()
        _, ttl, _ = mock_redis.setex.call_args[0]
        assert ttl == 60  # _RETRY_TTL

    def test_short_volume_and_short_interest_use_separate_cache_keys(self):
        """Verify the two endpoints write to distinct cache namespaces."""
        md = _import_market_data()

        si_redis = _make_redis_mock(None)
        sv_redis = _make_redis_mock(None)
        si_massive = MagicMock()
        si_massive.list_short_interest.return_value = iter([_make_short_interest_record()])
        sv_massive = MagicMock()
        sv_massive.list_short_volume.return_value = iter([_make_short_volume_record()])

        with patch.object(md, "_get_wdc", return_value=si_redis), \
             patch.object(md, "_get_massive_client", return_value=si_massive):
            md.short_interest("TSLA")

        with patch.object(md, "_get_wdc", return_value=sv_redis), \
             patch.object(md, "_get_massive_client", return_value=sv_massive):
            md.short_volume("TSLA")

        si_key = si_redis.setex.call_args[0][0]
        sv_key = sv_redis.setex.call_args[0][0]
        assert si_key != sv_key
        assert "short_interest" in si_key
        assert "short_volume" in sv_key
