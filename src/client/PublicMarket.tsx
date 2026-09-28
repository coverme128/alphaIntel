import { useEffect, useState, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Database,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type {
  PublicMarketState,
  PublicCandidate,
  MarketSnapshot,
} from "../market/types";
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
          "button,input,select,summary",
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
}: { onSimulate?: (id: string) => void } = {}) {
  const [state, setState] = useState<PublicMarketState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [strategy, setStrategy] = useState("ALL"),
    [detail, setDetail] = useState<any | null>(null),
    [view, setView] = useState("CANDIDATES"),
    [historyInstrument, setHistoryInstrument] = useState(""),
    [days, setDays] = useState("7"),
    [history, setHistory] = useState<any | null>(null);
  const fetchState = async () => {
    try {
      setState(await request("/api/public-market"));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    fetchState();
    const timer = setInterval(fetchState, 5000);
    return () => clearInterval(timer);
  }, []);
  const control = async (action: string) => {
    setBusy(true);
    setError("");
    try {
      setState(await request(`/api/public-market/${action}`, {}));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const showDetail = async (c: PublicCandidate) => {
    setBusy(true);
    try {
      setDetail(await request(`/api/public-market/candidates/${c.id}`));
    } catch (e) {
      setError((e as Error).message);
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
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(a.status !== "WATCH") - Number(b.status !== "WATCH") ||
      (b.netPct ?? -Infinity) - (a.netPct ?? -Infinity),
  );
  return (
    <div className="public-market">
      <div className="public-intro">
        <div>
          <span className="eyebrow">PUBLIC MARKET · 无需账户</span>
          <h2>从真实市场数据开始。</h2>
          <p>
            公开行情与模拟账本独立。当前扫描 {state.assets.join(" / ")}
            ；所有候选尚不可直接下单。
          </p>
        </div>
        <div className="public-controls">
          <button
            className="outline"
            disabled={busy || state.scanning}
            onClick={() => control("refresh")}
          >
            <RefreshCw size={14} className={busy ? "spin" : ""} />
            刷新快照
          </button>
          <button
            className={state.enabled ? "outline" : "primary"}
            disabled={busy}
            onClick={() => control(state.enabled ? "stop" : "start")}
          >
            {state.enabled ? <Pause size={14} /> : <Play size={14} />}{" "}
            {state.enabled ? "停止订阅" : "连接公开市场"}
          </button>
        </div>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="public-connections">
        {state.connections.map((c) => (
          <div className="panel" key={c.venue}>
            <div>
              <b>{c.venue}</b>
              <span
                className={`tag ${c.streamState === "LIVE" ? "green" : c.error ? "amber" : ""}`}
              >
                {c.streamState === "LIVE"
                  ? "WebSocket 在线"
                  : c.streamState === "CONNECTING"
                    ? "连接中"
                    : c.streamState === "RECOVERING"
                      ? "恢复中"
                      : c.state === "LIVE"
                        ? "REST 已接通"
                        : c.state === "CONNECTING"
                          ? "请求中"
                          : c.state === "DEGRADED"
                            ? "部分不可用"
                            : "未连接"}
              </span>
            </div>
            <strong>
              {c.instrumentCount} <small>个市场</small>
            </strong>
            <p>{c.error ?? `上次快照 ${time(c.lastSuccessAt)}`}</p>
          </div>
        ))}
      </div>
      <div className="public-evidence">
        <ShieldCheck size={16} />
        <span>
          缺少账户时仍可计算市场收益与盘口容量；可执行容量、实际手续费及保证金保持“未知”。美元金额使用公开参考价，不假设稳定币恒等于
          1 美元。
        </span>
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="tabs">
            <button
              className={view === "CANDIDATES" ? "selected" : ""}
              onClick={() => setView("CANDIDATES")}
            >
              机会计算 · {state.candidates.length}
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
          <span className="public-asof">计算快照 {time(state.computedAt)}</span>
        </div>
        {view === "CANDIDATES" && (
          <>
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
            </div>
            {sorted.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>市场组合</th>
                      <th>策略</th>
                      <th>净收益 / 持有期</th>
                      <th>参考规模预期净损益</th>
                      <th>市场判断</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <b>{c.asset}</b>
                          <small className="market-sub">
                            {c.venues.join(" → ")}
                          </small>
                          <small className="market-sub">
                            {c.instrumentIds
                              .map(
                                (id) =>
                                  state.snapshots.find(
                                    (s) => s.instrument.id === id,
                                  )?.instrument.symbol ?? id,
                              )
                              .join(" / ")}
                          </small>
                        </td>
                        <td>{names[c.strategy]}</td>
                        <td
                          className={
                            c.netPct !== null && c.netPct > 0
                              ? "positive"
                              : "negative"
                          }
                        >
                          {percent(c.netPct)}
                          <small className="market-sub">
                            {c.holdingSeconds >= 172800
                              ? `${(c.holdingSeconds / 86400).toFixed(1)} 天`
                              : `${(c.holdingSeconds / 3600).toFixed(1)} 小时`}
                          </small>
                        </td>
                        <td>{money(c.expectedPnlUsd)}</td>
                        <td>
                          <span
                            className={`tag ${c.status === "WATCH" ? "green" : c.status === "REJECTED" ? "amber" : ""}`}
                          >
                            {
                              {
                                WATCH: "值得观察",
                                REJECTED: "未达门槛",
                                STALE: "快照过期",
                                INCOMPLETE: "数据不足",
                              }[c.status]
                            }
                          </span>
                          <small className="market-sub">
                            {reason(
                              c.reasonCodes[0] ?? "ACCOUNT_NOT_CONNECTED",
                            )}
                          </small>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`查看公开 ${c.asset} ${names[c.strategy]} ${c.venues.join(" ")}`}
                            disabled={busy}
                            onClick={() => showDetail(c)}
                          >
                            <ArrowUpRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Database size={26} />
                <h3>
                  {state.lastScanAt ? "没有匹配的候选" : "先连接公开市场"}
                </h3>
                <p>
                  {strategy === "IDLE_CAPITAL_YIELD"
                    ? "闲置收益需要经过批准的产品条款；不伪造公开收益率。"
                    : "连接后获取合约规格、盘口、资金费和历史记录，并计算候选机会。"}
                </p>
              </div>
            )}
          </>
        )}
        {view === "DATA" && (
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
                      <span className="tag">{s.book?.source ?? "不可用"}</span>
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
                    setError((e as Error).message);
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
        <div className="error-banner">{state.errors.join(" · ")}</div>
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
          <div className="notice">
            当前为只读研究候选。市场容量{" "}
            {money(detail.candidate.marketCapacityUsd)}；账户可执行容量未知。
          </div>
          {onSimulate && (
            <button
              className="primary"
              onClick={() => {
                onSimulate(detail.candidate.id);
                setDetail(null);
              }}
            >
              使用真实行情模拟这笔交易
            </button>
          )}
          <h3>仍缺少的执行证据</h3>
          <ul className="public-blockers">
            {detail.candidate.executionBlockers.map((r: string) => (
              <li key={r}>{reason(r)}</li>
            ))}
          </ul>
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
          <details open>
            <summary>参考规模的交易腿</summary>
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
