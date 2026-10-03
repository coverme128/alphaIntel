import { useEffect, useState, useRef } from "react";
import {
  Plus,
  RefreshCw,
  X,
  AlertTriangle,
  Check,
  ArrowRight,
} from "lucide-react";
import PublicMarket from "./PublicMarket";
import type { BookMode } from "../personal/types";
const venues = ["OKX", "Binance", "Bybit", "Hyperliquid"];
const money = (v: number | null | undefined) =>
  v == null
    ? "待估值"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(v);
const date = (v: number) => new Date(v).toLocaleString("zh-CN");
const labels: Record<string, string> = {
  MARK_UNAVAILABLE: "缺少新鲜估值",
  FUNDING_NET_NEGATIVE: "双腿资金费按当前费率折算后为净支付",
  CROSS_ASSET_HEDGE_UNVERIFIED: "两腿资产不同，未验证对冲关系",
  PAYING_FUNDING: "当前方向需支付资金费",
  EXPIRY_WITHIN_24H: "距交割不足 24 小时",
  FUNDING_SETTLEMENT_INCOMPLETE: "模拟资金费待补齐结算证据",
  FUNDING_HISTORY_GAP: "资金费历史覆盖不足",
  VERIFY_MANUAL_FUNDING: "请核对并录入实际资金费",
  STOP_LOSS: "达到止损提醒阈值",
  TAKE_PROFIT: "达到止盈提醒阈值",
  HOLD_LIMIT: "达到最长持有时间",
  HEDGE_MISMATCH: "双腿数量未对冲",
  INSUFFICIENT_VENUE_CASH: "该交易所可用资金不足，请先录入资金",
  FRESH_BOOK_REQUIRED: "盘口已过期或缺少源时间，请刷新后重试",
  SPOT_SHORT_REQUIRES_EXISTING_INVENTORY:
    "当前不能模拟卖空现货；跨所现货价差需要已有库存，暂不支持此类建仓",
  BOOK_SOURCE_TIME_UNVERIFIED: "该盘口没有源时间，无法用于模拟成交",
  ORDER_BOOK_STALE: "盘口已过期，请稍后重新计算",
  INVALID_INSTRUMENT_QUANTITY: "数量不符合合约步长或最小订单要求",
  USD_VALUATION_MISSING: "缺少新鲜美元参考价格",
  DUPLICATE_SETTLEMENT_REFERENCE: "这笔结算编号已录入",
  INVALID_AMOUNT: "金额、价格或时间不合法",
  ACKNOWLEDGE_RESEARCH_REQUIRED: "请确认研究模拟说明",
  INSUFFICIENT_BOOK_DEPTH: "盘口不足以模拟全部平仓",
  REQUEST_ID_CONFLICT: "请求编号已用于不同操作，请重新提交",
  DEPTH_OR_MIN_ORDER_FAILED: "深度或最小订单未满足",
  ENTRY_SLIPPAGE_LIMIT: "该规模滑点超过上限",
  BOOK_SNAPSHOT_SKEW: "双腿盘口时间差过大",
};
async function api(url: string, body?: unknown) {
  const r = await fetch(
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
  const d = await r.json();
  if (!r.ok) throw new Error(labels[d.error] ?? d.error ?? "请求失败");
  return d;
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | null;
  detail?: string;
}) {
  return (
    <div className="personal-stat">
      <span>{label}</span>
      <strong>{money(value)}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="personal-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
const numeric = (form: FormData, key: string) => Number(form.get(key));
export default function PersonalWorkspace({ page }: { page: string }) {
  const [mode, setMode] = useState<BookMode>(() =>
      localStorage.getItem("alpha-personal-book") === "MANUAL"
        ? "MANUAL"
        : "PAPER",
    ),
    [data, setData] = useState<any>(null),
    [market, setMarket] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dialog, setDialog] = useState<any>(null),
    [legCount, setLegCount] = useState(1);
  const pending = useRef<{ signature: string; requestId: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const load = async () => {
    const [d, m] = await Promise.all([
      api(`/api/personal?mode=${mode}`),
      api("/api/public-market"),
    ]);
    setData(d);
    setMarket(m);
  };
  useEffect(() => {
    localStorage.setItem("alpha-personal-book", mode);
    setMessage("");
    let active = true;
    const refresh = () =>
      Promise.all([
        api(`/api/personal?mode=${mode}`),
        api("/api/public-market"),
      ])
        .then(([d, m]) => {
          if (active) {
            setData(d);
            setMarket(m);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    setData(null);
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [mode]);
  useEffect(() => {
    if (!dialog) return;
    const prior = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) setDialog(null);
      if (e.key === "Tab") {
        const nodes = modalRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, select",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === modalRef.current)
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
      prior?.focus();
    };
  }, [dialog]);
  const command = async (url: string, body: any) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const signature = JSON.stringify({ url, body });
      if (pending.current?.signature !== signature)
        pending.current = { signature, requestId: crypto.randomUUID() };
      await api(url, { ...body, requestId: pending.current.requestId });
      pending.current = null;
      setDialog(null);
      await load();
      setMessage("已保存到账本");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const instruments = market?.snapshots.map((s: any) => s.instrument) ?? [],
    opened = data?.positions.filter((p: any) => !p.closedAt) ?? [],
    alerts = opened
      .flatMap((p: any) => p.alerts.map((code: string) => ({ p, code })))
      .sort((a: any, b: any) => {
        const rank: Record<string, number> = {
          STOP_LOSS: 0,
          EXPIRY_WITHIN_24H: 1,
          HEDGE_MISMATCH: 2,
          FUNDING_NET_NEGATIVE: 3,
          TAKE_PROFIT: 4,
          HOLD_LIMIT: 5,
        };
        return (rank[a.code] ?? 9) - (rank[b.code] ?? 9);
      });
  const launchPaper = (candidateId: string, sizeUsd?: number) => {
    setMode("PAPER");
    setDialog({ type: "paper", candidateId, sizeUsd });
  };
  const riskFields = (
    <div className="personal-form-grid">
      <Field label="止损提醒（USD，0 为关闭）">
        <input
          name="stopLossUsd"
          type="number"
          min="0"
          step="any"
          defaultValue={dialog?.position?.stopLossUsd ?? 0}
        />
      </Field>
      <Field label="止盈提醒（USD，0 为关闭）">
        <input
          name="takeProfitUsd"
          type="number"
          min="0"
          step="any"
          defaultValue={dialog?.position?.takeProfitUsd ?? 0}
        />
      </Field>
      <Field label="最长持有（小时，0 为关闭）">
        <input
          name="maxHoldHours"
          type="number"
          min="0"
          step="any"
          defaultValue={dialog?.position?.maxHoldHours ?? 0}
        />
      </Field>
    </div>
  );
  const readRisk = (f: FormData) => ({
    stopLossUsd: numeric(f, "stopLossUsd"),
    takeProfitUsd: numeric(f, "takeProfitUsd"),
    maxHoldHours: numeric(f, "maxHoldHours"),
  });
  const fillFields = (prefix: string, leg?: any) => (
    <div className="personal-form-grid">
      <Field label="成交价格（报价币）">
        <input
          name={prefix + "price"}
          type="number"
          min="0.00000001"
          step="any"
          required
          defaultValue={leg?.currentPrice ?? undefined}
        />
      </Field>
      <Field label="报价币 / USD（实际记账汇率）">
        <input
          name={prefix + "fx"}
          type="number"
          min="0.00000001"
          step="any"
          required
          placeholder="例如 0.9995"
        />
      </Field>
      <Field label="实际手续费（USD）">
        <input
          name={prefix + "fee"}
          type="number"
          min="0"
          step="any"
          required
        />
      </Field>
    </div>
  );
  const positionsTable = (positions: any[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>持仓 / 来源</th>
            <th>占用本金</th>
            <th>已入账净损益</th>
            <th>未实现损益</th>
            <th>状态与提示</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.title}</b>
                <small className="market-sub">
                  {p.legs
                    .map(
                      (l: any) =>
                        `${l.instrument.venue} ${l.instrument.symbol} ${l.side} ${l.remaining}`,
                    )
                    .join(" / ")}
                </small>
                <small className="market-sub">{date(p.openedAt)}</small>
              </td>
              <td>
                {money(
                  p.legs.reduce((n: number, l: any) => n + l.collateralUsd, 0),
                )}
              </td>
              <td>{money(p.realizedNetPnlUsd)}</td>
              <td>{money(p.unrealizedPnlUsd)}</td>
              <td>
                <span className="tag">{p.closedAt ? "已平仓" : "持有中"}</span>
                {p.alerts.map((a: string) => (
                  <small key={a} className="market-sub">
                    {labels[a] ?? a}
                  </small>
                ))}
              </td>
              <td>
                <div className="personal-row-actions">
                  {!p.closedAt && (
                    <>
                      <button
                        className="outline compact"
                        onClick={() =>
                          setDialog({ type: "close", position: p })
                        }
                      >
                        {mode === "PAPER" ? "模拟平仓" : "录入平仓"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setDialog({ type: "risk", position: p })}
                      >
                        提醒阈值
                      </button>
                    </>
                  )}
                  {mode === "MANUAL" && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setDialog({ type: "cashflow", position: p })
                      }
                    >
                      资金费 / 费用
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!positions.length && (
        <div className="empty">
          <h3>还没有持仓记录</h3>
          <p>
            {mode === "PAPER"
              ? "先在资金组合添加模拟资金，再从公开市场选择研究候选。"
              : "先录入成交前的资金，再录入已经发生的成交。这里不会发送订单。"}
          </p>
        </div>
      )}
    </div>
  );
  return (
    <div className="personal-workspace">
      {page !== "Opportunities" && (
        <>
          <div className="personal-toolbar">
            <div className="market-mode-tabs">
              <button
                className={mode === "PAPER" ? "active" : ""}
                disabled={busy}
                onClick={() => setMode("PAPER")}
              >
                真实行情模拟
              </button>
              <button
                className={mode === "MANUAL" ? "active" : ""}
                disabled={busy}
                onClick={() => setMode("MANUAL")}
              >
                个人手动记账
              </button>
            </div>
            <button
              className="outline compact"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/personal/sync", {});
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw size={14} />
              刷新估值与结算
            </button>
          </div>
          <div className="notice personal-notice">
            {mode === "PAPER"
              ? "使用真实盘口模拟成交；资金和收益均为模拟，费用为配置估计。允许研究未达收益门槛的候选，但不会放宽数量和行情证据要求。"
              : "按你录入的成交和费用记账，公开行情仅用于参考估值。这里不会向交易所发送订单，也不代表交易所对账完成。"}
            现金按录入的 USD 账面值计量。
          </div>
        </>
      )}
      {error && (
        <div role="alert" className="error-banner">
          {error}
          <button className="text-button" onClick={() => setError("")}>
            关闭
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="notice">
          <Check size={14} />
          {message}
        </div>
      )}
      {page === "Opportunities" ? (
        <PublicMarket
          onSimulate={launchPaper}
          onManageFunds={() => {
            setMode("PAPER");
            location.hash = "Portfolio";
          }}
        />
      ) : !data ? (
        <p>正在读取个人账本…</p>
      ) : (
        <>
          <div className="personal-stats">
            <Stat
              label="参考净值"
              value={data.equityUsd}
              detail="现金 + 占用本金 + 未实现损益"
            />
            <Stat
              label="可用账面资金"
              value={data.cashUsd}
              detail={`占用本金 ${money(data.capitalUsd)}`}
            />
            <Stat
              label="已入账净损益"
              value={data.realizedNetPnlUsd}
              detail="价差损益 + 资金费 − 费用"
            />
            <Stat
              label="未实现损益"
              value={data.unrealizedPnlUsd}
              detail="按当前退出侧盘口估算，未扣未来退出费"
            />
          </div>
          {(page === "Today" || page === "Positions") && (
            <>
              <section className="panel">
                <div className="panel-title">
                  <h2>{page === "Today" ? "今日关注" : "持仓记录"}</h2>
                  <div className="personal-row-actions">
                    {mode === "MANUAL" && (
                      <button
                        className="primary compact"
                        onClick={() => {
                          setLegCount(1);
                          setDialog({ type: "manual" });
                        }}
                      >
                        <Plus size={14} />
                        录入成交
                      </button>
                    )}
                    <button
                      className="outline compact"
                      onClick={() => setDialog({ type: "flow" })}
                    >
                      录入资金
                    </button>
                  </div>
                </div>
                {page === "Today" && (
                  <div className="personal-alerts">
                    {alerts.length ? (
                      alerts.slice(0, 3).map(({ p, code }: any) => (
                        <div key={p.id + code}>
                          <AlertTriangle size={17} />
                          <span>
                            <b>{labels[code] ?? code}</b>
                            <small>{p.title}</small>
                          </span>
                          <button
                            className="text-button"
                            onClick={() =>
                              setDialog({ type: "risk", position: p })
                            }
                          >
                            查看阈值
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>
                        当前没有触发持仓提醒。
                        {opened.length
                          ? "继续按计划观察。"
                          : "先录入资金和持仓，或从公开市场开始模拟。"}
                      </p>
                    )}
                    <small>
                      仅在产品运行时更新并在页面展示，提醒不会自动平仓。
                    </small>
                  </div>
                )}
                {positionsTable(page === "Today" ? opened : data.positions)}
              </section>
            </>
          )}
          {page === "Portfolio" && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>我的资金与费率</h2>
                  <p>
                    首次录入交易前总资金；后续用入金、出金记账，避免重复加余额。
                  </p>
                </div>
                <button
                  className="primary compact"
                  onClick={() => setDialog({ type: "flow" })}
                >
                  <Plus size={14} />
                  录入资金
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>交易所</th>
                      <th>可用账面资金</th>
                      <th>配置 Taker 费率</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((a: any) => (
                      <tr key={a.venue}>
                        <td>{a.venue}</td>
                        <td>{money(a.cashUsd)}</td>
                        <td>
                          {a.feeBps === null
                            ? "未配置（模拟使用保守默认值）"
                            : Object.entries(a.feeBps)
                                .map(([kind, rate]) => `${kind}: ${rate} bps`)
                                .join(" / ")}
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() =>
                              setDialog({ type: "fee", account: a })
                            }
                          >
                            编辑费率
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="personal-footnote">
                模拟衍生品按单腿全名义金额预留本金，不使用杠杆。手动衍生品由你填写占用保证金；系统暂不推断强平价。手动记账中的实际手续费始终以成交录入为准。
              </p>
            </section>
          )}
          {page === "Performance" && (
            <>
              <section className="panel">
                <div className="panel-title">
                  <h2>收益构成</h2>
                  <span className="tag">
                    {mode === "PAPER"
                      ? "模拟结果"
                      : "本人录入 · 未经交易所核对"}
                  </span>
                </div>
                <div className="personal-stats">
                  <Stat
                    label="已实现价差损益"
                    value={data.realizedPricePnlUsd}
                  />
                  <Stat label="已入账资金费" value={data.fundingUsd} />
                  <Stat label="累计手续费" value={data.feesUsd} />
                  <Stat label="总损益（含未实现）" value={data.totalPnlUsd} />
                </div>
                <p className="personal-footnote">
                  净入金 {money(data.netContributionsUsd)} · 账本恒等式差额{" "}
                  {money(data.reconciliationDifferenceUsd)}
                  。入金和出金不计收益。资金费待补齐或估值缺失时，当前结果不完整。恒等式吻合仅证明内部计算一致，不代表交易所对账。
                </p>
              </section>
              <section className="panel">
                <div className="panel-title">
                  <h2>净值记录</h2>
                  <span>按当时已录入记录采样</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>记录时间</th>
                        <th>参考净值</th>
                        <th>净入金</th>
                        <th>累计损益</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.nav
                        .slice(-20)
                        .reverse()
                        .map((n: any) => (
                          <tr key={n.at}>
                            <td>{date(n.at)}</td>
                            <td>{money(n.equityUsd)}</td>
                            <td>{money(n.netContributionsUsd)}</td>
                            <td>
                              {money(
                                n.equityUsd === null
                                  ? null
                                  : n.equityUsd - n.netContributionsUsd,
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {(page === "Performance" || page === "Portfolio") && (
            <section className="panel">
              <div className="panel-title">
                <h2>记账流水</h2>
                <span>{data.entries.length} 条</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型 / 交易所</th>
                      <th>现金变动</th>
                      <th>价差损益</th>
                      <th>手续费</th>
                      <th>资金费</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.slice(0, 100).map((e: any) => (
                      <tr key={e.id}>
                        <td>{date(e.at)}</td>
                        <td>
                          {{
                            DEPOSIT: "入金",
                            WITHDRAWAL: "出金",
                            OPEN: "建仓",
                            CLOSE: "平仓",
                            FUNDING: "资金费",
                            FEE: "费用",
                          }[e.type as string] ?? e.type}
                          <small className="market-sub">{e.venue}</small>
                        </td>
                        <td>{money(e.cashDeltaUsd)}</td>
                        <td>{money(e.realizedPricePnlUsd)}</td>
                        <td>{money(e.feeUsd)}</td>
                        <td>{money(e.fundingUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.entries.length && (
                  <div className="empty">暂无流水；个人账本初始为空。</div>
                )}
              </div>
            </section>
          )}
        </>
      )}
      {dialog && (
        <div className="overlay">
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="个人账本操作"
            className="modal wide personal-modal"
          >
            <div className="modal-head">
              <h2>
                {
                  {
                    flow: "录入资金变动",
                    fee: "配置模拟参考费率",
                    manual: "录入已经发生的成交",
                    paper: "确认真实行情模拟",
                    close:
                      mode === "PAPER" ? "确认模拟平仓" : "录入实际平仓成交",
                    cashflow: "录入实际资金费或费用",
                    risk: "持仓提醒阈值",
                  }[dialog.type as string]
                }
              </h2>
              <button
                className="icon-button"
                aria-label="关闭个人操作"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                <X size={18} />
              </button>
            </div>
            {error && (
              <div role="alert" className="error-banner">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                let url = "",
                  body: any = { mode };
                if (dialog.type === "flow") {
                  url = "/api/personal/flows";
                  body = {
                    ...body,
                    venue: f.get("venue"),
                    type: f.get("type"),
                    amountUsd: numeric(f, "amount"),
                    note: f.get("note"),
                  };
                }
                if (dialog.type === "fee") {
                  url = "/api/personal/fees";
                  body = {
                    ...body,
                    venue: dialog.account.venue,
                    takerBps: numeric(f, "fee"),
                    kind: f.get("kind"),
                  };
                }
                if (dialog.type === "paper") {
                  url = "/api/personal/open";
                  body = {
                    mode: "PAPER",
                    candidateId: dialog.candidateId,
                    sizeUsd: numeric(f, "size"),
                    acknowledgeResearch: f.get("ack") === "on",
                    ...readRisk(f),
                  };
                }
                if (dialog.type === "manual") {
                  url = "/api/personal/open";
                  body = {
                    mode: "MANUAL",
                    at: new Date(String(f.get("at"))).getTime(),
                    title: f.get("title"),
                    ...readRisk(f),
                    legs: Array.from({ length: legCount }, (_, n) => ({
                      instrumentId: f.get(`i${n}`),
                      side: f.get(`side${n}`),
                      quantity: numeric(f, `q${n}`),
                      price: numeric(f, `${n}price`),
                      quoteUsd: numeric(f, `${n}fx`),
                      feeUsd: numeric(f, `${n}fee`),
                      collateralUsd: numeric(f, `capital${n}`),
                    })),
                  };
                }
                if (dialog.type === "close") {
                  url = `/api/personal/positions/${dialog.position.id}/close`;
                  body =
                    mode === "PAPER"
                      ? {}
                      : {
                          at: new Date(String(f.get("at"))).getTime(),
                          fills: dialog.position.legs
                            .filter((l: any) => l.remaining > 0)
                            .map((l: any, n: number) => ({
                              legId: l.id,
                              price: numeric(f, `${n}price`),
                              quoteUsd: numeric(f, `${n}fx`),
                              feeUsd: numeric(f, `${n}fee`),
                            })),
                        };
                }
                if (dialog.type === "risk") {
                  url = `/api/personal/positions/${dialog.position.id}/risk`;
                  body = readRisk(f);
                }
                if (dialog.type === "cashflow") {
                  url = `/api/personal/positions/${dialog.position.id}/cashflows`;
                  body = {
                    type: f.get("type"),
                    legId: f.get("leg"),
                    amountUsd: numeric(f, "amount"),
                    reference: f.get("reference"),
                    at: new Date(String(f.get("at"))).getTime(),
                  };
                }
                void command(url, body);
              }}
            >
              {dialog.type === "flow" && (
                <>
                  <div className="personal-form-grid">
                    <Field label="交易所">
                      <select name="venue">
                        {venues.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="类型">
                      <select name="type">
                        <option value="DEPOSIT">入金 / 初始资金</option>
                        <option value="WITHDRAWAL">出金</option>
                      </select>
                    </Field>
                    <Field label="金额 USD">
                      <input
                        name="amount"
                        type="number"
                        min="0.000001"
                        step="any"
                        required
                      />
                    </Field>
                  </div>
                  <Field label="备注">
                    <input name="note" maxLength={200} />
                  </Field>
                  <p>
                    这是{mode === "PAPER" ? "模拟资金" : "手动资金账本"}
                    记录，不会发生转账。已有持仓请先按成交前总资金初始化，再录入成交。
                  </p>
                </>
              )}
              {dialog.type === "fee" && (
                <>
                  <Field label="费率适用市场">
                    <select name="kind">
                      <option value="SPOT">现货</option>
                      <option value="PERPETUAL">永续</option>
                      <option value="FUTURE">交割</option>
                    </select>
                  </Field>
                  <Field
                    label={`${dialog.account.venue} Taker 费率（bps，10 bps = 0.1%）`}
                  >
                    <input
                      name="fee"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      defaultValue={dialog.account.feeBps?.SPOT ?? 10}
                      required
                    />
                  </Field>
                </>
              )}
              {dialog.type === "paper" && (
                <>
                  <p>
                    双腿按提交时的新鲜盘口全部模拟成交。每腿均预留全名义本金，开仓手续费即时扣账；任一腿不满足深度或资金要求，整笔不会写入。
                  </p>
                  <Field label="参考交易规模 USD（两腿分别占用本金）">
                    <input
                      name="size"
                      type="number"
                      min="1"
                      step="any"
                      defaultValue={dialog.sizeUsd ?? 1000}
                      required
                    />
                  </Field>
                  {riskFields}
                  <label className="personal-check">
                    <input type="checkbox" name="ack" required />
                    我理解这是研究模拟，可能模拟净收益为负的候选，既不代表策略合格，也不执行真实交易。
                  </label>
                </>
              )}
              {dialog.type === "manual" && (
                <>
                  <Field label="持仓名称">
                    <input
                      name="title"
                      maxLength={120}
                      required
                      placeholder="例如 BTC 现货与永续对冲"
                    />
                  </Field>
                  <Field label="实际成交时间">
                    <input name="at" type="datetime-local" required />
                  </Field>
                  <Field label="交易腿数">
                    <select
                      value={legCount}
                      onChange={(e) => setLegCount(Number(e.target.value))}
                    >
                      <option value="1">一条腿</option>
                      <option value="2">两条腿</option>
                    </select>
                  </Field>
                  {!instruments.length && (
                    <p className="error-banner">
                      请先在“机会”连接公开市场，取得合约规格。
                    </p>
                  )}
                  {Array.from({ length: legCount }, (_, n) => (
                    <fieldset key={n}>
                      <legend>第 {n + 1} 条腿</legend>
                      <div className="personal-form-grid">
                        <Field label="市场工具">
                          <select name={`i${n}`} required>
                            <option value="">请选择</option>
                            {instruments.map((i: any) => (
                              <option key={i.id} value={i.id}>
                                {i.venue} · {i.symbol} · {i.kind}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="方向">
                          <select name={`side${n}`}>
                            <option value="BUY">买入 / 做多</option>
                            <option value="SELL">做空衍生品</option>
                          </select>
                        </Field>
                        <Field label="基础币数量（不是合约张数）">
                          <input
                            name={`q${n}`}
                            type="number"
                            min="0.00000001"
                            step="any"
                            required
                          />
                        </Field>
                      </div>
                      {fillFields(String(n))}
                      <Field label="衍生品实际占用保证金 USD（现货自动按成交金额计算）">
                        <input
                          name={`capital${n}`}
                          type="number"
                          min="0"
                          step="any"
                          defaultValue={0}
                        />
                      </Field>
                    </fieldset>
                  ))}
                  {riskFields}
                  <p>
                    每次录入代表一批已成交数量。部分成交可分批建立记录；平仓操作会关闭该批全部剩余数量。
                  </p>
                </>
              )}
              {dialog.type === "close" && (
                <>
                  <p>{dialog.position.title}</p>
                  {mode === "PAPER" ? (
                    <p>
                      按当前退出侧盘口模拟双腿成交。行情过期或深度不足时拒绝整笔平仓，待刷新后重试。
                    </p>
                  ) : (
                    <>
                      <Field label="实际平仓时间">
                        <input name="at" type="datetime-local" required />
                      </Field>
                      {dialog.position.legs
                        .filter((l: any) => l.remaining > 0)
                        .map((l: any, n: number) => (
                          <fieldset key={l.id}>
                            <legend>
                              {l.instrument.venue} {l.instrument.symbol} · 平掉{" "}
                              {l.remaining} 基础币
                            </legend>
                            {fillFields(String(n), l)}
                          </fieldset>
                        ))}
                    </>
                  )}
                </>
              )}
              {dialog.type === "risk" && (
                <>
                  {riskFields}
                  <p>
                    达到阈值仅在今日和持仓页面提示；不会自动平仓。阈值基于含已入账费用与资金费的持仓总损益。
                  </p>
                </>
              )}
              {dialog.type === "cashflow" && (
                <>
                  <Field label="交易腿">
                    <select name="leg">
                      {dialog.position.legs.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          {l.instrument.venue} {l.instrument.symbol}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="personal-form-grid">
                    <Field label="类型">
                      <select name="type">
                        <option value="FUNDING">资金费</option>
                        <option value="FEE">补录费用</option>
                      </select>
                    </Field>
                    <Field label="金额 USD（资金费收正付负；费用填正数）">
                      <input name="amount" type="number" step="any" required />
                    </Field>
                    <Field label="发生时间">
                      <input name="at" type="datetime-local" required />
                    </Field>
                  </div>
                  <Field label="交易所流水编号（防重复）">
                    <input name="reference" required maxLength={120} />
                  </Field>
                </>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="outline"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  取消
                </button>
                <button className="primary" disabled={busy} type="submit">
                  {busy
                    ? "处理中…"
                    : dialog.type === "paper"
                      ? "确认模拟建仓"
                      : "确认记录"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
