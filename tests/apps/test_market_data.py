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

class _HTTP404(Exception):
    """Minimal HTTP exception stub matching py4web HTTP interface."""
    def __init__(self, status=200, *args, **kwargs):
        self.status = status
        super().__init__(status)


def _stub_py4web():
    py4web = MagicMock()
    _passthrough = lambda *a, **kw: (lambda f: f)
    _passthrough.uses = lambda *a, **kw: (lambda f: f)
    py4web.action = _passthrough
    py4web.HTTP = _HTTP404
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


# ---------------------------------------------------------------------------
# logo tests
# ---------------------------------------------------------------------------

class TestLogo:
    def _make_bytes_redis_mock(self, cached_value=None):
        """Return a mock Redis client for byte values."""
        mock = MagicMock()
        mock.get.return_value = cached_value
        mock.setex.return_value = True
        return mock

    def test_logo_with_no_overview_cache_expect_404(self):
        # Arrange
        md = _import_market_data()
        mock_bytes_redis = self._make_bytes_redis_mock(None)  # no cached bytes
        mock_str_redis = _make_redis_mock(None)               # no overview cache

        # Act / Assert
        with patch.object(md, "_get_wdc_bytes", return_value=mock_bytes_redis), \
             patch.object(md, "_get_wdc", return_value=mock_str_redis):
            with pytest.raises(_HTTP404) as exc_info:
                md.logo("AAPL")

        assert exc_info.value.status == 404

    def test_logo_with_cache_miss_fetches_polygon_and_returns_bytes(self):
        # Arrange
        md = _import_market_data()
        img_bytes = b'\x89PNG\r\n\x1a\nfakeimagedata'
        overview_data = {"name": "Apple Inc.", "logo_url": "https://api.polygon.io/v1/reference/company-branding/apple.com/logo"}

        mock_bytes_redis = self._make_bytes_redis_mock(None)
        mock_str_redis = _make_redis_mock(json.dumps(overview_data))

        mock_requests = MagicMock()
        mock_polygon_response = MagicMock()
        mock_polygon_response.status_code = 200
        mock_polygon_response.content = img_bytes
        mock_polygon_response.headers = {"Content-Type": "image/png"}
        mock_requests.get.return_value = mock_polygon_response

        # Act
        with patch.object(md, "_get_wdc_bytes", return_value=mock_bytes_redis), \
             patch.object(md, "_get_wdc", return_value=mock_str_redis), \
             patch.object(md, "requests_lib", mock_requests):
            result = md.logo("AAPL")

        # Assert — bytes returned, Polygon called with apiKey, bytes cached
        assert result == img_bytes
        call_url = mock_requests.get.call_args[0][0]
        assert "apiKey=test-key" in call_url
        assert "logo" in call_url
        mock_bytes_redis.setex.assert_called_once()
        cache_key, ttl, stored = mock_bytes_redis.setex.call_args[0]
        assert "logo" in cache_key
        assert ttl == 30 * 86400  # _OVERVIEW_TTL
        assert stored == img_bytes

    def test_logo_with_byte_cache_hit_skips_polygon(self):
        # Arrange
        md = _import_market_data()
        img_bytes = b'\x89PNG\r\n\x1a\nfakeimagedata'
        mock_bytes_redis = self._make_bytes_redis_mock(img_bytes)  # cache hit
        mock_requests = MagicMock()

        # Act
        with patch.object(md, "_get_wdc_bytes", return_value=mock_bytes_redis), \
             patch.object(md, "_get_wdc") as mock_str_redis_cls, \
             patch.object(md, "requests_lib", mock_requests):
            result = md.logo("AAPL")

        # Assert — bytes returned, Polygon NOT called, overview Redis NOT read
        assert result == img_bytes
        mock_requests.get.assert_not_called()
        mock_str_redis_cls.assert_not_called()

    def test_logo_with_polygon_non_200_expect_404(self):
        # Arrange
        md = _import_market_data()
        overview_data = {"name": "Apple Inc.", "logo_url": "https://api.polygon.io/v1/reference/company-branding/apple.com/logo"}

        mock_bytes_redis = self._make_bytes_redis_mock(None)
        mock_str_redis = _make_redis_mock(json.dumps(overview_data))

        mock_requests = MagicMock()
        mock_polygon_response = MagicMock()
        mock_polygon_response.status_code = 403
        mock_polygon_response.content = b''
        mock_requests.get.return_value = mock_polygon_response

        # Act / Assert
        with patch.object(md, "_get_wdc_bytes", return_value=mock_bytes_redis), \
             patch.object(md, "_get_wdc", return_value=mock_str_redis), \
             patch.object(md, "requests_lib", mock_requests):
            with pytest.raises(_HTTP404) as exc_info:
                md.logo("AAPL")

        assert exc_info.value.status == 404
        mock_bytes_redis.setex.assert_not_called()  # nothing cached on failure


