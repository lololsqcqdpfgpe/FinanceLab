import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, TimeScale);

type ApiData = {
  error?: string;

  symbol?: string;
  name?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  country?: string;
  description?: string;

  price?: number | null;
  marketCap?: number | null;
  volume?: number | null;
  dayLow?: number | null;
  dayHigh?: number | null;
  yearLow?: number | null;
  yearHigh?: number | null;

  period?: string | null;
  revenue?: number | null;
  ebitda?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;

  totalDebt?: number | null;
  cashAndCashEquivalents?: number | null;
  totalEquity?: number | null;

  operatingCashFlow?: number | null;
  capitalExpenditure?: number | null;
  freeCashFlow?: number | null;

  pe?: number | null;
  eps?: number | null;
  pb?: number | null;
  ps?: number | null;
  roe?: number | null;
  roa?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
};

type NewsItem = { title: string; url: string; site: string; date: string };
type PricePoint = { date: string; close: number; volume?: number };
type Tone = "green" | "orange" | "red";

function isNumber(x: any): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function fmtNumber(x: any) {
  if (!isNumber(x)) return "—";
  return x.toLocaleString("fr-FR");
}

function fmtMoneyCompact(x: any) {
  if (!isNumber(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1e12) return (x / 1e12).toFixed(2).replace(".", ",") + " T";
  if (abs >= 1e9) return (x / 1e9).toFixed(2).replace(".", ",") + " Md";
  if (abs >= 1e6) return (x / 1e6).toFixed(2).replace(".", ",") + " M";
  return x.toLocaleString("fr-FR");
}

function fmtPct(x: any) {
  if (!isNumber(x)) return "—";
  return (x * 100).toFixed(2).replace(".", ",") + "%";
}

function fmtSignedPct(x: any) {
  if (!isNumber(x)) return "—";
  const v = x * 100;
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(2).replace(".", ",") + "%";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------ Notions ------------------------ */
const DEFINITIONS: Record<
  string,
  { title: string; desc: string; how: string; warning?: string; short?: string }
> = {
  revenue: {
    title: "Chiffre d’affaires",
    desc: "Total des ventes sur la période. Indicateur de taille et de dynamique commerciale.",
    how: "À analyser avec les marges : CA en hausse mais marges en baisse = pression concurrentielle / coûts.",
    short: "Total des ventes sur la période.",
  },
  ebitda: {
    title: "EBITDA",
    desc: "Performance opérationnelle avant intérêts, impôts et amortissements.",
    how: "Souvent comparé à la dette (Dette nette / EBITDA). Plus le ratio est haut, plus le risque financier augmente.",
    short: "Performance opé (avant I/IS/D&A).",
  },
  operatingIncome: {
    title: "Résultat opérationnel",
    desc: "Profit du cœur de métier (avant intérêts et impôts).",
    how: "Mesure la rentabilité de l’activité principale indépendamment de la structure financière.",
    short: "Profit du cœur de métier.",
  },
  netIncome: {
    title: "Résultat net",
    desc: "Bénéfice final après toutes charges.",
    how: "À comparer au CA (marge nette) et à la stabilité sur plusieurs années.",
    short: "Bénéfice final (après tout).",
  },
  totalDebt: {
    title: "Dette totale",
    desc: "Ensemble des dettes financières.",
    how: "Dette nette = dette - cash ; puis Dette nette / EBITDA : <2 sain, 2–4 à surveiller, >4 risqué.",
    short: "Dettes financières totales.",
  },
  cashAndCashEquivalents: {
    title: "Cash",
    desc: "Liquidités disponibles.",
    how: "Un cash élevé réduit le risque et augmente la flexibilité financière.",
    short: "Liquidités disponibles.",
  },
  freeCashFlow: {
    title: "Free Cash Flow",
    desc: "Cash généré après investissements (Capex).",
    how: "FCF positif et régulier = capacité à investir, rembourser, distribuer.",
    warning: "FCF négatif durable peut signaler une entreprise qui consomme du cash.",
    short: "Cash dispo après capex.",
  },
};

/* ------------------------ UI ------------------------ */
function Dot({ tone }: { tone: Tone }) {
  return <span className={`fl-dot ${tone}`} />;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="fl-card"
      style={{
        transition: "transform 180ms ease, box-shadow 180ms ease",
      }}
    >
      <div className="fl-card-header">
        <div className="fl-card-title">{title}</div>
      </div>
      <div className="fl-card-body">{children}</div>
    </section>
  );
}

function Field({ label, value, sub }: { label: React.ReactNode; value: string; sub?: string }) {
  return (
    <div className="fl-field">
      <div className="fl-field-label">{label}</div>
      <div className="fl-field-value">{value}</div>
      {sub ? <div className="fl-field-sub">{sub}</div> : null}
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const active = router.pathname === href;
  return (
    <Link href={href} className={`fl-nav-link ${active ? "is-active" : ""}`}>
      {label}
    </Link>
  );
}

function InfoTip({ k, onOpen }: { k: keyof typeof DEFINITIONS; onOpen: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const d = DEFINITIONS[k];

  return (
    <span className="fl-info" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 950 }}>{d.title}</span>

      <span
        className="fl-info-icon"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onTouchStart={() => setOpen((v) => !v)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen(k);
        }}
        role="button"
        tabIndex={0}
        aria-label={`Info: ${d.title}`}
        title="Survol = aperçu · Clic = détail"
        style={{
          cursor: "pointer",
          transform: open ? "translateY(-1px)" : "translateY(0)",
          transition: "transform 150ms ease",
        }}
      >
        i
      </span>

      {open && (
        <span className="fl-tooltip" style={{ animation: "flFadeIn 140ms ease" as any }}>
          <span className="fl-tooltip-title">{d.title}</span>
          <span className="fl-tooltip-text">{d.short ?? d.desc}</span>
          <span className="fl-tooltip-hint">Clic pour le détail</span>
        </span>
      )}
    </span>
  );
}

