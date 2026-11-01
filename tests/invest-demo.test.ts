import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ASSETS,
  INITIAL_CASH_HALALAS,
  decidePaperRequest,
  executePaperOrder,
  initialPaperPortfolio,
  paperPositionsValue,
  paperTotalValue,
  placePaperOrder,
  togglePaperWatchlist,
  validatePaperPortfolio,
} from "../src/lib/invest-demo/core";

const day = "2026-11-01T12:00:00.000Z";
test("sample products have unique symbols and positive integer prices", () => {
  assert.equal(new Set(DEMO_ASSETS.map((a) => a.symbol)).size, DEMO_ASSETS.length);
  for (const a of DEMO_ASSETS) assert.ok(Number.isSafeInteger(a.priceHalalas) && a.priceHalalas > 0);
});
test("initial paper account is self-contained and holds only fictional cash", () => {
  const state = initialPaperPortfolio();
  assert.equal(state.cashHalalas, INITIAL_CASH_HALALAS);
  assert.equal(paperTotalValue(state), INITIAL_CASH_HALALAS);
  assert.equal(paperPositionsValue(state), 0);
  assert.ok(validatePaperPortfolio(state));
});
test("individual buy and sell update fake cash, holdings and history without changing total at fixed prices", () => {
  const initial = initialPaperPortfolio();
  const buy = placePaperOrder(initial, "INDIVIDUAL", "BUY", "DEMO-ETF", 4, "id1", day);
  assert.ok(buy.ok);
  if (!buy.ok) return;
  assert.equal(buy.portfolio.positions["DEMO-ETF"], 4);
  assert.equal(buy.portfolio.cashHalalas, initial.cashHalalas - 4 * 10220);
  assert.equal(paperTotalValue(buy.portfolio), INITIAL_CASH_HALALAS);
  assert.equal(initial.positions["DEMO-ETF"], undefined);
  const sell = placePaperOrder(buy.portfolio, "INDIVIDUAL", "SELL", "DEMO-ETF", 2, "id2", day);
  assert.ok(sell.ok);
  if (!sell.ok) return;
  assert.equal(sell.portfolio.positions["DEMO-ETF"], 2);
  assert.equal(sell.portfolio.orders.length, 2);
  assert.ok(validatePaperPortfolio(sell.portfolio));
});
test("fractional, zero and excessive quantities are rejected", () => {
  for (const amount of [0, -1, 1.5, 100001, NaN]) {
    const result = executePaperOrder(initialPaperPortfolio(), "BUY", "DEMO-ETF", amount, "id", day);
    assert.equal(result.ok, false);
  }
});
test("buying without simulated cash and selling without units fail", () => {
  const initial = initialPaperPortfolio();
  assert.equal(executePaperOrder(initial, "BUY", "DEMO-SUK", 1000, "id", day).ok, false);
  assert.equal(executePaperOrder(initial, "SELL", "DEMO-SUK", 1, "id", day).ok, false);
});
test("organization and government requests require simulated second action", () => {
  for (const kind of ["INSTITUTION", "GOVERNMENT"] as const) {
    const initial = initialPaperPortfolio();
    const requested = placePaperOrder(initial, kind, "BUY", "DEMO-BND", 2, "request1", day);
    assert.ok(requested.ok);
    if (!requested.ok) return;
    assert.equal(requested.portfolio.orders.length, 0);
    assert.equal(requested.portfolio.requests.length, 1);
    const approved = decidePaperRequest(requested.portfolio, "request1", true, "fill1", day);
    assert.ok(approved.ok);
    if (!approved.ok) return;
    assert.equal(approved.portfolio.orders.length, 1);
    assert.equal(approved.portfolio.positions["DEMO-BND"], 2);
    assert.equal(approved.portfolio.requests.length, 0);
  }
});
test("rejected simulated request never creates a trade", () => {
  const result = placePaperOrder(initialPaperPortfolio(), "INSTITUTION", "BUY", "DEMO-ETF", 1, "request2", day);
  assert.ok(result.ok);
  if (!result.ok) return;
  const rejected = decidePaperRequest(result.portfolio, "request2", false, "unused", day);
  assert.ok(rejected.ok);
  if (!rejected.ok) return;
  assert.equal(rejected.portfolio.requests[0].status, "REJECTED");
  assert.equal(rejected.portfolio.orders.length, 0);
  assert.equal(decidePaperRequest(rejected.portfolio, "request2", true, "fill", day).ok, false);
});
test("simulated approver cannot approve an unfunded order", () => {
  const requested = placePaperOrder(initialPaperPortfolio(), "INSTITUTION", "BUY", "DEMO-SUK", 1000, "over", day);
  assert.ok(requested.ok);
  if (!requested.ok) return;
  assert.equal(decidePaperRequest(requested.portfolio, "over", true, "fill", day).ok, false);
});
test("tampered or version-incompatible browser state is rejected", () => {
  const initial = initialPaperPortfolio();
  assert.equal(validatePaperPortfolio({ ...initial, version: 2 }), false);
  assert.equal(validatePaperPortfolio({ ...initial, cashHalalas: -1 }), false);
  assert.equal(validatePaperPortfolio({ ...initial, positions: { "UNKNOWN": 100 } }), false);
  assert.equal(validatePaperPortfolio({ ...initial, orders: [{}] }), false);
});
test("watchlist toggles sample symbols without affecting holdings", () => {
  const initial = initialPaperPortfolio();
  const next = togglePaperWatchlist(initial, "DEMO-ETF");
  assert.equal(next.watchlist.includes("DEMO-ETF"), false);
  assert.equal(initial.watchlist.includes("DEMO-ETF"), true);
});
