"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEMO_ASSETS,
  assetBySymbol,
  decidePaperRequest,
  initialPaperPortfolio,
  paperCurrency,
  paperPositionsValue,
  paperTotalValue,
  placePaperOrder,
  togglePaperWatchlist,
  validatePaperPortfolio,
  type DemoSymbol,
  type InvestorKind,
  type PaperPortfolio,
  type PaperSide,
} from "@/lib/invest-demo/core";

type Locale = "en" | "ar";
type Tab = "overview" | "markets" | "orders" | "onboarding";
const investors: InvestorKind[] = ["INDIVIDUAL", "INSTITUTION", "GOVERNMENT"];
const storageKey = (kind: InvestorKind) => "alabbas-paper-demo-v1-" + kind;
function loadPaper(kind: InvestorKind): PaperPortfolio {
  try {
    const item = window.localStorage.getItem(storageKey(kind));
    if (item) {
      const parsed: unknown = JSON.parse(item);
      if (validatePaperPortfolio(parsed)) return parsed;
    }
  } catch { /* Demo is usable even when storage is unavailable. */ }
  return initialPaperPortfolio();
}
const onboardingSteps: Record<InvestorKind, { en: string[]; ar: string[] }> = {
  INDIVIDUAL: {
    en: ["Create account and verify email", "Complete identity checks and investor profile", "Review suitability, agreements and disclosures", "Await compliance review before any regulated service"],
    ar: ["إنشاء الحساب وتأكيد البريد", "التحقق من الهوية والملف الاستثماري", "مراجعة الملاءمة والاتفاقيات والإفصاحات", "انتظار موافقة الامتثال قبل أي خدمة منظمة"],
  },
  INSTITUTION: {
    en: ["Register an authorized company representative", "Verify commercial registration, beneficial owners and signatories", "Configure company users and maker/checker permissions", "Complete institutional due diligence and approvals"],
    ar: ["تسجيل ممثل مفوض للشركة", "التحقق من السجل التجاري والملاك المستفيدين والمفوضين", "إعداد المستخدمين وصلاحيات الطلب والاعتماد", "استكمال إجراءات التحقق والموافقات المؤسسية"],
  },
  GOVERNMENT: {
    en: ["Contact the institutional onboarding team", "Validate government authority and legal mandate", "Register approved signatories and authorization limits", "Complete institutional contracts and regulatory checks"],
    ar: ["التواصل مع فريق تسجيل المؤسسات", "التحقق من صفة الجهة وصلاحياتها النظامية", "اعتماد المفوضين وحدود الصلاحيات", "استكمال الاتفاقيات والتحقق النظامي"],
  },
};