/* ------------------------ Scoring ------------------------ */
function scoreFromData(d: ApiData) {
  const reasonsGood: string[] = [];
  const reasonsWatch: string[] = [];
  const reasonsBad: string[] = [];

  const netDebt =
    isNumber(d.totalDebt) && isNumber(d.cashAndCashEquivalents)
      ? d.totalDebt - d.cashAndCashEquivalents
      : null;

  const ndEbitda =
    isNumber(netDebt) && isNumber(d.ebitda) && d.ebitda !== 0 ? netDebt / d.ebitda : null;

  if (ndEbitda === null) reasonsWatch.push("Endettement : données insuffisantes pour juger correctement.");
  else if (ndEbitda < 2) reasonsGood.push(`Endettement sain (Dette nette/EBITDA ≈ ${ndEbitda.toFixed(2)}).`);
  else if (ndEbitda < 4) reasonsWatch.push(`Endettement à surveiller (Dette nette/EBITDA ≈ ${ndEbitda.toFixed(2)}).`);
  else reasonsBad.push(`Endettement élevé (Dette nette/EBITDA ≈ ${ndEbitda.toFixed(2)}).`);

  if (!isNumber(d.freeCashFlow)) reasonsWatch.push("Cash : Free Cash Flow indisponible.");
  else if (d.freeCashFlow > 0) reasonsGood.push("Cash : Free Cash Flow positif (entreprise génératrice de cash).");
  else reasonsBad.push("Cash : Free Cash Flow négatif (consommation de cash).");

  if (isNumber(d.netMargin)) {
    if (d.netMargin >= 0.10) reasonsGood.push(`Rentabilité : marge nette solide (${(d.netMargin * 100).toFixed(1)}%).`);
    else if (d.netMargin >= 0.03) reasonsWatch.push(`Rentabilité : marge nette moyenne (${(d.netMargin * 100).toFixed(1)}%).`);
    else reasonsBad.push(`Rentabilité : marge nette faible (${(d.netMargin * 100).toFixed(1)}%).`);
  } else {
    reasonsWatch.push("Rentabilité : marge nette indisponible.");
  }

  if (isNumber(d.roe)) {
    if (d.roe >= 0.12) reasonsGood.push(`Efficacité : ROE solide (${(d.roe * 100).toFixed(1)}%).`);
    else if (d.roe >= 0.06) reasonsWatch.push(`Efficacité : ROE correct (${(d.roe * 100).toFixed(1)}%).`);
    else reasonsBad.push(`Efficacité : ROE faible (${(d.roe * 100).toFixed(1)}%).`);
  }

  if (isNumber(d.pe)) {
    if (d.pe <= 15) reasonsGood.push(`Valorisation : PER raisonnable (${d.pe.toFixed(1)}).`);
    else if (d.pe <= 30) reasonsWatch.push(`Valorisation : PER élevé (${d.pe.toFixed(1)}), dépend de la croissance.`);
    else reasonsBad.push(`Valorisation : PER très élevé (${d.pe.toFixed(1)}), risque de survalorisation.`);
  } else {
    reasonsWatch.push("Valorisation : PER indisponible.");
  }

  const bad = reasonsBad.length;
  const good = reasonsGood.length;

  let tone: Tone = "orange";
  let verdict = "Mitigée (à analyser)";
  if (bad >= 2) {
    tone = "red";
    verdict = "À éviter (profil risqué)";
  } else if (bad === 0 && good >= 3) {
    tone = "green";
    verdict = "Intéressante (profil solide)";
  } else {
    tone = "orange";
    verdict = "Mitigée (points à vérifier)";
  }

  return { tone, verdict, reasonsGood, reasonsWatch, reasonsBad, netDebt, ndEbitda };
}

