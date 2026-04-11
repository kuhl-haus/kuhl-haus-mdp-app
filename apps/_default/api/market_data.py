"""Market data enrichment endpoints — SCP caching proxy.

Provides authenticated REST endpoints that proxy Massive and Finlight APIs
with WDC Redis caching. Cache keys and TTLs are consistent with the MDP
pipeline so both the MDS and SCP share the same enrichment layer.

Routes:
    GET /api/market_data/company/<symbol>   — Massive ticker overview
    GET /api/market_data/news/<symbol>      — Finlight ticker news
"""
import json
import logging

from py4web import action, request

from kuhl_haus.mdp.analyzers.analyzer import AnalyzerOptions
from kuhl_haus.mdp.enum.widget_data_cache_keys import WidgetDataCacheKeys
from kuhl_haus.mdp.enum.widget_data_cache_ttl import WidgetDataCacheTTL

from ..common import auth, session
from ..settings import (
    FINLIGHT_API_KEY,
    MASSIVE_API_KEY,
    WDC_REDIS_URL,
)

logger = logging.getLogger(__name__)

# Enrichment TTLs (seconds) — consistent with DailyRangeAnalyzer conventions
_OVERVIEW_TTL = 30 * 86400     # 30 days — static reference data
_NEWS_TTL = WidgetDataCacheTTL.NEWS_TICKER.value  # 7 days
_RETRY_TTL = 60                 # 60s — transient API failure, retry soon
_NO_DATA_TTL = 86400            # 24h — ticker not in API, stable fact


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
        response = client.get_ticker_details(symbol)
        if response and getattr(response, "results", None):
            r = response.results
            data = {
                "name": getattr(r, "name", None),
                "description": getattr(r, "description", None),
                "homepage_url": getattr(r, "homepage_url", None),
                "list_date": getattr(r, "list_date", None),
                "market_cap": getattr(r, "market_cap", None),
                "primary_exchange": getattr(r, "primary_exchange", None),
                "sic_description": getattr(r, "sic_description", None),
                "total_employees": getattr(r, "total_employees", None),
                "share_class_shares_outstanding": getattr(r, "share_class_shares_outstanding", None),
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
