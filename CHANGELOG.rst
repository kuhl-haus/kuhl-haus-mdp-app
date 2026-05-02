=========
Changelog
=========
Version 0.4.0 (2026-05-01)
==========================

- `41d104b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/41d104b>`_ fix: defensive version_info.get() in app() controller

  KeyError in app() takes down the dashboard for all users on every page load.

  Apply the same defensive pattern already used in get_config().

- `3b3241c <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3b3241c>`_ chore: restore test_default_controllers.py to mainline (no changes)
- `d6d6d79 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d6d6d79>`_ chore: restore original closing line in shape test docstring
- `7811aee <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7811aee>`_ chore: remove stale comment from shape test docstring
- `6cef5d1 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6cef5d1>`_ chore: remove stale comment from get_config
- `9300ded <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9300ded>`_ feat: inject app version via window.__APP_VERSION__ at page load

  Version display does not need an API call. The app() controller already

  passes app_version to app.html at render time; inject it as a tiny inline

  script so the Vue app reads it synchronously on startup.

  - app.html: <script>window.__APP_VERSION__ = "[[=app_version]]";</script>

  - DashboardGrid.vue: const appVersion = window.__APP_VERSION__ || null

  - useConfig.js: reverted (appVersion removed; get_config stays 4 keys)

  - controllers.py: app_version removed from get_config response

  - Tests: shape test back to 4 keys; Vue tests use vi.stubGlobal('__APP_VERSION__')

  refs #245

- `39ad853 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/39ad853>`_ fix: defensive version_info.get() in get_config; add missing Arrange comment

  Address Bishop's review notes:

  - get_config() uses version_info.get('image version:') to avoid KeyError

  if version_info is None or missing the key in unusual environments

  - Add missing # Arrange comment to test_get_config_expect_app_version_in_response

- `943879d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/943879d>`_ style: increase app-version font size to 13px
- `d3a7751 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d3a7751>`_ feat: expose app_version from get_config and display in dashboard header

  Add app_version to the /api/get_config response, map it through

  useConfig() as appVersion, and render it at the far right of the

  dashboard header bar.

  - controllers.py: get_config() now includes app_version from version_info

  - useConfig.js: maps data.app_version → config.appVersion

  - DashboardGrid.vue: .app-version badge (v-if appConfig) far-right in header

  - Tests: shape test updated to 5 keys; new get_config test; 2 new Vue tests

  refs #245

- `5747ed0 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5747ed0>`_ Reject 'latest' and use IMAGE_VERSION env fallback

  Treat 'latest' in version.txt as invalid (raise an error) to avoid ambiguous image tags so the fallback code path runs. Update the fallback to read IMAGE_VERSION from the environment (defaulting to 'Unknown') instead of always using a hardcoded 'Unknown'. Also expose app_version from version_info to the template.