export function InvestmentSandbox({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [kind, setKind] = useState<InvestorKind>("INDIVIDUAL");
  const [portfolio, setPortfolio] = useState<PaperPortfolio>(initialPaperPortfolio);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<DemoSymbol>("DEMO-ETF");
  const [side, setSide] = useState<PaperSide>("BUY");
  const [quantity, setQuantity] = useState("1");
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [approvalMode, setApprovalMode] = useState(false);
  useEffect(() => {
    setPortfolio(loadPaper("INDIVIDUAL"));
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(storageKey(kind), JSON.stringify(portfolio)); } catch { /* Memory-only fallback. */ }
  }, [portfolio, kind, hydrated]);
  function switchKind(next: InvestorKind) {
    setPortfolio(loadPaper(next));
    setKind(next);
    setApprovalMode(false);
    setNotice("");
  }
  const products = useMemo(() => DEMO_ASSETS.filter((item) => {
    const search = filter.trim().toLowerCase();
    return !search || item.symbol.toLowerCase().includes(search) || item.name.toLowerCase().includes(search) || item.arName.includes(search) || item.assetClass.toLowerCase().includes(search);
  }), [filter]);
  const chosen = assetBySymbol(selected)!;
  const units = Number(quantity);
  const estimate = Number.isSafeInteger(units) && units > 0 && units <= 100000 ? units * chosen.priceHalalas : 0;
  const holdings = DEMO_ASSETS.filter((a) => (portfolio.positions[a.symbol] || 0) > 0);
  const pending = portfolio.requests.filter((r) => r.status === "PENDING");
  function paperId() {
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }
  function placeOrder() {
    const result = placePaperOrder(portfolio, kind, side, selected, Number(quantity), paperId(), new Date().toISOString());
    if (result.ok) {
      setPortfolio(result.portfolio);
      setNotice(result.message);
      setTab(kind === "INDIVIDUAL" ? "orders" : "orders");
    } else setNotice(result.error);
  }
  function decide(id: string, approve: boolean) {
    const result = decidePaperRequest(portfolio, id, approve, paperId(), new Date().toISOString());
    if (result.ok) { setPortfolio(result.portfolio); setNotice(result.message); } else setNotice(result.error);
  }
  const kindName = (value: InvestorKind) => ({
    INDIVIDUAL: t("Individual", "فرد"),
    INSTITUTION: t("Corporation", "شركة"),
    GOVERNMENT: t("Government", "جهة حكومية"),
  })[value];
  const displayName = (symbol: string) => {
    const a = assetBySymbol(symbol);
    return a ? (ar ? a.arName : a.name) : symbol;
  };
  return (
    <div className="invest-demo" dir={ar ? "rtl" : "ltr"}>
      <section className="invest-hero">
        <div className="container">
          <div className="invest-hero-line">
            <span className="invest-kicker">ALABBAS / {t("INVEST", "استثمر")}</span>
            <span className="invest-status">{t("PAPER TRADING SANDBOX", "منصة تداول تجريبية فقط")}</span>
          </div>
          <h1>{t("Invest with a clearer perspective.", "استثمر برؤية أوضح.")}</h1>
          <p>{t("Explore what an ALABBAS investment account could look like. All balances, products and prices on this page are fictional. No real trades, accounts, deposits or returns.", "استكشف الشكل المقترح لحساب الاستثمار لدى العباس. جميع الأرصدة والمنتجات والأسعار وهمية. لا توجد تداولات أو حسابات أو إيداعات أو عوائد حقيقية.")}</p>
          <div className="invest-hero-actions">
            <button type="button" className="invest-primary" onClick={() => setTab("markets")}>{t("Explore sample markets", "استكشف الأسواق التجريبية")}</button>
            <button type="button" className="invest-secondary" onClick={() => setTab("onboarding")}>{t("How accounts will work", "آلية فتح الحسابات")}</button>
          </div>
        </div>
      </section>
      <div className="container invest-shell">
        <aside className="invest-side">
          <p className="invest-side-title">{t("ACCOUNT PREVIEW", "معاينة الحساب")}</p>
          <label className="invest-kind-label" htmlFor="invest-kind">{t("Investor category", "فئة المستثمر")}</label>
          <select id="invest-kind" value={kind} onChange={(e) => switchKind(e.target.value as InvestorKind)}>
            {investors.map((item) => <option key={item} value={item}>{kindName(item)}</option>)}
          </select>
          <nav aria-label={t("Investment demo sections", "أقسام الاستثمار التجريبي")} className="invest-side-nav">
            {([
              ["overview", t("Overview", "نظرة عامة")],
              ["markets", t("Sample markets", "أسواق تجريبية")],
              ["orders", t("Orders & approvals", "الطلبات والموافقات")],
              ["onboarding", t("Account onboarding", "فتح الحساب")],
            ] as const).map(([id, name]) =>
              <button type="button" key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => { setTab(id); setNotice(""); }}>{name}</button>,
            )}
          </nav>
          <div className="invest-sidebar-note">
            <strong>{t("Simulated money only", "أموال وهمية فقط")}</strong>
            <p>{t("Your demo selections are saved in this browser, not on ALABBAS servers. Do not enter personal or financial information.", "تحفظ خيارات التجربة داخل هذا المتصفح فقط، وليس لدى خوادم العباس. لا تدخل بيانات شخصية أو مالية.")}</p>
            <button type="button" onClick={() => {
              if (window.confirm(t("Reset this investor category's fictional portfolio?", "هل تريد إعادة تعيين المحفظة التجريبية لهذه الفئة؟"))) {
                setPortfolio(initialPaperPortfolio()); setNotice(t("Demo reset.", "تمت إعادة تعيين التجربة."));
              }
            }}>{t("Reset paper account", "إعادة تعيين الحساب التجريبي")}</button>
          </div>
        </aside>
        <main className="invest-main" id="investment-demo-main">
          <div className="invest-section-heading">
            <div>
              <span className="invest-overline">{t("ACCOUNT TYPE", "نوع الحساب")} / {kindName(kind)}</span>
              <h2>{({ overview: t("Investment overview", "نظرة عامة على الاستثمار"), markets: t("Sample investment markets", "أسواق استثمار تجريبية"), orders: t("Simulation history", "سجل المحاكاة"), onboarding: t("Open an investor account", "فتح حساب مستثمر") })[tab]}</h2>
            </div>
            <span className="invest-demo-pill">{t("DEMO ONLY", "تجريبي")}</span>
          </div>
          {notice && <p role="status" className="invest-notice">{notice}</p>}
          {tab === "overview" && (
            <>
              <div className="invest-metrics">
                <div className="invest-metric"><span>{t("Portfolio value", "قيمة المحفظة")}</span><strong>{paperCurrency(paperTotalValue(portfolio), locale)}</strong><small>{t("Fictional, fixed prices", "أسعار وهمية ثابتة")}</small></div>
                <div className="invest-metric"><span>{t("Available paper cash", "الرصيد الوهمي المتاح")}</span><strong>{paperCurrency(portfolio.cashHalalas, locale)}</strong><small>{t("Not withdrawable", "غير قابل للسحب")}</small></div>
                <div className="invest-metric"><span>{t("Invested value", "قيمة الاستثمارات")}</span><strong>{paperCurrency(paperPositionsValue(portfolio), locale)}</strong><small>{t("Synthetic holdings", "حيازات افتراضية")}</small></div>
              </div>
              <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Portfolio allocation", "توزيع المحفظة")}</h3><span>{t("Illustrative", "توضيحي")}</span></div>
                <div className="invest-allocation">
                  <div className="invest-allocation-track" aria-label={t("Sample allocation by instrument", "توزيع تجريبي حسب الأداة")}>
                    {holdings.map((a,i) => <span key={a.symbol} style={{ width: ((portfolio.positions[a.symbol] || 0) * a.priceHalalas / paperTotalValue(portfolio) * 100) + "%", backgroundColor: ["#5b8775","#a58f65","#547b90","#a4b7a0","#708090","#9c927a","#749888"][i % 7] }}/>)}
                  </div>
                  <div className="invest-allocation-summary">
                    <span><i className="invest-cash-dot"/>{t("Paper cash", "نقد وهمي")}</span>
                    <strong>{Math.round(portfolio.cashHalalas / paperTotalValue(portfolio) * 100)}%</strong>
                  </div>
                </div>
                {holdings.length ? <div className="invest-table-wrap"><table><thead><tr><th>{t("Instrument", "الأداة")}</th><th>{t("Units", "الوحدات")}</th><th>{t("Value", "القيمة")}</th></tr></thead><tbody>
                  {holdings.map((a) => <tr key={a.symbol}><td><strong>{displayName(a.symbol)}</strong><small>{a.symbol}</small></td><td>{portfolio.positions[a.symbol]}</td><td>{paperCurrency((portfolio.positions[a.symbol] || 0) * a.priceHalalas, locale)}</td></tr>)}
                </tbody></table></div> : <p className="invest-muted">{t("You don't have any simulated holdings yet. Explore the sample markets to place a fictional order.", "ليس لديك أي حيازات تجريبية بعد. استكشف الأسواق لوضع طلب افتراضي.")}</p>}
              </div>
              <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Your watchlist", "قائمة المتابعة")}</h3><button type="button" onClick={() => setTab("markets")}>{t("See markets", "عرض الأسواق")}</button></div>
                {portfolio.watchlist.map((symbol) => <div className="invest-watch-row" key={symbol}><span><strong>{displayName(symbol)}</strong><small>{symbol}</small></span><span>{paperCurrency(assetBySymbol(symbol)!.priceHalalas, locale)}</span></div>)}
                {portfolio.watchlist.length === 0 && <p className="invest-muted">{t("No instruments selected.", "لم تتم إضافة أدوات.")}</p>}
              </div>
            </>
          )}
          {tab === "markets" && (
            <div className="invest-market-layout">
              <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Available sample instruments", "الأدوات التجريبية المتاحة")}</h3><span>{DEMO_ASSETS.length} {t("products", "منتجات")}</span></div>
                <input className="invest-search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("Search name, symbol or category", "بحث بالاسم أو الرمز أو الفئة")} aria-label={t("Search sample instruments", "البحث في الأدوات التجريبية")}/>
                <div className="invest-products">
                  {products.map((item) => <div className={"invest-product " + (selected === item.symbol ? "selected" : "")} key={item.symbol}>
                    <button type="button" onClick={() => setSelected(item.symbol)} className="invest-select-product" aria-pressed={selected === item.symbol}>
                      <span className="invest-product-icon">{item.assetClass.slice(0, 1)}</span>
                      <span className="invest-product-name"><strong>{ar ? item.arName : item.name}</strong><small>{item.symbol} · {item.assetClass}</small></span>
                      <span className="invest-product-price"><strong>{paperCurrency(item.priceHalalas, locale)}</strong><small>{t("Fixed mock price", "سعر وهمي ثابت")}</small></span>
                    </button>
                    <button type="button" className="invest-star" aria-label={portfolio.watchlist.includes(item.symbol) ? t("Remove from watchlist", "إزالة من المتابعة") : t("Add to watchlist", "إضافة للمتابعة")} aria-pressed={portfolio.watchlist.includes(item.symbol)} onClick={() => setPortfolio(togglePaperWatchlist(portfolio, item.symbol))}>{portfolio.watchlist.includes(item.symbol) ? "★" : "☆"}</button>
                  </div>)}
                  {!products.length && <p className="invest-muted">{t("No matching sample instruments.", "لا توجد أدوات تجريبية مطابقة.")}</p>}
                </div>
              </div>
              <div className="invest-panel invest-ticket">
                <div className="invest-panel-heading"><h3>{t("Paper order ticket", "طلب تداول وهمي")}</h3><span>{t("Not a live order", "ليس طلبًا حقيقيًا")}</span></div>
                <strong className="invest-ticket-title">{displayName(selected)}</strong>
                <span className="invest-muted">{chosen.symbol} · {chosen.assetClass}</span>
                <div className="invest-ticket-price">{paperCurrency(chosen.priceHalalas, locale)}</div>
                <div className="invest-trade-toggle">
                  {(["BUY", "SELL"] as PaperSide[]).map((option) => <button type="button" key={option} className={side === option ? "active" : ""} aria-pressed={side === option} onClick={() => setSide(option)}>{option === "BUY" ? t("Buy", "شراء") : t("Sell", "بيع")}</button>)}
                </div>
                <label className="invest-quantity">{t("Whole units", "عدد الوحدات")}<input type="number" inputMode="numeric" min="1" max="100000" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}/></label>
                <div className="invest-ticket-line"><span>{t("Estimated value", "القيمة التقديرية")}</span><strong>{paperCurrency(estimate, locale)}</strong></div>
                <div className="invest-ticket-line"><span>{t("Paper cash", "الرصيد الوهمي")}</span><strong>{paperCurrency(portfolio.cashHalalas, locale)}</strong></div>
                {kind !== "INDIVIDUAL" && <p className="invest-approval-info">{t("This investor category demonstrates a two-step order approval. It is a UI simulation, not enforceable authorization.", "توضح هذه الفئة اعتماد الطلب على مرحلتين. هذه محاكاة واجهة وليست صلاحيات تنفيذية فعلية.")}</p>}
                <button type="button" className="invest-primary invest-submit" onClick={placeOrder} disabled={!Number.isSafeInteger(units) || units < 1 || units > 100000}>{kind === "INDIVIDUAL" ? t("Place fictional order", "تنفيذ طلب وهمي") : t("Send mock approval request", "إرسال طلب موافقة تجريبي")}</button>
                <p className="invest-tiny">{t("No market connectivity, no payment, no real ownership, and no guaranteed returns.", "لا يوجد اتصال بالأسواق أو مدفوعات أو ملكية حقيقية ولا عوائد مضمونة.")}</p>
              </div>
            </div>
          )}
          {tab === "orders" && (
            <>
              {kind !== "INDIVIDUAL" && <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Institutional approval simulation", "محاكاة الموافقة المؤسسية")}</h3><span>{pending.length} {t("pending", "معلقة")}</span></div>
                <label className="invest-role-toggle"><input type="checkbox" checked={approvalMode} onChange={(e) => setApprovalMode(e.target.checked)}/>{t("Show mock approver controls (not security enforcement)", "عرض أدوات الموافقة التجريبية (ليست حماية فعلية)")}</label>
                {pending.length ? pending.map((r) => <div className="invest-request" key={r.id}>
                  <span><strong>{r.side} · {displayName(r.symbol)}</strong><small>{r.quantity} {t("units", "وحدات")}</small></span>
                  {approvalMode ? <span className="invest-request-actions"><button type="button" onClick={() => decide(r.id,true)}>{t("Simulate approval", "محاكاة الموافقة")}</button><button type="button" onClick={() => decide(r.id,false)}>{t("Reject", "رفض")}</button></span> : <span className="invest-pending">{t("Awaiting mock approver", "بانتظار موافقة تجريبية")}</span>}
                </div>) : <p className="invest-muted">{t("No pending requests.", "لا توجد طلبات معلقة.")}</p>}
              </div>}
              <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Paper order history", "سجل الطلبات الوهمية")}</h3><span>{portfolio.orders.length} {t("executed", "منفذة")}</span></div>
                {portfolio.orders.length ? <div className="invest-table-wrap"><table><thead><tr><th>{t("Instrument", "الأداة")}</th><th>{t("Action", "العملية")}</th><th>{t("Units", "الوحدات")}</th><th>{t("Value", "القيمة")}</th></tr></thead><tbody>
                  {portfolio.orders.map((o) => <tr key={o.id}><td><strong>{displayName(o.symbol)}</strong><small>{new Date(o.date).toLocaleDateString(ar ? "ar-SA" : "en-SA")}</small></td><td>{o.side}</td><td>{o.quantity}</td><td>{paperCurrency(o.totalHalalas, locale)}</td></tr>)}
                </tbody></table></div> : <p className="invest-muted">{t("No simulated orders have been executed.", "لم تُنفّذ طلبات وهمية بعد.")}</p>}
              </div>
            </>
          )}
          {tab === "onboarding" && (
            <>
              <div className="invest-panel">
                <div className="invest-panel-heading"><h3>{t("Proposed account opening process", "الخطوات المقترحة لفتح الحساب")}</h3><span>{kindName(kind)}</span></div>
                <ol className="invest-steps">{onboardingSteps[kind][locale].map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
                <p className="invest-muted">{t("Account approval is not automated here. Organization verification and live account activation require dedicated compliance systems, licensed providers and operational review.", "فتح الحساب الحقيقي غير آلي هنا. يتطلب التحقق من الجهات وتفعيل الحسابات الحقيقية أنظمة امتثال ومزودين مرخصين ومراجعة تشغيلية.")}</p>
              </div>
              <div className="invest-panel">
                <h3>{t("Existing authentication demonstration", "عرض المصادقة الموجود")}</h3>
                <p className="invest-muted">{t("The project already contains a separate sign-up, sign-in and multi-factor authentication prototype. The following links open the safe browser-only demo, not a real investment account.", "يحتوي المشروع بالفعل على نموذج مستقل للتسجيل والدخول والمصادقة متعددة العوامل. الروابط التالية تفتح العرض التجريبي الآمن داخل المتصفح، لا حساباً استثمارياً حقيقياً.")}</p>
                <div className="invest-hero-actions">
                  <Link href={"/" + locale + "/demo/portal/sign-up"} className="invest-primary">{t("Try demo sign-up", "تجربة إنشاء حساب")}</Link>
                  <Link href={"/" + locale + "/demo/portal/sign-in"} className="invest-secondary">{t("Try demo sign-in", "تجربة تسجيل الدخول")}</Link>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <section className="invest-bottom-disclosure">
        <div className="container"><strong>{t("Important: this is a fictional simulation.", "مهم: هذه محاكاة وهمية فقط.")}</strong><p>{t("ALABBAS does not execute or accept securities orders, accept investment deposits, provide custody, or represent that it has obtained regulatory authorization through this prototype. Real investment services require the appropriate approvals and licensed infrastructure.", "لا تنفذ العباس أو تقبل عبر هذا النموذج طلبات أوراق مالية أو إيداعات استثمارية ولا تقدم خدمات حفظ ولا تدعي الحصول على ترخيص نظامي من خلاله. تتطلب الخدمات الاستثمارية الحقيقية الموافقات والبنية المرخصة المناسبة.")}</p></div>
      </section>
    </div>
  );
}
