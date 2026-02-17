import Link from "next/link";
import { useMemo, useState } from "react";

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

/* ------------------------ Notions cliquables ------------------------ */
const DEFINITIONS: Record<
  string,
  { title: string; desc: string; how: string; warning?: string }
> = {
  revenue: {
    title: "Chiffre d’affaires",
    desc:
      "Total des ventes sur la période. Indicateur de taille et de dynamique commerciale.",
    how:
      "À analyser avec les marges : CA en hausse mais marges en baisse = pression concurrentielle / coûts.",
  },
  ebitda: {
    title: "EBITDA",
    desc:
      "Mesure la performance opérationnelle avant intérêts, impôts et amortissements. Très utilisé pour comparer des entreprises.",
    how:
      "Souvent comparé à la dette (Dette nette / EBITDA). Plus ce ratio est haut, plus le risque financier augmente.",
  },
  operatingIncome: {
    title: "Résultat opérationnel",
    desc:
      "Profit de l’activité principale après charges opérationnelles (avant intérêts et impôts).",
    how:
      "Permet de mesurer la rentabilité du cœur de métier, indépendamment de la structure financière.",
  },
  netIncome: {
    title: "Résultat net",
    desc:
      "Bénéfice final après toutes charges (intérêts, impôts, éléments exceptionnels).",
    how:
      "À comparer au chiffre d’affaires (marge nette) et à la stabilité sur plusieurs années.",
  },
  totalDebt: {
    title: "Dette totale",
    desc:
      "Ensemble des dettes financières de l’entreprise. À analyser avec le cash et l’EBITDA.",
    how:
      "Calcule la dette nette = dette - cash, puis Net Debt / EBITDA : <2 sain, 2–4 à surveiller, >4 risqué.",
  },
  cashAndCashEquivalents: {
    title: "Cash",
    desc:
      "Liquidités disponibles (trésorerie + équivalents). Sert à payer les dépenses et rembourser de la dette.",
    how:
      "Un cash élevé réduit le risque et augmente la flexibilité financière.",
  },
  freeCashFlow: {
    title: "Free Cash Flow",
    desc:
      "Cash généré après investissements (Capex). C’est le cash réellement disponible.",
    how:
      "FCF positif et régulier = capacité à investir, rembourser la dette, verser des dividendes.",
    warning:
      "FCF négatif sur plusieurs périodes peut signaler une entreprise qui consomme du cash.",
  },
};

