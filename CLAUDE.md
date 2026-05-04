# CLAUDE.md — kuhl-haus-mdp-app

## What This Is

Service Control Plane (SCP) and dashboard SPA for the Kuhl Haus Market Data Platform. Two stacks in one repo:

- **Backend:** Python 3.12 / py4web — OAuth, API proxy, config endpoint
- **Frontend:** Vue 3 SPA (Vite, `<script setup>`) — real-time market data dashboard

The SCP authenticates users, serves the SPA, and proxies enrichment APIs (Massive, Finlight) with Redis caching. The SPA connects directly to the Widget Data Service (WDS) via WebSocket for live data.

## Running Tests

**Backend (pytest):**
```bash
pip install -e ".[testing]"
pytest tests/ -v
```

**Frontend (Vitest):**
```bash
cd client
npm ci
npm test            # single run
npm run coverage    # with V8 coverage report
```

Both suites run in CI on every PR (`test-backend.yml`, `test-frontend.yml`). PRs that break tests will not be merged.

## Code Layout

```
apps/
├── _default/              # Main py4web app
│   ├── api/market_data.py # Enrichment proxy endpoints (company, news, short interest, logo)
│   ├── controllers.py     # Routes: index, app, get_config
│   ├── common.py          # Auth, db, session fixtures
│   └── settings.py        # All config via env vars
├── health/                # GET /health → "OK"
└── healthz/               # GET /healthz → JSON with version info
client/
├── src/
│   ├── components/
│   │   ├── DashboardGrid.vue     # Root layout — gates all widgets on config
│   │   ├── WidgetMenu.vue        # Widget type picker
│   │   ├── WidgetWrapper.vue     # Per-widget chrome (header, link color, remove)
│   │   └── widgets/              # Individual widget components
│   ├── composables/
│   │   ├── useConfig.js          # Module singleton — fetches /api/get_config
│   │   ├── useWebSocketClient.js # WDS WebSocket connection + subscription
│   │   ├── useWidgetBus.js       # Cross-widget ticker linking via color groups
│   │   └── useScannerLink.js     # Scanner → content widget click binding
│   └── utils/
│       ├── chartIndicators.js    # EMA/VWMA/SMA calculation
│       └── parseShareCount.js    # Human-readable share count parsing
tests/                     # Backend tests (pytest)
client/src/**/__tests__/   # Frontend tests (Vitest)
```

## Testing Standards

### General Principles

- **Observable behavior only** — assert on outputs and rendered DOM, not implementation details
- **No test classes in frontend** — standalone `test()` functions grouped by `describe()`
- **Backend uses both styles** — standalone functions for simple cases, classes for endpoint groups (see `test_market_data.py`)
- **Target ≥95% branch coverage** — floor, not ceiling

### Test Naming

**Backend (pytest):** `test_<subject>_with_<scenario>_expect_<outcome>`
```python
def test_healthz_index_with_defaults_expect_status_ok(monkeypatch):
```

**Frontend (Vitest):** Same pattern inside `test()` or `it()`:
```javascript
test('with go button click expect manualTicker set to uppercased input', async () => {
```

### Arrange / Act / Assert

Every test follows AAA. Act should be a single logical action:
```python
# Arrange
md = _import_market_data()
mock_redis = _make_redis_mock(json.dumps(cached_data))

# Act
result = md.short_interest("TSLA")

# Assert
assert result["source"] == "cache"
```

### Backend: py4web Stubbing Pattern

py4web requires full module stubbing at import time. Follow the established pattern in `test_market_data.py`:

1. Stub `py4web`, `pydal`, `yatl` in `sys.modules` before importing app code
2. Make `@action` a passthrough decorator (no-op)
3. Re-import the module under test on each test to pick up fresh patches
4. Call action functions directly — no HTTP server needed

`test_default_controllers.py` is **frozen** — do not modify it. Use it as a reference only.

When using `unittest.mock.patch` or `monkeypatch`, patch the symbol where it is **looked up**, not where it is **defined**. Patching at the definition site has no effect on already-imported callers.

### Frontend: Component Test Patterns

**Mock composables before import** — Vue SFC `<script setup>` runs at import time:
```javascript
vi.mock('@/composables/useWebSocketClient.js', async () => {
  const { ref } = await import('vue')
  return {
    useWebSocketClient: vi.fn((config) => ({
      lastDataAt:  ref(null),
      isConnected: ref(true),
      // ... all refs the component destructures
    })),
  }
})
```

**Module singleton reset** — `useConfig` is a module singleton. Reset between tests:
```javascript
beforeEach(async () => { vi.resetModules() })
```

**VTU 2.4.x emit capture bug** — `wrapper.emitted('event')` does NOT capture Vue emissions from `<script setup>` components in jsdom. Use the `attrs` listener pattern instead:
```javascript
const settingsCalls = []
const wrapper = mount(MyComponent, {
  props: { /* ... */ },
  attrs: { 'onUpdate-settings': (s) => settingsCalls.push(s) },
})
// Assert on settingsCalls[], not wrapper.emitted()
```

## Dependencies

- **Backend Python:** dependencies in `pyproject.toml` under `[project.dependencies]`; test deps under `[project.optional-dependencies.testing]`
- **Frontend:** `client/package.json`; lock file is `client/package-lock.json`
- **Cross-repo:** `kuhl-haus-mdp` is the core library (pinned as `kuhl-haus-mdp>=0.4.8`). Enum values like `WidgetDataCacheKeys` and `WidgetDataCacheTTL` come from there — keep cache key/TTL usage consistent with the library.

## Architecture Notes for Context

- `DashboardGrid.vue` is the parent component. It calls `useConfig()` and gates widget rendering on `config.value` being non-null. This eliminates the async timing race for `autoConnect` widgets. All child widgets mount with config already available.
- `useWebSocketClient.js` manages WDS connections. Widgets provide feed name, cache key, and auth — the composable handles connect/disconnect/reconnect/subscribe lifecycle.
- `useWidgetBus.js` provides cross-widget ticker linking via color groups. Scanner widgets set active tickers; content widgets watch them. State is ephemeral (resets on page reload).
- Market data proxy endpoints in `api/market_data.py` use Redis caching with TTLs consistent with the MDP data pipeline. Cache keys use `WidgetDataCacheKeys` from the core library.