/* ------------------------ Graph helpers ------------------------ */
function fmtPriceEuroLike(x: number) {
  return x.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function calcPerf(points: PricePoint[]) {
  if (!points || points.length < 2) return null;
  const first = points[0]?.close;
  const last = points[points.length - 1]?.close;
  if (!isNumber(first) || !isNumber(last) || first === 0) return null;
  return (last - first) / first;
}

function extractErrMessage(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload?.error === "string") return payload.error;
  if (typeof payload?.message === "string") return payload.message;
  return null;
}

function toneFromPerf(perf: number | null): Tone {
  if (perf == null) return "orange";
  if (perf > 0.08) return "green";
  if (perf < -0.08) return "red";
  return "orange";
}

function toneFromPe(pe: number | null | undefined): Tone {
  if (!isNumber(pe)) return "orange";
  if (pe <= 15) return "green";
  if (pe <= 30) return "orange";
  return "red";
}

function toneFromMargin(m: number | null | undefined): Tone {
  if (!isNumber(m)) return "orange";
  if (m >= 0.10) return "green";
  if (m >= 0.03) return "orange";
  return "red";
}

function toneFromFCF(fcf: number | null | undefined): Tone {
  if (!isNumber(fcf)) return "orange";
  return fcf > 0 ? "green" : "red";
}