function Field({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={styles.field}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
      {sub ? <div style={styles.fieldSub}>{sub}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
      </div>
      <div style={styles.cardBody}>{children}</div>
    </section>
  );
}

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  const canSearch = useMemo(() => symbol.trim().length >= 1, [symbol]);

  const fetchData = async () => {
    if (!canSearch) return;
    setLoading(true);
    setData(null);
    setNews([]);
    try {
      const res = await fetch(
        `/api/financials?symbol=${encodeURIComponent(symbol.trim())}`
      );
      const json = (await res.json()) as ApiData;
      setData(json);

      const newsRes = await fetch(
        `/api/news?symbol=${encodeURIComponent(symbol.trim())}`
      );
      const newsJson = await newsRes.json();
      setNews(Array.isArray(newsJson.articles) ? newsJson.articles : []);
    } catch (e) {
      setData({ error: "Erreur réseau (impossible de joindre l’API)." });
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") fetchData();
  };

  const headerTitle = data?.name ? data.name : "FinanceLab";
  const headerSub =
    data?.symbol && !data?.error
      ? `${data.symbol}${data.exchange ? " · " + data.exchange : ""}${data.sector ? " · " + data.sector : ""
      }`
      : "Analyse fondamentale (simple, claire, premium)";

  const netDebt =
    isNumber(data?.totalDebt) && isNumber(data?.cashAndCashEquivalents)
      ? (data!.totalDebt as number) - (data!.cashAndCashEquivalents as number)
      : null;

  const netDebtToEbitda =
    isNumber(netDebt) && isNumber(data?.ebitda) && (data!.ebitda as number) !== 0
      ? (netDebt as number) / (data!.ebitda as number)
      : null;

  const debtRisk =
    netDebtToEbitda === null
      ? { label: "Données insuffisantes", emoji: "—" }
      : netDebtToEbitda < 2
        ? { label: "Endettement sain (Net Debt/EBITDA < 2)", emoji: "✅" }
        : netDebtToEbitda < 4
          ? { label: "Dette à surveiller (2–4)", emoji: "⚠️" }
          : { label: "Endettement élevé (> 4)", emoji: "❗" };

  const fcfRisk =
    !isNumber(data?.freeCashFlow)
      ? { label: "Données insuffisantes", emoji: "—" }
      : (data!.freeCashFlow as number) > 0
        ? { label: "Free Cash Flow positif", emoji: "✅" }
        : { label: "Free Cash Flow négatif", emoji: "⚠️" };

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />
      <div style={styles.container}>
        {/* Top bar */}
        <div style={styles.topbar}>
          <div style={styles.brand}>
            <div style={styles.logo}>FL</div>
            <div>
              <div style={styles.brandTitle}>{headerTitle}</div>
              <div style={styles.brandSub}>{headerSub}</div>
            </div>
          </div>

          {/* ✅ NAVIGATION AJOUTÉE */}
          <div style={styles.nav}>
            <Link href="/" style={styles.navLink}>
              Dashboard
            </Link>
            <Link href="/concept" style={styles.navLink}>
              Concept
            </Link>
            <Link href="/community" style={styles.navLink}>
              Communauté
            </Link>
          </div>

          <div style={styles.pill}>
            <span style={styles.pillDot} />
            <span>Local</span>
          </div>
        </div>

        {/* Search */}
        <div style={styles.hero}>
          <h1 style={styles.h1}>Recherche d’entreprise</h1>
          <p style={styles.lead}>
            Tape un <strong>ticker</strong> (ex : <code style={styles.code}>AAPL</code>,{" "}
            <code style={styles.code}>MSFT</code>, <code style={styles.code}>AIR.PA</code>) puis clique sur
            Rechercher.
          </p>

          {/* ✅ boutons rapides */}
          <div style={styles.quickRow}>
            <Link href="/concept" style={styles.secondaryBtn}>
              Voir le concept
            </Link>
            <Link href="/community" style={styles.secondaryBtn}>
              Aller au forum
            </Link>
          </div>

          <div style={styles.searchRow}>
            <div style={styles.searchBox}>
              <div style={styles.searchLabel}>Ticker</div>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ex: AAPL"
                style={styles.input}
              />
              <div style={styles.searchHint}>Astuce : Entrée pour lancer</div>
            </div>

            <button
              onClick={fetchData}
              disabled={!canSearch || loading}
              style={{
                ...styles.button,
                ...(loading || !canSearch ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? "Chargement…" : "Rechercher"}
            </button>
          </div>

          <div style={styles.chips}>
            {["AAPL", "MSFT", "NVDA", "TSLA", "AIR.PA"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSymbol(s);
                  setTimeout(fetchData, 0);
                }}
                style={styles.chip}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {data?.error && (
          <div style={styles.alert}>
            <div style={styles.alertTitle}>Erreur</div>
            <div style={styles.alertText}>{data.error}</div>
            <div style={styles.alertTip}>
              Essaie un ticker US (ex : AAPL) pour vérifier.
            </div>
          </div>
        )}

        {!data && !loading && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🔎</div>
            <div style={styles.emptyTitle}>Aucune donnée affichée</div>
            <div style={styles.emptyText}>Saisis un ticker et lance la recherche.</div>
          </div>
        )}

        {data && !data.error && (
          <div style={styles.grid}>
            <Card title="Marché">
              <div style={styles.fieldsGrid}>
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

            <Card title="Compte de résultat">
              <div style={styles.fieldsGrid}>
                <Field label="Période" value={data.period ?? "—"} sub="Dernière période connue" />

                <div onClick={() => setOpenKey("revenue")} style={{ cursor: "pointer" }}>
                  <Field label="Chiffre d’affaires ℹ️" value={fmtMoneyCompact(data.revenue)} />
                </div>

                <div onClick={() => setOpenKey("ebitda")} style={{ cursor: "pointer" }}>
                  <Field label="EBITDA ℹ️" value={fmtMoneyCompact(data.ebitda)} />
                </div>

                <div onClick={() => setOpenKey("operatingIncome")} style={{ cursor: "pointer" }}>
                  <Field label="Résultat opé ℹ️" value={fmtMoneyCompact(data.operatingIncome)} />
                </div>

                <div onClick={() => setOpenKey("netIncome")} style={{ cursor: "pointer" }}>
                  <Field label="Résultat net ℹ️" value={fmtMoneyCompact(data.netIncome)} />
                </div>
              </div>
            </Card>

            <Card title="Bilan">
              <div style={styles.fieldsGrid}>
                <div onClick={() => setOpenKey("totalDebt")} style={{ cursor: "pointer" }}>
                  <Field label="Dette totale ℹ️" value={fmtMoneyCompact(data.totalDebt)} />
                </div>

                <div onClick={() => setOpenKey("cashAndCashEquivalents")} style={{ cursor: "pointer" }}>
                  <Field label="Cash ℹ️" value={fmtMoneyCompact(data.cashAndCashEquivalents)} />
                </div>

                <Field label="Capitaux propres" value={fmtMoneyCompact(data.totalEquity)} />
              </div>
            </Card>

            <Card title="Cash flow">
              <div style={styles.fieldsGrid}>
                <Field label="Operating CF" value={fmtMoneyCompact(data.operatingCashFlow)} sub="Flux opérationnel" />
                <Field label="Capex" value={fmtMoneyCompact(data.capitalExpenditure)} sub="Investissements" />
                <div onClick={() => setOpenKey("freeCashFlow")} style={{ cursor: "pointer" }}>
                  <Field label="Free Cash Flow ℹ️" value={fmtMoneyCompact(data.freeCashFlow)} sub="OCF - Capex" />
                </div>
              </div>
            </Card>

            <Card title="Diagnostic (automatique)">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={styles.diagnosticItem}>
                  <div style={styles.diagnosticTitle}>Risque de dette</div>
                  <div style={styles.diagnosticText}>
                    {debtRisk.emoji} {debtRisk.label}
                    {netDebtToEbitda !== null ? ` · Ratio: ${netDebtToEbitda.toFixed(2)}` : ""}
                  </div>
                </div>

                <div style={styles.diagnosticItem}>
                  <div style={styles.diagnosticTitle}>Génération de cash</div>
                  <div style={styles.diagnosticText}>
                    {fcfRisk.emoji} {fcfRisk.label}
                  </div>
                </div>

                {netDebt !== null && (
                  <div style={styles.diagnosticItem}>
                    <div style={styles.diagnosticTitle}>Dette nette</div>
                    <div style={styles.diagnosticText}>{fmtMoneyCompact(netDebt)}</div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Actualités récentes">
              <div style={{ display: "grid", gap: 12 }}>
                {news.length === 0 && (
                  <div style={{ opacity: 0.65 }}>Aucune actualité trouvée.</div>
                )}
                {news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noreferrer" style={styles.newsItem}>
                    <div style={styles.newsTitle}>{n.title}</div>
                    <div style={styles.newsMeta}>
                      {n.site} · {new Date(n.date).toLocaleDateString("fr-FR")}
                    </div>
                  </a>
                ))}
              </div>
            </Card>

            {(data.pb != null ||
              data.ps != null ||
              data.netMargin != null ||
              data.pe != null ||
              data.eps != null ||
              data.roe != null ||
              data.roa != null) && (
                <Card title="Ratios (si disponibles)">
                  <div style={styles.fieldsGrid}>
                    <Field label="PER (P/E)" value={data.pe != null ? String(data.pe) : "—"} sub="Valorisation" />
                    <Field label="EPS" value={data.eps != null ? String(data.eps) : "—"} sub="Bénéfice par action" />
                    <Field label="P/B" value={data.pb != null ? String(data.pb) : "—"} />
                    <Field label="P/S" value={data.ps != null ? String(data.ps) : "—"} />
                    <Field label="Marge nette" value={fmtPct(data.netMargin)} />
                    <Field label="ROE" value={fmtPct(data.roe)} />
                    <Field label="ROA" value={fmtPct(data.roa)} />
                  </div>
                </Card>
              )}

            <Card title="Profil">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={styles.profileLine}>
                  <div style={styles.profileKey}>Nom</div>
                  <div style={styles.profileVal}>{data.name ?? "—"}</div>
                </div>
                <div style={styles.profileLine}>
                  <div style={styles.profileKey}>Ticker</div>
                  <div style={styles.profileVal}>{data.symbol ?? "—"}</div>
                </div>
                <div style={styles.profileLine}>
                  <div style={styles.profileKey}>Secteur</div>
                  <div style={styles.profileVal}>{data.sector ?? "—"}</div>
                </div>
                <div style={styles.profileLine}>
                  <div style={styles.profileKey}>Industrie</div>
                  <div style={styles.profileVal}>{data.industry ?? "—"}</div>
                </div>
                <div style={styles.profileLine}>
                  <div style={styles.profileKey}>Pays</div>
                  <div style={styles.profileVal}>{data.country ?? "—"}</div>
                </div>

                {data.description && (
                  <div style={styles.descBox}>
                    <div style={styles.descTitle}>Description</div>
                    <div style={styles.descText}>{data.description}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <span style={styles.footerBadge}>FinanceLab</span>
            <span style={{ opacity: 0.75 }}>· Prototype premium (local)</span>
          </div>
          <div style={{ opacity: 0.6 }}>Prochaine étape : forum + page concept</div>
        </div>

        {openKey && DEFINITIONS[openKey] && (
          <div style={modalStyles.overlay} onClick={() => setOpenKey(null)}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={modalStyles.title}>{DEFINITIONS[openKey].title}</div>
              <div style={modalStyles.desc}>{DEFINITIONS[openKey].desc}</div>
              <div style={modalStyles.howTitle}>Comment l’interpréter</div>
              <div style={modalStyles.how}>{DEFINITIONS[openKey].how}</div>
              {DEFINITIONS[openKey].warning && (
                <div style={modalStyles.warn}>{DEFINITIONS[openKey].warning}</div>
              )}
              <button style={modalStyles.btn} onClick={() => setOpenKey(null)}>
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  modal: { width: "100%", maxWidth: 560, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(17,24,39,0.95)", backdropFilter: "blur(10px)", padding: 18 },
  title: { fontWeight: 900, fontSize: 18, marginBottom: 10 },
  desc: { opacity: 0.9, lineHeight: 1.6, marginBottom: 12 },
  howTitle: { fontWeight: 900, marginBottom: 6 },
  how: { opacity: 0.85, lineHeight: 1.6 },
  warn: { marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.08)", opacity: 0.95 },
  btn: { marginTop: 14, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)", color: "#EAF0FF", cursor: "pointer", fontWeight: 800, width: "100%" },
};

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0B1020", color: "#EAF0FF", position: "relative", overflow: "hidden" },
  bgGlow: {
    position: "absolute",
    inset: -200,
    background:
      "radial-gradient(800px 400px at 20% 10%, rgba(79,70,229,0.35), transparent 60%), radial-gradient(700px 400px at 80% 20%, rgba(16,185,129,0.22), transparent 60%), radial-gradient(900px 500px at 50% 100%, rgba(56,189,248,0.18), transparent 60%)",
    pointerEvents: "none",
  },
  container: { position: "relative", maxWidth: 1100, margin: "0 auto", padding: "24px 18px 40px" },

  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    letterSpacing: 0.5,
    background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(16,185,129,0.7))",
    color: "#07101F",
  },
  brandTitle: { fontWeight: 800, fontSize: 16, lineHeight: 1.1 },
  brandSub: { opacity: 0.75, fontSize: 13, marginTop: 2 },

  nav: { display: "flex", gap: 10, flexWrap: "wrap" },
  navLink: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#EAF0FF",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 800,
  },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 12,
  },
  pillDot: { width: 8, height: 8, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 0 6px rgba(34,197,94,0.12)" },

  hero: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(10px)",
  },
  h1: { margin: 0, fontSize: 28, letterSpacing: -0.4 },
  lead: { marginTop: 10, marginBottom: 12, opacity: 0.85, lineHeight: 1.5 },
  code: { padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 13 },

  quickRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 14,
    textDecoration: "none",
    color: "#EAF0FF",
    fontWeight: 900,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 13,
  },

  searchRow: { display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" },
  searchBox: { flex: "1 1 360px", minWidth: 260, padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.20)" },
  searchLabel: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
  input: { width: "100%", padding: "12px 12px", fontSize: 16, borderRadius: 12, outline: "none", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#EAF0FF" },
  searchHint: { fontSize: 12, opacity: 0.6, marginTop: 8 },

  button: { padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))", color: "#07101F", fontWeight: 800, cursor: "pointer", minWidth: 150 },
  buttonDisabled: { opacity: 0.55, cursor: "not-allowed" },

  chips: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  chip: { padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", color: "#EAF0FF", cursor: "pointer", fontSize: 12 },

  alert: { marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)" },
  alertTitle: { fontWeight: 800, marginBottom: 6 },
  alertText: { opacity: 0.9 },
  alertTip: { marginTop: 8, opacity: 0.75, fontSize: 13 },

  empty: { marginTop: 16, padding: 22, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", textAlign: "center" },
  emptyIcon: { fontSize: 26, marginBottom: 8 },
  emptyTitle: { fontWeight: 800, fontSize: 16 },
  emptyText: { opacity: 0.7, marginTop: 6 },

  grid: { marginTop: 16, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 },
  card: { gridColumn: "span 6", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", overflow: "hidden" },
  cardHeader: { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  cardTitle: { fontWeight: 900, letterSpacing: -0.2 },
  cardBody: { padding: 14 },

  fieldsGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  field: { padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" },
  fieldLabel: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  fieldValue: { fontSize: 18, fontWeight: 900, letterSpacing: -0.2 },
  fieldSub: { marginTop: 4, fontSize: 12, opacity: 0.6 },

  profileLine: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" },
  profileKey: { opacity: 0.7, fontSize: 12 },
  profileVal: { fontWeight: 700 },

  descBox: { padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" },
  descTitle: { fontWeight: 900, marginBottom: 6 },
  descText: { opacity: 0.85, lineHeight: 1.5 },

  footer: { marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12 },
  footerLeft: { display: "flex", alignItems: "center", gap: 10 },
  footerBadge: { padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)", fontWeight: 800 },

  diagnosticItem: { padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)" },
  diagnosticTitle: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  diagnosticText: { fontWeight: 900 },

  newsItem: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    textDecoration: "none",
    color: "#EAF0FF",
  },
  newsTitle: { fontWeight: 900, lineHeight: 1.3 },
  newsMeta: { opacity: 0.65, fontSize: 12, marginTop: 6 },
};