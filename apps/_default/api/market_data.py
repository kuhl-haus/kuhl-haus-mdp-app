"""Market data enrichment endpoints — SCP caching proxy.

Provides authenticated REST endpoints that proxy Massive and Finlight APIs
with WDC Redis caching. Cache keys and TTLs are consistent with the MDP
pipeline so both the MDS and SCP share the same enrichment layer.

Routes:
    GET /api/market_data/company/<symbol>        — Massive ticker overview
    GET /api/market_data/news/<symbol>           — Finlight ticker news
    GET /api/market_data/short_interest/<symbol> — Massive FINRA short interest
    GET /api/market_data/short_volume/<symbol>   — Massive short volume ratio
"""
import json
import logging

from py4web import action, request

from kuhl_haus.mdp.analyzers.analyzer import AnalyzerOptions
from kuhl_haus.mdp.enum.widget_data_cache_keys import WidgetDataCacheKeys
from kuhl_haus.mdp.enum.widget_data_cache_ttl import WidgetDataCacheTTL
from kuhl_haus.mdp.helpers.structured_logging import setup_logging

from ..common import auth, session
from ..settings import (
    FINLIGHT_API_KEY,
    MASSIVE_API_KEY,
    WDC_REDIS_URL,
)

setup_logging()
logger = logging.getLogger(__name__)

# Enrichment TTLs (seconds) — consistent with DailyRangeAnalyzer conventions
_OVERVIEW_TTL = 30 * 86400     # 30 days — static reference data
_NEWS_TTL = WidgetDataCacheTTL.NEWS_TICKER.value  # 7 days
_RETRY_TTL = 60                 # 60s — transient API failure, retry soon
_NO_DATA_TTL = 86400            # 24h — ticker not in API, stable fact
_SI_TTL = 86400                 # 1 day — FINRA reports bi-monthly; daily refresh is fine
_SV_TTL = 86400                 # 1 day — short volume is T+1


def _get_wdc():
    """Return a synchronous Redis client for WDC."""
    import redis as redis_lib
    return redis_lib.from_url(WDC_REDIS_URL, decode_responses=True)


def _get_massive_client():
    """Return a synchronous Massive REST client."""
    opts = AnalyzerOptions(redis_url=WDC_REDIS_URL, massive_api_key=MASSIVE_API_KEY or None)
    return opts.new_rest_client()


def _get_finlight_client():
    """Return a Finlight SDK ArticleService."""
    import finlight_client
    cfg = finlight_client.ApiConfig(api_key=FINLIGHT_API_KEY)
    return finlight_client.FinlightApi(cfg).articles


# ---------------------------------------------------------------------------
# Company info (Massive ticker overview)
# ---------------------------------------------------------------------------

