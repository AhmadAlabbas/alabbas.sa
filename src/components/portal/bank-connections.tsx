"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/content/site";
import { bankCopy, bankConsentText, bankConsentVersion } from "@/content/banks";
import type { BankScope } from "@/lib/portal/providers/bank-types";
import type {
  listBankConnections,
  bankAccounts,
  bankTransactions,
} from "@/lib/portal/banks";
import { kycRequest } from "./kyc-request";
type List = Awaited<ReturnType<typeof listBankConnections>>;
type Accounts = Awaited<ReturnType<typeof bankAccounts>>;
type Transactions = Awaited<ReturnType<typeof bankTransactions>>;
export function BankConnections({ locale }: { locale: Locale }) {
  const c = bankCopy[locale],
    router = useRouter(),
    base = "/api/portal/bank-connections";
  const [data, setData] = useState<List | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [accounts, setAccounts] = useState<Accounts | null>(null),
    [accountId, setAccountId] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [transactions, setTransactions] = useState<Transactions | null>(null),
    [notice, setNotice] = useState(""),
    [detailNotice, setDetailNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  const date = (value: string | Date) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      calendar: "gregory",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value));
  const money = (value: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      style: "currency",
      currency: "SAR",
      currencyDisplay: "code",
    }).format(value / 100);
  const message = useCallback(
    (error: string) =>
      error === "CONFLICT"
        ? c.conflict
        : error === "INVALID"
          ? c.invalid
          : error === "CONSENT_INACTIVE"
            ? c.noAccess
            : c.error,
    [c],
  );
  const get = useCallback(
    async (path: string, signal?: AbortSignal) => {
      const response = await fetch(path, { cache: "no-store", signal });
      if (response.status === 401) {
        router.replace(`/${locale}/auth/sign-in`);
        throw new Error("SIGN_IN");
      }
      if (!response.ok) {
        const value = await response.json();
        throw new Error(value.error || "UNAVAILABLE");
      }
      return response.json();
    },
    [locale, router],
  );
  const load = useCallback(async () => setData(await get(base)), [get]);
  useEffect(() => {
    const controller = new AbortController();
    get(base, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setNotice(message(error.message));
      });
    return () => controller.abort();
  }, [get, message, reload]);
  const connection = data?.connections.find((r) => r.id === selected);
  useEffect(() => {
    const controller = new AbortController();
    if (selected && connection?.status === "ACTIVE")
      get(`${base}/${selected}/accounts`, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setAccounts(result);
            setAccountId(result.accounts[0]?.id ?? "");
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setDetailNotice(message(error.message));
        });
    return () => controller.abort();
  }, [selected, connection?.status, connection?.version, get, message]);
  const canTransact = (connection?.scopes as string[] | undefined)?.includes(
    "TRANSACTIONS",
  );
  useEffect(() => {
    const controller = new AbortController();
    if (selected && accountId && connection?.status === "ACTIVE" && canTransact)
      get(
        `${base}/${selected}/transactions?accountId=${encodeURIComponent(accountId)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) setTransactions(result);
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setDetailNotice(message(error.message));
        });
    return () => controller.abort();
  }, [
    selected,
    accountId,
    cursor,
    connection?.status,
    connection?.version,
    canTransact,
    get,
    message,
  ]);
  function clearDetails() {
    setAccounts(null);
    setTransactions(null);
    setAccountId("");
    setCursor(null);
    setDetailNotice("");
  }
  function choose(id: string) {
    clearDetails();
    setSelected(id);
  }
  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget,
      fields = new FormData(form);
    setBusy(true);
    setNotice("");
    clearDetails();
    setSelected(null);
    try {
      const result = await kycRequest(base, {
        bankId: fields.get("bankId"),
        locale,
        consentVersion: bankConsentVersion,
        accepted: fields.has("accepted"),
        scopes: ["ACCOUNTS", ...fields.getAll("scopes")],
      });
      await load();
      if (!result.ok) {
        setNotice(message(result.error));
        return;
      }
      form.reset();
      setNotice(
        result.status === "ACTIVE"
          ? c.connected
          : result.status === "REVOKED"
            ? c.disconnected
            : result.status === "REVOKING"
              ? c.pendingRevoke
              : c.cancelled,
      );
      if (result.status === "ACTIVE") choose(result.id);
    } catch {
      setNotice(c.error);
    } finally {
      setBusy(false);
    }
  }
  async function disconnect(id: string) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    clearDetails();
    setSelected(null);
    try {
      const result = await kycRequest(`${base}/${id}/disconnect`, {});
      await load();
      setNotice(
        result.ok
          ? result.providerRevoked
            ? c.disconnected
            : c.pendingRevoke
          : message(result.error),
      );
    } catch {
      setNotice(c.error);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <div role="status">
        <p>{notice || c.loading}</p>
        {notice && (
          <button
            className="button"
            onClick={() => {
              setNotice("");
              setReload((v) => v + 1);
            }}
          >
            {c.retry}
          </button>
        )}
      </div>
    );
  return (
    <div className="portal-banks">
      <aside className="dashboard-sample">
        <strong className="eyebrow">{c.sample}</strong>
        <p>{c.intro}</p>
      </aside>
      <form
        key={data.connections
          .map((r) => `${r.id}:${r.version}:${r.status}`)
          .join("|")}
        className="contact-form bank-consent-form"
        onSubmit={connect}
      >
        <fieldset disabled={busy}>
          <legend>{c.consent}</legend>
          <label>
            {c.select}
            <select
              name="bankId"
              defaultValue={
                data.banks.find(
                  (bank) =>
                    !data.connections.some(
                      (r) =>
                        r.bankId === bank &&
                        !["REVOKED", "FAILED"].includes(r.status),
                    ),
                ) ?? data.banks[0]
              }
            >
              {data.banks.map((bank) => (
                <option
                  key={bank}
                  value={bank}
                  disabled={data.connections.some(
                    (r) =>
                      r.bankId === bank &&
                      !["REVOKED", "FAILED"].includes(r.status),
                  )}
                >
                  {c.banks[bank]}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{c.scopes}</legend>
            <label className="consent-check">
              <input type="checkbox" checked disabled />
              {c.scope.ACCOUNTS}
            </label>
            {(["BALANCES", "TRANSACTIONS"] as const).map((scope) => (
              <label key={scope} className="consent-check">
                <input
                  type="checkbox"
                  name="scopes"
                  value={scope}
                  defaultChecked={scope === "BALANCES"}
                />
                {c.scope[scope]}
              </label>
            ))}
          </fieldset>
          <p>{bankConsentText[locale]}</p>
          <p className="form-note">{c.consentHelp}</p>
          <Link
            className="underlined-link"
            href={`/${locale}/legal/privacy`}
            target="_blank"
            rel="noreferrer"
          >
            {c.privacy}
          </Link>
          <label className="consent-check">
            <input type="checkbox" name="accepted" required />
            {c.accept}
          </label>
          <button
            className="button"
            disabled={
              busy ||
              data.connections.filter(
                (r) => !["REVOKED", "FAILED"].includes(r.status),
              ).length === data.banks.length
            }
          >
            {busy ? c.working : c.connect}
          </button>
        </fieldset>
      </form>
      <p className="form-status" role="status">
        {notice}
      </p>
      <section className="dashboard-section">
        <h2>{c.connections}</h2>
        {!data.connections.length && <p>{c.empty}</p>}
        <div className="bank-records">
          {data.connections.map((r) => (
            <article key={r.id} className="portal-account-card">
              <h3>{c.banks[r.bankId as keyof typeof c.banks]}</h3>
              <p>{c.status[r.status as keyof typeof c.status]}</p>
              <p>
                {c.expires}: {date(r.expiresAt)}
              </p>
              <p>
                {c.permissions}:{" "}
                {(r.scopes as BankScope[]).map((s) => c.scope[s]).join(" · ")}
              </p>
              <div className="portal-kyc-actions">
                {r.status === "ACTIVE" && (
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => choose(r.id)}
                  >
                    {c.details}
                  </button>
                )}
                {!["REVOKED", "FAILED"].includes(r.status) && (
                  <button
                    className="button button-secondary"
                    disabled={busy || r.status === "REVOKING"}
                    onClick={() => disconnect(r.id)}
                  >
                    {c.disconnect}
                  </button>
                )}
              </div>
              {r.status === "REVOKING" && (
                <p className="form-note">{c.pendingRevoke}</p>
              )}
              {r.status === "EXPIRED" && (
                <p className="form-note">{c.expired}</p>
              )}
              <details className="bank-history">
                <summary>{c.history}</summary>
                {r.consents.map((consent) => (
                  <div key={consent.revision}>
                    <h4>
                      {c.version} {consent.revision} · {consent.textVersion}
                    </h4>
                    <p>{consent.text}</p>
                    <p>
                      {c.permissions}:{" "}
                      {(consent.scopes as BankScope[])
                        .map((s) => c.scope[s])
                        .join(" · ")}
                    </p>
                    <small>
                      {c.accepted}: {date(consent.acceptedAt)} · {c.expires}:{" "}
                      {date(consent.expiresAt)}
                    </small>
                  </div>
                ))}
                {r.events.map((e, i) => (
                  <p key={i}>
                    {c.events[e.action as keyof typeof c.events] || c.history} ·{" "}
                    {date(e.createdAt)}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </div>
      </section>
      {selected && connection?.status === "ACTIVE" && (
        <section
          className="dashboard-section"
          aria-labelledby="bank-accounts-heading"
        >
          <h2 id="bank-accounts-heading">{c.accounts}</h2>
          <p>{c.sample}</p>
          {detailNotice && <p role="status">{detailNotice}</p>}
          {!accounts && !detailNotice && <p role="status">{c.loading}</p>}
          {accounts && (
            <>
              <div className="bank-records">
                {accounts.accounts.map((account) => (
                  <article key={account.id} className="portal-account-card">
                    <h3>{c.accountName[account.kind]}</h3>
                    <p dir="ltr">{account.maskedIdentifier}</p>
                    {account.balance ? (
                      <>
                        <p>
                          {c.available}:{" "}
                          <bdi>{money(account.balance.availableCents)}</bdi>
                        </p>
                        <p>
                          {c.booked}:{" "}
                          <bdi>{money(account.balance.bookedCents)}</bdi>
                        </p>
                        <small>
                          {c.asOf}: {date(account.balance.asOf)}
                        </small>
                      </>
                    ) : (
                      <p>{c.noBalance}</p>
                    )}
                  </article>
                ))}
              </div>
              {canTransact ? (
                <>
                  <label className="bank-account-select">
                    {c.transactions}
                    <select
                      value={accountId}
                      onChange={(e) => {
                        setTransactions(null);
                        setCursor(null);
                        setAccountId(e.target.value);
                      }}
                    >
                      {accounts.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {c.accountName[a.kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {transactions ? (
                    <>
                      <div
                        className="bank-table-scroll"
                        tabIndex={0}
                        role="region"
                        aria-label={c.transactions}
                      >
                        <table>
                          <caption>
                            {c.transactions} · {c.sample}
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">{c.date}</th>
                              <th scope="col">{c.description}</th>
                              <th scope="col">{c.amount}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.items.map((t) => (
                              <tr key={t.id}>
                                <td>{date(t.date)}</td>
                                <th scope="row">{c.transactionKind[t.kind]}</th>
                                <td>
                                  <bdi>{money(t.amountCents)}</bdi>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="portal-kyc-actions">
                        {cursor && (
                          <button
                            className="button button-secondary"
                            onClick={() => {
                              setTransactions(null);
                              setCursor(null);
                            }}
                          >
                            {c.first}
                          </button>
                        )}
                        {transactions.nextCursor && (
                          <button
                            className="button button-secondary"
                            onClick={() => {
                              setTransactions(null);
                              setCursor(transactions.nextCursor);
                            }}
                          >
                            {c.next}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    !detailNotice && <p role="status">{c.loading}</p>
                  )}
                </>
              ) : (
                <p>{c.noTransactions}</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
