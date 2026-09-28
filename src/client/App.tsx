import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import type { Dashboard, Opportunity, Action, Position } from "../domain/types";
import "./styles.css";
import PublicMarket from "./PublicMarket";
const money = (n: number | null | undefined, digits = 2) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(n);
const pct = (n: number) => `${n.toFixed(2)}%`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${money(n)}`;
const strategies: Record<string, string> = {
  FUNDING_NEUTRAL: "资金费率中性",
  BASIS_CASH_CARRY: "期现基差",
  CROSS_EXCHANGE_FUNDING: "跨所资金费率",
  CROSS_EXCHANGE_SPREAD: "跨所价差",
  IDLE_CAPITAL_YIELD: "闲置资金生息",
};
const errors: Record<string, string> = {
  KILL_SWITCH_ACTIVE: "新建仓已暂停，请先在设置中恢复。",
  ALLOCATION_LIMIT: "金额超出组合分配上限，或缺少该规模的可执行证据。",
  VENUE_BALANCE_LIMIT: "交易所模拟可用资金不足。",
  OPPORTUNITY_NOT_EXECUTABLE: "机会已过期或不再符合条件，请刷新模拟场景。",
  LIVE_GATES_NOT_PASSED: "实盘验收门槛尚未通过，当前仅支持模拟执行。",
  INVALID_ORDER: "请输入有效金额（最低 $100，最多两位小数）。",
  RATE_LIMIT_WAIT_10_SECONDS: "请间隔 10 秒再刷新公开行情。",
  IDEMPOTENCY_CONFLICT: "此请求已用于另一笔交易，请重新打开确认窗口。",
};
async function api<T = any>(url: string, body?: unknown): Promise<T> {
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
  const result = await response.json();
  if (!response.ok)
    throw new Error(errors[result.error] ?? result.error ?? "请求失败");
  return result;
}
type Page =
  "Today" | "Opportunities" | "Positions" | "Portfolio" | "Performance";
const nav = [
  { id: "Today", label: "今日", icon: LayoutDashboard },
  { id: "Opportunities", label: "机会", icon: Compass },
  { id: "Positions", label: "持仓", icon: Layers3 },
  { id: "Portfolio", label: "资金组合", icon: Wallet },
  { id: "Performance", label: "绩效", icon: BarChart3 },
] as const;
const assetClass = (asset: string) =>
  asset === "ETH" ? "eth" : asset === "BTC" ? "btc" : "usdc";
function Asset({ asset, small = false }: { asset: string; small?: boolean }) {
  return (
    <span className={`asset ${assetClass(asset)} ${small ? "small" : ""}`}>
      {asset === "BTC" ? "₿" : asset === "ETH" ? "Ξ" : "$"}
    </span>
  );
}
function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Empty({
  title,
  description,
  icon: Icon = Layers3,
}: {
  title: string;
  description: string;
  icon?: typeof Layers3;
}) {
  return (
    <div className="empty">
      <span>
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, select, a[href], summary",
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
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [data, setData] = useState<Dashboard | null>(null),
    [page, setPage] = useState<Page>(() =>
      nav.some((n) => n.id === location.hash.slice(1))
        ? (location.hash.slice(1) as Page)
        : "Today",
    );
  const [marketView, setMarketView] = useState("PUBLIC");
  const [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(false),
    [alerts, setAlerts] = useState(false),
    [detail, setDetail] = useState<Opportunity | null>(null),
    [confirm, setConfirm] = useState<Opportunity | null>(null),
    [closing, setClosing] = useState<Position | null>(null),
    [amount, setAmount] = useState("5000"),
    [requestId, setRequestId] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [market, setMarket] = useState<any[]>([]),
    [positionTab, setPositionTab] = useState("OPEN");
  useEffect(() => {
    const syncPage = () => {
      const target = location.hash.slice(1);
      if (nav.some((n) => n.id === target)) setPage(target as Page);
    };
    window.addEventListener("hashchange", syncPage);
    return () => window.removeEventListener("hashchange", syncPage);
  }, []);
  const load = async () => {
    try {
      setData(await api("/api/dashboard"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const go = (p: Page) => {
    setPage(p);
    location.hash = p;
  };
  const mutate = async (url: string, body: unknown, message: string) => {
    setBusy(true);
    try {
      await api(url, body);
      await load();
      setToast(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const openConfirm = (o: Opportunity, n = 5000) => {
    setDetail(null);
    setConfirm(o);
    setAmount(String(n));
    setRequestId(crypto.randomUUID());
    setError("");
  };
  const exportData = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error("导出失败");
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `alpha-capital-decision-analysis-${new Date().toISOString().replaceAll(":", "-")}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast("决策与分析 JSON 已导出");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return (
      <div className="loading">
        <div className="brand-symbol">α</div>
        <h2>Alpha Capital OS</h2>
        {error ? (
          <>
            <p>{error}</p>
            <button onClick={load}>重新连接</button>
          </>
        ) : (
          <p>
            <LoaderCircle className="spin" size={16} /> 正在载入资金工作台…
          </p>
        )}
      </div>
    );
  const p = data.portfolio,
    opened = data.positions.filter((p) => p.status === "OPEN"),
    qualified = data.opportunities.filter((o) => o.qualified),
    date = new Date().toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  const actionCard = (a: Action, index: number) => {
    const o = data.opportunities.find((o) => o.id === a.opportunityId);
    return (
      <article
        className="action-card"
        key={`${a.actionType}-${a.opportunityId}`}
      >
        <div className="action-top">
          <span className="eyebrow">
            {String(index + 1).padStart(2, "0")} /{" "}
            {a.actionType === "EXECUTE"
              ? "模拟配置"
              : a.actionType === "HOLD"
                ? "保持配置"
                : "保留现金"}
          </span>
          <ArrowUpRight size={17} />
        </div>
        <div className="action-title">
          {o && <Asset asset={o.asset} />}
          <div>
            <h3>{a.displayTitle}</h3>
            <p>{o ? o.venues.join(" + ") : "当前无需新增配置"}</p>
          </div>
        </div>
        <div className="action-amount">
          <span>配置资金</span>
          <strong>{money(a.capitalUsd, 0)}</strong>
        </div>
        <div className="action-return">
          <span>预计持有期净收益</span>
          <b>
            {a.expectedNetPnlUsd == null ? "—" : signed(a.expectedNetPnlUsd)}{" "}
            <small>
              {a.expectedNetPct == null ? "" : `(${pct(a.expectedNetPct)})`}
            </small>
          </b>
        </div>
        <div className="action-meta">
          <span>
            <Clock3 size={13} />
            {o
              ? `${o.holdingDays < 1 ? "约 6 小时" : `${o.holdingDays} 天`}持有期`
              : "等待符合门槛的机会"}
          </span>
          <Tag tone="amber">尚未验证</Tag>
        </div>
        <p className="risk-note">
          {o
            ? "压力损失：暂无模型证据 · 仅供模拟体验"
            : "系统持续保留安全退出能力"}
        </p>
        <div className="action-footer">
          <button
            className="why"
            onClick={() => (o ? setDetail(o) : setSettings(true))}
          >
            为什么 <ChevronRight size={14} />
          </button>
          {o ? (
            <button
              className="primary compact"
              disabled={busy || data.killSwitch}
              onClick={() => openConfirm(o, a.capitalUsd)}
            >
              查看并模拟 <ArrowRight size={14} />
            </button>
          ) : (
            <span className="hold-label">
              <Check size={15} /> 无需操作
            </span>
          )}
        </div>
      </article>
    );
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#Today" onClick={() => go("Today")}>
          <span className="brand-symbol">α</span>
          <span>
            alpha<span className="brand-dot">.</span>
            <small>CAPITAL OS</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-avatar">G</div>
          <div>
            <b>我的资金空间</b>
            <small>PRIVATE WORKSPACE</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <span className="nav-caption">工作台</span>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "Positions" && opened.length > 0 && (
                <small>{opened.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mode-panel">
            <FlaskConical size={17} />
            <div>
              <b>模拟运行</b>
              <p>安全探索，验证每个决策</p>
            </div>
            <span className="status-dot" />
          </div>
          <button className="settings-button" onClick={() => setSettings(true)}>
            <Settings2 size={18} /> 高级与设置 <ChevronRight size={15} />
          </button>
          <div className="user">
            <span className="user-avatar">G</span>
            <div>
              <b>Owner</b>
              <small>个人资金管理</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            工作台 <ChevronRight size={13} />{" "}
            <span>{nav.find((n) => n.id === page)?.label}</span>
          </div>
          <div className="top-actions">
            <span className="core-status">
              <span className="status-dot" />{" "}
              {data.intelligenceMode === "CORE_ONLY"
                ? "确定性引擎"
                : "AI 增强 · 确定性回退"}
            </span>
            <span className="top-divider" />
            <button
              className="icon-button mobile-settings"
              aria-label="高级与设置"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="icon-button notification"
              aria-label="查看通知"
              onClick={() => setAlerts(true)}
            >
              <Bell size={18} />
              {data.killSwitch && <i />}
            </button>
            <button
              className="export-button"
              onClick={exportData}
              disabled={busy}
            >
              <ArrowDownToLine size={15} /> 决策与分析导出
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR CAPITAL, WITH CLARITY</div>
              <h1>
                {page === "Today"
                  ? "让每一笔资金，都有清晰的下一步。"
                  : page === "Opportunities"
                    ? "发现值得关注的机会。"
                    : page === "Positions"
                      ? "每个持仓，都在掌握之中。"
                      : page === "Portfolio"
                        ? "一个组合，一套资金决策。"
                        : "收益之外，看见真实价值。"}
              </h1>
              <p>
                {page === "Today"
                  ? `${date} · 以下是你的资金概览与今日建议。`
                  : page === "Opportunities"
                    ? "统一比较净收益、容量与证据成熟度，先理解，再行动。"
                    : page === "Positions"
                      ? "查看模拟持仓、退出条件与执行记录。"
                      : page === "Portfolio"
                        ? "先保留流动性，再在约束内配置资金。"
                        : "区分预期、已实现结果与经过验证的 Alpha。"}
              </p>
            </div>
            <span className="environment">
              <FlaskConical size={14} />{" "}
              {page === "Opportunities" && marketView === "PUBLIC"
                ? "公开市场 · 只读研究"
                : "PAPER 模拟环境"}
            </span>
          </div>
          {!(page === "Opportunities" && marketView === "PUBLIC") && (
            <>
              <div className="scenario-banner">
                <span>
                  <BookOpen size={16} />
                  <b>示例场景</b>{" "}
                  当前使用规格包中的固定测试数据与模拟资金，非实时投资机会。
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      "/api/scenario/refresh",
                      {},
                      "已载入新的模拟场景；已有持仓保留",
                    )
                  }
                >
                  <RefreshCw size={13} /> 刷新场景
                </button>
              </div>
            </>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="关闭错误"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {data.killSwitch && (
            <div className="kill-banner">
              <Pause size={16} /> 新建仓已暂停。现有持仓仍可正常退出。
              <button onClick={() => setSettings(true)}>
                管理状态 <ArrowRight size={14} />
              </button>
            </div>
          )}
          {(page === "Today" || page === "Portfolio") && (
            <div className="metrics">
              <div className="metric featured">
                <span>
                  模拟总权益 <CircleHelp size={13} />
                </span>
                <strong>{money(p.equityUsd)}</strong>
                <small>
                  <span className="status-dot" /> USD 计价 · 本地模拟账本
                </small>
              </div>
              <div className="metric">
                <span>已配置资金</span>
                <strong>{money(p.deployedUsd)}</strong>
                <small>
                  {opened.length} 个活跃持仓 <i /> 占总权益{" "}
                  {pct((p.deployedUsd / p.equityUsd) * 100)}
                </small>
              </div>
              <div className="metric">
                <span>
                  可用资金 <span className="tiny-tag">保留 15% 储备后</span>
                </span>
                <strong>{money(p.availableUsd)}</strong>
                <small>现金储备 {money(p.reserveUsd, 0)}</small>
              </div>
              <div className="metric">
                <span>本月已平仓模拟净损益</span>
                <strong
                  className={p.monthlyRealizedPnlUsd < 0 ? "negative" : ""}
                >
                  {signed(p.monthlyRealizedPnlUsd)}
                </strong>
                <small>
                  真实 Alpha <Tag>尚未验证</Tag>
                </small>
              </div>
            </div>
          )}
          {page === "Today" && (
            <>
              <section>
                <div className="section-heading">
                  <div>
                    <h2>
                      今日行动 <span>{data.actions.length}</span>
                    </h2>
                    <p>少一些信息噪声，多一些有依据的行动。</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("Opportunities")}
                  >
                    查看全部机会 <ArrowRight size={15} />
                  </button>
                </div>
                <div className="actions-grid">
                  {data.actions.map(actionCard)}
                </div>
              </section>
              <div className="overview-grid">
                <section className="panel allocation-panel">
                  <div className="panel-title">
                    <h2>资金配置</h2>
                    <button
                      className="icon-button"
                      aria-label="查看资金组合"
                      onClick={() => go("Portfolio")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="allocation-content">
                    <div
                      className="donut"
                      style={{
                        background: `conic-gradient(#f28a5c 0 ${(p.deployedUsd / p.equityUsd) * 100}%, #e6eaf0 0 85%, #233a50 0)`,
                      }}
                    >
                      <div>
                        <span>模拟资金</span>
                        <strong>{money(p.equityUsd, 0)}</strong>
                        <small>USD</small>
                      </div>
                    </div>
                    <div className="legend">
                      <div>
                        <span>
                          <i className="orange" />
                          策略配置
                        </span>
                        <b>{money(p.deployedUsd, 0)}</b>
                      </div>
                      <div>
                        <span>
                          <i className="light" />
                          待配置现金
                        </span>
                        <b>{money(p.availableUsd, 0)}</b>
                      </div>
                      <div>
                        <span>
                          <i className="navy" />
                          安全储备
                        </span>
                        <b>{money(p.reserveUsd, 0)}</b>
                      </div>
                      <p>
                        <ShieldCheck size={14} /> 先保留流动性，再分配资金。
                      </p>
                    </div>
                  </div>
                  <div className="panel-bottom">
                    <span>资金分配：建议模式</span>
                    <button onClick={() => go("Portfolio")}>
                      查看分配依据 <ChevronRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="panel monitor-panel">
                  <div className="panel-title">
                    <h2>值得留意</h2>
                    <Tag tone="green">本地状态</Tag>
                  </div>
                  <div className="monitor-item">
                    <span className="monitor-icon mint">
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <h3>
                        {data.killSwitch
                          ? "新建仓已暂停"
                          : "实盘安全门槛保持关闭"}
                      </h3>
                      <p>尚未完成回放、连续模拟与交易所验收。</p>
                    </div>
                  </div>
                  <div className="monitor-item">
                    <span className="monitor-icon peach">
                      <Activity size={18} />
                    </span>
                    <div>
                      <h3>
                        {opened.length
                          ? `${opened.length} 个模拟持仓等待管理`
                          : "当前没有需要退出的持仓"}
                      </h3>
                      <p>
                        {opened.length
                          ? "在持仓页查看成本与主动退出。"
                          : "完成模拟配置后，持仓将在这里持续展示。"}
                      </p>
                    </div>
                  </div>
                  <div className="monitor-item">
                    <span className="monitor-icon lavender">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <h3>决策不依赖 AI</h3>
                      <p>所有建议均来自可追溯的规则与计算事实。</p>
                    </div>
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      机会一览 <small>精选 CARRY & YIELD</small>
                    </h2>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("Opportunities")}
                  >
                    全部机会 <ArrowRight size={15} />
                  </button>
                </div>
                <OpportunityTable
                  items={data.opportunities.slice(-5)}
                  onDetail={setDetail}
                />
              </section>
            </>
          )}
          {page === "Opportunities" && (
            <div className="market-source-tabs">
              <button
                className={marketView === "PUBLIC" ? "selected" : ""}
                onClick={() => setMarketView("PUBLIC")}
              >
                公开市场 · 实际数据
              </button>
              <button
                className={marketView === "SCENARIO" ? "selected" : ""}
                onClick={() => setMarketView("SCENARIO")}
              >
                模拟场景 · 流程演练
              </button>
            </div>
          )}
          {page === "Opportunities" && marketView === "PUBLIC" && (
            <PublicMarket />
          )}
          {page === "Opportunities" && marketView === "SCENARIO" && (
            <section className="panel">
              <div className="filter-bar">
                <div className="tabs">
                  {[
                    ["ALL", "全部机会"],
                    ["CARRY", "Carry 策略"],
                    ["YIELD", "闲置收益"],
                  ].map(([v, t]) => (
                    <button
                      key={v}
                      className={filter === v ? "selected" : ""}
                      onClick={() => setFilter(v)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="搜索机会"
                    placeholder="搜索资产或交易所…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <OpportunityTable
                items={data.opportunities.filter(
                  (o) =>
                    (filter === "ALL" || o.module === filter) &&
                    `${o.title} ${o.venues.join(" ")}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )}
                onDetail={setDetail}
              />
              <div className="table-note">
                <CircleHelp size={14} />{" "}
                净收益对应实际持有期；年化仅供对比。所有策略当前均为 DRAFT /
                尚未验证。
              </div>
            </section>
          )}
          {page === "Positions" && (
            <section className="panel">
              <div className="filter-bar">
                <div className="tabs">
                  <button
                    className={positionTab === "OPEN" ? "selected" : ""}
                    onClick={() => setPositionTab("OPEN")}
                  >
                    当前持仓 · {opened.length}
                  </button>
                  <button
                    className={positionTab === "CLOSED" ? "selected" : ""}
                    onClick={() => setPositionTab("CLOSED")}
                  >
                    已平仓 · {data.positions.length - opened.length}
                  </button>
                </div>
                <Tag>PAPER 模拟执行</Tag>
              </div>
              {data.positions.filter((p) => p.status === positionTab).length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>持仓</th>
                        <th>配置资金</th>
                        <th>预计净收益</th>
                        <th>已支付模拟入场成本</th>
                        <th>
                          {positionTab === "OPEN"
                            ? "建仓时间"
                            : "模拟已实现损益"}
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.positions
                        .filter((p) => p.status === positionTab)
                        .map((pos) => (
                          <tr key={pos.id}>
                            <td>
                              <div className="instrument">
                                <Asset asset={pos.asset} small />
                                <div>
                                  <b>{pos.title}</b>
                                  <small>{pos.venues.join(" · ")}</small>
                                </div>
                              </div>
                            </td>
                            <td>{money(pos.capitalUsd)}</td>
                            <td>{signed(pos.expectedPnlUsd)}</td>
                            <td>{money(pos.entryFeeUsd)}</td>
                            <td>
                              {positionTab === "OPEN"
                                ? new Date(pos.openedAt).toLocaleString("zh-CN")
                                : signed(pos.realizedPnlUsd ?? 0)}
                            </td>
                            <td>
                              {pos.status === "OPEN" && (
                                <button
                                  className="outline compact"
                                  onClick={() => setClosing(pos)}
                                >
                                  退出持仓
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title={
                    positionTab === "OPEN"
                      ? "资金准备好了，等待你的第一步。"
                      : "还没有已平仓记录"
                  }
                  description={
                    positionTab === "OPEN"
                      ? "从今日行动或机会列表开始，模拟一笔有依据的资金配置。"
                      : "退出模拟持仓后，可在这里复核实际记录的成本与损益。"
                  }
                />
              )}
            </section>
          )}
          {page === "Portfolio" && (
            <>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-title">
                    <h2>交易所资金清单</h2>
                    <Tag>仅规划 · 不转账</Tag>
                  </div>
                  <div className="inventory-list">
                    {p.inventory.map((v, i) => (
                      <div className="inventory-row" key={v.venue}>
                        <div className={`venue-logo venue-${i}`}>
                          {v.venue[0]}
                        </div>
                        <div>
                          <b>{v.venue}</b>
                          <small>可用 {money(v.readyUsd)}</small>
                        </div>
                        <div className="inventory-bar">
                          <i
                            style={{
                              width: `${Math.max(2, (v.allocatedUsd / v.totalUsd) * 100)}%`,
                            }}
                          />
                        </div>
                        <strong>{money(v.totalUsd, 0)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="table-note">
                    所有余额均为模拟 USD。未连接私有账户，不发起资金转移。
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-title">
                    <h2>配置约束</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <div className="policy-list">
                    {[
                      ["最低现金储备", "15%"],
                      ["单机会配置上限", "10%"],
                      ["策略家族上限", "35%"],
                      ["单交易所 / 单资产上限", "40%"],
                      ["结算稳定币上限", "80%"],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <h2>下一步资金建议</h2>
                    <p>按边际收益与资金占用时间比较，在约束内逐步配置。</p>
                  </div>
                  <Tag>ADVISORY</Tag>
                </div>
                <div className="plan-list">
                  {data.actions.map((a) => (
                    <div key={a.displayTitle}>
                      <span className="plan-arrow">
                        <ArrowRight size={18} />
                      </span>
                      <div>
                        <b>{a.displayTitle}</b>
                        <small>
                          {a.actionType === "EXECUTE"
                            ? "从模拟现金配置 · 需手动确认"
                            : "维持当前配置"}
                        </small>
                      </div>
                      <strong>{money(a.capitalUsd, 0)}</strong>
                      <Tag tone="amber">尚未验证</Tag>
                    </div>
                  ))}
                </div>
                <div className="table-note">
                  混合持有期计划预期净损益：{money(p.expectedPlanPnlUsd)}
                  。这不是相同期限的组合收益率。
                </div>
              </section>
            </>
          )}
          {page === "Performance" && (
            <>
              <div className="performance-hero">
                <div>
                  <span className="eyebrow">ALPHA PROOF</span>
                  <h2>有收益，还需要有证据。</h2>
                  <p>
                    真实价值来自已对账的结果、同窗口基准比较与完整运行成本。
                  </p>
                  <Tag tone="amber">证据不足 · UNPROVEN</Tag>
                </div>
                <div className="proof-symbol">
                  <ShieldCheck size={64} strokeWidth={1} />
                </div>
              </div>
              <div className="metrics three">
                <div className="metric">
                  <span>累计模拟已记录损益</span>
                  <strong>{signed(p.realizedPnlUsd)}</strong>
                  <small>含未平仓入场成本 · 不等于真实收益</small>
                </div>
                <div className="metric">
                  <span>基准调整后超额收益</span>
                  <strong>—</strong>
                  <small>尚无同步实盘与基准数据</small>
                </div>
                <div className="metric">
                  <span>实盘证据覆盖</span>
                  <strong>
                    0 <em>天</em>
                  </strong>
                  <small>价值分类要求至少 90 天合格证据</small>
                </div>
              </div>
              <section className="panel">
                <div className="panel-title">
                  <h2>产品价值评估</h2>
                  <Tag>证据不足</Tag>
                </div>
                <div className="value-grid">
                  {[
                    ["Alpha 价值", "尚未验证", "等待已实现、已对账的超额收益"],
                    ["风险降低价值", "证据不足", "等待同步窗口的回撤比较"],
                    [
                      "操作效率价值",
                      "未开始计量",
                      "需要测量或所有者记录的工时",
                    ],
                    ["扩张决策", "尚未评估", "不因预期收益或功能完成而扩张"],
                  ].map(([t, v, desc]) => (
                    <div key={t}>
                      <span>{t}</span>
                      <h3>{v}</h3>
                      <p>{desc}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <h2>模拟执行流水</h2>
                  <span>{data.events.length} 条事件</span>
                </div>
                {data.events.length ? (
                  <div className="event-list">
                    {data.events
                      .slice(-10)
                      .reverse()
                      .map((e) => (
                        <div key={e.id}>
                          <span className="event-dot" />
                          <div>
                            <b>
                              {{
                                PAPER_OPEN: "模拟建仓",
                                PAPER_CLOSE: "模拟退出",
                                KILL_SWITCH_ON: "暂停新建仓",
                                KILL_SWITCH_OFF: "恢复新建仓",
                                SCENARIO_REFRESH: "刷新模拟场景",
                                INTELLIGENCE_MODE_CHANGED: "切换解释模式",
                              }[e.type] ?? e.type}
                            </b>
                            <small>
                              {e.id} · {e.hash.slice(0, 16)}
                            </small>
                          </div>
                          <time>{new Date(e.at).toLocaleString("zh-CN")}</time>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Empty
                    title="每一个行动，都会留下记录。"
                    description="模拟执行后，可在此复核事件与账本。"
                    icon={BookOpen}
                  />
                )}
              </section>
            </>
          )}
          <footer>
            <span>
              <span className="mini-alpha">α</span> Alpha Opportunity & Capital
              OS
            </span>
            <span>
              本地开发版 · 规格 v1.0.7 <i /> 确定性计算，可追溯决策
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {detail && (
        <Modal title="机会详情" onClose={() => setDetail(null)} wide>
          <div className="detail-title">
            <Asset asset={detail.asset} />
            <div>
              <h2>{detail.title}</h2>
              <p>
                {detail.venues.join(" + ")} · {strategies[detail.strategy]}
              </p>
            </div>
            <Tag tone="amber">尚未验证</Tag>
          </div>
          <div className="detail-stats">
            <div>
              <span>持有期预计净收益</span>
              <b>{pct(detail.netPct)}</b>
              <small>{detail.holdingDays} 天</small>
            </div>
            <div>
              <span>场景容量</span>
              <b>{money(detail.capacityUsd, 0)}</b>
              <small>实际配置另受组合上限约束</small>
            </div>
            <div>
              <span>压力损失 / 强平距离</span>
              <b>暂无证据</b>
              <small>实盘执行保持关闭</small>
            </div>
          </div>
          <div className="explanation">
            <h3>为什么值得模拟？</h3>
            <p>
              固定测试场景的净收益与容量符合 {strategies[detail.strategy]}{" "}
              的规则门槛。系统先扣除预期成本，再扣除适用的模型储备。此结果不代表当前市场存在该机会。
            </p>
          </div>
          <details open>
            <summary>
              计算明细 <ChevronDown size={15} />
            </summary>
            <div className="calculation-grid">
              <div>
                <span>
                  {detail.strategy === "IDLE_CAPITAL_YIELD"
                    ? "相对现金基准毛增量"
                    : "持有期毛收益"}
                </span>
                <b>{pct(detail.grossPct)}</b>
              </div>
              <div>
                <span>− 预期经济成本</span>
                <b>{pct(detail.costPct)}</b>
              </div>
              <div>
                <span>− 模型储备（未支付）</span>
                <b>{pct(detail.reservePct)}</b>
              </div>
              <div className="sum">
                <span>预计净收益</span>
                <b>{pct(detail.netPct)}</b>
              </div>
            </div>
            <p className="detail-footnote">
              简单年化对比 {pct(detail.annualizedPct)} ·
              仅供对比，不能视为可持续年收益。模拟规模曲线采用固定场景假设。
            </p>
          </details>
          <details>
            <summary>
              退出与取消条件 <ChevronDown size={15} />
            </summary>
            <p className="detail-footnote">
              模拟场景有效期至{" "}
              {new Date(detail.expiresAt).toLocaleTimeString("zh-CN")}
              。暂停开仓或有效期届满会阻止新增配置。当前支持手动模拟退出；尚未接入自动监控。退出仅记录模拟成本，不把预期收益变成已实现利润。
            </p>
          </details>
          <details>
            <summary>
              专业追溯 <ChevronDown size={15} />
            </summary>
            <pre>
              {JSON.stringify(
                {
                  formula: detail.strategy,
                  version: "1.0.4",
                  source: detail.source,
                  inputSnapshotHash: detail.snapshotHash,
                  configHash: detail.configHash,
                  factIds: detail.factIds,
                  inputs: detail.inputs,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <div className="modal-actions">
            <span>GUIDED · 模拟资金</span>
            <button
              className="primary"
              disabled={!detail.qualified || data.killSwitch || busy}
              onClick={() => openConfirm(detail)}
            >
              配置模拟资金 <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="确认模拟配置" onClose={() => !busy && setConfirm(null)}>
          <div className="detail-title">
            <Asset asset={confirm.asset} />
            <div>
              <h2>{confirm.title}</h2>
              <p>{confirm.venues.join(" + ")} · 尚未验证</p>
            </div>
          </div>
          <p className="notice">
            这笔操作仅使用本地模拟资金。不会向交易所发送订单。
          </p>
          <label className="amount-label">
            配置金额（USD）
            <input
              autoFocus
              type="number"
              min="100"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <p className="detail-footnote">
            单机会不超过权益的
            10%；同一机会的已有持仓计入额度。成本、现金储备和交易所余额由服务端复核。
          </p>
          <div className="confirm-facts">
            <div>
              <span>已保存的持有期净收益率</span>
              <b>{pct(confirm.netPct)}</b>
            </div>
            <div>
              <span>模拟入场成本规则</span>
              <b>配置金额 × {`${(confirm.costPct / 2).toFixed(3)}%`}</b>
            </div>
            <div>
              <span>模型储备</span>
              <b>不作为已支付费用</b>
            </div>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              取消
            </button>
            <button
              className="primary"
              disabled={busy || data.killSwitch}
              onClick={async () => {
                if (
                  await mutate(
                    "/api/orders",
                    {
                      opportunityId: confirm.id,
                      amountUsd: Number(amount),
                      requestId,
                      mode: "PAPER",
                    },
                    "模拟配置完成，可在持仓页查看",
                  )
                ) {
                  setConfirm(null);
                  go("Positions");
                }
              }}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Check size={16} />
              )}{" "}
              确认模拟配置
            </button>
          </div>
        </Modal>
      )}
      {closing && (
        <Modal title="退出模拟持仓" onClose={() => !busy && setClosing(null)}>
          <h3>{closing.title}</h3>
          <p className="notice">
            退出后释放 {money(closing.capitalUsd)}{" "}
            模拟本金，并记录模拟退出成本。尚未产生的预期收益不会计入已实现损益。
          </p>
          {error && <p className="inline-error">{error}</p>}
          <div className="modal-actions">
            <button
              className="outline"
              disabled={busy}
              onClick={() => setClosing(null)}
            >
              继续持有
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await mutate(
                    `/api/positions/${closing.id}/close`,
                    {},
                    "模拟持仓已退出，资金已回到账本",
                  )
                )
                  setClosing(null);
              }}
            >
              确认退出
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal title="高级与设置" onClose={() => setSettings(false)} wide>
          <div className="settings-section">
            <div>
              <h3>执行控制</h3>
              <p>当前仅开放模拟执行。实盘、自动交易和提币均不可用。</p>
            </div>
            <button
              className={data.killSwitch ? "outline" : "danger-outline"}
              disabled={busy}
              onClick={() =>
                mutate(
                  "/api/settings/kill-switch",
                  { active: !data.killSwitch },
                  data.killSwitch ? "已恢复模拟新建仓" : "已暂停所有新建仓",
                )
              }
            >
              {data.killSwitch ? <Play size={15} /> : <Pause size={15} />}{" "}
              {data.killSwitch ? "恢复新建仓" : "暂停新建仓"}
            </button>
          </div>
          <div className="settings-section">
            <div>
              <h3>智能模式</h3>
              <p>AI 增强尚未配置提供商，启用后仍使用确定性解释。</p>
            </div>
            <select
              aria-label="智能模式"
              value={data.intelligenceMode}
              onChange={(e) =>
                mutate(
                  "/api/settings/intelligence",
                  { mode: e.target.value },
                  "智能模式已保存",
                )
              }
              disabled={busy}
            >
              <option value="CORE_ONLY">CORE ONLY · 核心模式</option>
              <option value="AI_ENHANCED">AI ENHANCED · 确定性回退</option>
            </select>
          </div>
          <div className="settings-section">
            <div>
              <h3>公开行情连接</h3>
              <p>
                手动获取四家交易所的 BTC
                盘口快照。仅供诊断，不参与模拟机会计算。
              </p>
            </div>
            <button
              className="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  setMarket(await api("/api/market/refresh", {}));
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw size={14} className={busy ? "spin" : ""} /> 检查连接
            </button>
          </div>
          <div className="connections">
            {["OKX", "Binance", "Bybit", "Hyperliquid"].map((v) => {
              const r = market.find((x) => x.venue === v);
              return (
                <div key={v}>
                  <b>{v}</b>
                  <Tag tone={r?.ok ? "green" : "neutral"}>
                    {r ? (r.ok ? "已取得快照" : "不可用") : "未连接"}
                  </Tag>
                  <small>
                    {r?.ok
                      ? `买一 ${r.bids[0][0]} / 卖一 ${r.asks[0][0]} · ${new Date(r.receivedAt).toLocaleTimeString("zh-CN")}`
                      : (r?.error ?? "不需要 API 密钥")}
                  </small>
                </div>
              );
            })}
          </div>
          <details>
            <summary>
              模块与上线验收 <ChevronDown size={15} />
            </summary>
            <div className="readiness">
              <p>Carry / Yield：模拟规则已实现，策略仍为 DRAFT。</p>
              <p>Structured / Options：仅保留包内契约，配置与执行禁用。</p>
              <p>
                待验收：WebSocket 行情恢复、30 天历史回放、连续 7
                天模拟、私有账户接入、双腿失败恢复、对账与受限 AUTO。
              </p>
            </div>
          </details>
          <details>
            <summary>
              关于本地数据 <ChevronDown size={15} />
            </summary>
            <p className="detail-footnote">
              账本保存在项目
              .data/paper-state.json。单进程本地开发存储使用原子写入与事件哈希链，不作为生产数据库。导出不包含任何账户凭据。
            </p>
          </details>
          {error && <p className="inline-error">{error}</p>}
        </Modal>
      )}
      {alerts && (
        <Modal title="通知与关注" onClose={() => setAlerts(false)}>
          <div className="notice">
            <ShieldCheck size={19} />
            <div>
              <h3>{data.killSwitch ? "新建仓已暂停" : "实盘门槛尚未通过"}</h3>
              <p>
                {data.killSwitch
                  ? "暂停不会阻止现有持仓的安全退出。"
                  : "当前为固定场景模拟；未连接真实账户。"}
              </p>
            </div>
          </div>
          <div className="notice">
            <Clock3 size={19} />
            <div>
              <h3>{qualified.length} 个有效模拟机会</h3>
              <p>固定场景在载入后 30 分钟过期。过期后可重新载入用于演练。</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function OpportunityTable({
  items,
  onDetail,
}: {
  items: Opportunity[];
  onDetail: (o: Opportunity) => void;
}) {
  return items.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>机会 / 资产</th>
            <th>交易所</th>
            <th>持有期净收益</th>
            <th>预计持有</th>
            <th>证据成熟度</th>
            <th>状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id}>
              <td>
                <button
                  className="instrument clickable"
                  onClick={() => onDetail(o)}
                >
                  <Asset asset={o.asset} small />
                  <span>
                    <b>{o.title}</b>
                    <small>
                      {o.module === "YIELD" ? "YIELD" : "CARRY"} · {o.asset}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span className="venues">{o.venues.join(" / ")}</span>
              </td>
              <td className="positive strong">+{pct(o.netPct)}</td>
              <td>{o.holdingDays < 1 ? "6 小时" : `${o.holdingDays} 天`}</td>
              <td>
                <Tag tone="amber">尚未验证</Tag>
              </td>
              <td>
                <span className={`table-status ${o.qualified ? "" : "muted"}`}>
                  <i />
                  {o.qualified ? "规则通过" : "已过期"}
                </span>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`查看 ${o.title}`}
                  onClick={() => onDetail(o)}
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
    <Empty
      title="没有匹配的机会"
      description="尝试其他资产、交易所或策略分类。"
      icon={Search}
    />
  );
}
