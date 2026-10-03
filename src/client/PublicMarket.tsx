import {
  candidateGroup,
  capitalEstimate,
  comparableAnnualized,
  duration,
  networkMessage,
  simulationBlocker,
  type CandidateGroup,
} from "./market-presentation";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Clock3,
  Database,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { PublicMarketState, PublicCandidate } from "../market/types";
const names: Record<string, string> = {
  FUNDING_NEUTRAL: "资金费率中性",
  BASIS_CASH_CARRY: "期现基差",
  CROSS_EXCHANGE_FUNDING: "跨所资金费率",
  CROSS_EXCHANGE_SPREAD: "跨所价差",
  IDLE_CAPITAL_YIELD: "闲置资金生息",
};
const reasons: Record<string, string> = {
  ACCOUNT_NOT_CONNECTED: "未连接账户",
  ACTUAL_FEE_TIER_UNVERIFIED: "尚无实际账户费率",
  BALANCE_AND_INVENTORY_UNKNOWN: "余额与预置库存未知",
  VENUE_AND_ASSET_RISK_UNREVIEWED: "交易所及结算资产风险尚未审批",
  USD_VALUATION_REFERENCE_ONLY: "美元估值仅为公开价格参考",
  STRATEGY_NOT_PROMOTED: "策略尚未通过实盘验证",
  MARGIN_AND_LIQUIDATION_UNKNOWN: "缺少保证金及强平证据",
  ORDER_BOOK_STALE: "盘口超过策略有效期",
  BOOK_SNAPSHOT_SKEW: "双腿盘口时间不同步",
  BOOK_SOURCE_TIME_UNVERIFIED: "盘口未提供源事件时间",
  ORDER_BOOK_MISSING: "缺少盘口",
  USD_VALUATION_MISSING: "缺少新鲜美元估值",
  FUNDING_EVIDENCE_MISSING: "缺少资金费或历史记录",
  FUNDING_PERSISTENCE_LOW: "正资金费持续性不足",
  FUNDING_NOT_POSITIVE: "保守资金费不为正",
  NET_BELOW_MIN: "扣除成本后净收益不足",
  CAPACITY_BELOW_MIN: "盘口容量不足",
  MARKET_CAPACITY_EXCEEDED: "该规模超过盘口容量",
  DEPTH_OR_MIN_ORDER_FAILED: "深度不足或最小订单未满足",
  ROUNDED_DELTA_MISMATCH: "数量舍入后对冲偏差超限",
  ENTRY_SLIPPAGE_LIMIT: "入场滑点超限",
  PER_LEG_SLIPPAGE_LIMIT: "单腿滑点超限",
  ANNUALIZED_BELOW_MIN: "基差年化对比未达门槛",
  EXPIRY_OUT_OF_RANGE: "不在允许到期范围内",
  NEGATIVE_BASIS: "基差非正",
  ENTRY_BASIS_LIMIT: "入场基差超限",
  CROSS_VENUE_PREMIUM_LIMIT: "跨所标记溢价超限",
  FUNDING_HISTORY_GAP: "历史结算记录存在缺口",
  FUNDING_STALE: "资金费数据已过期",
  SPOT_INVENTORY_UNSUPPORTED: "需要预置现货库存，当前账本暂不支持这类模拟",
  MARKET_EVIDENCE_INCOMPLETE: "市场数据不完整，暂不能模拟",
  INSUFFICIENT_FUNDING_HISTORY: "历史资金费样本不足",
  INSTRUMENT_METADATA_STALE: "合约信息已过期",
  MARK_INDEX_MISSING: "缺少标记价或指数价",
  EXIT_DEPTH_MISSING: "退出侧深度不足",
};
const reason = (r: string) => reasons[r] ?? r;
const money = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(v);
const percent = (v: number | null, digits = 4) =>
  v === null ? "—" : `${v.toFixed(digits)}%`;
