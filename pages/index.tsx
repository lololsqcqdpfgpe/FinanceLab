import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

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
    <section className="fl-card" style={{ transition: "transform 180ms ease, box-shadow 180ms ease" }}>
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
    isNumber(d.totalDebt) && isNumber(d.cashAndCashEquivalents) ? d.totalDebt - d.cashAndCashEquivalents : null;

  const ndEbitda = isNumber(netDebt) && isNumber(d.ebitda) && d.ebitda !== 0 ? netDebt / d.ebitda : null;

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

/* ------------------------ Helpers pour le bloc WOW ------------------------ */
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
function toneFromNdEbitda(x: number | null | undefined): Tone {
  if (!isNumber(x)) return "orange";
  if (x < 2) return "green";
  if (x < 4) return "orange";
  return "red";
}
function toneToColor(t: Tone) {
  if (t === "green") return "rgba(34,197,94,0.95)";
  if (t === "red") return "rgba(239,68,68,0.95)";
  return "rgba(245,158,11,0.95)";
}
function score01FromTone(t: Tone) {
  if (t === "green") return 0.85;
  if (t === "orange") return 0.55;
  return 0.25;
}
function scoreFromMetrics(d: ApiData, synth: ReturnType<typeof scoreFromData>) {
  const tVal = toneFromPe(d.pe);
  const tRisk = toneFromNdEbitda(synth.ndEbitda);
  const tCash = toneFromFCF(d.freeCashFlow);
  const tQual = toneFromMargin(d.netMargin);

  const val = score01FromTone(tVal);
  const risk = score01FromTone(tRisk);
  const cash = score01FromTone(tCash);
  const qual = score01FromTone(tQual);

  // pondération légère (risque un peu plus important)
  const total01 = clamp(0.26 * val + 0.30 * risk + 0.22 * cash + 0.22 * qual, 0, 1);
  const total = Math.round(total01 * 100);

  const tone: Tone = total >= 72 ? "green" : total >= 45 ? "orange" : "red";

  return {
    total,
    tone,
    pillars: [
      { k: "Valorisation", value01: val, tone: tVal, hint: d.pe == null ? "PER —" : `PER ${d.pe.toFixed(1)}` },
      {
        k: "Risque",
        value01: risk,
        tone: tRisk,
        hint: synth.ndEbitda == null ? "DN/EBITDA —" : `DN/EBITDA ${synth.ndEbitda.toFixed(2)}`,
      },
      { k: "Cash", value01: cash, tone: tCash, hint: `FCF ${fmtMoneyCompact(d.freeCashFlow)}` },
      { k: "Qualité", value01: qual, tone: tQual, hint: `Marge nette ${fmtSignedPct(d.netMargin)}` },
    ],
  };
}

function RingMeter({
  value,
  tone,
  label,
  sub,
}: {
  value: number; // 0..100
  tone: Tone;
  label: string;
  sub?: string;
}) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = clamp(value / 100, 0, 1);
  const dash = c * pct;
  const col = toneToColor(tone);

  return (
    <div className="fl-wow-ring">
      <svg width="120" height="120" viewBox="0 0 120 120" className="fl-wow-svg">
        <defs>
          <linearGradient id="flRingGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.95)" />
            <stop offset="55%" stopColor="rgba(56,189,248,0.80)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.70)" />
          </linearGradient>
          <filter id="flSoftGlow">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* track */}
        <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.10)" strokeWidth="10" fill="none" />
        {/* value glow */}
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke="url(#flRingGlow)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 60 60)"
          filter="url(#flSoftGlow)"
          style={{ opacity: 0.35 }}
        />
        {/* value main */}
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke={col}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 700ms ease" }}
        />

        <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="900" fill="rgba(234,240,255,0.95)">
          {value}
        </text>
        <text x="60" y="76" textAnchor="middle" fontSize="11" fontWeight="800" fill="rgba(234,240,255,0.70)">
          /100
        </text>
      </svg>

      <div className="fl-wow-ring-label">{label}</div>
      {sub ? <div className="fl-wow-ring-sub">{sub}</div> : null}
    </div>
  );
}

function PillarBar({
  title,
  value01,
  tone,
  hint,
}: {
  title: string;
  value01: number;
  tone: Tone;
  hint: string;
}) {
  const w = Math.round(clamp(value01, 0, 1) * 100);
  return (
    <div className="fl-wow-bar">
      <div className="fl-wow-bar-top">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`fl-dot ${tone}`} />
          <span style={{ fontWeight: 950 }}>{title}</span>
        </div>
        <div style={{ opacity: 0.75, fontWeight: 900 }}>{hint}</div>
      </div>
      <div className="fl-wow-bar-track">
        <div
          className="fl-wow-bar-fill"
          style={{
            width: `${w}%`,
            background: `linear-gradient(90deg, ${toneToColor(tone)}, rgba(255,255,255,0.08))`,
          }}
        />
      </div>
    </div>
  );
}