- `efb4cf9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/efb4cf9>`_ chore: remove window.__APP_CONFIG__ from app.html (#269)

  * test(app): failing tests for window.__APP_CONFIG__ removal

  app() should no longer return api_key/ws_endpoint in its context dict.

  Credentials must not be embedded in HTML. Use /api/get_config instead.

  refs #257

  * chore: remove window.__APP_CONFIG__ from app.html

  - Remove <script>window.__APP_CONFIG__ = {...}</script> from app.html

  - Remove api_key and ws_endpoint from app() controller context dict

  - Update test: app() no longer embeds credentials in template context

  All widgets now read credentials from /api/get_config (auth-gated).

  Credentials no longer appear in page source.

  refs #257

  * fix(tests): remove redundant combined test per Bishop review

  The combined test asserted api_key not in result AND ws_endpoint not in result

  together. The two individual tests below already cover each assertion

  separately. Drop the combined test -- three tests covering the same behavior

  fail or pass together and add no value.

  refs #257

- `1a002fa <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1a002fa>`_ feat(TopGappers): migrate window.__APP_CONFIG__ to useConfig() (#266)

  * feat(TopGainers): migrate window.__APP_CONFIG__ to useConfig()

  refs #251

  * feat(TopGappers): migrate window.__APP_CONFIG__ to useConfig()

  refs #252

  * fix(TopGappers): complete useWebSocketClient mock — add missing feedName, cacheKey, subscribe, unsubscribe, getCache

  Per Bishop review on PR #266: mock was missing fields the component

  destructures, making it a trap for future tests.

  * fix: remove TopGainers files — belong in PR #268, not here

  * fix: remove stale vite.config.js.bak artifact

- `9c08c73 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9c08c73>`_ feat(TopVolume): migrate window.__APP_CONFIG__ to useConfig() (#267)

  * feat(TopGainers): migrate window.__APP_CONFIG__ to useConfig()

  refs #251

  * feat(TopVolume): migrate window.__APP_CONFIG__ to useConfig()

  refs #253

  * fix(TopVolume): complete useWebSocketClient mock — add missing feedName, cacheKey, subscribe, unsubscribe, getCache

  Per Bishop review on PR #267: mock was missing fields the component

  destructures, making it a trap for future tests.

  * fix: remove TopGainers files — belong in PR #268, not here

- `e15cd15 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e15cd15>`_ feat(TopGainers): migrate window.__APP_CONFIG__ to useConfig() (#268)

  * feat(TopGainers): migrate window.__APP_CONFIG__ to useConfig()

  refs #251

  * fix(TopGainers): complete useWebSocketClient mock — add missing feedName, cacheKey, subscribe, unsubscribe, getCache

  Per Bishop review on PR #268: mock was missing fields the component

  destructures, making it a trap for future tests.

- `163aae3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/163aae3>`_ feat(Quote): migrate window.__APP_CONFIG__ to useConfig() (#265)

  * feat(Quote): migrate window.__APP_CONFIG__ to useConfig()

  refs #250

  * fix(Quote): complete useWebSocketClient mock — add missing feedName, cacheKey, subscribe, unsubscribe, getCache

  Per Bishop review on PR #265: mock was missing fields the component

  destructures, making it a trap for future tests.

- `d070c82 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d070c82>`_ feat(NewsFeed): migrate window.__APP_CONFIG__ to useConfig() (#264)

  * test(NewsFeed): failing tests for useConfig() migration

  refs #249

  * feat(NewsFeed): migrate window.__APP_CONFIG__ to useConfig()

  refs #249

- `82a6247 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/82a6247>`_ feat(DailyRangeAlerts): migrate window.__APP_CONFIG__ to useConfig() (#262)

  * test(DailyRangeAlerts): failing tests for useConfig() migration (clean v2)

  Now that DashboardGrid (#254) gates widget rendering on config being ready,

  DailyRangeAlerts mounts with config.value guaranteed non-null. The migration

  is clean: import useConfig, replace window.__APP_CONFIG__, autoConnect: true

  works immediately with the correct endpoint — no watch, no race.

  3 failing tests:

  - useWebSocketClient receives wsUrl from config.value.wsEndpoint

  - useWebSocketClient receives authKey from config.value.apiKey

  - fallback wsUrl when config is null (defensive baseline)

  85 existing tests passing.

  refs #248

  * feat(DailyRangeAlerts): migrate window.__APP_CONFIG__ to useConfig()

  Clean migration now that DashboardGrid (#254) gates widget rendering.

  DailyRangeAlerts mounts with config.value guaranteed non-null, so

  autoConnect: true fires immediately with the correct WDS endpoint.

  - Import useConfig from @/composables/useConfig.js

  - Replace window.__APP_CONFIG__ || {} with useConfig() config ref

  - Replace appConfig.wsEndpoint/apiKey with appConfig.value?.wsEndpoint/apiKey

  - No watch, no deferred connect — config is already available at mount

  Also: add ref to DailyRangeAlerts.spec.js vue import.

  refs #248

  * fix(DashboardGrid): gate GridLayout on appConfig — prevent premature widget mount

  The GridLayout (and all widgets inside it) had no v-if guard on appConfig.

  Only the header controls were gated. Widgets were mounting before the

  useConfig() fetch resolved, so autoConnect widgets dialed ws://localhost:4202/ws.

  Fix: wrap both mobile-stack and GridLayout v-else in v-if='appConfig'.

  Widgets only mount once config.value is non-null — guaranteed real endpoint.

  New tests verify:

  - grid layout absent when config is null

  - grid layout present when config is loaded

  refs #254

- `fd0d83d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fd0d83d>`_ feat(DashboardGrid): migrate window.__APP_CONFIG__ to useConfig() (#261)

  * test(DashboardGrid): failing tests for useConfig() migration

  DashboardGrid is being migrated first (#254) because it is the parent

  component. Once it calls useConfig() and gates widget rendering on

  config.value being non-null, all child widgets mount with config already

  available — eliminating the async timing race for autoConnect widgets.

  4 failing tests:

  - useConfig is called on mount (still uses window.__APP_CONFIG__)

  - layout controls are hidden when config is null (loading state)

  - auth-required message shown when config is null

  - layout controls appear reactively when config loads after null

  2 passing baselines:

  - layout controls visible when config loaded (window.__APP_CONFIG__ always truthy)

  - auth-required hidden when config loaded (same reason)

  refs #254

  * feat(DashboardGrid): migrate window.__APP_CONFIG__ to useConfig()

  - Import useConfig from @/composables/useConfig.js

  - Replace window.__APP_CONFIG__ || {} with const { config: appConfig, ... } = useConfig()

  - Existing v-if='appConfig' template conditions now gate on config.value

  (null while fetching → loading/auth state; non-null when loaded → dashboard)

  - Auth-required state is now real: shows during fetch, persists on 401

  - DashboardGridColNum.spec.js: replace window.__APP_CONFIG__ assignment

  with useConfig mock (same value, now properly mocked)

  Child widgets that mount inside DashboardGrid now have config.value

  available synchronously, eliminating the async timing race for autoConnect.

  refs #254

  * test(DashboardGrid): add 401 error state coverage per Bishop review

  Blocking: no test exercised the configError path. Added two tests:

  - auth-required shown and persists on 401 (config=null, error=Error)

  - auth-required clears when config loads after error (re-auth/retry)

  Also removed 'useConfig is called on mount' — implementation detail,

  covered implicitly by the DOM behavior tests (per pattern from #259).

  refs #254

- `ccb7ab8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ccb7ab8>`_ test(get_config): add pytest coverage for /api/get_config endpoint (#258)

  * test(get_config): add coverage for /api/get_config endpoint

  Three new tests alongside the existing happy-path test:

  - None optional keys: MASSIVE_API_KEY=None and FINLIGHT_API_KEY=None

  pass through as None in the response (not converted to empty string)

  - Response shape: all four required keys (api_key, ws_endpoint,

  massive_api_key, finlight_api_key) must be present — documents the

  contract that useConfig() depends on

  - Empty WDS api_key: empty string passes through unmodified

  Note: auth gate (@action.uses(auth.user)) is a py4web decorator concern

  and is not tested at the unit level. The 401 for unauthenticated

  requests is enforced by the framework before the function runs.

  refs #246

  * fix(get_config): use subset check in response shape test

  Bishop review: == locks down the complete response shape and will

  spuriously fail if get_config() ever adds a new field. <= checks

  that the four required keys are present without constraining the

  rest of the response shape — consistent with the test name

  'expect_all_four_required_keys'.

- `37eeeb2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/37eeeb2>`_ feat(CompanyNews): migrate window.__APP_CONFIG__ to useConfig() (#259)

  * test(CompanyNews): failing tests for useConfig() migration

  3 failing tests:

  - useConfig is called on mount (component uses window.__APP_CONFIG__ instead)

  - useWebSocketClient receives wsUrl from config.value.wsEndpoint

  - useWebSocketClient receives authKey from config.value.apiKey

  2 passing tests (baseline — fallback behavior works when config is null):

  - useWebSocketClient falls back to default wsUrl when config is null

  - useWebSocketClient falls back to default authKey when config is null

  refs #247

  * feat(CompanyNews): migrate window.__APP_CONFIG__ to useConfig()

  - Import useConfig from @/composables/useConfig.js

  - Replace window.__APP_CONFIG__ || {} with const { config: appConfig } = useConfig()

  - Replace appConfig.wsEndpoint with appConfig.value?.wsEndpoint

  - Replace appConfig.apiKey with appConfig.value?.apiKey

  Fallback defaults (ws://localhost:4202/ws, 'secret') retained for

  pre-fetch null state and dev environments.

  refs #247

  * fix(CompanyNews): update wsUrl/authKey refs when config loads async

  Problem: useWebSocketClient is called synchronously at mount time.

  If useConfig() hasn't fetched yet, config.value is null and the

  composable receives fallback values (ws://localhost:4202/ws, 'secret').

  When connect() fires (triggered by ticker selection), it reads the

  now-stale wsUrl ref and connects to the fallback instead of the real

  WDS endpoint.

  Fix: destructure wsUrl and authKey refs from useWebSocketClient, then

  watch appConfig with { immediate: true }. When config loads, update

  both refs. connect() always reads the current ref value, so by the

  time it fires (user selects a ticker), the correct endpoint is used.

  Also update CompanyNews.spec.js mock to include wsUrl and authKey refs

  so the component can destructure them without TypeError.

  refs #247

  * test(CompanyNews): address Bishop review — AAA, async ref-update tests

  - Add AAA (Arrange/Act/Assert) comments to all tests

  - Remove 'useConfig is called on mount' (tests implementation, not behavior)

  - Add two new tests verifying the async ref-update pattern:

  - wsUrl ref is updated when config loads after null initial state

  - authKey ref is updated when config loads after null initial state

  These tests document and verify the watch() design that fixes the

  'ws://localhost:4202/ws failed' error when config loads async.

  - Add design comment explaining the wsUrl/authKey ref-update approach

  refs #247

- `c1973ed <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c1973ed>`_ perf(DailyRangeAlerts): Rec 3 — RAF batching of live WebSocket events (#244)

  * test(DailyRangeAlerts): failing tests for Rec 3 RAF batching

  5 failing tests covering the required behavior:

  - live event is not immediately added (must be buffered pre-RAF)

  - RAF flush delivers all buffered events in one reactive update

  - burst order preserved after flush (newest first)

  - maxEvents enforced at flush, not per-event

  - second burst after first flush is also batched correctly

  1 passing test (intentional baseline):

  - cache hydration (Array payload) remains synchronous — not affected by RAF

  Architecture: Option A — batching in widget composable, not in

  useWebSocketClient.js. All 5 failing tests assert the pre-RAF state

  (events.value is empty) before advancing fake timers, so they will only

  pass with a real RAF buffer implementation.

  * perf(DailyRangeAlerts): Rec 3 — RAF batch buffer for live events

  Implementation: Option A — batching in widget, useWebSocketClient unchanged.

  Live events accumulate in a plain non-reactive array (_rafPending).

  requestAnimationFrame fires once at the frame boundary and does a single

  events.value assignment: one reactive cycle, one VDOM diff, one paint

  regardless of burst size.

  Cache hydration (Array payload) remains synchronous — one-time load.

  Background tab: RAF pauses when tab hidden; buffer flushes on focus.

  Ordering: incoming.reverse() + existing events (newest first).

  Test updates: two existing tests ('live event prepend', 'maxEvents cap')

  updated to use vi.useFakeTimers + vi.advanceTimersByTime(20) since live

  event behavior now requires RAF flush. RAF batching tests use

  vi.stubGlobal('requestAnimationFrame') for deterministic control,

  decoupled from jsdom's native RAF implementation details.

  5 new tests passing:

  - live event not immediately added (buffered pre-RAF)

  - RAF flush delivers all buffered events in one update

  - burst order preserved (newest first)

  - maxEvents enforced at flush not per-event

  - second burst re-arms RAF correctly

  1 baseline test passing:

  - cache hydration remains synchronous

  500 tests total, 0 failures.

  * fix(DailyRangeAlerts): cancel pending RAF on unmount

  Prevents flushLiveEvents from firing against a detached component

  when the widget is removed mid-burst. cancelAnimationFrame(_rafId)

  in onUnmounted drops the queued callback safely.

- `795f54e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/795f54e>`_ fix(charts): display ET (America/New_York) time instead of UTC (#243)

  * test(charts): failing tests for ET timezone bug in CandlestickChart and TVLiteChart

  CandlestickChart: x-axis time labels are built with toISOString() which

  produces UTC strings (e.g. '2024-01-15T14:30:00.000Z'). Fixture

  2024-01-15T14:30:00Z = 09:30 EST. Tests assert the label contains '09'

  (ET hour) and does not end with 'Z' (UTC indicator).

  TVLiteChart: createChart is called without localization.timeFormatter so

  lightweight-charts renders all timestamps in UTC. Tests assert the

  createChart options include localization.timeFormatter and that calling

  it with a known UTC unix timestamp returns the ET hour.

  * test(charts): add EDT DST fixture and strengthen ET assertions per Bishop review

  - Add summer fixture (2024-07-15T13:30:00Z = 09:30 EDT) to both specs.

  A naive UTC-5 offset passes the winter fixture but returns 08:30 for

  this input; only a correct America/New_York Intl.DateTimeFormat passes.

  - Replace toContain(ET_HOUR) with toMatch(/09:30/) across all ET hour

  assertions — checks hour+minute together, not a loose substring match.

  - Rename tests to 'winter (EST)' / 'summer (EDT)' for clarity.

  * fix(charts): display ET (America/New_York) time instead of UTC

  CandlestickChart: replace toISOString() with toLocaleString using

  timeZone: 'America/New_York' (sv-SE locale for YYYY-MM-DD HH:MM:SS

  format, 'T' replaced with space for ECharts category axis labels).

  TVLiteChart: add localization.timeFormatter to createChart options.

  Formats Unix timestamps (seconds) as MM/DD HH:MM in America/New_York,

  handling both EST (UTC-5) and EDT (UTC-4) automatically via Intl.

  * fix(TVLiteChart): add tickMarkFormatter to timeScale for ET axis labels

  localization.timeFormatter fixes the crosshair/hover label only.

  The bottom axis tick labels use a separate timeScale.tickMarkFormatter

  which defaults to UTC when unset. Add tickMarkFormatter with the same

  America/New_York timezone, formatting by markType:

  3/4 (intraday) -> HH:MM ET

  2 (day)        -> MM/DD ET

  1 (month)      -> MMM ET

  0 (year)       -> YYYY ET

  Tests: two DST-aware cases (EST winter + EDT summer) for markType 3.

- `9432de3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9432de3>`_ Reorder and hide default columns in DailyRangeAlerts

  Update DailyRangeAlerts columns and default visibility/order. DEFAULT_SETTINGS.hiddenCols now hides several less-used fields by default (pct_change_since_open, change, session, prev_day_close, direction, note). The columns array was reordered to surface VWAP, Price, Change %, Float, Volume, Avg Vol and Rel Vol earlier, and column definitions were standardized with decimals and formatters (vwap, close, free_float, avg_volume, relative_volume, change, pct_change_since_open). These changes adjust the default table presentation to prioritize key metrics while keeping additional details available but hidden by default.

- `3d51482 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3d51482>`_ Remove NewsFeedV2.vue widget component

  Delete the NewsFeedV2.vue component from client/src/components/widgets. This removes the entire news feed widget implementation (controls, mobile card list, desktop virtual scroller, detail modal, WebSocket client logic, column resize handling, filtering/sorting, and scoped styles).

- `245b75c <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/245b75c>`_ feat(NewsFeed): add ticker select/filter mode toggle (#242)

  * test(NewsFeed): failing tests for ticker select/filter mode toggle

  - toggle renders with filter as default label

  - toggle active class reflects current mode

  - toggling emits update-settings with tickerClickMode

  - filter mode: ticker click filters feed AND broadcasts

  - select mode: ticker click broadcasts only, feed unchanged

  - bus sync: filter mode follows external activeTicker; select mode ignores it

  * feat(NewsFeed): add ticker select/filter mode toggle

  Adds a select/filter mode toggle to the news controls bar.

  Filter mode (default): clicking a ticker tag filters the local feed

  to that ticker AND broadcasts to linked widgets (quote, charts).

  Preserves existing behavior.

  Select mode: clicking a ticker tag broadcasts to linked widgets only.

  The news feed view is unchanged — useful when monitoring a broad news

  stream while driving linked widgets from ticker clicks.

  Bus sync watcher updated: in select mode, external activeTicker

  changes from linked widgets do not filter the local feed.

  Toggle preference persisted via update-settings → tickerClickMode.

  - NewsFeed.vue: tickerClickMode ref, toggleTickerClickMode, mode-aware

  toggleTickerFilter, mode-aware bus sync watcher

  - NewsFeed.spec.js: 16 tests (toggle rendering, settings persistence

  via attrs pattern, filter/select behavior, bus sync)

  * fix(NewsFeed): address Bishop review — select-mode deselect, test gaps, beforeEach cleanup

  Blocking:

  - Select-mode toggle-off was undefined (activeTicker.value never set in

  select mode, so double-click always re-broadcast the ticker). Resolved

  with Option B: add lastBroadcastTicker ref for toggle bookkeeping in

  select mode so double-clicking the same ticker broadcasts null and

  clears linked widgets. Reset on mode change. Add comment explaining

  the design decision.

  Medium:

  - Add test: select mode + no linkColor is a complete no-op (no pill, no

  broadcast)

  - Add test: clicking same ticker twice in select mode broadcasts null

  - Add top-level beforeEach to clear shared activeTickers reactive object

  between tests, preventing state leakage

  Minor:

  - VTU emit workaround comment now includes upstream issue ref and TODO

  version note

  - Add test: other settings preserved when tickerClickMode toggles

- `deeee9a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/deeee9a>`_ feat(ci): add Codecov coverage badges for frontend and backend (refs #152) (#241)

Version 0.3.0 (2026-04-29)
==========================

- `65dc8d1 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/65dc8d1>`_ Version 0.3.0 (2026-04-29)
- `37e79a5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/37e79a5>`_ Update widget icons in WidgetMenu.vue

  Adjust emoji icons for several widgets in client/src/components/WidgetMenu.vue to improve visual consistency. Changes: top-gainers 📈 → 🔝, top-volume 📊 → 🔝, tv-lite-chart 📊 → 📈. No functional behavior changed.

- `ec7453a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ec7453a>`_ Fix inverted branding toggle labels

  Correct the ternary labels for the branding toggle buttons in EQV4HeroCard.vue and EnhancedQuoteV3.vue. The text/emoji were previously inverted (showing the opposite mode), causing a mismatch with the button title/tooltip; now the displayed label matches the current brandingMode. This is a UI text fix only.

- `9e40470 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9e40470>`_ Add 20k and 25k max-articles options

  Expand the MAX_ARTICLES_OPTIONS arrays in NewsFeed and NewsFeedV2 components to include larger choices (20000 and 25000). This adds higher-capacity selections for the newsfeed max articles dropdown while keeping the existing localStorage key and default behavior intact.

- `f4ca3fb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f4ca3fb>`_ Set default bar count to 5000

  5k is the default for the API and 1k often results in too few bars to draw meaningful 200 moving averages.

  https://massive.com/docs/rest/stocks/aggregates/custom-bars

- `d00cfe9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d00cfe9>`_ feat(TVLiteChart): new TV Lite Chart widget using TradingView Lightweight Charts v5 (#240)

  * test(TVLiteChart): failing tests for TV Lite Chart widget (refs #239)

  * chore(TVLiteChart): add stub component so tests produce assertion failures not import errors (refs #239)

  * test(TVLiteChart): fix undeclared wrapper variable; exact fetch-count assertions (refs #239)

  * test(TVLiteChart): exact fetch-count on auto-refresh timer test (refs #239)

  * feat(TVLiteChart): implement TV Lite Chart widget using lightweight-charts v5 (refs #239)

  * fix(TVLiteChart): remove dead calcVolumeAvg import; VWAP null guard; volume/MACD toggle via applyOptions visibility (refs #239)

  * fix(TVLiteChart): scope overlay position to chart-container to prevent covering WidgetWrapper title bar (refs #239)

  * fix(TVLiteChart): enable MACD by default to match CandlestickChart defaults (refs #239)

  * feat(TVLiteChart): add avgVolume line on volume pane (refs #239)

  * test(TVLiteChart): add avgVolume setData and visibility behavioral tests (refs #239)

- `a7cd27e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a7cd27e>`_ fix(CandlestickChart): remove orphaned tickerSource from DEFAULT_SETTINGS (#238)
- `b50ff59 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b50ff59>`_ Update default chart indicator settings

  Adjust default indicators for CandlestickChart: modify EMA entries (9, 21, add/enable 200 with new colors), update SMA defaults (enable 200, change colors), change VWMA periods and enable the 50-period VWMA, update vwap and avgVolume colors, and enable MACD (12/26/9) by default. These changes update the chart's default visualization and styling for indicators.

- `922dc7f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/922dc7f>`_ fix+feat(CandlestickChart): candle colors, connection indicator, indicator counts, color pickers, header ticker input (#237)

  * test(CandlestickChart): failing tests for bug fixes and tweaks (refs #234)

  * fix+feat(CandlestickChart): candle colors, connection indicator, 3 EMAs/2 VWMAs, color pickers, header ticker input (refs #234)

  * test(CandlestickChart): remove dead tickerSource from lastDataAt test; exact fetch-count assertion on bus update

  * test(CandlestickChart): remove dead tickerSource from candle colors test

- `23d4e12 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/23d4e12>`_ fix(CandlestickChart): restore dark-themed DataZoom slider for tablet navigation (#236)
- `267e63a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/267e63a>`_ feat(CandlestickChart): new candlestick chart widget with technical indicators and auto-refresh (#235)

  * test(CandlestickChart): failing tests for chart indicators and widget component (refs #234)

  * feat(CandlestickChart): new candlestick chart widget with technical indicators and auto-refresh (refs #234)

  * chore: regenerate package-lock.json after adding echarts + vue-echarts

  * fix(CandlestickChart): rename setInterval->selectInterval (shadow bug), add VWMA+avgVolume, fix xAxisCount, VWAP ET timezone, remove dead watcher, add fake-timer tests (refs #234)

  * fix(CandlestickChart): use useConfig() for massiveApiKey instead of window.__APP_CONFIG__ (refs #234)

  * style(CandlestickChart): dark theme — remove split areas, tooltip dark bg, inside-only zoom, muted axis colors (refs #234)

  * fix(chartIndicators): VWAP ET timezone in calcVWAP + add ET midnight boundary test (refs #234)

- `c8a7080 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c8a7080>`_ fix(DailyRangeAlerts): null symbol guard + bus sync in filter mode (#233)

  * test(DailyRangeAlerts): failing regression tests for null-symbol TypeError (refs #230)

  * fix(DailyRangeAlerts): guard toUpperCase against undefined/null symbol in filteredEvents, isRowActive, handleRowClick (refs #230)

  * test(DailyRangeAlerts): failing tests for bus-sync ticker filter in filter mode (refs #230)

  * fix(DailyRangeAlerts): sync tickerFilter with bus activeTicker in filter mode (refs #230)

- `3001d10 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3001d10>`_ feat(DailyRangeAlerts): ticker filter input + row-click filter mode (#231)

  * test(DailyRangeAlerts): failing tests for ticker filter + row-click filter mode (refs #230)

  * feat(DailyRangeAlerts): ticker filter input + row-click filter mode (refs #230)

  * test(DailyRangeAlerts): fix vacuous truth in settings test, assert onRowClick in filter mode, fix naming drift

- `4299eae <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4299eae>`_ feat(DailyRangeAlerts): rel vol color styling + user-configurable column order (#229)

  * feat(DailyRangeAlerts): rel vol color styling + user-configurable column order (refs #224)

  * test(DailyRangeAlerts): AAA structure, DEFAULT_COL_ORDER constant, boundary coverage; fix columnByKey O(1)

- `204b670 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/204b670>`_ fix(DailyRangeAlerts): use browser local timezone for Time column instead of hardcoded ET (refs #224) (#228)
- `fcc49f2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fcc49f2>`_ feat(DailyRangeAlerts): show news flame icons next to ticker symbol (refs #224) (#227)
- `f77d5d2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f77d5d2>`_ fix(DailyRangeAlerts): remove array spread in hiddenColsLocal to break reactive loop (refs #224) (#226)
- `a5500f1 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a5500f1>`_ feat(DailyRangeAlerts): new Range Alerts widget for HOD/LOD alert feed (refs #224) (#225)
- `ecf678e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ecf678e>`_ Update impact badge tests to expect high severity

  Modify EQV4SecEdgarCard.spec.js tests to reflect badge severity changes: rename S-3 and S-1/A test names to indicate 'high' and update expectations from 'eqv4-impact-badge--medium' to 'eqv4-impact-badge--high' (Shelf registration and Dilution risk cases). Keeps tests aligned with the component's updated badge severity logic.

- `feeecc7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/feeecc7>`_ Reclassify SEC form impact levels

  Update FORM_IMPACT in EQV4SecEdgarCard.vue: elevate S-1/A, S-3, S-3/A, S-3ASR, F-1, and F-3 to 'high' (dilution/shelf registration category), and change 6-K and 20-F/A to 'high' (foreign filing impact).

- `a4277a4 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a4277a4>`_ feat(EQV4SecEdgarCard): add price impact badge column (refs #222) (#223)
- `96002a1 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/96002a1>`_ fix(EQv4): bump active card body font from 11px to 13px (#221)

  All four active cards (Company News, SEC EDGAR, Stock Splits, Ticker

  Events) used 11px for body text — data rows, empty/error states, search

  input, selects, links. Bumped to 13px for readability.

  The raw .txt backup link in EQV4SecEdgarCard bumped from 10px to 11px

  per Tom's direction. Column headers, article/filing counts, source

  attributions, and retry buttons remain at 10px intentionally.

- `266a274 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/266a274>`_ fix(EQV4SecEdgarCard): link to EDGAR index page; add raw .txt backup link (#220)

  Primary link (form type label) → EDGAR index page (text/html): properly

  rendered filing index with links to all documents.

  Secondary link ('txt') → raw filing_url (.txt): backup for users who

  want the original source directly.

  SEC serves filing_url with Content-Type: text/plain; browsers render it

  as raw text. The index page is text/html and renders correctly.

  Adds edgarIndexUrl() helper (cik + accession_number → index.htm URL).

  Updates test fixtures with cik/accession_number fields; asserts both

  primary and secondary link hrefs.

- `8502b55 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8502b55>`_ feat(EQv4): add Stock Splits, SEC EDGAR, and Ticker Events cards (refs #219) (#219)
- `d26db53 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d26db53>`_ Expand volume and price filter options

  Add additional volume and max-price options to the filter selects in TopGainers.vue, TopGappers.vue and TopVolume.vue. This introduces finer-grained volume thresholds (e.g. 50K, 250K, 500K, 750K, 2M, 25M) and more price breakpoints (e.g. $25, $50, $75, $125, $150, $200, $250, $300, $400, $500, $1K+) for the volumeThreshold and maxPriceThreshold selects to allow more precise filtering.

- `0dd0352 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0dd0352>`_ fix(WidgetMenu): set friendly userLabel on widget creation (refs #217) (#218)

  - WidgetMenu.vue: emit { type, label } instead of plain type string

  - DashboardGrid.vue: addWidget destructures { type, label }, sets userLabel on push

  - DashboardGrid.vue: canvas previews use item.userLabel || item.type || 'widget'

  - WidgetMenuAndWrapper.spec.js: update emit test + add per-widget emit coverage (8 widgets)

  - DashboardGridColNum.spec.js: update addWidget call sites to pass { type, label };

  add userLabel behavior tests (3) and exposed-interface assertion

- `7d59cc4 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7d59cc4>`_ test(EQv3): add onColReorder, onDragEnd, layoutMode, col3Cards to exposed-interface assertions (refs #172) (#216)
- `67f292a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/67f292a>`_ fix(DashboardGrid): key GridLayout on selectedLayoutName to force remount on layout switch (refs #209) (#215)
- `f9417af <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f9417af>`_ fix(DashboardGrid): set dashboardColNum before layout in loadLayout to prevent col-mismatch mangle (refs #209) (#214)
- `73a8737 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/73a8737>`_ fix(DashboardGrid): autosave on dashboardColNum change (refs #209) (#213)
- `e98f5e5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e98f5e5>`_ feat(WidgetMenu): rename widgets — Quote→Mini Quote, Enhanced Quote→Quote, Enhanced Quote V4→Enhanced Quote (#212)
- `58db0f8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/58db0f8>`_ feat(DashboardGrid): move Cols input to far right of edit bar (#211)

  * feat(DashboardGrid): move Cols input to far right of edit bar (refs #209)

  * feat(DashboardGrid): Cols input rightmost in layout-controls via margin-left:auto (refs #209)

- `f76c15b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f76c15b>`_ feat(DashboardGrid): user-configurable column count (#210)

  * feat(DashboardGrid): user-configurable column count via dashboardColNum (refs #209)

  * fix(DashboardGrid): add saveLayout persistence test; expose saveLayout + saveLayoutName (refs #209)

  * fix(DashboardGrid): expand column range to 2–48 for 4K display support (refs #209)

- `b0d2709 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b0d2709>`_ fix(EQv4): remove ticker tag rendering from news card row — Finlight REST doesn't populate companies (refs #204) (#208)
- `8577099 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8577099>`_ fix(EQv4): two-column table layout matching NewsFeed; extract NewsArticleModal SFC (#207)

  * fix(EQv4): two-column table matching NewsFeed, extract NewsArticleModal SFC (refs #204)

  * fix(EQv4): NewsArticleModal — Escape key, spec, CSS vars, source link v-if (refs #204)

  * fix: set --text-muted: #afafaf in :root to match --pd-text-muted (refs #204)

  * fix: replace all hardcoded hex colors in NewsArticleModal with CSS custom properties (refs #204)

  * fix: replace last hardcoded #fff in modal-title:hover with var(--pd-text) (refs #204)

- `ce695cd <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ce695cd>`_ fix(EQv4): use X-API-KEY header for Finlight auth, not Bearer token (refs #204) (#206)
- `be06939 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/be06939>`_ feat(EQv4): add EQV4CompanyNewsCard — REST-based company news card (#205)

  * feat(EQv4): add EQV4CompanyNewsCard — REST-based company news card (refs #204)

  * fix(EQv4): replace false-positive null key test with real guard assertion using exported _configRef (refs #204)

- `ec322fe <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ec322fe>`_ Adjust .eqv4-overlay inset/padding

  Increase the overlay top offset to 80px and add 8px horizontal padding while keeping a 40px bottom inset. This shifts the .eqv4-overlay further below the controls bar and provides horizontal spacing from the edges (client/src/components/widgets/EnhancedQuoteV4.vue).

- `fa6970b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fa6970b>`_ feat(EQv4): chips fill card width, centered, with increased padding (refs #188) (#203)
- `42f5230 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/42f5230>`_ fix(EQv4): increase chip font sizes — label 9px→11px, value 12px→14px (refs #188) (#202)
- `f647258 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f647258>`_ fix(EQv4): hero narrow mode — column stack mirroring EQv3 full-mode hero (#201)

  * fix(EQv4): narrow mode vertically stacks hero content via flex-direction: column override (refs #188)

  * fix(EQv4): narrow hero shows all data in column stack — mirrors EQv3 full-mode hero exactly (refs #188)

- `00794fa <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/00794fa>`_ fix(EQv4): rewrite HeroCard — port EQv3 hero CSS directly, single template, heroMode controls identity block visibility (refs #188) (#200)
- `c39bcb3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c39bcb3>`_ fix(EQv4): correct heroMode layout inversion (#199)

  * fix(EQv4): correct heroMode layout inversion — wide=two-column, narrow=vertical-stack (refs #188)

  * fix(EQv4): swap flex-direction on hero mode classes to match swapped template content (refs #188)

- `ee08d7f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ee08d7f>`_ fix(EQv4): resolve flame icon srcs via Vite asset import, not raw variant string (refs #188) (#198)
- `0515dce <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0515dce>`_ Lighten muted text color in EnhancedQuoteV4

  Update the CSS variable --text-muted in client/src/components/widgets/EnhancedQuoteV4.vue from #64748b to #afafaf to improve contrast and readability of muted text in the component's dark theme.

- `48c8f37 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/48c8f37>`_ feat(EQv4): always render grid; hero wide/narrow toggle; chips toggle in card header (#197)

  * feat(EQv4): always render grid; hero wide/narrow toggle; chips toggle in card header (refs #188)

  * fix(EQv4): pass heroMode only to hero card to avoid attribute inheritance warnings (refs #188)

- `3d07661 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3d07661>`_ fix(EQv4): move edit bar outside data guard; fix layout-update feedback loop (#196)

  * fix(EQv4): move edit bar outside data guard; add layout-update feedback-loop guard (refs #192)

  * fix(EQv4): add regression test for layout-update feedback loop (refs #188)

- `dd86bdb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/dd86bdb>`_ feat(EQv4): register enhanced-quote-v4 in WidgetMenu and WidgetWrapper (#195)

  * feat(EQv4): register enhanced-quote-v4 in WidgetMenu and WidgetWrapper (refs #192)

  * fix(EQv4): remove dead code from WidgetMenu test (refs #192)

  * fix(EQv4): use 💎 icon for enhanced-quote-v4 to avoid collision with quote widget (refs #192)

- `056232a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/056232a>`_ feat(EQv4): add EnhancedQuoteV4 root widget and EQV4CardPicker (#194)

  * feat(EQv4): add EnhancedQuoteV4 root widget and EQV4CardPicker with spec (refs #190)

  * fix(EQv4): address Bishop review — add onLayoutUpdated tests, CardPicker unit tests, fix fallback addCard test (refs #190)

  * fix(EQv4): fix addCard fallback test to exercise actual fallback code path (refs #190)

- `83c8593 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/83c8593>`_ feat(EQv4): add 7 card SFCs with spec (#193)

  * feat(EQv4): add 7 card SFCs with spec (refs #189)

  * fix(EQv4): address Bishop review — export fmt from eqv3Utils, fix CompanyCard prop name and allNull, add null safety to HeroCard template (refs #189)

- `d2e5127 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d2e5127>`_ Increase FULL breakpoint to 1600px

  Raise the FULL layout breakpoint from 1024 to 1600px. This updates the JS BREAKPOINTS constant, the explanatory template/CSS comments, and the @container (min-width) rule so the 'full' layout (hero left, single horizontal card row right) now activates at 1600px+. No other logic or card ordering changes were made.

- `05e4685 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/05e4685>`_ Revert "feat(EQv3): three-column medium layout and sticky per-column card order (#184)" (#187)

  This reverts commit 43aa146a5ae4742d0752b337042b619a5e1e88f6.

- `d4b9a4e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d4b9a4e>`_ fix(EQv3): fix cross-column drag by emitting from onColReorder not onDragEnd (#186)

  vuedraggable fires @end BEFORE @update:model-value. The previous impl

  relied on @end (onDragEnd) to emit, but _col1/2/3 were always null at

  that point because onColReorder (@update:model-value) hadn't fired yet.

  Cross-column drags therefore always fell back to stale props.settings.

  Fix: move the emit into onColReorder (@update:model-value), same pattern

  already used by onFullRowReorder. For cross-column drags vuedraggable

  fires @update:model-value twice (once per affected column); a nextTick

  debounce coalesces both into a single emit with the final state of all

  columns.

  onDragEnd is now a single-line isDragging=false setter.

  refs #183

- `84500fc <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/84500fc>`_ fix(EQv3): add min-height to columns so empty col3 has a drop target (#185)

  vuedraggable cannot accept drops into a zero-height empty list. Adding

  min-height: 48px to .eqv3-col ensures all columns always have a drop

  zone, including col3 when it starts empty.

  refs #183

- `43aa146 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/43aa146>`_ feat(EQv3): three-column medium layout and sticky per-column card order (#184)

  - Add MEDIUM breakpoint (720px) to BREAKPOINTS constant and CSS

  - Replace flat `cardOrder` with nested `columns` settings shape:

  columns: [[col1 ids], [col2 ids], [col3 ids]]

  - Migration shim (watch immediate) converts legacy cardOrder on first

  load; idempotent if columns already present

  - col3Cards computed: live at medium layoutMode, empty otherwise

  - col1Cards: flattens all columns at narrow so no cards disappear

  - Unassigned registry cards silently append to col1

  - onDragEnd extended to three columns; emits columns shape

  - onFullRowReorder collapses to col1 (intentional — user controls save)

  - col3 draggable template block (identical card rendering to col1/col2)

  - CSS: @container (min-width: 720px) shows eqv3-col-3

  - defineExpose: col1Cards and col2Cards added

  - 8 new tests covering migration shim, col3, narrow flatten, cross-col

  drag (col2 preserved), hidden card in col3 absent from flatten,

  unassigned card falls to col1

  120/120 tests passing.

  refs #183

- `bd49590 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/bd49590>`_ Adjust breakpoints and hero width in EnhancedQuoteV3

  Update responsive breakpoints and layout sizing in EnhancedQuoteV3.vue: change WIDE breakpoint from 480→360 and FULL from 960→1024 (update JS BREAKPOINTS and matching CSS/comments/container queries), update template comment for FULL mode, and reduce the full-mode hero column width from 360px to 200px. These changes align the JS constants with the CSS container thresholds and tighten the full-mode layout.

- `64a6ef3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/64a6ef3>`_ Set company card max-width to 250px

  Replace the .eqv3-company-card max-width from 50% to a fixed 250px in EnhancedQuoteV3.vue. This prevents company cards from becoming overly wide in the .eqv3-full-row-draggable layout while keeping the existing 200px min-width.

- `4473d89 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4473d89>`_ fix(EQv3): cap company card width to 50% in full mode only (#181)

  Move max-width constraint to the 960px+ container query so it only

  applies in full mode (horizontal card row). Narrow and wide modes

  are unaffected.

  refs #175

- `0feb546 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0feb546>`_ fix(EQv3): cap company card width to 50% in wide mode (#179)

  Company card in wide mode was stretching to full column width (~half the

  widget), making it wider than the hero. Cap it at 50% of the column.

  refs #175

- `ba34492 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ba34492>`_ fix(EQv3): align card-toggle active state fallback with --pd-accent token (#178)

  Fallback color in .eqv3-card-toggle--active was #60a5fa (blue) but the

  actual --pd-accent token is #7c3aed (violet). Align fallback and hover

  background rgba to match.

  refs #177

- `84f4d8d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/84f4d8d>`_ fix(EQv3): replace emoji toggles with filter-btn pills; fix RVol chip color (#176)

  - Card toggle buttons now use text labels ('hide'/'show', 'list'/'chips')

  styled as filter-btn pills (dark bg, border, border-radius) matching

  the NewsFeed filter-btn pattern; active state highlighted with

  --pd-accent border + text color

  - RVol chip value now inherits the same extreme/high/medium color rules

  as the kv-list RVol value via .eqv3-chip-val.extreme/high/medium rules

  refs #175

- `9644b7f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9644b7f>`_ feat(EQv3): per-card show/hide and normal/chips toggles (#174)

  Adds two user-configurable toggles to each draggable card (except

  EQV3CompanyCard) when in edit mode:

  1. 👁 Show/Hide  — removes the card from the visible layout; hidden

  cards appear in a tray below the columns so they can be re-shown

  without entering/leaving edit mode.

  2. ◧/▦ Normal/Chips — switches the card between kv-list (normal)

  and a compact chip layout. Applies in all layout modes.

  ## Data model

  Two new arrays in settings (backward-compatible; absent = defaults):

  - hiddenCards: string[] — card IDs hidden by the user

  - chipCards:   string[] — card IDs rendered in chip mode

  ## CARD_REGISTRY

  Added chipsCapable flag. company card: false (excluded from chips

  toggle). All other cards: true.

  ## Computeds

  - hiddenCardIds / chipCardIds — Set<string> for O(1) lookup

  - visibleCards — activeCards minus hidden; drives col1/col2/fullRow

  - hiddenCards — active cards that are hidden; drives tray

  ## CSS

  - .eqv3-card-label: now flex so controls align to the right

  - .eqv3-card-controls / .eqv3-card-toggle: toggle button row

  - .eqv3-chip-row: generic chip container (today/volume/short/prev)

  - .eqv3-hidden-tray: edit-mode tray for re-showing hidden cards

  ## Tests

  13 new tests covering:

  - hiddenCardIds / chipCardIds / visibleCards / hiddenCards computeds

  - toggleCardVisibility add/remove

  - toggleCardChips add/remove

  - hidden tray visibility (edit mode vs locked)

  - hidden card absent from layout and present in tray

  - chips rendering when chipCards setting is set

  - kv-list default (chips are opt-in)

  112/112 tests passing.

  refs #175

- `59dcf4f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/59dcf4f>`_ feat(EQv3): make Previous Day a uniform draggable card in all layouts (#171)

  Previous Day was special-cased:

  - Narrow/wide: pinned as a full-width row outside the draggable lists,

  using chip layout; excluded from col1Cards/col2Cards; appended to the

  saved cardOrder on every drag end

  - Full mode: regular draggable card using kv-list layout

  Now it is just another card in all layouts:

  - Removed pinned eqv3-prev-row div and eqv3-prev-chips chip layout

  - Added prev card kv-list rendering to col1 and col2 draggable item

  templates (matching full-mode rendering)

  - Removed filter(c => c.id !== 'prev') from col1Cards/col2Cards

  - Simplified onDragEnd: no more orderedNonPrev + appended 'prev'

  - Removed eqv3-prev-row CSS (width, flex-basis, display:none override)

  refs #133

- `f77f407 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f77f407>`_ Show branding toggle when EQv3 widget is unlocked

  Remove requirement for both logoUrl and iconUrl in EnhancedQuoteV3 so the branding toggle is rendered whenever the widget is unlocked. Update unit tests to match the new behavior: rename tests, adjust expectations for toggle visibility when only one URL is present, and add a props update for brandingMode in the relevant test.

- `997d90f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/997d90f>`_ fix(useWebSocketClient): arm auto-reconnect in connect() for deferred-connect pattern (#170)

  * feat: restore enhanced-quote type alias for backward compat with saved layouts

  Saved layouts using 'enhanced-quote' (the original V1 type string) would

  render nothing after EQV1/EQV2 were decommissioned. Register

  'enhanced-quote' in WidgetWrapper pointing to EnhancedQuoteV3 so

  existing layouts load correctly without reconfiguration.

  WidgetMenu now emits 'enhanced-quote' for new widget additions.

  'enhanced-quote-v3' kept as a backward-compat alias.

  refs #133

  * fix(useWebSocketClient): arm auto-reconnect in connect() for deferred-connect pattern

  Widgets that pass autoConnect: false and call connect() manually (EQv3)

  never had autoConnect flipped to true, so onclose() skipped

  scheduleReconnect(). Every other widget passes autoConnect: true so they

  were unaffected.

  Fix: set autoConnect = true at the top of connect(). disconnect() still

  sets it back to false to suppress reconnects on intentional closes.

  Two new tests:

  - connect() arms reconnect so onclose schedules a retry

  - disconnect() suppresses reconnect on intentional close

  refs #133

- `046efa6 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/046efa6>`_ feat: restore enhanced-quote type alias for backward compat with saved layouts (#169)

  Saved layouts using 'enhanced-quote' (the original V1 type string) would

  render nothing after EQV1/EQV2 were decommissioned. Register

  'enhanced-quote' in WidgetWrapper pointing to EnhancedQuoteV3 so

  existing layouts load correctly without reconfiguration.

  WidgetMenu now emits 'enhanced-quote' for new widget additions.

  'enhanced-quote-v3' kept as a backward-compat alias.

  refs #133

- `fee3c90 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fee3c90>`_ feat(eqv3): logo/icon toggle in edit mode (#168)

  * feat(eqv3): logo/icon toggle in edit mode

  Store icon_url from Massive branding alongside logo_url. Add

  brandingMode computed (default 'logo') reading from settings. Add

  activeBrandingUrl computed that returns the preferred URL with fallback

  to the other if unavailable.

  Show a toggle button in the controls bar when isLocked=false and both

  URLs are available. Clicking cycles logo <-> icon and emits

  update-settings with the new brandingMode — persisted per-widget.

  Five new tests: default logo mode, icon mode, toggle emits, visibility

  guards (locked/unlocked, one-url-only).

  refs #133

  * test(eqv3): fix two Bishop review blockers on branding toggle tests

  1. Add iconUrl/brandingMode/activeBrandingUrl/toggleBranding assertions

  to the Exposed interface describe block — these are public API and

  must be guarded against accidental removal or rename.

  2. Remove per-test global.stubs: { draggable } overrides from the four

  new branding tests. The module-level vi.mock('vuedraggable') is

  already in place and applies automatically. Per-mount stubs take

  precedence over the module mock, so those tests were running with a

  different stub (list prop vs modelValue) than the rest of the file.

  refs #133

- `bf466b7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/bf466b7>`_ fix(eqv3): map missing company fields in fetchCompany (#167)

  exchange, market_cap, total_employees, and list_date were omitted from

  the companyData assignment in fetchCompany — the Massive API returns

  them but they were never stored, leaving those rows blank in the company

  card. homepage_url and description worked because they were included.

  Add the four missing fields to the companyData mapping. Add test mock

  data and a regression test to prevent recurrence.

  refs #133

- `3d49553 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3d49553>`_ feat: apply Phantom Dark theme tokens to app chrome (#166)

  Define --pd-* CSS custom properties in base.css (bg, surface,

  surface-2, border, border-hover, text, text-muted, accent, positive,

  negative). Map Vue scaffold --color-* vars to them so the whole app

  inherits the palette.

  Apply tokens to:

  - App.vue: body bg/text

  - WidgetWrapper: widget shell, header bar, title, close btn, color swatch

  - DashboardGrid: toolbar, select trigger/dropdown/options, btn-icon, auto-save indicator

  - WidgetMenu: toggle button, panel, widget buttons

  Accent shifts from green (#4ade80) to violet (#7c3aed) to match EQV3.

  Selected state shifts from green-tinted to violet-tinted. Other widgets

  (GenericScannerTable, Quote, news widgets) are all dark and blend fine;

  comprehensive widget theming is a separate effort.

  refs #133

- `fdfaa3d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fdfaa3d>`_ fix(eqv3): move freshness timestamp into hero price block (#165)

  'As of <datetime>' was floating at the bottom of the card in all modes,

  visually disconnected from the price data it describes. Move it directly

  under the 'since open' line in the hero price block where it belongs.

  Remove the standalone .eqv3-freshness div and CSS. Add .eqv3-as-of

  styled at 10px/muted/right-aligned with slight opacity reduction.

  refs #133

- `9161e81 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9161e81>`_ fix(eqv3): render session H/L and prev day as kv-list in full mode (#164)

  * feat: decommission EnhancedQuote and EnhancedQuoteV2 — EQV3 is the sole widget

  Remove EQV1/EQV2 components, specs, and registry entries.

  Rename EQV2CompanyCard → EQV3CompanyCard and eqv2Utils → eqv3Utils.

  Update all eqv2-* CSS classes to eqv3-* in the renamed component.

  Update EnhancedQuoteV3.vue imports and template references.

  refs #133

  * fix(eqv3): render session H/L and prev day as kv-list in full mode

  Chips layout squishes at ≥960px full mode where cards render

  horizontally. Switch to eqv3-kv-list rows (same as all other cards)

  in the full-row draggable section only. Narrow/wide still use chips

  (they look fine stacked vertically).

  Session H/L: PRE/REG/AH × H/L → 6 kv rows (Pre High, Pre Low, etc.)

  Previous Day: O/H/L/C/Vol/VWAP → 6 kv rows

  refs #133

  * test(eqv3): add full-mode kv-list rendering tests for session H/L and prev day

  Three new tests covering the chip-to-kv-list change at full mode:

  - session card renders kv rows (Pre High/Low, Reg High/Low, AH High/Low) not chips

  - prev card renders kv rows (Open/High/Low/Close/Volume/VWAP) not chips

  - narrow mode still renders chips (regression guard)

  refs #133

- `5181747 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5181747>`_ feat: decommission EnhancedQuote and EnhancedQuoteV2 — EQV3 is the sole widget (#163)

  Remove EQV1/EQV2 components, specs, and registry entries.

  Rename EQV2CompanyCard → EQV3CompanyCard and eqv2Utils → eqv3Utils.

  Update all eqv2-* CSS classes to eqv3-* in the renamed component.

  Update EnhancedQuoteV3.vue imports and template references.

  refs #133

- `f93d4e7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f93d4e7>`_ fix(eqv2,eqv3): full-row drag snap-back — emit from @update:model-value not @end (#161)

  vuedraggable fires @end before @update:model-value, so reading _fullRow

  in onFullRowDragEnd always saw null (the stale pre-drag value). Cards

  appeared to move during drag but snapped back on drop because the emitted

  cardOrder was the original order.

  Fix: drive the emit from a new onFullRowReorder handler bound to

  @update:model-value, which receives the already-updated list directly.

  onFullRowDragEnd is retained (only resets isDragging) for API compat.

  Same root cause fixed in both EQV2 and EQV3. Tests updated to call

  onFullRowReorder directly rather than setting _fullRow + awaiting @end.

  refs #133

- `96ac337 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/96ac337>`_ Consolidate Enhanced Quote widget and adjust V3 UI

  Remove legacy enhanced-quote and enhanced-quote-v2 entries from the widget menu and rename the enhanced-quote-v3 entry to "Enhanced Quote" with a new icon, unifying available widgets. Update EnhancedQuoteV3.vue markup to change how since-open values are displayed: move parentheses from the dollar change to the percent change and adjust sign/formatting so the absolute change shows with a +/- before the dollar amount and the percent is shown (with sign) in parentheses. Files changed: WidgetMenu.vue, EnhancedQuoteV3.vue.

- `f04bfcb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f04bfcb>`_ feat(eqv3): backport full-mode horizontal layout from EQV2 (#160)
- `137a48f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/137a48f>`_ Increase font sizes in EnhancedQuoteV3

  Bump font-size for .eqv3-change-badge from 13px to 15px and .eqv3-since-open from 11px to 13px in client/src/components/widgets/EnhancedQuoteV3.vue to improve readability and visual prominence of quote metrics.

- `c3c1c19 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c3c1c19>`_ fix(eqv2): company desc wrapping, hero width 360px, hero field order at full mode (#159)
- `e10dada <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e10dada>`_ feat(eqv2): full-mode horizontal layout — hero left, all cards in single row (#158)
- `fa92384 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fa92384>`_ Add EnhancedQuoteV3 widget component

  Import EnhancedQuoteV3 in WidgetWrapper.vue and register it in the widgetComponents map under the 'enhanced-quote-v3' key so the wrapper can render the new enhanced quote variant.

- `1a511f8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1a511f8>`_ Swap percent/absolute display and bump font sizes

  In EnhancedQuoteV2.vue, the 'since open' display order was changed so the absolute dollar change is shown before the percentage, and the parentheses were moved to wrap the percentage instead of the dollar value. Also increased typography for readability: .eqv2-change-badge font-size from 13px to 15px and .eqv2-since-open from 11px to 13px.

- `ab9d5f6 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ab9d5f6>`_ Update muted text color in EnhancedQuoteV2 and EnhancedQuoteV3

  Adjust --text-muted in client/src/components/widgets/EnhancedQuoteV2.vue and EnhancedQuoteV3.vue from #5a5a7a to #afafaf to lighten the muted text tone, improving readability/contrast.

- `61f01c3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/61f01c3>`_ feat(eqv3): add EnhancedQuoteV3 widget with client-side Massive API (#157)
- `18bc28e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/18bc28e>`_ feat(eqv2): remove logo, set FULL breakpoint to 960px (#156)

  * feat(eqv2): remove logo, set FULL breakpoint to 960px

  Remove logo:

  - Remove <img> tag from eqv2-hero-identity

  - Remove logoError ref and reset on ticker change

  - Remove logoError from defineExpose

  - Remove .eqv2-hero-logo CSS

  - Remove 4 logo tests

  FULL breakpoint: 680 → 960px

  - BREAKPOINTS.FULL in JS

  - @container (min-width: 960px) in CSS

  refs #133

  * fix(eqv2): update all comments referencing FULL breakpoint from 680 to 960

- `e4cf8d7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e4cf8d7>`_ fix(eqv2): await two nextTick cycles in onDragEnd for cross-column card drag (#155)

  * fix(eqv2): await two nextTick cycles in onDragEnd for cross-column drag

  vuedraggable wraps each update:modelValue emission in nextTick().

  A cross-column drag fires two separate emissions in succession:

  one from the source column (remove) and one from the destination

  (add). A single nextTick was only catching one of the two, leaving

  one column's _col override null and causing the card to snap back.

  refs #133

  * test(eqv2): reproduce actual nextTick race in cross-column drag test

  Previous test pre-set both col overrides before calling onDragEnd,

  so it passed even with the original single-tick code — not a real

  regression test.

  New approach: set col1 override synchronously, start onDragEnd(),

  then deliver col2 override after the first nextTick (simulating

  vuedraggable's async emission sequence for cross-column drags).

  Verified: test fails with single await nextTick(), passes with two.

  refs #133

- `0a4948f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0a4948f>`_ fix(eqv2): add scoped styles to EQV2CompanyCard — fixes unstyled company card (#154)

  EQV2CompanyCard.vue had no <style> block. EnhancedQuoteV2.vue uses

  <style scoped>, so its eqv2-k/v/kv/link/desc CSS did not apply to

  child component elements (scoped styles only affect elements rendered

  by the component that defines them).

  Fix: add <style scoped> to EQV2CompanyCard.vue with all classes used

  in its template: eqv2-kv-list, eqv2-kv, eqv2-k, eqv2-v, eqv2-link,

  eqv2-company-desc-wrap/text/ellipsis, eqv2-see-more, eqv2-muted-msg.

  Also set display:contents on the wrapper div (transparent to layout).

  refs #133


Version 0.2.2 (2026-04-13)
==========================

- `14e0aec <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/14e0aec>`_ Version 0.2.2 (2026-04-13)
- `b305adb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b305adb>`_ feat: add GitHub release step to build-images.yml + releases badge to README (#153)

  build-images.yml:

  - Trigger on tag pushes (refs/tags/v*) in addition to mainline branch

  - New github-release job: tag-only, depends on build-docker

  - contents:write permission (required for gh release create)

  - gh release create with tag name, no notes (matches kuhl-haus-mdp pattern)

  README.md:

  - Add GitHub Release badge (shields.io v/release) after Build Images badge

- `a8708c3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a8708c3>`_ chore(deps-dev): update setuptools requirement from >=61.0 to >=82.0.1 (#149)

  Updates the requirements on [setuptools](https://github.com/pypa/setuptools) to permit the latest version.

  - [Release notes](https://github.com/pypa/setuptools/releases)

  - [Changelog](https://github.com/pypa/setuptools/blob/main/NEWS.rst)

  - [Commits](https://github.com/pypa/setuptools/compare/v61.0.0...v82.0.1)

  ---

  updated-dependencies:

  - dependency-name: setuptools

  dependency-version: 82.0.1

  dependency-type: direct:development

  ...

  Signed-off-by: dependabot[bot] <support@github.com>

  Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>

- `b83efa5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b83efa5>`_ fix: restrict widget drag to .widget-header to prevent conflict with card drag handles (#148)

  GridItem drag was capturing mousedown anywhere on the widget, including

  inside EQV2 card drag handles (⠿). This caused the entire widget to

  move instead of the card reordering within the widget.

  Fix: add drag-allow-from=".widget-header" to GridItem — widget drag

  only initiates from the header bar. Card drag handles inside

  widget-content are now unambiguous.

  refs #133

- `9ded335 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9ded335>`_ feat(eqv2): three-column layout at full width + hero logo/identity restructure (#147)

  * feat(eqv2): three-column layout at full width + hero logo/identity restructure

  Three-column layout (680px+):

  - col1: session + volume (non-today/short/company cards)

  - col2: today + short

  - col3: company (new eqv2-col-3, shown only at FULL mode)

  - col3Cards computed returns company at full, empty otherwise

  - _col3 drag ref + onColReorder(val, 3) wired

  - onDragEnd includes c3 in merged cardOrder

  - CSS: .eqv2-col-2/.eqv2-col-3 both hidden by default; col-3 display:flex at 680px+

  Hero identity restructure (logo left block, text stack right):

  - eqv2-hero-identity-text wrapper: flex-column with symbol-row + name + sic

  - eqv2-hero-symbol-row: symbol + flame icon inline

  - Company name and sic_description inside identity-text (removed separate hero-company div)

  - Logo stretches full height of identity row via align-self:stretch

  Tests: 114/114 — added full-mode col3 tests + hero identity structure test

  refs #133

  * refactor(eqv2): extract company card body to EQV2CompanyCard, key on card div

  - EQV2CompanyCard.vue: new child component encapsulating company card body

  (loading/unavailable/kv-list/description/see-more toggle)

  Props: loading, allNull, data, expanded

  Emits: expand, collapse

  Includes own truncateUrl, truncateDesc (175), fmtVol helpers

  - All three col draggable slots use EQV2CompanyCard — one definition, three references

  - Col3 renders EQV2CompanyCard directly (no v-if chain — only ever company card)

  - :key moved from <template #item> to inner <div> (correct Vue placement)

  All three slots consistent

  refs #133

  * refactor(eqv2): shared utils module + EQV2CompanyCard test suite

  eqv2Utils.js (new):

  - Single source of truth for truncateUrl, truncateDesc (175), fmtVol

  - Imported by both EnhancedQuoteV2.vue and EQV2CompanyCard.vue

  - Removes copy-paste duplication between parent and child

  EnhancedQuoteV2.vue:

  - Import truncateUrl/truncateDesc/fmtVol from eqv2Utils.js

  - Remove local definitions (replaced with single-line comment)

  EQV2CompanyCard.vue:

  - Import from eqv2Utils.js (no local function copies)

  - Single root element (eqv2-company-card-body wrapper div)

  - onExpand/onCollapse handler functions for VTU emit compat

  EQV2CompanyCard.spec.js (new, 11 tests):

  - loading state, allNull state, kv row rendering

  - homepage_url present/absent, fmtVol formatting

  - description truncation (short/long/expanded)

  - expand emit on see-more click, collapse emit on less click

  - Event capture via attrs pattern (VTU 2.4.x script setup compat)

  refs #133

  * test(eqv2): tighten market cap assertion to exact 3200.0B value

  - expect(wrapper.text()).toContain('3200.0B') instead of toContain('B')

  - Add comment explaining attrs listener pattern for emit capture

  (wrapper.emitted() does not capture Vue emissions from script setup

  components in VTU 2.4.6/jsdom — intentional workaround, same pattern

  as EnhancedQuoteV2.spec.js update-settings tests)

  refs #133

- `3d8d249 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3d8d249>`_ feat(eqv2): hero logo full-height, company name/sic on separate lines, desc 175, kv font 13px (#146)

  - Logo: height:100%/width:auto/max-width:48px + align-self:stretch fills hero height

  - Hero identity row: align-items:stretch so logo stretches with row height

  - Company name/sic: flex-column layout, separate lines, no bullet separator

  - name: 13px/600 weight; sic: 10px/muted

  - truncateDesc default maxLen: 250 → 175

  - .eqv2-k, .eqv2-v, .eqv2-link font-size: 12px → 13px

  refs #133

- `45910b5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/45910b5>`_ fix: logo loading race, description truncation, session H/L chip layout (#145)

  Logo (no REST call in prod):

  - Gate logo <img> on !companyLoading — prevents the proxy being called

  before fetchCompany has written enrichment:overview:{symbol} to Redis.

  Without this, proxy returns 404 immediately, @error fires, logoError=true,

  and logo never appears.

  - Tests: assert logo absent while companyLoading=true, present after resolve

  Description truncation:

  - Increase truncateDesc maxLen 50→250 chars (50 was far too aggressive)

  - Update LONG_DESC test fixture to 460 chars so it still triggers truncation

  Session H/L chip layout (narrow mode):

  - Change .eqv2-session-chips flex-direction from column→row at all widths

  (chips were stacking vertically in narrow mode, leaving dead space right)

  - Remove redundant flex-direction:row override at 480px+ (now always row)

  - Add min-width:0 to .eqv2-session-chip for proper flex shrink

  refs #133

- `ffbda9f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ffbda9f>`_ feat: Vue Draggable card reorder with persisted settings (PR C) (#144)

  * feat: Vue Draggable card reorder with persisted settings

  - Add vuedraggable 4.1.0 (exact pin) to client/package.json

  - Add CARD_REGISTRY (5 cards: session/today/volume/short/company);

  'prev' (Previous Day) always pinned full-width, not in registry

  - activeCards computed: reads settings.cardOrder, falls back to

  CARD_REGISTRY default; appends any missing registry cards

  - col1Cards / col2Cards: split activeCards by layoutMode (all in col1

  at narrow; ceil(n/2) split at wide/full)

  - <draggable> wraps each column; group='eqv2-cards'; handle='.eqv2-drag-handle';

  :disabled='isLocked'; emits update-settings with new flat cardOrder on @end

  - Card content rendered by id via v-if switch inside draggable template slot

  - Drag handle (⠿) visible in .eqv2-card-label only when !isLocked

  - isDragging ref drives .eqv2-dragging-active on root + .eqv2-dragging on sections

  - Expose activeCards, isDragging, onColReorder, onDragEnd for test access

  - Tests: mock vuedraggable, stub ResizeObserver; 7 new tests covering

  default order, custom order, partial order, drag handles locked/unlocked,

  prev-card not in registry, update-settings emit payload

  refs #133

  * fix: regenerate package-lock.json to include vuedraggable 4.1.0

  npm ci in CI was failing because pnpm install only updated pnpm-lock.yaml.

  Regenerated package-lock.json with npm install --package-lock-only.

  refs #133

  * fix: await nextTick in onDragEnd to prevent cross-column drag race condition

  SortableJS fires @end before @update:model-value is guaranteed to have

  run on both source and destination columns in a cross-column drag.

  Without nextTick, one column override ref may still be null, causing

  onDragEnd to fall back to the stale computed value and emit incorrect

  cardOrder.

  Fix: make onDragEnd async and await nextTick() before reading _col1/_col2.

  Also adds cross-column drag test: both onColReorder calls fire (col1 + col2)

  before onDragEnd, asserting merged 5-card order is emitted correctly.

  refs #133

- `43a4a25 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/43a4a25>`_ feat: EQV2 layout v2 — logo proxy src, since-open fix, chip H/L, flex columns (PR B) (#143)

  * feat: EQV2 layout v2 — logo proxy src, since-open fix, chip H/L, flex columns

  - Logo: use /api/market_data/logo/<symbol> proxy src; hide on @error via

  logoError ref; reset logoError on ticker change

  - Since open: restore 'since open' label; render change_since_open dollar

  delta from WDS payload (not recomputed client-side)

  - Session H/L: chip card style at all breakpoints (.eqv2-session-chip);

  flex-direction column at narrow, row at 480px+; remove old mini-row markup

  - Layout: replace grid-template-areas with independent flex columns;

  narrow = single col-1; wide (480px+) = col-1 + col-2; Previous Day

  always pinned full-width in .eqv2-prev-row

  - Card order: session, today, volume in col-1; short, company in col-2;

  prev pinned at bottom; narrow shows all in col-1 via .eqv2-narrow-only

  - Tests: logo proxy src, logoError hide/reset, since-open label + delta +

  null omission, H/L chip labels/values/null/markup, prev-day always present

  refs #133

  * fix: eliminate Company/Short Interest DOM duplication via ResizeObserver + isNarrow

  - Add BREAKPOINTS constant (WIDE=480, FULL=680) — shared by ResizeObserver

  and CSS @container rules (coupling made explicit per spec decision #2)

  - Add ResizeObserver in onMounted to drive layoutMode ref ('narrow'|'wide'|'full')

  - Replace .eqv2-narrow-only CSS pattern with v-if="isNarrow" / v-if="!isNarrow"

  on Company and Short Interest cards — exactly one DOM instance at all times

  - Expose layoutMode in defineExpose for test control

  - Tests: stub ResizeObserver in jsdom; add 3 layout mode tests (narrow default,

  wide renders col-2, single company card instance at narrow)

  refs #133

- `b85a097 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b85a097>`_ feat: add logo proxy endpoint with Redis byte cache (PR A) (#142)

  * feat: add logo proxy endpoint with Redis byte cache

  - Add GET /api/market_data/logo/<symbol> — proxies Polygon company

  branding images server-side (avoids HTTP 401 in browser <img> tags)

  - Auth: @action.uses(session, auth.user) — consistent with all other

  market data endpoints

  - Two-tier cache: raw image bytes in enrichment:logo:{symbol} (30-day

  TTL); logo_url read from existing enrichment:overview:{symbol} JSON

  - Add _get_wdc_bytes() helper for decode_responses=False Redis client

  - Add _detect_image_content_type() for magic-byte MIME detection

  - Promote requests to module-level import (patchable in tests)

  - Tests: 4 cases covering 404 on cache miss, Polygon fetch + cache

  write, byte cache hit bypasses Polygon, Polygon non-200 returns 404

  refs #133

  * fix: improve SVG detection in _detect_image_content_type

  Scan first 512 bytes for '<svg' instead of matching '<?xm' prefix.

  Catches both bare '<svg' and XML-declaration-prefixed '<?xml...><svg'

  without false-positives on non-SVG XML (XHTML, RSS, etc.).

  refs #133

- `bb5203a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/bb5203a>`_ feat: EnhancedQuoteV2 layout optimizations + company logo/description (#141)

  * feat: EnhancedQuoteV2 layout optimizations + company logo/description

  Layout fixes:

  - Hero: split into left (symbol+price) and right (change badge+since-open)

  using space-between — eliminates empty right-side dead space at all widths

  - Company card: add logo_url + full description (3-line clamp); consolidate

  exchange+sector into single meta line; align-self:start in 2-col so it

  doesn't dominate and leave empty space matching sibling cards

  - 3-col grid: restructure areas so short+volume fill right column cleanly

  (company/today/short top row, company/session/volume bottom row)

  - Wide/full font sizes scaled up for better use of available space

  Backend:

  - Add logo_url (from branding.logo_url) to /api/market_data/company response

  refs #133

  * feat: move logo/name/sic to hero; website-first company card; see-more description

  Hero card:

  - Logo (22px) + symbol + flame icon inline on top row

  - Company name + sic_description as a subtitle line below

  - Price moves to hero-right alongside change badge and since-open

  - Hero now has full brand identity + price context in one glance

  Company card:

  - Website link first (most actionable)

  - Description last: first 50 chars + 'see more' inline toggle to expand

  - Logo/name/sic removed (now in hero)

  - descExpanded ref resets on ticker change

  Design doc: Projects/EnhancedQuoteV2-Layout-Spec.md in vault

  refs #133

  * fix(test): update company name assertion to check hero card

  Company name and sic_description moved to the hero card in the layout

  refactor. Update test to assert on the correct DOM location.

  Also assert that the company card shows exchange (XNAS) as confirmation

  that company card data is still rendering.

  * feat: word-boundary truncation + tests for hero identity and see-more

  Component:

  - Replace .slice(0,50) with truncateDesc() helper that breaks at the last

  space before maxLen — avoids mid-word cuts

  - Update see-more visibility condition to compare truncated vs original

  Tests (9 new):

  - Hero: company name + sic in hero, logo present, logo absent (no broken img)

  - See-more: no toggle for short desc, truncated for long desc,

  expand on click, collapse on second click, reset on ticker change

  Fixes Bishop's review requests on PR #141.

- `424b5bf <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/424b5bf>`_ fix: use next(iter(results)) for Massive list_* generator returns (#140)

  * fix: use next(iter(results)) for Massive list_* generator returns

  list_short_interest() and list_short_volume() return lazy generators,

  not subscriptable lists. results[0] raised:

  'generator' object is not subscriptable

  Fix: use next(iter(results), None) to safely consume the first item.

  Also update test mocks from list to iter() so this failure mode is

  caught at test time, not discovered in production.

  * docs: add generator return type comments for list_short_interest/volume

  Verified against legion-mcp/massive_data_provider.py which iterates

  these with 'for r in records'. Document the lazy generator behavior

  in-code so the next implementer doesn't have to rediscover it.

  Also addresses the root cause acknowledgment: the original implementation

  assumed list behavior without verifying against the reference implementation

  despite the design doc explicitly flagging this as an open question.

  * docs: add missing generator comment to list_short_interest call

- `2c8259d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2c8259d>`_ fix: fetch short interest via REST endpoints on ticker change (#138)

  * fix: fetch short interest via REST endpoints on ticker change

  The widgets were reading short_interest, days_to_cover, and

  short_volume_ratio from the WebSocket quoteData payload, but the

  daily_range feed doesn't include those fields — so the section showed

  'loading' forever.

  Fix follows the established company data pattern: add fetchShortInterest()

  that calls /api/market_data/short_interest/<symbol> and

  /api/market_data/short_volume/<symbol> in parallel on ticker change, then

  stores results in a separate shortInterestData ref.

  Changes in both EnhancedQuote.vue and EnhancedQuoteV2.vue:

  - Add shortInterestData ref + shortInterestLoading ref

  - Add fetchShortInterest() — parallel fetch of both endpoints

  - Call fetchShortInterest() alongside fetchCompany() on ticker change

  - Reset shortInterestData when ticker is cleared

  - Update allShortNull to read from shortInterestData (not quoteData)

  - Update template bindings to shortInterestData

  - Improve loading/unavailable states (distinct messages)

  - Add shortInterestData/shortInterestLoading to defineExpose

  refs #135

  * test: add short interest fetch tests to EnhancedQuoteV2.spec.js

  5 new tests covering:

  - parallel fetch of short_interest + short_volume endpoints on ticker change

  - DOM display of merged short interest values

  - unavailable message when endpoints return null data

  - reset on ticker change

  - network error handled gracefully (no throw, unavailable shown)

  Follows existing pattern: mock global.fetch per URL, assert on rendered DOM.

  Also filed #139 for the pre-existing race condition on rapid ticker change

  (noted by @kuhl-haus-bishop in review).

  * test: assert on DOM not internal ref in reset test

  Per project testing standards: assert on observable behavior, not

  internal state. Replace wrapper.vm.shortInterestData assertion with

  DOM check — after ticker change with null SI data, the short card

  must not show the previous ticker's values and must show 'unavailable'.

- `4d95b63 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4d95b63>`_ feat: enable short interest section in EnhancedQuote and EnhancedQuoteV2 (#137)

  Now that /api/market_data/short_interest and /api/market_data/short_volume

  endpoints are live (#135), uncomment the short interest sections in both

  quote widgets.

  - EnhancedQuote: remove TODO comment wrapper, section is live

  - EnhancedQuoteV2: uncomment eqv2-short-card block + add 'short' area to

  CSS grid-template-areas in both wide (2-col) and full (3-col) layouts

  Both widgets display:

  - Short Int. (absolute share count)

  - Days to Cover

  - Short Vol Ratio %

  refs #135

- `0fe9d2b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0fe9d2b>`_ feat: add short_interest and short_volume REST endpoints (#136)

  Two new endpoints in apps/_default/api/market_data.py:

  GET /api/market_data/short_interest/<symbol>

  - Proxies Massive list_short_interest() (FINRA data)

  - Returns: short_interest, days_to_cover, avg_daily_volume, settlement_date

  - Cache: enrichment:short_interest:{symbol}, TTL 1 day

  GET /api/market_data/short_volume/<symbol>

  - Proxies Massive list_short_volume()

  - Returns: short_volume, total_volume, short_volume_ratio, date,

  nyse_short_volume, nasdaq_carteret_short_volume

  - Cache: enrichment:short_volume:{symbol}, TTL 1 day

  Both follow the established WDC Redis cache-proxy pattern (cache hit →

  empty sentinel → API call → retry sentinel on error).

  Tests: tests/apps/test_market_data.py — 13 tests covering cache hit,

  cache miss, empty sentinel, API failure, and cache key isolation.

  refs #135

- `8f5ffef <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8f5ffef>`_ feat: EnhancedQuoteV2 — adaptive container-query layout, Phantom Dark design (#134)

  * feat: add EnhancedQuoteV2 widget with adaptive container-query layout

  - Adaptive layout using CSS container queries (container-type: inline-size)

  - < 480px: single-column stacked (narrow)

  - ≥ 480px: 2-column section grid (wide)

  - ≥ 680px: 3-column section grid (full)

  - 'Phantom Dark' visual design: #0d0d12 bg, section cards, accent borders

  - Price hero: large bold price with colored change badge (pill/rounded)

  - Relative volume visualization bar with color-coded fill

  - Previous Day as chip strip (O/H/L/C/Vol/VWAP inline)

  - Session H/L as 3-column PRE/REG/AH row in wide mode

  - Same data, composables, and WebSocket subscription as V1

  - V1 (enhanced-quote) untouched

  - Register in WidgetWrapper + WidgetMenu as 'enhanced-quote-v2'

  - Tests in EnhancedQuoteV2.spec.js

  refs #133

  * fix(test): add missing nextTick between manualTicker and quoteData assignments

  The activeTicker watcher resets quoteData to null when the ticker changes.

  Tests must await nextTick after setting manualTicker before setting quoteData,

  otherwise the watcher fires async and wipes quoteData after the assignment.

  Pattern mirrors the existing EnhancedQuote.spec.js tests.

  * fix: align relVolClass CSS colors with design spec and rvBarColor

  relVolClass color values were misaligned — extreme showed orange (#f97316)

  instead of red, high showed yellow (#eab308) instead of orange.

  Design spec: green <2x, yellow 2-3x, orange 3-5x, red >5x

  rvBarColor already implemented this correctly; CSS now matches.

  Caught in review by @kuhl-haus-bishop.

  * fix(test): add missing nextTick in fmtVol describe block tests

  The regex in previous fix didn't catch tests inside describe blocks

  due to different indentation. Fix remaining 3 cases in the fmtVol

  describe block — same pattern as the other nextTick fixes.

- `fa054f7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fa054f7>`_ feat: expose massive_api_key and finlight_api_key in get_config (#132)

  Allows authenticated clients to obtain API keys directly for client-side

  Massive/Finlight calls. The SCP cache endpoints remain available for

  server-side caching when needed.

  - controllers.py: get_config() returns massive_api_key + finlight_api_key

  - useConfig.js: maps massiveApiKey + finlightApiKey from the response

  - Test updated to assert all four fields

- `3c67e4b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3c67e4b>`_ fix: get_ticker_details returns TickerDetails directly, not wrapped in .results (#131)

  The Massive SDK's get_ticker_details() returns a TickerDetails object

  directly via _get() → deserializer(obj). The code was checking for a

  .results attribute that doesn't exist on TickerDetails, so every lookup

  fell through to the 'no results' path and wrote a 24h no-data sentinel

  even for tickers fully covered by Massive (e.g. SKYQ, AAPL).

  Fix: check getattr(ticker_details, 'name', None) to detect a valid

  response instead of the non-existent .results wrapper.

  Also add structured logging via setup_logging() so logs appear as JSON

  in OpenObserve instead of plain text.

- `8aa6776 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8aa6776>`_ refactor: rename controllers/ package to api/ (#130)

  Having both controllers.py and controllers/ in the same directory causes

  Python to shadow controllers.py with the package on import. Renaming to

  api/ is also a cleaner convention: controllers.py for py4web page routes,

  api/ for REST API endpoints.

- `ac39db3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ac39db3>`_ chore: add update-changelog.sh and CONTRIBUTING.rst (#129)

  Copied update-changelog.sh from kuhl-haus-mdp-servers (identical script).

  CONTRIBUTING.rst adapted for kuhl-haus-mdp-app — Docker image release

  instead of PyPI, includes both pytest and npm test in contribution steps.

- `e7f1fb8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e7f1fb8>`_ feat(testing): add _default controller tests (refs #56) (#128)

  4 tests for index(), app(), and get_config():

  - index() with unauthenticated user returns generic hello message

  - index() with authenticated user returns personalized message

  - app() returns WDS api_key and ws_endpoint from settings

  - get_config() returns WDS api_key and ws_endpoint

  Uses importlib.util to load controllers.py directly (bypassing the

  controllers/ package that would otherwise shadow it). Stubs py4web.action

  with .uses support. Module stubs use direct assignment to guarantee

  correct stub across test file ordering.

- `28564da <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/28564da>`_ feat(testing): add health endpoint tests (refs #55) (#127)
- `6b140cc <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6b140cc>`_ feat(testing): add pytest infrastructure and healthz endpoint tests (closes #54, closes #61) (#126)

  - Add tests/ directory with __init__.py

  - Add tests/apps/test_healthz.py — 4 tests covering status OK, IMAGE_VERSION,

  CONTAINER_IMAGE, and all env vars reflected

  - Stub py4web.action so tests run without a full py4web install

  - Add pytest-asyncio to [project.optional-dependencies.testing]

  - Add asyncio_mode = 'auto' to pytest config

  - Add .github/workflows/test-backend.yml — runs pytest --cov=apps on push/PR to mainline

- `53c13bb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/53c13bb>`_ feat(testing): add useConfig and useScannerLink composable tests (closes #60) (#125)

  useConfig — 8 tests:

  - Successful fetch populates config ref with apiKey + wsEndpoint

  - Failed HTTP response returns null and sets error

  - Network error returns null

  - isAuthenticated reflects config presence

  - loading is false after fetch completes

  - Module reset via vi.resetModules() in beforeEach for singleton isolation

  useScannerLink — 9 tests:

  - onRowClick with color sets bus ticker

  - onRowClick with no color is a no-op

  - Handles both 'symbol' and 'ticker' row fields

  - Toggle: clicking active ticker clears it

  - Clicking different ticker updates

  - activeTicker computed reflects bus state

  - activeTicker null when no color

  - activeTicker updates when linkColor changes

- `1c80238 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1c80238>`_ feat(testing): add useWebSocketClient composable tests (#124)

  * feat(testing): add useWebSocketClient composable tests (closes #59)

  15 tests covering:

  - connect/disconnect: WebSocket created with correct URL, isConnected state

  - sendMessage: open socket sends message, closed socket returns false

  - getCache: no limit omits limit field, limit>0 includes it, zero omits it

  - cacheLimit: initial value propagated to getCache on connect

  - subscribe/unsubscribe: correct action+feed sent, empty feedName no-ops

  - onData: called with data.data when present, raw message otherwise

  - sendAuth: auth message sent with api_key on open

  Uses MockWebSocket stub with simulateOpen/simulateMessage helpers.

  * ci: trigger CI run

- `80d39c5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/80d39c5>`_ feat(testing): add useWidgetBus composable tests (closes #58) (#123)

  14 tests covering:

  - Initial state: all colors null

  - setActiveTicker: valid color, invalid color, null ticker, empty string, null color

  - getActiveTicker: set ticker, unset color, invalid color, null color

  - clearActiveTicker: set ticker, invalid color (no throw)

  - Reactivity: shared state across composable instances

  - Isolation: setActiveTicker does not affect other colors

  Module singleton state reset via clearActiveTicker in beforeEach.

- `f2ac6df <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f2ac6df>`_ feat(ci): add GitHub Actions workflow for frontend tests (closes #62) (#122)

  Runs Vitest on push to mainline and on all PRs targeting mainline.

  Node 22, npm ci in client/, cache keyed on package-lock.json.

  Depends on Vitest infrastructure from #57.

- `7d04564 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7d04564>`_ feat(testing): add coverage script and @vitest/coverage-v8 (closes #57) (#121)

  - Add 'coverage' script: vitest run --coverage

  - Add @vitest/coverage-v8 dev dependency

  - Configure coverage in vite.config.js: v8 provider, text + lcov reporters

  Completes the Vitest + Vue Test Utils infrastructure (issue #57).

- `8526a75 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8526a75>`_ feat: wire EnhancedQuote widget to REST company enrichment endpoint (#120)

  On ticker change, fires GET /api/market_data/company/{symbol} to populate

  the company section independently of the WS feed. DailyRangeAnalyzer only

  publishes HOD/LOD — company data no longer comes from the quote stream.

  - companyData ref populated via fetchCompany() on activeTicker change

  - companyLoading state while fetch is in flight

  - Shows 'unavailable' when API returns no data

  - defineExpose updated to include companyData + companyLoading

  - 10 tests (2 new: unavailable state + populated data)

- `fd2a7ea <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fd2a7ea>`_ feat: add market data enrichment proxy (company info + news) (#119)

  * feat: add market data enrichment proxy to SCP (company info + news)

  Introduces a controllers package pattern to keep controllers.py lean.

  Adds two authenticated REST endpoints backed by WDC Redis caching:

  GET /api/market_data/company/<symbol>

  - Massive get_ticker_details() → enrichment:overview:{symbol}

  - TTLs: 30d (data), 24h (no-data), 60s (API error)

  GET /api/market_data/news/<symbol>

  - Finlight fetch_articles() → news:ticker:{symbol}

  - TTL: 7d (data), 60s (API error)

  Cache keys are consistent with the MDP pipeline. Both endpoints

  require an authenticated session (auth.user).

  Dependencies:

  - kuhl-haus-mdp>=0.4.8 added to pyproject.toml

  - New env vars in settings.py: MDC_REDIS_URL, WDC_REDIS_URL,

  MASSIVE_API_KEY, FINLIGHT_API_KEY

  * chore: modernize build — remove setup.py/cfg and requirements.txt

  All project metadata is now in pyproject.toml only. No dual maintenance.

  - Removed: setup.py, setup.cfg (superseded by pyproject.toml)

  - Removed: requirements.txt (app deps in pyproject.toml, installed via pip install -e . in app.Dockerfile)

  - Updated: py4web.Dockerfile base image installs py4web directly; app deps installed in app.Dockerfile

  - Simplified: requirements-build.txt — only GHA build/version detection deps

  * chore: replace requirements-build.txt with pip install -e .[testing]

  Consistent with kuhl-haus-mdp GHA pattern. Build deps are now defined

  in pyproject.toml [project.optional-dependencies.testing] only.

  - Deleted: requirements-build.txt

  - Updated: build-images.yml uses pip install -e .[testing]

  - Added setuptools-scm to testing extras (needed for version detection)

- `ae88610 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ae88610>`_ feat: subscribe EnhancedQuote widget to daily_range feed (#118)

  Switch WS feed from enhanced_quote:{symbol} to daily_range:{symbol}

  to match the new DailyRangeAnalyzer output.

  Update test: short interest section is disabled so assert it does not exist.

- `4922dcb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4922dcb>`_ Reorder Company/Today sections

  Move the Company and Today sections earlier in the EnhancedQuote.vue template.

- `0f665ef <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/0f665ef>`_ feat: temporarily disable Short Interest section in EnhancedQuote widget (refs #85) (#117)

  Short interest and volume enrichment is disabled in the MDS until

  issue #85 is fully resolved. Hide the section to avoid showing

  misleading null/loading state to users.

- `131d6c2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/131d6c2>`_ feat: EnhancedQuote widget — session HOD/LOD, short interest, company info (#116)

  * test(EnhancedQuote): add failing smoke tests for EnhancedQuote widget

  refs #115

  * feat(EnhancedQuote): implement EnhancedQuote widget with session H/L, short interest, company, and splits sections

  Subscribes to enhanced_quote:{symbol} feed. Follows Quote.vue patterns

  exactly for ticker input, widget bus, WebSocket, flame icon, and

  formatting helpers. Adds session H/L, short interest, company info,

  and stock splits sections. All enrichment fields are null-safe.

  refs #115

- `a543851 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a543851>`_ fix(CompanyNews): remove flex from news-card-title — fixes headline alignment and source position (#114)

  display:flex on .news-card-title was causing two bugs:

  - Headline and source became separate flex items → source pushed right

  - flex alignment center-justified multi-line headlines instead of top

  Fix: remove display:flex/gap/align-items, matching NewsFeed exactly.

  Sentiment dot uses inline-block + vertical-align:middle to stay in

  the text flow.

- `fa2cfc7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fa2cfc7>`_ fix(CompanyNews): match mobile card layout to NewsFeed (#113)

  Four fixes:

  1. Sentiment colors: #4ade80/#f87171 → #22c55e/#ef4444 (matches NewsFeed)

  2. Card borders: border-bottom → border+border-radius+background (#1a1a1a)

  matching NewsFeed card style with gap between cards

  3. news-card-header: add flex-wrap; news-card-time: add tabular-nums

  4. news-card-title: align-items:flex-start → center (sentiment dot

  was floating above headline baseline); add color:#ddd, line-height:1.4

- `62ad2ca <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/62ad2ca>`_ fix(CompanyNews): headline font-size 16px → 14px to match NewsFeed (#112)

  NewsFeed uses font-size:14px on .vs-headline explicitly; it has a

  redundant 16px on .vs-td.col-title that is overridden by a second

  .vs-td.col-title block further down. CompanyNews only had the first

  block, so headlines were rendering at 16px instead of 14px.

  Fix: remove font-size from .vs-td.col-title, set explicit 14px on

  .vs-headline.

- `f1e4187 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f1e4187>`_ fix(CompanyNews): match virtual scroller row, header, and input style to NewsFeed (#111)

  Row fixes:

  - .vs-td.col-title: add color:#ddd, font-size:16px, line-height:1.4

  - .ticker-tag: font-size 11px → 10px

  - .vs-row:hover: #2a2a2a → #111

  Header fixes:

  - .vs-header: background #252525 → #1a1a1a; add sticky/z-index/font styles

  - .vs-th: remove duplicate font styling (now inherited from .vs-header)

  Input fixes:

  - .cn-input, .search-input: background #2d2d2d → #121212, border #444 → #333

  - placeholder color #444 → #666 (legible grayish on black bg)

- `34f4ae3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/34f4ae3>`_ Add 20000 option to max-articles list

  Add 20000 to MAX_ARTICLES_OPTIONS in CompanyNews.vue and NewsFeed.vue so users can choose a 20,000-article cache size. No other logic or defaults were changed; NewsFeed's localStorage key and existing default remain unchanged.

- `3d60912 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3d60912>`_ fix(CompanyNews): highlight active ticker badge with bold/bright style (#110)

  Active ticker badge now shows purple background, bright border, white

  bold text — same visual treatment as NewsFeed's active ticker filter.

  Tooltip changes to 'Currently viewing' for the active ticker.

- `931fcf1 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/931fcf1>`_ fix(CompanyNews): clicking ticker badge switches feed instead of opening modal (#109)

  Ticker badges in rows/cards now call switchTicker() with @click.stop,

  preventing bubble-up to the row's openDetail handler.

  Clickable badges get a pointer cursor and hover highlight.

- `77f4527 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/77f4527>`_ docs(CLAUDE): add bug workflow — test first directive (#108)
- `2aac6bd <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2aac6bd>`_ feat(CompanyNews): add US-ticker badges to rows and mobile cards (#107)

  Articles tagged to multiple companies now show all ticker badges at a

  glance in both desktop and mobile views, matching NewsFeed behavior.

- `c609130 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c609130>`_ fix(CompanyNews): fix oscillating reconnect and double-subscribe (#106)

  Two bugs:

  1. lastDataAt was hardcoded as ref(null) — always null — so the

  freshness expression (lastDataAt === null) always evaluated true,

  showing the widget as perpetually reconnecting.

  Fix: expose real lastDataAt from useWebSocketClient.

  2. External watch(isConnected) called subscribe+getCache on every

  reconnect, duplicating the composable's own internal watcher which

  does the same. Two subscribers fighting each other.

  Fix: remove the external watch(isConnected) entirely — the composable

  handles subscribe+getCache internally after connect succeeds.

- `23bbf0e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/23bbf0e>`_ fix(CompanyNews): don't auto-connect until ticker is set (#105)

  With autoConnect:true and an empty feedName, the WDS received an invalid

  subscribe request on connect, causing an immediate error/close and a

  persistent reconnect loop.

  Fix: autoConnect:false — connect() is called manually when the first

  ticker is set. Subsequent ticker changes use subscribe/unsubscribe as

  before. The existing watch(isConnected) handler fires after connect()

  succeeds and issues subscribe + getCache.

- `b60d63f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b60d63f>`_ fix(NewsFeed, CompanyNews): remove column resize — virtual scroller has fixed row width (#104)

  The resize handle only moved the header column divider; the virtual

  scroller rows are fixed-width so resizing had no functional effect.

  Removes from both widgets:

  - startResize / resizeState logic

  - isLocked prop

  - col-resize-handle CSS

- `6e8cab0 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6e8cab0>`_ feat(NewsFeed, CompanyNews): dismiss modal on Escape key (#102)

  Adds a document-level keyup listener when the widget is mounted.

  Pressing Escape closes the article detail modal in both NewsFeed

  and CompanyNews widgets.

- `c43cfbd <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c43cfbd>`_ feat(CompanyNews): per-ticker news widget from news:ticker:{symbol} cache (#101)

  New widget showing full article history for a single ticker.

  - Ticker input + widget bus (same pattern as Quote widget)

  - Subscribes to news:ticker:{symbol} on symbol change

  - Calls getCache() for immediate historical load

  - Virtual scroll table with sort + headline search

  - Max articles selector (50 to 10K)

  - Detail modal (image, summary, source link, sentiment)

  - Column resize when layout unlocked

  - Settings (maxArticles) persist to named layouts

  - Widget type: company-news | Menu label: Company News | Icon: 🗞️

  refs #100

- `c3483f5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c3483f5>`_ feat(Quote): show end_timestamp instead of received-time in freshness line (#99)

  Previously showed when the data was received by the browser.

  Now shows end_timestamp from the agg event — the actual time the

  aggregate window ended (Unix milliseconds), making stale/delayed

  quotes easier to reconcile with the timeframe they were emitted in.

  Falls back to '—' if absent.

  Label updated: 'Updated' → 'As of'

- `53856d8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/53856d8>`_ Shorten previous day labels in Quote.vue

  Remove the "PD " prefix from previous day field labels in client/src/components/widgets/Quote.vue, changing labels to Open, High, Low, Close, Volume, and VWAP for improved readability and consistency with other sections. This is a UI-only text change.

- `d005e68 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d005e68>`_ feat(Quote): add prev_day open/high/low to Previous Day section (#98)

  Previous Day section now shows the full OHLC picture:

  PD Open / PD High / PD Low / PD Close / PD Volume / PD VWAP

  Fields sourced from prev_day_open/high/low in the quote:{symbol} payload,

  added in kuhl-haus/kuhl-haus-mdp#55. Gracefully renders as $0.00 when

  fields are absent (quote-v fmt() handles null/undefined safely).

  refs #97

- `e6c2cf5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e6c2cf5>`_ feat(NewsFeed): include M/D date prefix in time column (#96)

  With multi-day article cache, time alone is ambiguous. Format changed from

  '12:00 AM' to '4/1 12:00 AM' — no zero-padding, single-digit month/day.

  Examples:

  4/1 12:00 AM

  3/31 11:59 PM

  1/1 12:00 AM

  12/31 11:59 PM

- `94307b7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/94307b7>`_ Remove high and low from Quote widget.

  Pending feature to track high-of-day and low-of-day.

  ref: https://github.com/kuhl-haus/kuhl-haus-mdp/issues/53

- `dd9ae9f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/dd9ae9f>`_ Use lightning icon in empty Quote widget

  Replace the chart emoji (📊) with a lightning emoji (⚡) in the Quote.vue empty-state markup to improve visual emphasis when no ticker is selected. Small UI-only tweak to the widget's placeholder.

- `5ece96b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5ece96b>`_ Change Quote so it doesn't conflict with an existing icon.
- `06df89e <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/06df89e>`_ refactor(NewsFeed): replace original with FastFeed impl; delete NewsFeedFast; remove V2 from app (#94)

  NewsFeedFast (virtual scrolling) handles 10K articles without performance

  issues. The original NewsFeed suffered under load.

  - NewsFeed.vue replaced with NewsFeedFast implementation (virtual scrolling)

  - NewsFeedFast.vue deleted

  - NewsFeedV2.vue exists on disk only — not registered, not importable from app

  - WidgetMenu: only 'News Feed' exposed; Fast and V2 entries removed

  - Existing layouts using news-feed type continue to work unchanged

- `ecfa7d6 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ecfa7d6>`_ fix(Quote): match change text size to header; add flame icon next to ticker (#93)

  - quote-change font-size: 13px -> 18px (matches quote-symbol)

  - Flame freshness icon next to ticker symbol when news exists

  (same getFlameVariant/getFlameTooltip pattern as GenericScannerTable)

- `2a7d775 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2a7d775>`_ fix(Quote): increase font sizes +10-25%; boost label contrast (#92)

  Data values: 12px → 15px (+25%)

  Data labels (quote-k): 12px → 15px, color #666 → #aaa (high contrast)

  Section labels: 10px → 13px (+30%), color #555 → #999

  From-open text: 12px → 14px, color #888 → #aaa

  Freshness timestamp: 11px → 13px, color #444 → #888

  Base widget / input / button: 13-14px throughout

- `7ca25ec <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7ca25ec>`_ fix(Quote): broadcast manual ticker to widget bus; fix mobile Go button (#91)

  Bug 1 (mobile): Go button @click can be unreliable on iOS due to touch

  event handling. Added @touchend.prevent='applyInput' to fire on touch.

  Bug 2 (no broadcast): applyInput() only set the local manualTicker ref.

  It never called setActiveTicker(), so linked widgets (news feed, etc.)

  didn't receive the ticker update. Now calls setActiveTicker(linkColor, t)

  when a link color is configured, making manual entry equivalent to

  clicking a scanner row for linked widgets.

- `47fb009 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/47fb009>`_ fix(Quote): replace freshness icon+relative age with localized timestamp (#90)

  The freshness status ball in the footer was redundant with the widget

  header's freshness indicator. Removed the icon; replaced the relative

  age text ('23s ago') with a localized date+time string using

  toLocaleString() so the user sees the actual timestamp of the last

  update in their local timezone.

- `6ac2ad5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6ac2ad5>`_ fix(Quote): use autoConnect:true and properly manage feed subscriptions (#89)

  Root cause: initialized with autoConnect:false and empty feedName, so

  no WebSocket connection was ever established.

  Fix:

  - autoConnect:true — connection established immediately on mount

  - Track current feed in a local ref (currentFeed)

  - On ticker change: unsubscribe old, update feedName+cacheKey, subscribe new

  - On connection open: subscribe + getCache() if ticker pending

  - getCache() called after subscribe to immediately serve 3-day cached data

  refs #49

- `fd0bfee <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/fd0bfee>`_ feat: Quote widget — live per-symbol enriched data (#88)

  * feat: Quote widget — live per-symbol enriched data via quote:{symbol} feed

  New widget that displays enriched real-time quote data for a linked ticker.

  ## How it works

  The Quote widget has no ticker input — it is driven entirely by the widget

  bus. Link it to a scanner widget via a shared link color; clicking a scanner

  row broadcasts the ticker, and the Quote widget:

  1. Unsubscribes from the previous quote:{symbol} feed

  2. Re-subscribes to quote:{newSymbol}

  3. Displays enriched data as it arrives (~1/sec, throttled by LBA)

  ## Displays

  - Symbol + price + change (prev day and from open)

  - OHLC (open, high, low, VWAP)

  - Volume: accumulated, relative volume, avg vol, float

  - Previous day: close, volume, VWAP

  - Data freshness indicator (last updated timestamp)

  ## States

  - No link color set → 'Link to a scanner widget...' prompt

  - Linked but no data yet → 'Waiting for data for {ticker}...'

  - Data available → full quote display

  ## Notes

  - Ticker not persisted to settings (ephemeral widget bus state only)

  - TTL is 3 days in Redis — stale data shown with age indicator

  - Registered in WidgetWrapper + WidgetMenu as 'quote' type

  refs #49

  * fix(Quote): add manual ticker input field; no settings persistence

  Requirements per issue #49:

  1. Search field to input a stock ticker (Enter or Go button)

  2. Displays enriched LeaderboardAnalyzer data

  3. Continuously updates via quote:{symbol} WebSocket feed

  4. No settings persistence — ticker is driven by widget bus OR manual entry

  Ticker priority:

  - Widget bus (linked scanner row click) takes precedence when link color is set

  - Manual entry fills the gap when no bus ticker is active

  - Clearing the bus ticker falls back to manual entry; setting a new bus

  ticker clears the manual override

  Both inputs are ephemeral — nothing persists to layout settings.

- `efd9752 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/efd9752>`_ fix(scanners): sync all filter state when settings prop changes (layout load race condition) (#87)

  * fix(scanners): sync hiddenCols when settings prop updates after layout load

  When a layout is loaded, Vue reuses existing component instances rather

  than remounting them (same widget-i keys). The hiddenCols ref was only

  initialized from props.settings at mount time, so loading a layout after

  a browser refresh required a second load for the hidden column state to

  apply.

  Fix: watch props.settings.hiddenCols and update the local ref whenever

  it changes, so layout loads always sync the column visibility state.

  * fix: replace per-key watches with single props.settings watcher

  All filter refs (volumeThreshold, relVolumeThreshold, minPriceThreshold,

  maxPriceThreshold, minChangePercent, showGappersOnly, hiddenCols) suffered

  the same race condition — initialized from props.settings at mount only,

  not updated when a layout loads into a reused component instance.

  Replace the separate hiddenCols watch (added in the previous commit on

  this branch) with a single props.settings watcher that syncs all refs

  at once. Cleaner, covers everything, no watch proliferation.

- `006a6ae <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/006a6ae>`_ fix: restore missing /> on checkbox input and remove duplicate attributes (#86)

  Patch script ate the self-closing /> on the checkbox input and

  left duplicate :checked/:disabled attributes. Both issues fixed.

- `9fc4fce <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9fc4fce>`_ fix(scanners): column visibility toggles now work correctly (#85)

  Two bugs:

  1. Inline @change handler used both auto-unwrapped (template context)

  and explicit .value access inconsistently. Replaced with a named

  toggleCol(key, visible) method for clarity and correctness.

  2. Watch source '() => hiddenCols.value' captured the array reference.

  Changed to '() => [...hiddenCols.value]' (spread copy) so Vue

  detects the new array reference on every mutation and fires the

  settings emit.

  refs #83

- `9248aa3 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9248aa3>`_ feat(#83): resizable and hideable columns in scanner widgets (#84)

  ## Column resize

  - GenericScannerTable: drag handles on <th> right edge (visible when unlocked)

  - Width tracked per-column in localWidths ref, initialized from colWidths prop

  - Emits update-col-widths on drag end → DashboardGrid persists to layout

  - Scanner widgets: accept colWidths prop, forward to GenericScannerTable

  ## Column visibility

  - Gear icon (⚙️) in scanner controls bar opens a column checklist popover

  - Symbol column is always visible (disabled in checklist)

  - Hidden columns excluded from both <thead> and <tbody> via visibleColumns computed

  - hiddenCols stored in settings.hiddenCols → persists to layout via update-settings

  - Click-outside closes the popover

  refs #83

- `208ce49 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/208ce49>`_ fix(WidgetWrapper): remove redundant link color dot in locked mode (#82)

  The link color is already indicated by the colored border-bottom on the

  widget header. The small dot next to the freshness icon in locked mode

  was redundant visual noise. Removed both the template element and its CSS.

- `74735fa <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/74735fa>`_ fix(NewsFeedFast/V2): scope .col-title to data rows only (#81)

  .col-title was applying to both .vs-th header cells and .vs-td data

  cells. The color: #ddd and font-size: 16px overrode the .vs-th header

  styling, making the 'HEADLINE' header label appear white and oversized.

  Scope to .vs-td.col-title so header cells inherit .vs-th styles only.

- `5e66d7f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5e66d7f>`_ feat(#78): news freshness flame indicators on scanner rows (#80)

  Implements the 6-tier flame freshness indicator on scanner widgets.

  ## How it works

  News feed widgets (NewsFeed, NewsFeedFast, NewsFeedV2) now call

  setNewsTimestamp(ticker, timestamp) for each ticker in every incoming

  article. This updates a module-singleton reactive Map in useWidgetBus.

  GenericScannerTable reads that map and renders the appropriate flame

  icon inline in the symbol cell, with a title tooltip for desktop hover

  and a 500ms long-press handler for mobile.

  ## Tiers

  🔴 Red    — < 1h   (freshest catalyst)

  🟠 Orange — 1–3h   (very fresh)

  🟡 Yellow — 3–12h  (same session)

  ⬜ White  — 12–24h (multi-session)

  🔵 Blue   — 1–3d   (fading)

  ⚫ Dark   — > 3d   (stale)

  (none)    — no news in cache

  ## Files changed

  - useWidgetBus.js: newsTimestamps map + setNewsTimestamp/getFlameVariant/

  getFlameTooltip/formatAge exports

  - GenericScannerTable.vue: flame icon rendering + long-press mobile tooltip

  - NewsFeed/NewsFeedFast/NewsFeedV2.vue: wire onData → setNewsTimestamp

- `f1a6911 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f1a6911>`_ feat: add flame icons for news freshness indicator (refs #78) (#79)

  Six color variants aligned with MOMO scanner freshness tiers:

  flame-red    — <1h    (freshest catalyst)

  flame-orange — 1–3h   (very fresh)

  flame-yellow — 3–12h  (same session)

  flame-white  — 12–24h (multi-session)

  flame-blue   — 1–3d   (fading momentum)

  flame-dark   — >3d    (stale)

  No icon = no news recorded for this ticker.

  Icon source: Heroicons 'fire' solid (heroicons.com, MIT License).

- `036ebad <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/036ebad>`_ fix: align NewsFeedFast/V2 header style with NewsFeed (#76)

  vs-header/vs-th were styled independently and diverged from the

  original news-feed table header. Align to match:

  background:    #0d0d0d → #1a1a1a

  color:         #666    → #888

  font-size:     11px    → 12px

  font-weight:   normal  → 600

  border-bottom: #222    → #333

  padding (th):  6px 8px → 3px 8px

  letter-spacing: 0.05em → 0.04em

- `69d7326 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/69d7326>`_ fix(GenericScannerTable): tighten row padding to match NewsFeedFast density (#75)

  th: 10px 8px → 4px 8px

  td: 8px → 2px 8px

  Matches the row density of NewsFeedFast (.news-row td { padding: 2px 8px }),

  reducing wasted vertical space in scanner widgets.

- `702105d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/702105d>`_ fix(TopGappers): add missing watch to persist filter settings (#74)

  The patch script that added settings persistence to scanner widgets

  searched for 'const { lastDataAt, isConnected, reconnecting }' as

  the insertion point. TopGappers destructures 'connect' as well —

  'const { connect, lastDataAt, isConnected, reconnecting }' — so the

  pattern didn't match and the watch block was silently skipped.

  TopGainers and TopVolume were unaffected (they don't destructure

  'connect' from useWebSocketClient).

  refs #66

- `ae000cb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ae000cb>`_ feat(WidgetWrapper): long-press to rename widget title on mobile (#72)

  Double-click works on desktop but not on touch screens. Add a

  500ms long-press handler on the widget title span that triggers

  inline edit mode on mobile, matching the existing double-click

  behavior on desktop.

  - touchstart starts a 500ms timer to call startEditLabel()

  - touchend/touchmove cancel the timer (prevents accidental trigger while scrolling)

  - Tooltip text is context-aware: 'Long-press to rename' on mobile,

  'Double-click to rename' on desktop

  - Timer cleaned up on unmount

  refs #65

- `bb8f634 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/bb8f634>`_ feat(scanners): persist filter settings to layout (closes #66) (#71)

  Wire scanner widgets into the settings persistence pattern established

  by the news feed widgets. All three scanner widgets now:

  - Accept a `settings` prop (passed down DashboardGrid → WidgetWrapper → widget)

  - Initialize filter controls from props.settings with hardcoded defaults as fallback

  - Watch all filter refs and emit `update-settings` on any change

  - DashboardGrid handles the event, merges into layout item, triggers autosave

  Affected widgets and their persisted settings keys:

  - TopGainers: volumeThreshold, relVolumeThreshold, minPriceThreshold,

  maxPriceThreshold, minChangePercent

  - TopGappers: volumeThreshold, relVolumeThreshold, minPriceThreshold,

  maxPriceThreshold, minChangePercent

  - TopVolume:  volumeThreshold, relVolumeThreshold, showGappersOnly,

  minPriceThreshold, maxPriceThreshold

  Default values match the current Ross 5-pillars tuning. Two instances

  of the same widget type now maintain independent filter state.

- `8570a21 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8570a21>`_ fix: mobile edit mode now respects isLocked state (#70)

  Mobile WidgetWrapper was hardcoded with :is-locked="true", which

  prevented edit-mode features from working on mobile regardless of

  the lock toggle state. This broke:

  - Widget linking (link color selector hidden when isLocked=true)

  - Widget title editing (dblclick guard checks !isLocked)

  Fix: pass :is-locked="isLocked" consistently, matching desktop.

- `2adf0a2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2adf0a2>`_ feat(WidgetWrapper): user-defined widget title with inline editing (#68)

  Double-click the widget title when unlocked to edit in-place.

  Enter or blur commits; Escape cancels. Empty label falls back to

  the widget type key. userLabel stored in layout item and autosaved.

  refs #65

- `9ed27bf <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9ed27bf>`_ fix(NewsFeed): missing closing paren on emit call (syntax error) (#69)

  Fixes build failure introduced in PR #67.

  emit('update-settings', ...) was missing its closing ')'.

  refs #66

- `a0bb471 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/a0bb471>`_ feat(layout): persist per-widget control settings in layout (#67)

  Each layout item now carries a 'settings' object (maxArticles,

  hasTickersOnly). Widgets initialize from props.settings (falling back

  to localStorage for backwards compat), and emit 'update-settings'

  when controls change. DashboardGrid writes back to layout[i].settings

  and autosaves — fixing the shared-localStorage bug where two instances

  of the same widget type fought over the same key.

  refs #66

- `c10ee97 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c10ee97>`_ fix(NewsFeedFast): tighten row density (22px height, no padding gap) (#64)
- `4c63716 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4c63716>`_ fix(NewsFeedFast/V2): remove double scrollbar + match original font sizes and row spacing (#63)

  * fix(NewsFeedFast/V2): remove outer scrollbar from news-table-wrap

  news-table-wrap had overflow-y: auto creating a redundant outer

  scrollbar alongside the inner vs-scroller. Changed to overflow: hidden

  since the scroller handles all scrolling.

  * fix(NewsFeedFast/V2): match original font sizes and tighten row spacing

  - Headline font-size: 14px → 16px (matches NewsFeed col-title)

  - Time font-size: 12px (unchanged, already correct)

  - Row height: 40px → 28px (Fast), min-height 44px → 28px (V2)

  - Row padding: tightened to match original 2px rows

- `4e66d06 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4e66d06>`_ fix(NewsFeedFast/V2): remove outer scrollbar from news-table-wrap (#52)

  news-table-wrap had overflow-y: auto creating a redundant outer

  scrollbar alongside the inner vs-scroller. Changed to overflow: hidden

  since the scroller handles all scrolling.

- `d82951b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d82951b>`_ fix(NewsFeedV2): inline sentiment/headline/tickers on same row (#51)

  col-title was flex-direction: column, stacking everything vertically.

  Changed to flex-direction: row with flex-wrap so headline and tickers

  flow inline. Removed separate vs-tickers div.

- `29bca5b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/29bca5b>`_ feat(NewsFeedV2): virtual scrolling with variable row height (closes #48) (#50)

  New widget using DynamicScroller + DynamicScrollerItem from

  vue-virtual-scroller. Row heights measured after render — headlines

  wrap naturally, ticker pills wrap to multiple lines.

  Sticky flex header, full filter/search/sort stack preserved.

  Registered as 'news-feed-v2' (🗞️) in widget menu.

- `6423884 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6423884>`_ feat(NewsFeedFast): virtual scrolling with fixed row height (closes #47) (#49)

  New widget using vue-virtual-scroller RecycleScroller for fixed 40px

  rows. Headlines truncated with ellipsis. Sticky div header replaces

  <thead>. All filters, search, sort, and article count preserved.

  Registered as 'news-feed-fast' (⚡) in widget menu.

- `f3565ac <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/f3565ac>`_ Add higher max articles options

  Expand MAX_ARTICLES_OPTIONS in NewsFeed.vue to include 4000, 8000 and 10000 so users can select larger article counts for the news feed. LocalStorage key and default behavior remain unchanged (defaults to 1000, persisted under 'newsfeed:maxArticles').


Version 0.2.1 (2026-03-28)
==========================

- `b069eea <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b069eea>`_ feat(NewsFeed): send limit to WDS on initial cache fetch (closes #47 step 3) (#46)

  Pass maxArticles as cacheLimit to useWebSocketClient so initial cache

  requests include { limit: N } — WDS now fetches only N items from Redis

  instead of the full 10k list.

  Watching maxArticles clears the buffer and re-fetches at the new limit.

- `c07fb97 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c07fb97>`_ feat(NewsFeed): add max articles selector (50/100/500/1000/2000, default 1000) (#45)

  Adds a dropdown to the toolbar to control the maximum number of articles

  loaded and displayed. Default is 1,000. Persisted to localStorage.

  The article buffer is trimmed to maxArticles on each incoming batch,

  keeping memory bounded while the backend cache grows independently.

- `e21d095 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e21d095>`_ feat(NewsFeed): show article count in toolbar (#44)

  Displays filtered/total count in the toolbar right-aligned.

  When no filters are active: shows total (e.g. '342').

  When filters are active: shows filtered/total (e.g. '12 / 342').


Version 0.2.0 (2026-03-27)
==========================

- `07d0864 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/07d0864>`_ feat(NewsFeed): client-side full-text search (closes #42) (#43)

  Search input in toolbar filters articles by headline, source, and

  ticker symbols in real time. Escape clears the query. Composes with

  R1 (tickers-only) and R2 (ticker click-to-filter).

  type=search gives native clear button. No debounce needed;

  String.includes() on 1,000 articles is sub-millisecond.

- `79294ae <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/79294ae>`_ fix(NewsFeed): deduplicate articles by link on ingest (#41)

  Cache load on connect + live pub/sub subscription can deliver the

  same article twice if FDP reprocesses or FDL reconnects and replays.

  Filter incoming articles against existing links before prepending.

- `1bac37a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1bac37a>`_ fix: two z-index bugs in scanner table and mobile toolbar (#40)

  GenericScannerTable:

  - th: add z-index:1 so sticky header sits above absolute-positioned

  td contents (volume bar was rendering over column headers on scroll)

  - td: add position:relative to contain the absolute volume-bar inside

  its cell rather than leaking into the stacking context

  DashboardGrid (mobile):

  - custom-select--mobile: add position:relative for correct dropdown

  anchor positioning

  - select-dropdown on mobile: z-index:9999 so it renders above the

  WidgetMenu button instead of behind it

- `c66e228 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/c66e228>`_ feat(scanner): highlight selected row with violet 1px outline instead of background (#39)

  Replace subtle background tint with 1px solid #a78bfa outline on

  active/selected rows. outline-offset: -1px keeps it inside the row

  bounds without affecting layout. No background change — selected row

  is visually distinct from both default and hover states.

- `1d91b52 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1d91b52>`_ fix(NewsFeed): revert time column font to 12px (headline stays 16px) (#38)
- `2aff2e8 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2aff2e8>`_ feat(NewsFeed): inline tickers into headline cell, two-column layout (#37)

  Desktop table: Time | Headline+Tickers (was Time | Tickers | Headline)

  Tickers render inline after source: '{headline} — {source} [AAPL] [NVDA]'

  Sortable columns: Time and Headline only.

  Mobile card layout: tickers already inline in header row — unchanged.

- `06dd9e9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/06dd9e9>`_ feat(NewsFeed): larger desktop fonts + tighter row spacing (#36)

  Desktop only (mobile card layout unchanged):

  - Time: 12px → 15px

  - Headline: 13px → 16px

  - Inline source: 11px → 13px

  - Ticker tags: unchanged (10px — already correct size)

  - Row padding: 4px → 2px top/bottom

  - Header padding: 5px → 3px top/bottom

- `e728b59 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e728b59>`_ feat(NewsFeed): reorder columns — Time | Tickers | Headline (#35)
- `9a17975 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9a17975>`_ fix(mobile): restore layout controls + fix auth-required false positive (#34)

  The v-else on the auth-required div was chained to the desktop toolbar's

  v-if (appConfig && !isMobile), so on mobile it always rendered 'Please

  log in to access the dashboard' even when authenticated.

  Fix: change v-else to v-if="!appConfig" (explicit condition).

  Also expand mobile toolbar to include layout dropdown (load/save),

  lock/unlock toggle, and widget-add — matching the desktop feature set

  at a mobile-appropriate size.

- `8d0b53a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8d0b53a>`_ feat(NewsFeed): sortable columns (#33)

  Clicking a column header sorts the feed by that column.

  Clicking again reverses direction. Active sort column highlighted in violet.

  - Time: by publishDate (default: desc — newest first)

  - Headline: alphabetical by title

  - Tickers: alphabetical by first US ticker

  Sort indicator ▲/▼ shown in header. Resize handles still work.

- `14169ee <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/14169ee>`_ feat(mobile): responsive layout + NewsFeed source inline (#32)

  - Source column removed from NewsFeed table; inlined as

  '{HEADLINE} — {source}' in muted text (frees ~110px)

  - Phone (< 640px): vertical widget stack, collapsed toolbar,

  NewsFeed card layout (no columns, full-width headline)

  - Tablet/desktop (>= 640px): unchanged

  - isMobile reactive on window resize, forwarded to all widgets

- `5847eec <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5847eec>`_ feat(dashboard): widget linking Phase 2 — scanner broadcast (#30)

  Wire top-gainers, top-gappers, top-volume into the widget bus.

  Clicking a row broadcasts the ticker to all Content widgets sharing

  the same link color.

  useScannerLink (new composable):

  - onRowClick(row): broadcasts row.symbol to bus; toggle-clears if same ticker

  - activeTicker: computed from bus for the current link color (row highlight)

  GenericScannerTable:

  - Accepts activeTicker prop; highlights matching row with row-active class

  - Emits row-click on tr click

  TopGainers / TopGappers / TopVolume:

  - Accept linkColor + isLocked props (forwarded from WidgetWrapper)

  - Wire :active-ticker and @row-click to GenericScannerTable

- `1f6f88d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1f6f88d>`_ feat(dashboard): widget linking framework — Phase 1 (closes #28) (#29)

  Introduces a cross-widget ticker broadcast system. Widgets are grouped

  by a shared link color from a 9-color high-contrast palette.

  useWidgetBus (new composable):

  - Singleton reactive store: activeTickers[color] = ticker | null

  - setActiveTicker(color, ticker) — broadcast from Scanner/Alert

  - getActiveTicker(color) — poll from Content

  - LINK_COLORS + LINK_COLOR_MAP exported for palette consumers

  - Ephemeral state (resets on reload)

  WidgetWrapper:

  - Accepts linkColor prop; persisted in layout item via update-link-color emit

  - Widget header gets 1px bottom border in link color when linked

  - Unlocked: shows 9-swatch color selector + ∅ unlink option in header

  - Locked: shows small colored dot when linked; clean header when unlinked

  DashboardGrid:

  - Passes :link-color to WidgetWrapper per item

  - updateLinkColor() stores on layout item + autoSaves

  NewsFeed:

  - Accepts linkColor prop

  - Ticker badge click broadcasts to bus when linkColor set

  - Watches bus for incoming ticker from other linked widgets; auto-applies filter

  - Bi-directional: both source and receiver on same color

- `562d1b9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/562d1b9>`_ feat(dashboard): autosave toggle button (#27)

  Adds a toggle to the toolbar to enable/disable autosave.

  Icon: 🔄 (running) / ⏸ (paused) — distinct from 💾 manual save button.

  - ON (default): autosave runs as normal on layout changes (debounced 2s)

  - OFF: autoSaveLayout() returns early; no __autosave__ writes occur

  - State persisted in localStorage (dashboard-autosave-enabled)

  - Button dims (grayscale + 40% opacity) when autosave is disabled

- `eff7f7a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/eff7f7a>`_ feat(NewsFeed): resizable columns, text wrap, tighter row spacing (#26)

  NewsFeed:

  - Drag-to-resize column handles on th headers (visible only when dashboard unlocked)

  - Default widths: Time=90px, Source=110px, Tickers=130px, Headline=auto (fills rest)

  - Widths emitted via update-col-widths on drag end → saved into layout item

  - Widths restored from colWidths prop on layout load

  - Text wraps instead of truncating (white-space: normal on td)

  - Row padding reduced: 4px top/bottom (was 8px)

  WidgetWrapper:

  - Forwards isLocked + colWidths props to inner component

  - Forwards update-col-widths emit to DashboardGrid

  DashboardGrid:

  - Passes :is-locked and :col-widths to WidgetWrapper per item

  - updateColWidths() stores colWidths on layout item + calls autoSaveLayout()

- `5585edb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/5585edb>`_ feat(NewsFeed): remove article limit — scroll back indefinitely (#25)

  Remove MAX_BUFFER cap (was 500) and maxItems select (was 25/50/100).

  All received articles are retained in memory for the session; no

  arbitrary truncation. WDS pushes only as articles arrive so practical

  memory footprint is a few hundred items per trading day.

- `1372625 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1372625>`_ feat(NewsFeed): filterable news feed widget (closes #23) (#24)

  R1: 'Tickers only' toggle button hides articles with no US-listed companies.

  State persisted in localStorage (newsfeed:hasTickersOnly). Default: off.

  R2: Ticker badge click-to-filter. Clicking a badge sets an active ticker

  filter pill in the toolbar; feed narrows to articles containing that

  ticker. Click same ticker again to clear. Click × in pill to clear.

  Different ticker replaces the current filter (single-ticker, not multi).

  Active ticker badge highlighted with filled background + white text.

  R1 and R2 compose: both can be active simultaneously.

  Ticker filter is ephemeral (clears on reload); toggle persists.

- `acf5ca7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/acf5ca7>`_ fix: widen time column, increase font sizes in NewsFeed widget (#22)
- `9b9fa6a <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9b9fa6a>`_ fix: filter out WDS auth/subscribe ack messages in NewsFeed onData (#21)
- `7e16db9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7e16db9>`_ feat: redesign NewsFeed widget — table layout, detail modal, sentiment dots (#20)
- `1c97a60 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1c97a60>`_ feat: layout lock mode — prevent accidental drag/autosave (closes #18) (#19)

  Adds a lock/edit toggle (🔒/✏️) to the dashboard header.

  Locked mode (default):

  - is-draggable and is-resizable bound to !isLocked

  - autosave watch gated on !isLocked — no accidental saves from mis-click or touch

  - all widget controls remain fully functional

  Edit mode:

  - existing drag/resize/autosave behavior unchanged

  Lock state persisted in localStorage (key: dashboard-layout-locked).

  Default is locked so mobile users and new users are safe from the start.

- `347cb48 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/347cb48>`_ feat: add NewsFeed widget (closes #16) (#17)

  Adds NewsFeed.vue widget that subscribes to news:feed:latest via WDS

  WebSocket and displays real-time headlines with ticker tags.

  - Ticker filter input + item count selector

  - Articles prepended newest-first, capped at 500 items

  - Clicking a ticker tag emits ticker-click event

  - Headlines link out to source

  - Freshness indicator wired via defineExpose (lastDataAt, isConnected, reconnecting)

  - Registered in WidgetWrapper and WidgetMenu (📰 News Feed)

- `8116219 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/8116219>`_ ci: bump Docker actions to Node.js 24-compatible versions (#13) (#14)
- `6bed82c <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6bed82c>`_ docs: update blog links to canonical oldschool-engineer.dev (#11) (#12)
- `3616c53 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/3616c53>`_ docs: add CLAUDE.md and AGENTS.md for AI agent maintainers (#10)

  Closes #9

  Co-authored-by: Tom Pounders <git@oldschool.engineer>

- `2df40a5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2df40a5>`_ feat: replace freshness text label with emoji icon state indicator (#8)

  Replace the oscillating "0s ago"/"1s ago" text with a single emoji

  icon that conveys connection/data state at a glance.

  Icon states:

  ❌  Disconnected (not reconnecting)

  🔵/🟣  Connecting / Reconnecting (250ms oscillation)

  🔴  Stale (connected, data ≥ 60s old)

  🟡  Aging (connected, data 5–59s old)

  🟢  Fresh (connected, data < 5s old)

  A 250ms oscillation interval drives the blue/purple alternation for

  the connecting/reconnecting state. All text-based computed props

  (freshnessLabel, freshnessClass) and their CSS are removed.

  Closes #7

  Co-authored-by: Tom Pounders <git@oldschool.engineer>

- `7b547e2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/7b547e2>`_ feat: add automatic WebSocket reconnection with exponential backoff (#6)

  Add auto-reconnect with exponential backoff to useWebSocketClient.

  Reconnect triggers only on onclose (actual connection drop), never on

  data staleness — preserving correct off-hours / market-closed behavior

  where the WebSocket stays connected but feeds are quiet.

  Backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped). Resets on successful

  reconnect. Intentional disconnect() suppresses reconnect.

  WidgetWrapper freshness indicator gains "Reconnecting..." and

  "Disconnected" states (amber) alongside the existing fresh/aging/stale.

  Changes:

  - useWebSocketClient: scheduleReconnect(), backoff state, reset on open,

  autoConnect→let, disconnect clears timer, new config options

  - TopVolume, TopGainers, TopGappers: expose isConnected + reconnecting

  - WidgetWrapper: computed isConnected/reconnecting, extended

  freshnessLabel/freshnessClass, .disconnected CSS

  Closes #5

  Co-authored-by: Tom Pounders <git@oldschool.engineer>

- `e9b66d7 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e9b66d7>`_ feat: add data freshness indicator to widget header (#4)

  Add a live-updating freshness indicator to each widget header showing

  how long ago data was last received via WebSocket. The indicator is

  color-coded: green (<30s), amber (30-120s), red (>120s / no data).

  Changes:

  - useWebSocketClient: track lastDataAt timestamp on each data message

  - TopVolume, TopGainers, TopGappers, GenericScannerTable: expose lastDataAt

  - WidgetWrapper: read lastDataAt via template ref, tick every 1s,

  render colored freshness label in header

  Closes #3

  Co-authored-by: Tom Pounders <git@oldschool.engineer>

- `1f6ecbb <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1f6ecbb>`_ Add link for Part 5 of the project series
- `4a8f85b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4a8f85b>`_ Revise README: badges, SCP docs, container guide

  Rework README content and structure: relocate and fix the Build Images badge, remove an outdated last-commit badge, and refine the project summary. Clarify the frontend(Service Control Plane) description and consolidate implemented vs planned features. Add a Container Image section with guidance to generate a py4web password hash and an example Dockerfile for building a custom image, and link to py4web run docs. Reorganize code-organization and documentation links and tidy up additional resources. Also remove informal/sarcastic wording and update wording for clarity and professionalism.

- `e211905 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/e211905>`_ Enhance README with overview and feature details

  Expanded the README to include an overview, architecture details, key features, and additional resources for the Kuhl Haus Market Data Platform. Updated the frontend application section with implemented and planned features.


Version 0.1.5 (2026-02-11)
==========================

- `1c17796 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1c17796>`_ Normalize numbers before formatting

  Add a toNum helper across several widgets (GenericScannerTable, TopGainers, TopGappers, TopVolume) to coerce values to finite numbers and default to 0. Update formatVolume, cell formatters and cellClass checks to use toNum, and adjust GenericScannerTable's decimals handling to coerce values and avoid NaN/throws. These changes make numeric formatting and classing robust against nulls, strings, or non-finite inputs.


Version 0.1.4 (2026-02-03)
==========================

- `ae06901 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ae06901>`_ Add image version to build args for app image
- `2c68fe9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/2c68fe9>`_ Delete un-used code

Version 0.1.3 (2026-01-16)
==========================

- `84ba232 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/84ba232>`_ Fixed 'Gainers Only' filter on TopVolume

  The behavior that I implemented is to filter Gappers, not Gainers, so this is really just a UI change to make it consistent.


Version 0.1.2 (2026-01-09)
==========================

- `b36f09b <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b36f09b>`_ Merge branch 'mainline' of https://github.com/kuhl-haus/kuhl-haus-mdp-app into mainline
- `326b880 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/326b880>`_ Update README.md
- `9fac5a5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9fac5a5>`_ Remove unused settings
- `b2d44e9 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/b2d44e9>`_ Add CodeQL analysis workflow configuration
- `4503446 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/4503446>`_ Remove invalid workflow file
- `bfb83f4 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/bfb83f4>`_ Merge pull request #1 from kuhl-haus/dependabot/docker/node-25-alpine

  Bump node from 22-alpine to 25-alpine

- `36cdaf6 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/36cdaf6>`_ Update requirements-build.txt
- `6edd770 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/6edd770>`_ Bump node from 22-alpine to 25-alpine

  Bumps node from 22-alpine to 25-alpine.

  ---

  updated-dependencies:

  - dependency-name: node

  dependency-version: 25-alpine

  dependency-type: direct:production

  ...

  Signed-off-by: dependabot[bot] <support@github.com>

- `de9c74f <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/de9c74f>`_ py4web apps
- `9bc32e2 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/9bc32e2>`_ Client initial commit
- `1dca46d <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/1dca46d>`_ Container files
- `d9c8334 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d9c8334>`_ Github workflows and project files
- `ecbb180 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/ecbb180>`_ Add CodeQL analysis workflow configuration
- `d33fda5 <https://github.com/kuhl-haus/kuhl-haus-mdp-app/commit/d33fda5>`_ Initial commit