@action("api/market_data/company/<symbol>", method=["GET"])
@action.uses(session, auth.user)
def company(symbol: str):
    """Return cached company overview for a ticker.

    Cache: enrichment:overview:{symbol} in WDC Redis (30-day TTL).
    Falls back to Massive get_ticker_details() on cache miss.
    """
    symbol = symbol.upper().strip()
    cache_key = f"enrichment:overview:{symbol}"

    try:
        wdc = _get_wdc()
        cached = wdc.get(cache_key)
        if cached:
            data = json.loads(cached)
            if data:
                logger.debug(f"[company:{symbol}] WDC cache hit")
                return dict(symbol=symbol, data=data, source="cache")
            else:
                logger.debug(f"[company:{symbol}] WDC empty sentinel — data unavailable")
                return dict(symbol=symbol, data={}, source="cache", available=False)
    except Exception as e:
        logger.error(f"[company:{symbol}] Redis error on read: {e}")

    # Cache miss — call Massive
    try:
        client = _get_massive_client()
        # get_ticker_details() returns TickerDetails directly (not wrapped in .results)
        ticker_details = client.get_ticker_details(symbol)
        if ticker_details and getattr(ticker_details, "name", None):
            data = {
                "name": getattr(ticker_details, "name", None),
                "description": getattr(ticker_details, "description", None),
                "homepage_url": getattr(ticker_details, "homepage_url", None),
                "list_date": getattr(ticker_details, "list_date", None),
                "market_cap": getattr(ticker_details, "market_cap", None),
                "primary_exchange": getattr(ticker_details, "primary_exchange", None),
                "sic_description": getattr(ticker_details, "sic_description", None),
                "total_employees": getattr(ticker_details, "total_employees", None),
                "share_class_shares_outstanding": getattr(ticker_details, "share_class_shares_outstanding", None),
            }
            logger.info(f"[company:{symbol}] API hit — caching (TTL={_OVERVIEW_TTL}s) name={data.get('name')!r}")
            try:
                wdc.setex(cache_key, _OVERVIEW_TTL, json.dumps(data))
            except Exception as e:
                logger.error(f"[company:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data=data, source="api")
        else:
            logger.warning(f"[company:{symbol}] Massive returned no results — writing no-data sentinel")
            try:
                wdc.setex(cache_key, _NO_DATA_TTL, json.dumps({}))
            except Exception as e:
                logger.error(f"[company:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data={}, source="api", available=False)
    except Exception as e:
        logger.error(f"[company:{symbol}] Massive API error: {e}")
        try:
            wdc.setex(cache_key, _RETRY_TTL, json.dumps({}))
        except Exception:
            pass
        return dict(symbol=symbol, data={}, error="Company data temporarily unavailable")


# ---------------------------------------------------------------------------
# Short interest (Massive FINRA short interest)
# ---------------------------------------------------------------------------

@action("api/market_data/short_interest/<symbol>", method=["GET"])
@action.uses(session, auth.user)
def short_interest(symbol: str):
    """Return cached short interest data for a ticker.

    Sourced from Massive's FINRA short interest feed via list_short_interest().
    Returns the most recent settlement date entry for the ticker.

    Cache: enrichment:short_interest:{symbol} in WDC Redis (1-day TTL).
    """
    symbol = symbol.upper().strip()
    cache_key = f"enrichment:short_interest:{symbol}"

    try:
        wdc = _get_wdc()
        cached = wdc.get(cache_key)
        if cached:
            data = json.loads(cached)
            if data:
                logger.debug(f"[short_interest:{symbol}] WDC cache hit")
                return dict(symbol=symbol, data=data, source="cache")
            else:
                logger.debug(f"[short_interest:{symbol}] WDC empty sentinel — data unavailable")
                return dict(symbol=symbol, data={}, source="cache", available=False)
    except Exception as e:
        logger.error(f"[short_interest:{symbol}] Redis error on read: {e}")

    # Cache miss — call Massive
    try:
        client = _get_massive_client()
        results = client.list_short_interest(
            ticker=symbol,
            limit=1,
            order="desc",
            sort="settlement_date",
        )
        r = next(iter(results), None)
        if r is not None:
            data = {
                "short_interest": getattr(r, "short_interest", None),
                "days_to_cover": getattr(r, "days_to_cover", None),
                "avg_daily_volume": getattr(r, "avg_daily_volume", None),
                "settlement_date": getattr(r, "settlement_date", None),
            }
            logger.info(
                f"[short_interest:{symbol}] API hit — "
                f"si={data['short_interest']} dtc={data['days_to_cover']} "
                f"date={data['settlement_date']} (TTL={_SI_TTL}s)"
            )
            try:
                wdc.setex(cache_key, _SI_TTL, json.dumps(data))
            except Exception as e:
                logger.error(f"[short_interest:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data=data, source="api")
        else:
            logger.warning(f"[short_interest:{symbol}] Massive returned no results — writing no-data sentinel")
            try:
                wdc.setex(cache_key, _NO_DATA_TTL, json.dumps({}))
            except Exception as e:
                logger.error(f"[short_interest:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data={}, source="api", available=False)
    except Exception as e:
        logger.error(f"[short_interest:{symbol}] Massive API error: {e}")
        try:
            wdc.setex(cache_key, _RETRY_TTL, json.dumps({}))
        except Exception:
            pass
        return dict(symbol=symbol, data={}, error="Short interest data temporarily unavailable")


# ---------------------------------------------------------------------------
# Short volume (Massive short volume ratio)
# ---------------------------------------------------------------------------

@action("api/market_data/short_volume/<symbol>", method=["GET"])
@action.uses(session, auth.user)
def short_volume(symbol: str):
    """Return cached short volume data for a ticker.

    Sourced from Massive's short volume feed via list_short_volume().
    Returns the most recent date entry for the ticker.

    Cache: enrichment:short_volume:{symbol} in WDC Redis (1-day TTL).
    """
    symbol = symbol.upper().strip()
    cache_key = f"enrichment:short_volume:{symbol}"

    try:
        wdc = _get_wdc()
        cached = wdc.get(cache_key)
        if cached:
            data = json.loads(cached)
            if data:
                logger.debug(f"[short_volume:{symbol}] WDC cache hit")
                return dict(symbol=symbol, data=data, source="cache")
            else:
                logger.debug(f"[short_volume:{symbol}] WDC empty sentinel — data unavailable")
                return dict(symbol=symbol, data={}, source="cache", available=False)
    except Exception as e:
        logger.error(f"[short_volume:{symbol}] Redis error on read: {e}")

    # Cache miss — call Massive
    try:
        client = _get_massive_client()
        results = client.list_short_volume(
            ticker=symbol,
            limit=1,
            order="desc",
            sort="date",
        )
        r = next(iter(results), None)
        if r is not None:
            data = {
                "short_volume": getattr(r, "short_volume", None),
                "total_volume": getattr(r, "total_volume", None),
                "short_volume_ratio": getattr(r, "short_volume_ratio", None),
                "date": getattr(r, "date", None),
                "nyse_short_volume": getattr(r, "nyse_short_volume", None),
                "nasdaq_carteret_short_volume": getattr(r, "nasdaq_carteret_short_volume", None),
            }
            logger.info(
                f"[short_volume:{symbol}] API hit — "
                f"ratio={data['short_volume_ratio']} date={data['date']} (TTL={_SV_TTL}s)"
            )
            try:
                wdc.setex(cache_key, _SV_TTL, json.dumps(data))
            except Exception as e:
                logger.error(f"[short_volume:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data=data, source="api")
        else:
            logger.warning(f"[short_volume:{symbol}] Massive returned no results — writing no-data sentinel")
            try:
                wdc.setex(cache_key, _NO_DATA_TTL, json.dumps({}))
            except Exception as e:
                logger.error(f"[short_volume:{symbol}] Redis write error: {e}")
            return dict(symbol=symbol, data={}, source="api", available=False)
    except Exception as e:
        logger.error(f"[short_volume:{symbol}] Massive API error: {e}")
        try:
            wdc.setex(cache_key, _RETRY_TTL, json.dumps({}))
        except Exception:
            pass
        return dict(symbol=symbol, data={}, error="Short volume data temporarily unavailable")


# ---------------------------------------------------------------------------
# News (Finlight ticker news)
# ---------------------------------------------------------------------------

@action("api/market_data/news/<symbol>", method=["GET"])
@action.uses(session, auth.user)
def news(symbol: str):
    """Return cached news articles for a ticker.

    Cache: news:ticker:{symbol} in WDC Redis (7-day TTL).
    Falls back to Finlight API on cache miss.

    Query params:
        limit (int): max articles to return (default 10, max 50)
    """
    symbol = symbol.upper().strip()
    cache_key = f"{WidgetDataCacheKeys.NEWS_TICKER.value.format(ticker=symbol)}"
    limit = min(int(request.query.get("limit", 10)), 50)

    try:
        wdc = _get_wdc()
        cached = wdc.get(cache_key)
        if cached:
            articles = json.loads(cached)
            if articles:
                logger.debug(f"[news:{symbol}] WDC cache hit — {len(articles)} articles")
                return dict(symbol=symbol, articles=articles[:limit], source="cache")
            else:
                logger.debug(f"[news:{symbol}] WDC empty sentinel")
                return dict(symbol=symbol, articles=[], source="cache", available=False)
    except Exception as e:
        logger.error(f"[news:{symbol}] Redis error on read: {e}")

    # Cache miss — call Finlight
    try:
        import finlight_client
        svc = _get_finlight_client()
        params = finlight_client.models.GetArticlesParams(
            tickers=[symbol],
            pageSize=50,
            includeEntities=True,
        )
        response = svc.fetch_articles(params)
        articles_raw = getattr(response, "articles", None) or []
        articles = []
        for a in articles_raw:
            articles.append({
                "title": getattr(a, "title", None),
                "summary": getattr(a, "summary", None),
                "url": getattr(a, "link", None),
                "source": getattr(a, "source", None),
                "published_at": str(getattr(a, "publishDate", None)),
                "sentiment": getattr(a, "sentiment", None),
                "confidence": getattr(a, "confidence", None),
            })
        logger.info(f"[news:{symbol}] Finlight API hit — {len(articles)} articles (TTL={_NEWS_TTL}s)")
        try:
            wdc.setex(cache_key, _NEWS_TTL, json.dumps(articles))
        except Exception as e:
            logger.error(f"[news:{symbol}] Redis write error: {e}")
        return dict(symbol=symbol, articles=articles[:limit], source="api")
    except Exception as e:
        logger.error(f"[news:{symbol}] Finlight API error: {e}")
        try:
            wdc.setex(cache_key, _RETRY_TTL, json.dumps([]))
        except Exception:
            pass
        return dict(symbol=symbol, articles=[], error="News temporarily unavailable")
