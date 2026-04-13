=========
Changelog
=========
Version 0.2.2 (2026-04-13)
==========================

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