const time = (v: number | null) =>
  v === null ? "—" : new Date(v).toLocaleTimeString("zh-CN");
async function request<T = any>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Alpha-Client": "owner-ui",
          },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data;
}
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),summary",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal wide"
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭市场详情"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function PublicMarket({
  onSimulate,
  onManageFunds,
}: {
  onSimulate?: (id: string, sizeUsd?: number) => void;
  onManageFunds?: () => void;
} = {}) {
  const [state, setState] = useState<PublicMarketState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [strategy, setStrategy] = useState("ALL"),
    [detail, setDetail] = useState<any | null>(null),
    [view, setView] = useState("CANDIDATES"),
    [historyInstrument, setHistoryInstrument] = useState(""),
    [days, setDays] = useState("7"),
    [history, setHistory] = useState<any | null>(null),
    [group, setGroup] = useState<CandidateGroup>("WATCH"),
    [sort, setSort] = useState("DURATION"),
    [limit, setLimit] = useState(6),
    [now, setNow] = useState(Date.now()),
    [previewSize, setPreviewSize] = useState(5000),
    [paperAccounts, setPaperAccounts] = useState<any[] | null>(null),
    [heldIds, setHeldIds] = useState<string[] | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setLimit(6);
    setHeldIds(null);
  }, [group, strategy, search, sort]);
  const fetching = useRef(false);
  const fetchState = async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      setState(await request("/api/public-market"));
      setError("");
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      fetching.current = false;
    }
  };
  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 1000);
    return () => clearInterval(timer);
  }, []);
  const control = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      setState(await request(`/api/public-market/${action}`, {}));
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const showDetail = async (c: PublicCandidate, size = c.referenceSizeUsd) => {
    setBusy(true);
    try {
      const result = await request(`/api/public-market/candidates/${c.id}`);
      setDetail(result);
      setPreviewSize(size);
      setPaperAccounts(null);
      if (onSimulate) {
        try {
          const book = await request("/api/personal?mode=PAPER");
          setPaperAccounts(book.accounts);
        } catch {
          setPaperAccounts(null);
        }
      }
    } catch (e) {
      setError(networkMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (!state)
    return (
      <section className="panel">
        <div className="empty">
          <LoaderCircle className="spin" size={24} />
          <p>{error || "正在读取公开市场状态…"}</p>
        </div>
      </section>
    );
  const candidates = state.candidates.filter(
    (c) =>
      (strategy === "ALL" || c.strategy === strategy) &&
      `${c.asset} ${c.venues.join(" ")} ${names[c.strategy]}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const available = state.enabled && !error;
  const counts = { WATCH: 0, REJECTED: 0, ATTENTION: 0 };
  for (const c of state.candidates) counts[candidateGroup(c, now, available)]++;
  const sorted = candidates
    .filter((c) => candidateGroup(c, now, available) === group)
    .sort((a, b) =>
      sort === "ANNUALIZED"
        ? (comparableAnnualized(b) ?? -Infinity) -
            (comparableAnnualized(a) ?? -Infinity) ||
          a.holdingSeconds - b.holdingSeconds
        : a.holdingSeconds - b.holdingSeconds || a.asset.localeCompare(b.asset),
    );
  const displayed = heldIds
    ? heldIds
        .map((id) => state.candidates.find((c) => c.id === id))
        .filter((c): c is PublicCandidate => !!c)
    : sorted;
  const holdList = () => setHeldIds((ids) => ids ?? sorted.map((c) => c.id));
  const live = state.connections.filter((c) => c.streamState === "LIVE").length;
  const headline = !state.enabled
    ? "连接行情，查看当前候选"
    : error
      ? "连接中断，当前数据暂不可用"
      : !state.candidates.length
        ? "正在准备市场数据"
        : counts.WATCH
          ? `${counts.WATCH} 个候选值得进一步查看`
          : counts.ATTENTION === state.candidates.length
            ? "数据仍待更新，暂时无法判断"
            : "当前没有达到观察条件的候选";
  const currentDetail = detail
    ? (state.candidates.find((c) => c.id === detail.candidate.id) ??
      (detail.candidate as PublicCandidate))
    : null;
  const detailEconomics = currentDetail?.economics.find(
    (e) => e.notionalUsd === previewSize,
  );
  const latestEconomics = currentDetail?.economics.find(
    (e: any) => e.notionalUsd === previewSize,
  );
  const blocked = currentDetail
    ? simulationBlocker(currentDetail, latestEconomics, now, available)
    : null;
  const selectedCapital = capitalEstimate(detailEconomics);
  const requirements: Record<string, number> = {};
  for (const leg of latestEconomics?.legs ?? []) {
    const kind = state.snapshots.find(
      (s) => s.instrument.id === leg.instrumentId,
    )?.instrument.kind;
    const configured = paperAccounts?.find((a) => a.venue === leg.venue)
      ?.feeBps?.[kind ?? ""];
    requirements[leg.venue] =
      (requirements[leg.venue] ?? 0) +
      leg.notionalUsd * (1 + (configured ?? leg.feeBps) / 10000);
  }
  const shortfall =
    paperAccounts !== null &&
    Object.entries(requirements).some(
      ([venue, required]) =>
        required >
        (paperAccounts.find((a) => a.venue === venue)?.cashUsd ?? 0) + 1e-7,
    );
  return (
    <div className="public-market">
      <div className="decision-summary">
        <div className="decision-source">
          <span className={`status-dot ${live ? "" : "muted"}`} />
          <span>交易所真实行情 · 无需账户</span>
          <button
            className="text-button"
            onClick={() => setView(view === "DATA" ? "CANDIDATES" : "DATA")}
          >
            数据状态 {live} / {state.connections.length}
          </button>
        </div>
        <h2>{headline}</h2>
        <p>
          {!state.enabled
            ? "启动行情后再判断，缓存结果仅供回看。"
            : counts.WATCH
              ? "这些是研究候选，尚不能直接下单。先比较资金占用、持有期和主要限制。"
              : counts.ATTENTION === state.candidates.length
                ? "先等待有效行情；数据不足不等于市场没有机会。"
                : "无需为了操作而选择。可查看未达门槛原因，或等待市场变化。"}
        </p>
        <div className="decision-controls">
          <span>
            覆盖 {state.assets.join(" / ")} · 已评估 {state.candidates.length}{" "}
            个组合
          </span>
          <button
            className="outline compact"
            disabled={busy || state.scanning}
            onClick={() => control(state.enabled ? "refresh" : "start")}
          >
            <RefreshCw
              size={14}
              className={busy || state.scanning ? "spin" : ""}
            />
            {!state.enabled
              ? "连接公开市场"
              : state.scanning
                ? "正在刷新"
                : "刷新行情"}
          </button>
        </div>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <section className="panel">
        <div className="filter-bar">
          <div className="tabs">
            <button
              className={view === "CANDIDATES" ? "selected" : ""}
              onClick={() => setView("CANDIDATES")}
            >
              候选看板
            </button>
            <button
              className={view === "DATA" ? "selected" : ""}
              onClick={() => setView("DATA")}
            >
              市场与资金费
            </button>
            <button
              className={view === "HISTORY" ? "selected" : ""}
              onClick={() => setView("HISTORY")}
            >
              历史结算
            </button>
          </div>
          <span className="public-asof">
            最近计算{" "}
            {state.computedAt
              ? new Date(state.computedAt).toLocaleString("zh-CN")
              : "尚未计算"}
          </span>
        </div>
        {view === "CANDIDATES" && (
          <>
            <div className="decision-groups" aria-label="候选状态分组">
              {(
                [
                  ["WATCH", "值得观察"],
                  ["REJECTED", "暂不满足"],
                  ["ATTENTION", "数据待更新"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={group === key ? "selected" : ""}
                  aria-pressed={group === key}
                  onClick={() => setGroup(key)}
                >
                  <b>{counts[key]}</b>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="public-filter">
              <select
                aria-label="公开策略筛选"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="ALL">全部交易策略</option>
                {Object.entries(names).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="search">
                <Search size={14} />
                <input
                  aria-label="搜索公开市场"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="资产或交易所"
                />
              </label>
              <select
                aria-label="候选排序"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="DURATION">持有期：短 → 长</option>
                <option value="ANNUALIZED">资金占用年化对比</option>
              </select>
            </div>
            {sort === "ANNUALIZED" && (
              <p className="decision-footnote">
                按两腿全额本金及入场费归一化，仅作算术对比。不假设收益可以持续重复；年化高不代表风险低，现货价差不参与年化排序。
              </p>
            )}
            {displayed.length ? (
              <>
                <div
                  className="decision-list"
                  onPointerEnter={holdList}
                  onPointerDown={holdList}
                  onPointerLeave={() => {
                    if (!detail) setHeldIds(null);
                  }}
                  onFocusCapture={holdList}
                  onBlurCapture={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node))
                      setHeldIds(null);
                  }}
                >
                  {displayed.slice(0, limit).map((c) => {
                    const e = c.economics.find(
                        (e) => e.notionalUsd === c.referenceSizeUsd,
                      ),
                      capital = capitalEstimate(e),
                      liveGroup = candidateGroup(c, now, available),
                      needsData = liveGroup === "ATTENTION",
                      status = needsData
                        ? "数据待更新"
                        : liveGroup === "WATCH"
                          ? "值得观察"
                          : "暂不满足";
                    const stale =
                      !available || now > c.freshUntil || c.status === "STALE";
                    const mainReason = needsData
                      ? stale
                        ? "盘口已过期，等待更新"
                        : reason(
                            c.reasonCodes[0] ?? "MARKET_EVIDENCE_INCOMPLETE",
                          )
                      : reason(c.reasonCodes[0] ?? "ACCOUNT_NOT_CONNECTED");
                    return (
                      <article
                        key={c.id}
                        className={`decision-card ${needsData ? "muted-candidate" : ""}`}
                      >
                        <div className="decision-card-head">
                          <div>
                            <h3>
                              {c.asset} · {names[c.strategy]}
                            </h3>
                            <p>
                              {c.venues.join(" → ")}
                              {c.strategy === "BASIS_CASH_CARRY"
                                ? ` · ${c.instrumentIds
                                    .map(
                                      (id) =>
                                        state.snapshots.find(
                                          (s) => s.instrument.id === id,
                                        )?.instrument,
                                    )
                                    .filter((i) => i?.expiresAt)
                                    .map((i) =>
                                      new Date(
                                        i!.expiresAt!,
                                      ).toLocaleDateString("zh-CN"),
                                    )
                                    .join("")} 到期`
                                : ""}
                            </p>
                          </div>
                          <span
                            className={`tag ${liveGroup === "WATCH" ? "green" : liveGroup === "REJECTED" ? "amber" : ""}`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="decision-card-metrics">
                          <div>
                            <span>
                              {c.strategy === "CROSS_EXCHANGE_SPREAD"
                                ? "两腿名义金额"
                                : "模拟需备资金"}
                            </span>
                            <strong>
                              {money(
                                c.strategy === "CROSS_EXCHANGE_SPREAD"
                                  ? (capital?.principal ?? null)
                                  : (capital?.required ?? null),
                              )}
                            </strong>
                            <small>
                              {c.strategy === "CROSS_EXCHANGE_SPREAD"
                                ? "另需预置现货库存，暂不支持模拟"
                                : "两腿全额本金 + 入场费估计"}
                            </small>
                          </div>
                          <div>
                            <span>
                              {needsData
                                ? "上次模型预期净收益"
                                : "模型预期净收益"}
                            </span>
                            <strong
                              className={
                                needsData
                                  ? ""
                                  : liveGroup === "WATCH" &&
                                      c.expectedPnlUsd !== null &&
                                      c.expectedPnlUsd > 0
                                    ? "positive"
                                    : ""
                              }
                            >
                              {money(c.expectedPnlUsd)}
                            </strong>
                            <small>
                              预计持有 {duration(c.holdingSeconds)} ·
                              已扣模型成本及储备
                            </small>
                            {sort === "ANNUALIZED" && (
                              <small>
                                资金占用年化对比{" "}
                                {percent(comparableAnnualized(c), 2)}
                              </small>
                            )}
                          </div>
                        </div>
                        <p className="decision-reason">
                          {needsData
                            ? "数据限制"
                            : liveGroup === "WATCH"
                              ? "下一步"
                              : "主要原因"}
                          ：
                          {liveGroup === "WATCH"
                            ? "核对成本和资金，再决定是否研究模拟"
                            : mainReason}
                        </p>
                        <div className="decision-card-footer">
                          <span>
                            单腿参考规模 {money(c.referenceSizeUsd)}
                            {needsData ? " · 非当前有效报价" : ""}
                          </span>
                          <button
                            className="outline compact"
                            disabled={busy}
                            onClick={() => showDetail(c)}
                          >
                            {needsData
                              ? "查看数据问题"
                              : liveGroup === "REJECTED"
                                ? "查看原因"
                                : "查看资金与风险"}
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {displayed.length > limit && (
                  <button
                    className="outline decision-more"
                    onClick={() => setLimit((n) => n + 6)}
                  >
                    再显示 {Math.min(6, displayed.length - limit)} 个组合（共{" "}
                    {sorted.length} 个）
                  </button>
                )}
              </>
            ) : (
              <div className="empty decision-empty">
                <ShieldCheck size={25} />
                <h3>
                  {state.candidates.length === 0
                    ? "连接后开始评估"
                    : group === "WATCH"
                      ? "当前筛选下没有值得观察的候选"
                      : group === "REJECTED"
                        ? "当前筛选下没有未达门槛的候选"
                        : "当前筛选下没有数据待更新的候选"}
                </h3>
                <p>
                  {strategy === "IDLE_CAPITAL_YIELD"
                    ? "闲置生息尚缺已验证产品条款。"
                    : group === "WATCH"
                      ? "可以先不操作。未达门槛和数据问题已分开列出。"
                      : "调整策略或搜索条件，查看其他组合。"}
                </p>
                <div className="decision-empty-actions">
                  {group === "WATCH" && counts.REJECTED > 0 && (
                    <button
                      className="outline"
                      onClick={() => {
                        setGroup("REJECTED");
                        setStrategy("ALL");
                        setSearch("");
                      }}
                    >
                      查看未达门槛原因
                    </button>
                  )}
                  {group === "WATCH" && counts.ATTENTION > 0 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setGroup("ATTENTION");
                        setStrategy("ALL");
                        setSearch("");
                      }}
                    >
                      查看数据问题
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {view === "DATA" && (
          <>
            <div className="decision-connections">
              {state.connections.map((c) => (
                <div key={c.venue}>
                  <b>{c.venue}</b>
                  <span className="tag">
                    {!state.enabled
                      ? "已暂停"
                      : c.streamState === "LIVE"
                        ? "行情流已连接"
                        : c.streamState === "RECOVERING"
                          ? "正在重连"
                          : "等待行情"}
                  </span>
                  <small>
                    {c.instrumentCount} 个市场 · 最近接收{" "}
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleString("zh-CN")
                      : "尚无数据"}
                  </small>
                  {c.error && (
                    <details>
                      <summary>连接问题</summary>
                      {c.error}
                    </details>
                  )}
                </div>
              ))}
              <button
                className="outline"
                disabled={busy}
                onClick={() => control(state.enabled ? "stop" : "start")}
              >
                {state.enabled ? "暂停行情连接" : "连接公开市场"}
              </button>
            </div>
            <p className="decision-footnote">
              连接成功不代表每个盘口仍有效；候选按各策略的时间要求单独检查。下表可包含上次取得的数据。
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>市场</th>
                    <th>买一 / 卖一</th>
                    <th>当前资金费</th>
                    <th>结算周期</th>
                    <th>最近历史样本</th>
                    <th>数据源</th>
                  </tr>
                </thead>
                <tbody>
                  {state.snapshots.map((s) => (
                    <tr key={s.instrument.id}>
                      <td>
                        <b>{s.instrument.venue}</b>
                        <small className="market-sub">
                          {s.instrument.symbol} · {s.instrument.kind}
                        </small>
                      </td>
                      <td>
                        {s.book
                          ? `${s.book.bids[0][0]} / ${s.book.asks[0][0]}`
                          : "—"}
                        <small className="market-sub">
                          {s.instrument.quote} ·{" "}
                          {s.book ? time(s.book.observedAt) : "盘口缺失"}
                        </small>
                      </td>
                      <td>
                        {s.funding ? percent(s.funding.rate * 100, 6) : "—"}
                        <small className="market-sub">
                          {s.funding
                            ? `下次 ${time(s.funding.nextSettlementAt)}`
                            : ""}
                        </small>
                      </td>
                      <td>
                        {s.funding
                          ? `${s.funding.intervalMs / 3600000} 小时`
                          : "—"}
                      </td>
                      <td>{s.funding?.history.length ?? "—"}</td>
                      <td>
                        <span className="tag">
                          {s.book?.source ?? "不可用"}
                        </span>
                        <small className="market-sub">
                          {s.errors[0] ??
                            (s.book?.timestampQuality === "RECEIPT_ONLY"
                              ? "仅接收时间"
                              : "源时间戳")}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {view === "HISTORY" && (
          <div className="history-form">
            <p>
              读取交易所已结算资金费记录；按时间去重排序。历史资金费本身不等于完整订单簿回测。
            </p>
            <div>
              <select
                aria-label="历史合约"
                value={historyInstrument}
                onChange={(e) => setHistoryInstrument(e.target.value)}
              >
                <option value="">选择永续合约</option>
                {state.snapshots
                  .filter((s) => s.instrument.kind === "PERPETUAL")
                  .map((s) => (
                    <option value={s.instrument.id} key={s.instrument.id}>
                      {s.instrument.venue} · {s.instrument.symbol}
                    </option>
                  ))}
              </select>
              <select
                aria-label="历史窗口"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                <option value="7">最近 7 天</option>
                <option value="30">最近 30 天</option>
                <option value="90">最近 90 天</option>
              </select>
              <button
                className="outline"
                disabled={busy || !historyInstrument}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const i = state.snapshots.find(
                      (s) => s.instrument.id === historyInstrument,
                    )!.instrument;
                    const end = Date.now();
                    setHistory(
                      await request(
                        `/api/public-market/history?venue=${encodeURIComponent(i.venue)}&instrumentId=${encodeURIComponent(i.id)}&start=${end - Number(days) * 86400000}&end=${end}`,
                      ),
                    );
                  } catch (e) {
                    setError(networkMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <LoaderCircle size={14} className="spin" />
                ) : (
                  <Database size={14} />
                )}
                读取历史
              </button>
            </div>
            {history && (
              <>
                <p>
                  已取得 {history.observations.length} 条已结算记录。首末记录：
                  {new Date(history.firstAt).toLocaleString("zh-CN")} —{" "}
                  {new Date(history.lastAt).toLocaleString("zh-CN")}。
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>结算时间</th>
                        <th>资金费率（该结算周期）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.observations
                        .slice(-30)
                        .reverse()
                        .map((r: any) => (
                          <tr key={r.at}>
                            <td>{new Date(r.at).toLocaleString("zh-CN")}</td>
                            <td>{percent(r.rate * 100, 6)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p>展示最近 30 条；历史覆盖及数据缺口不自动视为验收通过。</p>
              </>
            )}
          </div>
        )}
        <div className="table-note">
          <Clock3 size={14} /> 费率 / 元数据按周期刷新，盘口通过 WebSocket
          更新；失联或过期直接标记，不回退成示例机会。
        </div>
      </section>
      {state.errors.length > 0 && (
        <details className="decision-footnote">
          <summary>部分数据源有问题 · 查看技术详情</summary>
          {state.errors.join(" · ")}
        </details>
      )}
      <div className="public-valuation">
        {state.valuations.map((v) => (
          <span key={v.asset}>
            {v.asset} / USD <b>{v.usdPrice.toFixed(6)}</b> · Coinbase 参考 ·{" "}
            {time(v.observedAt)}
          </span>
        ))}
      </div>
      {detail && (
        <Dialog title="公开市场计算详情" close={() => setDetail(null)}>
          <div className="detail-title">
            <div>
              <h2>
                {detail.candidate.asset} · {names[detail.candidate.strategy]}
              </h2>
              <p>
                {detail.candidate.venues.join(" → ")} · 计算于{" "}
                {time(detail.candidate.computedAt)}
              </p>
            </div>
            <span className="tag amber">DRAFT · 尚未验证</span>
          </div>
          <div className="decision-detail-controls">
            <label>
              单腿参考规模{" "}
              <select
                aria-label="模拟参考规模"
                value={previewSize}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
              >
                {currentDetail?.economics.map((e) => (
                  <option key={e.notionalUsd} value={e.notionalUsd}>
                    {money(e.notionalUsd)}
                  </option>
                ))}
              </select>
            </label>
            <span>预计持有 {duration(currentDetail!.holdingSeconds)}</span>
          </div>
          <div className="decision-card-metrics decision-detail-metrics">
            <div>
              <span>两腿全额本金 + 入场费估计</span>
              <strong>{money(selectedCapital?.required ?? null)}</strong>
              <small>公开费率估计；模拟不使用杠杆</small>
            </div>
            <div>
              <span>
                {candidateGroup(currentDetail!, now, available) === "ATTENTION"
                  ? "上次模型预期净收益"
                  : "模型预期净收益"}
              </span>
              <strong>{money(detailEconomics?.expectedPnlUsd ?? null)}</strong>
              <small>该持有期内的模型结果，非保证收益</small>
            </div>
          </div>
          <p className="detail-footnote">
            预期交易成本{" "}
            {money(
              detailEconomics?.roundedNotionalUsd != null &&
                detailEconomics.expectedCostPct != null
                ? (detailEconomics.roundedNotionalUsd *
                    detailEconomics.expectedCostPct) /
                    100
                : null,
            )}{" "}
            · 风险储备{" "}
            {money(
              detailEconomics?.roundedNotionalUsd != null
                ? (detailEconomics.roundedNotionalUsd *
                    detailEconomics.reservePct) /
                    100
                : null,
            )}
            （均已从净收益扣除，储备不是已付费用）。上方估计随行情更新。
          </p>
          <div className="decision-action-box">
            <b>
              {blocked
                ? `暂不能模拟：${reason(blocked)}`
                : shortfall
                  ? "模拟资金不足：先设置各交易所的模拟余额"
                  : !paperAccounts && onSimulate
                    ? "尚未取得模拟余额，请重试读取"
                    : detailEconomics?.publicGatesPass
                      ? "公开条件通过，可继续检查研究模拟"
                      : "未达收益门槛，仅适合研究模拟"}
            </b>
            {onSimulate &&
              Object.entries(requirements).map(([venue, required]) => (
                <p key={venue}>
                  {venue} 需备 {money(required)} · 模拟可用{" "}
                  {money(
                    paperAccounts?.find((a) => a.venue === venue)?.cashUsd ??
                      null,
                  )}
                </p>
              ))}
            <p>
              仅记入个人模拟账本，不发送真实订单。提交时会重新检查盘口、数量和资金；实际收益仍取决于后续行情。
            </p>
            <div className="decision-empty-actions">
              {onSimulate && (
                <button
                  className="primary"
                  disabled={
                    !!blocked || paperAccounts === null || shortfall || busy
                  }
                  onClick={() => {
                    onSimulate(detail.candidate.id, previewSize);
                    setDetail(null);
                  }}
                >
                  继续研究模拟
                </button>
              )}
              {shortfall && onManageFunds && (
                <button
                  className="outline"
                  onClick={() => {
                    setDetail(null);
                    onManageFunds();
                  }}
                >
                  设置模拟资金
                </button>
              )}
              <button
                className="outline"
                disabled={busy}
                onClick={() => showDetail(currentDetail!, previewSize)}
              >
                重新读取详情与余额
              </button>
            </div>
          </div>
          <details>
            <summary>真实执行仍缺少什么</summary>
            <ul className="public-blockers">
              {detail.candidate.executionBlockers.map((r: string) => (
                <li key={r}>{reason(r)}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary>
              打开详情时的各规模计算快照 · {time(detail.candidate.computedAt)}
            </summary>
            <h3>按规模计算</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>参考规模</th>
                    <th>毛收益</th>
                    <th>预期成本</th>
                    <th>储备</th>
                    <th>净收益</th>
                    <th>门槛</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.candidate.economics.map((e: any) => (
                    <tr key={e.notionalUsd}>
                      <td>
                        {money(e.notionalUsd)}
                        <small className="market-sub">
                          取整后 {money(e.roundedNotionalUsd)}
                        </small>
                      </td>
                      <td>{percent(e.grossPct)}</td>
                      <td>{percent(e.expectedCostPct)}</td>
                      <td>{percent(e.reservePct)}</td>
                      <td>{percent(e.netPct)}</td>
                      <td>
                        {e.publicGatesPass
                          ? "公开条件通过"
                          : reason(e.reasonCodes[0])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details>
            <summary>打开详情时的参考交易腿</summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>方向 / 合约</th>
                    <th>交易所数量</th>
                    <th>基础币数量</th>
                    <th>VWAP</th>
                    <th>滑点 bps</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.candidate.economics
                    .find(
                      (e: any) =>
                        e.notionalUsd === detail.candidate.referenceSizeUsd,
                    )
                    ?.legs.map((leg: any) => (
                      <tr key={leg.instrumentId}>
                        <td>
                          {leg.side} {leg.venue}
                          <small className="market-sub">{leg.symbol}</small>
                        </td>
                        <td>{leg.venueQuantity}</td>
                        <td>{leg.baseQuantity}</td>
                        <td>{leg.vwap.toFixed(4)}</td>
                        <td>{leg.slippageBps.toFixed(4)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
          <details>
            <summary>计算假设与数据来源</summary>
            <p className="detail-footnote">
              手续费为版本化保守估计；退出滑点使用当前反向盘口估算。储备不是已支付费用。美元为公开参考估值，真实会计需要通过估值审批。
            </p>
            <pre>
              {JSON.stringify(
                {
                  source: detail.candidate.source,
                  inputHash: detail.candidate.inputHash,
                  configHash: detail.candidate.configHash,
                  reasons: detail.candidate.reasonCodes,
                  assumptions: detail.candidate.assumptions,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <details>
            <summary>公式事实与追溯</summary>
            <pre>
              {JSON.stringify(
                { facts: detail.facts, traces: detail.traces },
                null,
                2,
              )}
            </pre>
          </details>
        </Dialog>
      )}
    </div>
  );
}