const LS_RECENTS = "mfl_recents_v1";

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

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
    } catch {
      setData({ error: "Erreur réseau (impossible de joindre l’API)." });
      setNews([]);
    } finally {
      setLoading(false);
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

    const t = setTimeout(() => {
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

  const wow = useMemo(() => {
    if (!data || data.error || !synth) return null;
    return scoreFromMetrics(data, synth);
  }, [data, synth]);

  const lastFetchLabel =
    lastFetchAt == null
      ? "—"
      : new Date(lastFetchAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <style>{`
        @keyframes flFadeIn { from { opacity: 0; transform: translateY(3px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes flFloat { 0% { transform: translateY(0);} 50% { transform: translateY(-3px);} 100% { transform: translateY(0);} }
        @keyframes flSheen { 0% { transform: translateX(-40%);} 100% { transform: translateX(140%);} }
        .fl-wow {
          position: relative;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          overflow: hidden;
        }
        .fl-wow::before {
          content: "";
          position: absolute;
          inset: -2px;
          background:
            radial-gradient(800px 360px at 15% 10%, rgba(99,102,241,0.28), transparent 60%),
            radial-gradient(700px 360px at 85% 35%, rgba(56,189,248,0.18), transparent 60%),
            radial-gradient(800px 420px at 50% 110%, rgba(16,185,129,0.15), transparent 60%);
          pointer-events: none;
        }
        .fl-wow::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -60%;
          width: 60%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: rotate(14deg);
          animation: flSheen 2.8s ease-in-out infinite;
          pointer-events: none;
          opacity: 0.55;
        }
        .fl-wow-inner { position: relative; padding: 16px; display: grid; gap: 14px; }
        .fl-wow-head {
          display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .fl-wow-title { font-weight: 950; letter-spacing: -0.2px; }
        .fl-wow-sub { opacity: 0.72; font-size: 12px; }
        .fl-wow-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 14px;
          align-items: stretch;
        }
        @media (max-width: 860px) {
          .fl-wow-grid { grid-template-columns: 1fr; }
        }
        .fl-wow-ring {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.18);
          padding: 14px;
          display: grid;
          place-items: center;
          text-align: center;
          animation: flFloat 2.6s ease-in-out infinite;
        }
        .fl-wow-ring-label { margin-top: 6px; font-weight: 950; }
        .fl-wow-ring-sub { margin-top: 4px; font-size: 12px; opacity: 0.72; }
        .fl-wow-bars {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.18);
          padding: 14px;
          display: grid;
          gap: 12px;
        }
        .fl-wow-bar-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .fl-wow-bar-track {
          height: 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.10);
          overflow: hidden;
        }
        .fl-wow-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 700ms ease;
          box-shadow: 0 10px 26px rgba(0,0,0,0.18);
        }
        .fl-wow-mini {
          display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
        }
        .fl-wow-chip {
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(0,0,0,0.18);
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 900;
          font-size: 12px;
          opacity: 0.98;
        }
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 className="fl-h1" style={{ marginBottom: 6 }}>
                Recherche d’entreprise
              </h1>
              <p className="fl-lead" style={{ marginTop: 0 }}>
                Tape un <strong>ticker</strong> (ex : <code className="fl-code">AAPL</code>,{" "}
                <code className="fl-code">MSFT</code>, <code className="fl-code">AIR.PA</code>) puis lance la recherche.
              </p>
            </div>

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
                style={{ transition: "transform 160ms ease, box-shadow 160ms ease" }}
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
            {/* WOW PANEL (remplace le graphique) */}
            {wow && (
              <div className="fl-card fl-wow" style={{ gridColumn: "span 12" }}>
                <div className="fl-wow-inner">
                  <div className="fl-wow-head">
                    <div>
                      <div className="fl-wow-title">Pulse Board</div>
                      <div className="fl-wow-sub">
                        Score visuel basé sur : valorisation (PER), risque (DN/EBITDA), cash (FCF), qualité (marge nette).
                      </div>
                    </div>

                    <div className="fl-wow-mini">
                      <span className="fl-wow-chip" title="Résumé du scoring">
                        <Dot tone={wow.tone} />
                        <span>Score global</span>
                        <span style={{ opacity: 0.75 }}>·</span>
                        <span style={{ fontWeight: 950 }}>{wow.total}/100</span>
                      </span>

                      <span className="fl-wow-chip" title="Nombre d’actus chargées">
                        <Dot tone={news.length > 0 ? "green" : "orange"} />
                        <span>Actus</span>
                        <span style={{ opacity: 0.75 }}>·</span>
                        <span style={{ fontWeight: 950 }}>{newsLoading ? "…" : news.length}</span>
                      </span>

                      <span className="fl-wow-chip" title="Verdict automatique (règles simples)">
                        <Dot tone={synth.tone} />
                        <span>{synth.verdict}</span>
                      </span>
                    </div>
                  </div>

                  <div className="fl-wow-grid">
                    <RingMeter
                      value={wow.total}
                      tone={wow.tone}
                      label="Score"
                      sub={data.symbol ? `${data.symbol}${data.exchange ? " · " + data.exchange : ""}` : "—"}
                    />

                    <div className="fl-wow-bars">
                      {wow.pillars.map((p) => (
                        <PillarBar
                          key={p.k}
                          title={p.k}
                          value01={p.value01}
                          tone={p.tone}
                          hint={p.hint}
                        />
                      ))}

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                        <span className="fl-wow-chip" title="PER">
                          <Dot tone={toneFromPe(data.pe)} />
                          <span>PER</span>
                          <span style={{ opacity: 0.75 }}>·</span>
                          <span style={{ fontWeight: 950 }}>{data.pe == null ? "—" : data.pe.toFixed(1)}</span>
                        </span>

                        <span className="fl-wow-chip" title="Dette nette / EBITDA">
                          <Dot tone={toneFromNdEbitda(synth.ndEbitda)} />
                          <span>DN/EBITDA</span>
                          <span style={{ opacity: 0.75 }}>·</span>
                          <span style={{ fontWeight: 950 }}>
                            {synth.ndEbitda == null ? "—" : synth.ndEbitda.toFixed(2)}
                          </span>
                        </span>

                        <span className="fl-wow-chip" title="Free Cash Flow">
                          <Dot tone={toneFromFCF(data.freeCashFlow)} />
                          <span>FCF</span>
                          <span style={{ opacity: 0.75 }}>·</span>
                          <span style={{ fontWeight: 950 }}>{fmtMoneyCompact(data.freeCashFlow)}</span>
                        </span>

                        <span className="fl-wow-chip" title="Marge nette">
                          <Dot tone={toneFromMargin(data.netMargin)} />
                          <span>Marge nette</span>
                          <span style={{ opacity: 0.75 }}>·</span>
                          <span style={{ fontWeight: 950 }}>{fmtSignedPct(data.netMargin)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            {/* Marché */}
            <Card title="Marché">
              <div className="fl-fields">
                <Field label="Prix" value={fmtNumber(data.price)} sub="Dernier cours" />
                <Field label="Capitalisation" value={fmtMoneyCompact(data.marketCap)} sub="Market Cap" />
                <Field label="Volume" value={fmtNumber(data.volume)} sub="Volume du jour" />
                <Field
                  label="Jour"
                  value={`${fmtNumber(data.dayLow)} → ${fmtNumber(data.dayHigh)}`}
                  sub="Plus bas → Plus haut"
                />
                <Field
                  label="52 semaines"
                  value={`${fmtNumber(data.yearLow)} → ${fmtNumber(data.yearHigh)}`}
                  sub="Plus bas → Plus haut"
                />
              </div>
            </Card>

            {/* Compte de résultat */}
            <Card title="Compte de résultat">
              <div className="fl-fields">
                <Field label="Période" value={data.period ?? "—"} sub="Dernière période connue" />
                <Field label={<InfoTip k="revenue" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.revenue)} />
                <Field label={<InfoTip k="ebitda" onOpen={setOpenKey} />} value={fmtMoneyCompact(data.ebitda)} />
                <Field
                  label={<InfoTip k="operatingIncome" onOpen={setOpenKey} />}
                  value={fmtMoneyCompact(data.operatingIncome)}
                />
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
                <Field
                  label={<InfoTip k="freeCashFlow" onOpen={setOpenKey} />}
                  value={fmtMoneyCompact(data.freeCashFlow)}
                  sub="OCF - Capex"
                />
                <Field
                  label="Dette nette / EBITDA"
                  value={synth.ndEbitda == null ? "—" : synth.ndEbitda.toFixed(2)}
                  sub="Niveau de risque"
                />
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