const LS_RECENTS = "mfl_recents_v1";

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [range, setRange] = useState<"1m" | "3m" | "6m" | "1y">("6m");
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [recents, setRecents] = useState<string[]>([]);
  const [autoMode, setAutoMode] = useState(true); // auto-search soft (debounce)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canSearch = useMemo(() => symbol.trim().length >= 1, [symbol]);

  // Load recents
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RECENTS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecents(arr.filter((x) => typeof x === "string").slice(0, 8));
      }
    } catch { }
  }, []);

  const saveRecent = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setRecents((prev) => {
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 8);
      try {
        localStorage.setItem(LS_RECENTS, JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  // Keyboard shortcuts (Cmd/Ctrl+K focus, Esc close modal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      if (e.key === "Escape") {
        setOpenKey(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchData = async (forcedSymbol?: string) => {
    const sym = (forcedSymbol ?? symbol).trim();
    if (!sym) return;

    setLoading(true);
    setData(null);
    setNews([]);
    setHistory([]);
    setHistoryError(null);
    setHistoryLoading(true);
    setNewsLoading(true);

    try {
      saveRecent(sym);

      // 1) Financials
      const res = await fetch(`/api/financials?symbol=${encodeURIComponent(sym)}`);
      const json = (await res.json()) as ApiData;
      setData(json);

      // 2) News
      const newsRes = await fetch(`/api/news?symbol=${encodeURIComponent(sym)}`);
      const newsJson = await newsRes.json();
      setNews(Array.isArray(newsJson.articles) ? newsJson.articles : []);
      setNewsLoading(false);

      // 3) History (graph)
      const histRes = await fetch(
        `/api/history?symbol=${encodeURIComponent(sym)}&range=${encodeURIComponent(range)}`
      );
      const histJson = await histRes.json();

      if (!histRes.ok) {
        setHistory([]);
        setHistoryError(extractErrMessage(histJson) ?? "Impossible de charger l’historique.");
      } else {
        setHistory(Array.isArray(histJson.points) ? histJson.points : []);
        setHistoryError(null);
      }
    } catch {
      setData({ error: "Erreur réseau (impossible de joindre l’API)." });
      setHistory([]);
      setHistoryError("Erreur réseau sur l’historique.");
    } finally {
      setLoading(false);
      setHistoryLoading(false);
      setNewsLoading(false);
      setLastFetchAt(Date.now());

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") fetchData();
  };

  // Auto-mode debounce (soft)
  useEffect(() => {
    if (!autoMode) return;
    const s = symbol.trim();
    if (!s) return;

    // évite auto-fetch au premier render trop agressif
    const t = setTimeout(() => {
      // auto seulement si utilisateur a vraiment modifié depuis dernière requête
      // (simple : si ça fait >800ms qu'il tape)
      fetchData(s);
    }, 900);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, autoMode]);

  const headerTitle = data?.name ? data.name : "MyFinanceLab";
  const headerSub =
    data?.symbol && !data?.error
      ? `${data.symbol}${data.exchange ? " · " + data.exchange : ""}${data.sector ? " · " + data.sector : ""}`
      : "Analyse fondamentale claire et rapide";

  const synth = data && !data.error ? scoreFromData(data) : null;

  const perf = calcPerf(history);
  const perfTone = toneFromPerf(perf);

  const chartData = useMemo(() => {
    const labels = history.map((p) => p.date);
    const values = history.map((p) => p.close);
    return {
      labels,
      datasets: [
        {
          label: "Prix",
          data: values,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          borderColor: "rgba(120,170,255,1)",
          backgroundColor: "rgba(120,170,255,0.14)",
        },
      ],
    };
  }, [history]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          intersect: false,
          mode: "index" as const,
          backgroundColor: "rgba(12,16,32,0.92)",
          borderColor: "rgba(255,255,255,0.10)",
          borderWidth: 1,
          titleColor: "rgba(234,240,255,0.95)",
          bodyColor: "rgba(234,240,255,0.90)",
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items: any) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return history[idx]?.date ?? "";
            },
            label: (item: any) => `Prix : ${fmtPriceEuroLike(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: {
          display: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "rgba(234,240,255,0.70)",
            callback: (v: any) => fmtPriceEuroLike(Number(v)),
          },
        },
      },
    };
  }, [history]);

  const onChangeRange = async (r: "1m" | "3m" | "6m" | "1y") => {
    setRange(r);
    if (!symbol.trim()) return;

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const histRes = await fetch(
        `/api/history?symbol=${encodeURIComponent(symbol.trim())}&range=${encodeURIComponent(r)}`
      );
      const histJson = await histRes.json();

      if (!histRes.ok) {
        setHistory([]);
        setHistoryError(extractErrMessage(histJson) ?? "Impossible de charger l’historique.");
      } else {
        setHistory(Array.isArray(histJson.points) ? histJson.points : []);
        setHistoryError(null);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  // Tones (Key insights)
  const peTone = toneFromPe(data?.pe);
  const fcfTone = toneFromFCF(data?.freeCashFlow);
  const marginTone = toneFromMargin(data?.netMargin);

  const ndTone: Tone =
    synth?.ndEbitda == null ? "orange" : synth.ndEbitda < 2 ? "green" : synth.ndEbitda < 4 ? "orange" : "red";

  const lastFetchLabel =
    lastFetchAt == null ? "—" : new Date(lastFetchAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* tiny animation helper (safe inline) */}
      <style>{`
        @keyframes flFadeIn { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>

      <div className="fl-bg-glow" />
      <div className="fl-container">
        {/* Topbar */}
        <div className="fl-topbar fl-glass">
          <div className="fl-brand">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src="/logo.png"
                alt="MyFinanceLab"
                style={{ width: 34, height: 34, borderRadius: 10, objectFit: "contain" }}
              />
              <div>
                <div className="fl-brand-title">{headerTitle}</div>
                <div className="fl-brand-sub">{headerSub}</div>
              </div>
            </div>
          </div>

          <div className="fl-nav">
            <NavLink href="/" label="Dashboard" />
            <NavLink href="/concept" label="Concept" />
            <NavLink href="/community" label="Notes" />
          </div>

          <div className="fl-pill" title="Dernière mise à jour (client)">
            <Dot tone="green" />
            <span>Local</span>
            <span style={{ opacity: 0.7, marginLeft: 8 }}>· {lastFetchLabel}</span>
          </div>
        </div>

        {/* Hero */}
        <div className="fl-hero fl-glass">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h1 className="fl-h1" style={{ marginBottom: 6 }}>
                Recherche d’entreprise
              </h1>
              <p className="fl-lead" style={{ marginTop: 0 }}>
                Tape un <strong>ticker</strong> (ex : <code className="fl-code">AAPL</code>,{" "}
                <code className="fl-code">MSFT</code>, <code className="fl-code">AIR.PA</code>) puis lance la recherche.
              </p>
            </div>

            {/* mini controls */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div className="fl-pill" title="Raccourci clavier">
                <span style={{ fontWeight: 900 }}>⌘/Ctrl</span>
                <span style={{ opacity: 0.85, marginLeft: 6 }}>K</span>
              </div>

              <button
                className="fl-btn secondary"
                onClick={() => setAutoMode((v) => !v)}
                title="Auto = lance une recherche après ~1s d’inactivité pendant la saisie"
                style={{ opacity: 0.98 }}
              >
                {autoMode ? "Auto: ON" : "Auto: OFF"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <Link href="/concept" className="fl-btn secondary">
              Voir le concept
            </Link>
            <Link href="/community" className="fl-btn secondary">
              Aller aux notes
            </Link>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
            <div className="fl-input-wrap" style={{ flex: "1 1 320px" }}>
              <div className="fl-input-label" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>Ticker</span>
                <span style={{ opacity: 0.65, fontSize: 12 }}>Entrée = lancer · ⌘/Ctrl+K = focus</span>
              </div>

              <input
                ref={inputRef}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={onKeyDown}
                placeholder="Ex: AAPL"
                className="fl-input"
                style={{
                  transition: "transform 160ms ease, box-shadow 160ms ease",
                }}
              />
              <div className="fl-input-hint">
                Astuce : mets <strong>.PA</strong> pour Euronext Paris (ex : <code className="fl-code">AIR.PA</code>)
              </div>
            </div>

            <button className="fl-btn" onClick={() => fetchData()} disabled={!canSearch || loading}>
              {loading ? "Chargement…" : "Rechercher"}
            </button>
          </div>

          {/* Quick picks */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
            {["AAPL", "MSFT", "NVDA", "TSLA", "AIR.PA"].map((s) => (
              <button
                key={s}
                className="fl-btn secondary"
                onClick={() => {
                  setSymbol(s);
                  setTimeout(() => fetchData(s), 0);
                }}
              >
                {s}
              </button>
            ))}

            {recents.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 6 }}>Récents :</span>
                {recents.map((s) => (
                  <button
                    key={s}
                    className="fl-btn secondary"
                    onClick={() => {
                      setSymbol(s);
                      setTimeout(() => fetchData(s), 0);
                    }}
                    title="Relancer"
                    style={{ opacity: 0.98 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Errors */}
        {data?.error && (
          <div className="fl-alert" ref={resultsRef} style={{ animation: "flFadeIn 160ms ease" as any }}>
            <div className="fl-alert-title">Erreur</div>
            <div className="fl-alert-text">{data.error}</div>
            <div className="fl-alert-tip">Si tu vois “429 / quota”, c’est juste tes crédits API.</div>
          </div>
        )}

        {/* Empty */}
        {!data && !loading && (
          <div className="fl-empty" ref={resultsRef} style={{ animation: "flFadeIn 160ms ease" as any }}>
            <div className="fl-empty-title">Aucune donnée affichée</div>
            <div className="fl-empty-text">Saisis un ticker et lance la recherche.</div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="fl-grid" ref={resultsRef}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="fl-card">
                <div className="fl-card-header">
                  <div className="fl-card-title">
                    <div className="fl-skeleton" style={{ height: 18, width: 160 }} />
                  </div>
                </div>
                <div className="fl-card-body">
                  <div className="fl-fields">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div key={j} className="fl-skeleton" style={{ height: 78, borderRadius: 14 }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {data && !data.error && synth && (
          <div className="fl-grid" ref={resultsRef} style={{ animation: "flFadeIn 200ms ease" as any }}>
            {/* KEY INSIGHTS */}
            <div className="fl-card" style={{ gridColumn: "span 12" }}>
              <div
                className="fl-card-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div className="fl-card-title">Key insights</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  Résumé visuel · {data.symbol ?? "—"} · Range {range.toUpperCase()}
                </div>
              </div>

              <div className="fl-card-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="fl-pill" title="PER (valorisation)">
                  <Dot tone={peTone} />
                  <span style={{ fontWeight: 900 }}>PER</span>
                  <span style={{ opacity: 0.85, marginLeft: 8 }}>{data.pe == null ? "—" : data.pe.toFixed(1)}</span>
                </div>

                <div className="fl-pill" title="Dette nette / EBITDA (risque)">
                  <Dot tone={ndTone} />
                  <span style={{ fontWeight: 900 }}>DN/EBITDA</span>
                  <span style={{ opacity: 0.85, marginLeft: 8 }}>
                    {synth.ndEbitda == null ? "—" : synth.ndEbitda.toFixed(2)}
                  </span>
                </div>

                <div className="fl-pill" title="Free Cash Flow">
                  <Dot tone={fcfTone} />
                  <span style={{ fontWeight: 900 }}>FCF</span>
                  <span style={{ opacity: 0.85, marginLeft: 8 }}>{fmtMoneyCompact(data.freeCashFlow)}</span>
                </div>

                <div className="fl-pill" title="Marge nette">
                  <Dot tone={marginTone} />
                  <span style={{ fontWeight: 900 }}>Marge nette</span>
                  <span style={{ opacity: 0.85, marginLeft: 8 }}>{fmtSignedPct(data.netMargin)}</span>
                </div>

                <div className="fl-pill" title="Performance sur la période sélectionnée">
                  <Dot tone={perfTone} />
                  <span style={{ fontWeight: 900 }}>Perf</span>
                  <span style={{ opacity: 0.85, marginLeft: 8 }}>
                    {perf == null ? "—" : fmtSignedPct(perf)}
                  </span>
                </div>
              </div>
            </div>

            {/* SYNTHÈSE */}
            <div className="fl-card" style={{ gridColumn: "span 12" }}>
              <div
                className="fl-card-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div className="fl-card-title">Synthèse (automatique)</div>
                <div className="fl-pill">
                  <Dot tone={synth.tone} />
                  <span style={{ fontWeight: 900 }}>{synth.verdict}</span>
                </div>
              </div>

              <div className="fl-card-body" style={{ display: "grid", gap: 12 }}>
                <div style={{ opacity: 0.85 }}>
                  Cette synthèse se base sur l’endettement, la génération de cash, la rentabilité et la valorisation (si disponible).
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {synth.reasonsGood.length > 0 && (
                    <div className="fl-field" style={{ borderColor: "rgba(34,197,94,0.25)" }}>
                      <div className="fl-field-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Dot tone="green" /> Points forts
                      </div>
                      <div style={{ display: "grid", gap: 6, marginTop: 8, opacity: 0.92 }}>
                        {synth.reasonsGood.map((r, idx) => (
                          <div key={idx}>• {r}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {synth.reasonsWatch.length > 0 && (
                    <div className="fl-field" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
                      <div className="fl-field-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Dot tone="orange" /> À surveiller
                      </div>
                      <div style={{ display: "grid", gap: 6, marginTop: 8, opacity: 0.92 }}>
                        {synth.reasonsWatch.map((r, idx) => (
                          <div key={idx}>• {r}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {synth.reasonsBad.length > 0 && (
                    <div className="fl-field" style={{ borderColor: "rgba(239,68,68,0.25)" }}>
                      <div className="fl-field-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Dot tone="red" /> Points bloquants
                      </div>
                      <div style={{ display: "grid", gap: 6, marginTop: 8, opacity: 0.92 }}>
                        {synth.reasonsBad.map((r, idx) => (
                          <div key={idx}>• {r}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GRAPH */}
            <div className="fl-card" style={{ gridColumn: "span 12" }}>
              <div
                className="fl-card-header"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div className="fl-card-title">Prix (graphique)</div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="fl-pill" title="Performance sur la période sélectionnée">
                    <Dot tone={perfTone} />
                    <span style={{ fontWeight: 900 }}>
                      {perf == null ? "Performance —" : `Performance ${(perf * 100).toFixed(2).replace(".", ",")}%`}
                    </span>
                  </div>

                  <button className="fl-btn secondary" onClick={() => onChangeRange("1m")} disabled={historyLoading}>
                    1M
                  </button>
                  <button className="fl-btn secondary" onClick={() => onChangeRange("3m")} disabled={historyLoading}>
                    3M
                  </button>
                  <button className="fl-btn secondary" onClick={() => onChangeRange("6m")} disabled={historyLoading}>
                    6M
                  </button>
                  <button className="fl-btn secondary" onClick={() => onChangeRange("1y")} disabled={historyLoading}>
                    1Y
                  </button>
                </div>
              </div>

              <div className="fl-card-body">
                <div style={{ height: 280 }}>
                  {historyLoading ? (
                    <div className="fl-skeleton" style={{ height: 280, borderRadius: 16 }} />
                  ) : historyError ? (
                    <div style={{ opacity: 0.8 }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Graph indisponible</div>
                      <div style={{ opacity: 0.8 }}>{historyError}</div>
                    </div>
                  ) : history.length === 0 ? (
                    <div style={{ opacity: 0.7 }}>Aucune donnée disponible pour le graphique.</div>
                  ) : (
                    <Line data={chartData as any} options={chartOptions as any} />
                  )}
                </div>
                <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>
                  Astuce : survole le graphique pour afficher la date et le prix exact.
                </div>
              </div>
            </div>

            {/* Marché */}
            <Card title="Marché">
              <div className="fl-fields">
                <Field label="Prix" value={fmtNumber(data.price)} sub="Dernier cours" />
                <Field label="Capitalisation" value={fmtMoneyCompact(data.marketCap)} sub="Market Cap" />
                <Field label="Volume" value={fmtNumber(data.volume)} sub="Volume du jour" />
                <Field label="Jour" value={`${fmtNumber(data.dayLow)} → ${fmtNumber(data.dayHigh)}`} sub="Plus bas → Plus haut" />
                <Field label="52 semaines" value={`${fmtNumber(data.yearLow)} → ${fmtNumber(data.yearHigh)}`} sub="Plus bas → Plus haut" />
              </div>
            </Card>

            {/* Compte de résultat */}
            <Card title="Compte de résultat">
              <div className="fl-fields">
                <Field label="Période" value={data.period ?? "—"} sub="Dernière période connue" />
                <Field label={<InfoTip k="revenue" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.revenue)} />
                <Field label={<InfoTip k="ebitda" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.ebitda)} />
                <Field label={<InfoTip k="operatingIncome" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.operatingIncome)} />
                <Field label={<InfoTip k="netIncome" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.netIncome)} />
              </div>
            </Card>

            {/* Bilan */}
            <Card title="Bilan">
              <div className="fl-fields">
                <Field label={<InfoTip k="totalDebt" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.totalDebt)} />
                <Field
                  label={<InfoTip k="cashAndCashEquivalents" onOpen={setOpenKey} />}
                  value={fmtMoneyCompact(data.cashAndCashEquivalents)}
                />
                <Field label="Capitaux propres" value={fmtMoneyCompact(data.totalEquity)} />
                <Field label="Dette nette" value={fmtMoneyCompact(synth.netDebt)} sub="Dette - Cash" />
              </div>
            </Card>

            {/* Cash flow */}
            <Card title="Cash flow">
              <div className="fl-fields">
                <Field label="Operating CF" value={fmtMoneyCompact(data.operatingCashFlow)} sub="Flux opérationnel" />
                <Field label="Capex" value={fmtMoneyCompact(data.capitalExpenditure)} sub="Investissements" />
                <Field label={<InfoTip k="freeCashFlow" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.freeCashFlow)} sub="OCF - Capex" />
                <Field label="Dette nette / EBITDA" value={synth.ndEbitda == null ? "—" : synth.ndEbitda.toFixed(2)} sub="Niveau de risque" />
              </div>
            </Card>

            {/* Actus */}
            <Card title="Actualités récentes">
              <div style={{ display: "grid", gap: 12 }}>
                {newsLoading && (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="fl-skeleton" style={{ height: 58, borderRadius: 14 }} />
                    ))}
                  </>
                )}

                {!newsLoading && news.length === 0 && <div style={{ opacity: 0.65 }}>Aucune actualité trouvée.</div>}

                {!newsLoading &&
                  news.map((n, i) => (
                    <a
                      key={i}
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="fl-news"
                      style={{
                        transition: "transform 170ms ease, box-shadow 170ms ease, border-color 170ms ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as any).style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as any).style.transform = "translateY(0)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div className="fl-news-title">{n.title}</div>
                        <div style={{ opacity: 0.7, fontWeight: 900 }}>↗</div>
                      </div>
                      <div className="fl-news-meta">
                        {n.site} · {new Date(n.date).toLocaleDateString("fr-FR")}
                      </div>
                    </a>
                  ))}
              </div>
            </Card>

            {/* Ratios */}
            {(data.pb != null ||
              data.ps != null ||
              data.netMargin != null ||
              data.pe != null ||
              data.eps != null ||
              data.roe != null ||
              data.roa != null) && (
                <Card title="Ratios (si disponibles)">
                  <div className="fl-fields">
                    <Field
                      label="PER (P/E)"
                      value={data.pe != null ? String((data.pe as any).toFixed?.(2) ?? data.pe) : "—"}
                      sub="Valorisation"
                    />
                    <Field label="EPS" value={data.eps != null ? String(data.eps) : "—"} sub="Bénéfice par action" />
                    <Field label="P/B" value={data.pb != null ? String(data.pb) : "—"} />
                    <Field label="P/S" value={data.ps != null ? String(data.ps) : "—"} />
                    <Field label="Marge nette" value={fmtPct(data.netMargin)} />
                    <Field label="ROE" value={fmtPct(data.roe)} />
                    <Field label="ROA" value={fmtPct(data.roa)} />
                  </div>
                </Card>
              )}

            {/* Profil */}
            <Card title="Profil">
              <div style={{ display: "grid", gap: 12 }}>
                <div className="fl-field" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <div className="fl-field-label">Nom</div>
                  <div style={{ fontWeight: 900 }}>{data.name ?? "—"}</div>
                </div>
                <div className="fl-field" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <div className="fl-field-label">Ticker</div>
                  <div style={{ fontWeight: 900 }}>{data.symbol ?? "—"}</div>
                </div>
                <div className="fl-field" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <div className="fl-field-label">Secteur</div>
                  <div style={{ fontWeight: 900 }}>{data.sector ?? "—"}</div>
                </div>
                <div className="fl-field" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <div className="fl-field-label">Industrie</div>
                  <div style={{ fontWeight: 900 }}>{data.industry ?? "—"}</div>
                </div>
                <div className="fl-field" style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                  <div className="fl-field-label">Pays</div>
                  <div style={{ fontWeight: 900 }}>{data.country ?? "—"}</div>
                </div>

                {data.description && (
                  <div className="fl-field">
                    <div className="fl-field-label" style={{ fontWeight: 950, opacity: 0.85 }}>
                      Description
                    </div>
                    <div style={{ opacity: 0.88, lineHeight: 1.55 }}>{data.description}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="fl-footer">
          <div>MyFinanceLab · Dashboard</div>
          <div style={{ opacity: 0.7 }}>Notes : pense-bête perso</div>
        </div>

        {/* Modal définitions */}
        {openKey && DEFINITIONS[openKey] && (
          <div className="fl-overlay" onClick={() => setOpenKey(null)} style={{ animation: "flFadeIn 140ms ease" as any }}>
            <div className="fl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fl-modal-title">{DEFINITIONS[openKey].title}</div>
              <div className="fl-modal-desc">{DEFINITIONS[openKey].desc}</div>
              <div className="fl-modal-how-title">Comment l’interpréter</div>
              <div className="fl-modal-how">{DEFINITIONS[openKey].how}</div>
              {DEFINITIONS[openKey].warning && <div className="fl-modal-warn">{DEFINITIONS[openKey].warning}</div>}
              <button className="fl-modal-btn" onClick={() => setOpenKey(null)}>
                Fermer (Esc)
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}