# ---------------------------------------------------------------------------
# company tests
# ---------------------------------------------------------------------------

def _make_ticker_details(
    name="Apple Inc.",
    description="Consumer electronics company",
    homepage_url="https://apple.com",
    logo_url="https://api.polygon.io/v1/reference/company-branding/apple.com/logo",
    list_date="1980-12-12",
    market_cap=2_500_000_000_000,
    primary_exchange="XNAS",
    sic_description="Electronic computers",
    total_employees=150000,
    share_class_shares_outstanding=15_550_000_000,
):
    r = MagicMock()
    r.name = name
    r.description = description
    r.homepage_url = homepage_url
    r.branding = MagicMock()
    r.branding.logo_url = logo_url
    r.list_date = list_date
    r.market_cap = market_cap
    r.primary_exchange = primary_exchange
    r.sic_description = sic_description
    r.total_employees = total_employees
    r.share_class_shares_outstanding = share_class_shares_outstanding
    return r


class TestCompany:
    def test_with_cache_hit_expect_cache_returned(self):
        # Arrange
        md = _import_market_data()
        cached_data = {"name": "Apple Inc.", "description": "Consumer electronics"}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.company("AAPL")

        # Assert
        assert result["symbol"] == "AAPL"
        assert result["source"] == "cache"
        assert result["data"]["name"] == "Apple Inc."
        mock_client.assert_not_called()

    def test_with_cache_hit_symbol_uppercased(self):
        # Arrange
        md = _import_market_data()
        cached_data = {"name": "Apple Inc."}
        mock_redis = _make_redis_mock(json.dumps(cached_data))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis):
            result = md.company("aapl")

        # Assert
        assert result["symbol"] == "AAPL"

    def test_with_empty_sentinel_expect_available_false(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(json.dumps({}))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client") as mock_client:
            result = md.company("TSLA")

        # Assert
        assert result["available"] is False
        assert result["source"] == "cache"
        mock_client.assert_not_called()

    def test_with_cache_miss_expect_api_called(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        ticker_details = _make_ticker_details()
        mock_massive = MagicMock()
        mock_massive.get_ticker_details.return_value = ticker_details

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.company("AAPL")

        # Assert
        assert result["symbol"] == "AAPL"
        assert result["source"] == "api"
        assert result["data"]["name"] == "Apple Inc."
        assert result["data"]["description"] == "Consumer electronics company"
        assert result["data"]["logo_url"] == "https://api.polygon.io/v1/reference/company-branding/apple.com/logo"
        assert result["data"]["market_cap"] == 2_500_000_000_000
        mock_massive.get_ticker_details.assert_called_once_with("AAPL")
        mock_redis.setex.assert_called_once()

    def test_with_api_returns_no_name_expect_empty_sentinel(self):
        # Arrange — Massive returns an object but name is None
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        ticker_details = MagicMock()
        ticker_details.name = None
        mock_massive = MagicMock()
        mock_massive.get_ticker_details.return_value = ticker_details

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.company("UNKN")

        # Assert
        assert result["available"] is False
        assert result["source"] == "api"
        mock_redis.setex.assert_called_once()
        _, ttl, payload = mock_redis.setex.call_args[0]
        assert json.loads(payload) == {}

    def test_with_api_failure_expect_graceful_error(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_massive = MagicMock()
        mock_massive.get_ticker_details.side_effect = RuntimeError("API down")

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.company("AAPL")

        # Assert
        assert "error" in result
        assert result["data"] == {}
        mock_redis.setex.assert_called_once()
        _, ttl, _ = mock_redis.setex.call_args[0]
        assert ttl == 60  # _RETRY_TTL

    def test_with_redis_read_error_expect_fallthrough_to_api(self):
        # Arrange
        md = _import_market_data()
        mock_redis = MagicMock()
        mock_redis.get.side_effect = Exception("Redis connection refused")
        mock_redis.setex.return_value = True
        ticker_details = _make_ticker_details()
        mock_massive = MagicMock()
        mock_massive.get_ticker_details.return_value = ticker_details

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.company("AAPL")

        # Assert — falls through to API
        assert result["source"] == "api"
        assert result["data"]["name"] == "Apple Inc."
        mock_massive.get_ticker_details.assert_called_once()

    def test_with_redis_write_error_expect_result_still_returned(self):
        # Arrange
        md = _import_market_data()
        mock_redis = MagicMock()
        mock_redis.get.return_value = None
        mock_redis.setex.side_effect = Exception("Redis write failed")
        ticker_details = _make_ticker_details()
        mock_massive = MagicMock()
        mock_massive.get_ticker_details.return_value = ticker_details

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_massive_client", return_value=mock_massive):
            result = md.company("AAPL")

        # Assert — result returned even if Redis write fails
        assert result["source"] == "api"
        assert result["data"]["name"] == "Apple Inc."


# ---------------------------------------------------------------------------
# news tests
# ---------------------------------------------------------------------------

def _make_article(
    title="AAPL beats estimates",
    summary="Apple reported Q2 earnings...",
    link="https://example.com/aapl-earnings",
    source="example.com",
    publish_date="2026-04-30T12:00:00Z",
    sentiment="positive",
    confidence=0.85,
):
    a = MagicMock()
    a.title = title
    a.summary = summary
    a.link = link
    a.source = source
    a.publishDate = publish_date
    a.sentiment = sentiment
    a.confidence = confidence
    return a


def _make_finlight_response(articles=None):
    resp = MagicMock()
    resp.articles = articles if articles is not None else [_make_article()]
    return resp


class TestNews:
    def _mock_request(self, md):
        """Stub the request module used by news() to avoid real HTTP."""
        return MagicMock()

    def test_with_cache_hit_expect_articles_returned(self):
        # Arrange
        md = _import_market_data()
        cached_articles = [
            {"title": "AAPL beats", "summary": "Good quarter", "url": "https://x.com/1",
             "source": "x.com", "published_at": "2026-04-30", "sentiment": "positive", "confidence": 0.9},
        ]
        mock_redis = _make_redis_mock(json.dumps(cached_articles))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client") as mock_fl:
            result = md.news("AAPL")

        # Assert
        assert result["symbol"] == "AAPL"
        assert result["source"] == "cache"
        assert len(result["articles"]) == 1
        assert result["articles"][0]["title"] == "AAPL beats"
        mock_fl.assert_not_called()

    def test_with_cache_hit_symbol_uppercased(self):
        # Arrange
        md = _import_market_data()
        cached_articles = [{"title": "TSLA news", "summary": "", "url": "",
                            "source": "", "published_at": "", "sentiment": "neutral", "confidence": 0.5}]
        mock_redis = _make_redis_mock(json.dumps(cached_articles))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis):
            result = md.news("tsla")

        # Assert
        assert result["symbol"] == "TSLA"

    def test_with_empty_sentinel_expect_available_false(self):
        # Arrange — cached empty list is the no-data sentinel
        md = _import_market_data()
        mock_redis = _make_redis_mock(json.dumps([]))

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client") as mock_fl:
            result = md.news("AAPL")

        # Assert
        assert result["available"] is False
        assert result["source"] == "cache"
        assert result["articles"] == []
        mock_fl.assert_not_called()

    def test_with_cache_miss_expect_finlight_called(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        article = _make_article()
        mock_svc = MagicMock()
        mock_svc.fetch_articles.return_value = _make_finlight_response([article])

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client", return_value=mock_svc):
            result = md.news("AAPL")

        # Assert
        assert result["symbol"] == "AAPL"
        assert result["source"] == "api"
        assert len(result["articles"]) == 1
        assert result["articles"][0]["title"] == "AAPL beats estimates"
        assert result["articles"][0]["sentiment"] == "positive"
        mock_svc.fetch_articles.assert_called_once()
        mock_redis.setex.assert_called_once()

    def test_with_limit_param_respected(self):
        # Arrange — cache has 5 articles, limit=2 → only 2 returned
        md = _import_market_data()
        cached_articles = [
            {"title": f"Article {i}", "summary": "", "url": f"https://x.com/{i}",
             "source": "x.com", "published_at": "2026-04-30", "sentiment": "neutral", "confidence": 0.5}
            for i in range(5)
        ]
        mock_redis = _make_redis_mock(json.dumps(cached_articles))

        mock_request = MagicMock()
        mock_request.query.get.return_value = "2"

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "request", mock_request):
            result = md.news("AAPL")

        # Assert
        assert len(result["articles"]) == 2

    def test_with_api_returns_empty_articles_expect_empty_cached(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_svc = MagicMock()
        mock_svc.fetch_articles.return_value = _make_finlight_response([])

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client", return_value=mock_svc):
            result = md.news("AAPL")

        # Assert
        assert result["source"] == "api"
        assert result["articles"] == []
        mock_redis.setex.assert_called_once()
        _, ttl, payload = mock_redis.setex.call_args[0]
        assert json.loads(payload) == []

    def test_with_api_failure_expect_graceful_error(self):
        # Arrange
        md = _import_market_data()
        mock_redis = _make_redis_mock(None)
        mock_svc = MagicMock()
        mock_svc.fetch_articles.side_effect = RuntimeError("Finlight timeout")

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client", return_value=mock_svc):
            result = md.news("AAPL")

        # Assert
        assert "error" in result
        assert result["articles"] == []
        mock_redis.setex.assert_called_once()
        _, ttl, _ = mock_redis.setex.call_args[0]
        assert ttl == 60  # _RETRY_TTL

    def test_with_redis_read_error_expect_fallthrough_to_finlight(self):
        # Arrange
        md = _import_market_data()
        mock_redis = MagicMock()
        mock_redis.get.side_effect = Exception("Redis down")
        mock_redis.setex.return_value = True
        article = _make_article()
        mock_svc = MagicMock()
        mock_svc.fetch_articles.return_value = _make_finlight_response([article])

        # Act
        with patch.object(md, "_get_wdc", return_value=mock_redis), \
             patch.object(md, "_get_finlight_client", return_value=mock_svc):
            result = md.news("AAPL")

        # Assert — falls through to Finlight
        assert result["source"] == "api"
        assert len(result["articles"]) == 1
        mock_svc.fetch_articles.assert_called_once()


# ---------------------------------------------------------------------------
# _detect_image_content_type tests
# ---------------------------------------------------------------------------

class TestDetectImageContentType:
    def _get_fn(self):
        md = _import_market_data()
        return md._detect_image_content_type

    def test_with_png_magic_bytes_expect_image_png(self):
        fn = self._get_fn()
        assert fn(b'\x89PNG\r\n\x1a\nsome data') == "image/png"

    def test_with_gif_magic_bytes_expect_image_gif(self):
        fn = self._get_fn()
        assert fn(b'GIF89a\x01\x00') == "image/gif"

    def test_with_jpeg_magic_bytes_expect_image_jpeg(self):
        fn = self._get_fn()
        assert fn(b'\xff\xd8\xff\xe0\x00\x10JFIF') == "image/jpeg"

    def test_with_svg_data_expect_image_svg_xml(self):
        fn = self._get_fn()
        svg_data = b'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">...</svg>'
        assert fn(svg_data) == "image/svg+xml"

    def test_with_unknown_bytes_expect_png_fallback(self):
        fn = self._get_fn()
        assert fn(b'\x00\x01\x02\x03unknown data') == "image/png"
