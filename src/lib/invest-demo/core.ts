/**
 * Paper investment engine. ALL instruments, prices, accounts, orders and money are fictional.
 * No bank, broker, exchange, payment rail or server endpoint is used.
 * Never reuse this client-side state or these checks for real securities orders.
 */
export type InvestorKind = "INDIVIDUAL" | "INSTITUTION" | "GOVERNMENT";
export type AssetClass = "Stock" | "ETF" | "Sukuk" | "Bond" | "Fund";
export type PaperSide = "BUY" | "SELL";
export interface PaperInstrument {
  symbol: string;
  name: string;
  arName: string;
  assetClass: AssetClass;
  market: string;
  priceHalalas: number;
  illustrativeMove: number;
}
export const DEMO_ASSETS = [
  { symbol: "DEMO-TECH", name: "Sample Technology Equity", arName: "سهم تقنية تجريبي", assetClass: "Stock", market: "Illustrative", priceHalalas: 8250, illustrativeMove: 1.4 },
  { symbol: "DEMO-IND", name: "Sample Industrial Equity", arName: "سهم صناعي تجريبي", assetClass: "Stock", market: "Illustrative", priceHalalas: 6475, illustrativeMove: -0.8 },
  { symbol: "DEMO-HLTH", name: "Sample Healthcare Equity", arName: "سهم رعاية صحية تجريبي", assetClass: "Stock", market: "Illustrative", priceHalalas: 11900, illustrativeMove: 0.6 },
  { symbol: "DEMO-ETF", name: "Sample Diversified ETF", arName: "صندوق متداول تجريبي", assetClass: "ETF", market: "Illustrative", priceHalalas: 10220, illustrativeMove: 0.2 },
  { symbol: "DEMO-SUK", name: "Sample Fixed-Rate Sukuk", arName: "صكوك تجريبية ثابتة", assetClass: "Sukuk", market: "Illustrative", priceHalalas: 100000, illustrativeMove: 0 },
  { symbol: "DEMO-BND", name: "Sample Investment-Grade Bond", arName: "سند تجريبي", assetClass: "Bond", market: "Illustrative", priceHalalas: 99000, illustrativeMove: -0.1 },
  { symbol: "DEMO-FND", name: "Sample Balanced Fund", arName: "صندوق متوازن تجريبي", assetClass: "Fund", market: "Illustrative", priceHalalas: 2535, illustrativeMove: 0.3 },
] as const satisfies readonly PaperInstrument[];
export type DemoSymbol = (typeof DEMO_ASSETS)[number]["symbol"];
export interface PaperOrder {
  id: string;
  symbol: DemoSymbol;
  side: PaperSide;
  quantity: number;
  priceHalalas: number;
  totalHalalas: number;
  date: string;
  status: "FILLED";
}
export interface PaperRequest {
  id: string;
  symbol: DemoSymbol;
  side: PaperSide;
  quantity: number;
  date: string;
  status: "PENDING" | "REJECTED";
}
export interface PaperPortfolio {
  version: 1;
  cashHalalas: number;
  positions: Partial<Record<DemoSymbol, number>>;
  orders: PaperOrder[];
  requests: PaperRequest[];
  watchlist: DemoSymbol[];
}
export type PaperResult = { ok: true; portfolio: PaperPortfolio; message: string } | { ok: false; error: string };
export const INITIAL_CASH_HALALAS = 25000000; // SAR 250,000 imaginary starting cash
const MAX_HISTORY = 100;
const validSymbols = new Set<string>(DEMO_ASSETS.map((a) => a.symbol));
export function assetBySymbol(symbol: string) {
  return DEMO_ASSETS.find((a) => a.symbol === symbol);
}
export function initialPaperPortfolio(): PaperPortfolio {
  return { version: 1, cashHalalas: INITIAL_CASH_HALALAS, positions: {}, orders: [], requests: [], watchlist: ["DEMO-ETF", "DEMO-SUK"] };
}
export function paperPositionsValue(state: PaperPortfolio) {
  return DEMO_ASSETS.reduce((sum, asset) => sum + (state.positions[asset.symbol] || 0) * asset.priceHalalas, 0);
}
export function paperTotalValue(state: PaperPortfolio) {
  return state.cashHalalas + paperPositionsValue(state);
}
export function paperCurrency(halalas: number, locale: "ar" | "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100);
}
export function validatePaperPortfolio(value: unknown): value is PaperPortfolio {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<PaperPortfolio>;
  if (s.version !== 1 || !Number.isSafeInteger(s.cashHalalas) || s.cashHalalas! < 0 || s.cashHalalas! > 100000000000) return false;
  if (!s.positions || typeof s.positions !== "object" || Array.isArray(s.positions)) return false;
  if (Object.entries(s.positions).some(([key, units]) => !validSymbols.has(key) || !Number.isSafeInteger(units) || (units as number) < 0 || (units as number) > 100000)) return false;
  if (!Array.isArray(s.watchlist) || s.watchlist.length > DEMO_ASSETS.length || s.watchlist.some((item) => !validSymbols.has(item))) return false;
  const validAction = (x: unknown, filled: boolean) => {
    if (!x || typeof x !== "object") return false;
    const a = x as Record<string, unknown>;
    return typeof a.id === "string" && a.id.length <= 90 &&
      typeof a.date === "string" && a.date.length <= 40 &&
      typeof a.symbol === "string" && validSymbols.has(a.symbol) &&
      (a.side === "BUY" || a.side === "SELL") &&
      Number.isSafeInteger(a.quantity) && (a.quantity as number) > 0 && (a.quantity as number) <= 100000 &&
      (filled
        ? a.status === "FILLED" && Number.isSafeInteger(a.priceHalalas) && Number.isSafeInteger(a.totalHalalas)
        : a.status === "PENDING" || a.status === "REJECTED");
  };
  return Array.isArray(s.orders) && s.orders.length <= MAX_HISTORY && s.orders.every((x) => validAction(x, true)) &&
    Array.isArray(s.requests) && s.requests.length <= MAX_HISTORY && s.requests.every((x) => validAction(x, false));
}
export function executePaperOrder(state: PaperPortfolio, side: PaperSide, symbol: DemoSymbol, quantity: number, id: string, date: string): PaperResult {
  const asset = assetBySymbol(symbol);
  if (!asset || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) return { ok: false, error: "Enter a whole-number quantity between 1 and 100,000." };
  const total = asset.priceHalalas * quantity;
  if (!Number.isSafeInteger(total)) return { ok: false, error: "Invalid order value." };
  if (side === "BUY" && total > state.cashHalalas) return { ok: false, error: "Insufficient simulated cash." };
  if (side === "SELL" && (state.positions[symbol] || 0) < quantity) return { ok: false, error: "You do not hold enough simulated units." };
  const newUnits = (state.positions[symbol] || 0) + (side === "BUY" ? quantity : -quantity);
  const positions = { ...state.positions, [symbol]: newUnits };
  const order: PaperOrder = { id, symbol, side, quantity, priceHalalas: asset.priceHalalas, totalHalalas: total, date, status: "FILLED" };
  return {
    ok: true, message: "Simulated order filled. No real trade occurred.",
    portfolio: {
      ...state,
      cashHalalas: state.cashHalalas + (side === "BUY" ? -total : total),
      positions,
      orders: [order, ...state.orders].slice(0, MAX_HISTORY),
    },
  };
}
export function placePaperOrder(state: PaperPortfolio, kind: InvestorKind, side: PaperSide, symbol: DemoSymbol, quantity: number, id: string, date: string): PaperResult {
  if (!assetBySymbol(symbol) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) return { ok: false, error: "Choose an instrument and a valid whole-number quantity." };
  if (kind === "INDIVIDUAL") return executePaperOrder(state, side, symbol, quantity, id, date);
  // This is a visual demonstration of institutional maker/checker flow, NOT access control.
  const request: PaperRequest = { id, symbol, side, quantity, date, status: "PENDING" };
  return { ok: true, message: "Simulation: order submitted for second-person approval.", portfolio: { ...state, requests: [request, ...state.requests].slice(0, MAX_HISTORY) } };
}
export function decidePaperRequest(state: PaperPortfolio, requestId: string, approve: boolean, executionId: string, date: string): PaperResult {
  const request = state.requests.find((item) => item.id === requestId && item.status === "PENDING");
  if (!request) return { ok: false, error: "Pending request not found." };
  if (!approve) return {
    ok: true, message: "Simulated request rejected.",
    portfolio: { ...state, requests: state.requests.map((r) => r.id === requestId ? { ...r, status: "REJECTED" } : r) },
  };
  const filled = executePaperOrder(state, request.side, request.symbol, request.quantity, executionId, date);
  if (!filled.ok) return filled;
  return { ok: true, message: "Simulated second-person approval completed. No trade occurred.", portfolio: { ...filled.portfolio, requests: filled.portfolio.requests.filter((r) => r.id !== requestId) } };
}
export function togglePaperWatchlist(state: PaperPortfolio, symbol: DemoSymbol): PaperPortfolio {
  if (!assetBySymbol(symbol)) return state;
  return { ...state, watchlist: state.watchlist.includes(symbol) ? state.watchlist.filter((s) => s !== symbol) : [...state.watchlist, symbol] };
}
