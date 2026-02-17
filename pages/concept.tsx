import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";

type SectionKey = "decouvrir" | "comprendre" | "diagnostic" | "notes";

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
    { key: "decouvrir", label: "Découvrir", desc: "À quoi sert FinanceLab" },
    { key: "comprendre", label: "Comprendre", desc: "Définitions au survol" },
    { key: "diagnostic", label: "Diagnostic", desc: "Vert / Orange / Rouge" },
    { key: "notes", label: "Notes", desc: "Bloc perso 24h" },
];

const TIPS: Record<
    string,
    {
        title: string;
        short: string;
        detail: string;
    }
> = {
    ticker: {
        title: "Ticker",
        short: "Code de l’action (ex : AAPL, MSFT, AIR.PA).",
        detail:
            "Le ticker est l’identifiant utilisé sur les marchés. Il permet de récupérer automatiquement prix, ratios et fondamentaux.",
    },
    revenue: {
        title: "Chiffre d’affaires",
        short: "Total des ventes sur la période.",
        detail:
            "À comparer dans le temps : croissance régulière = dynamique ; baisse ou stagnation = marché mature ou pression concurrentielle.",
    },
    ebitda: {
        title: "EBITDA",
        short: "Performance opérationnelle (avant intérêts/impôts/amortissements).",
        detail:
            "Utile pour comparer des entreprises et évaluer la dette : Net Debt / EBITDA (plus c’est haut, plus le risque est élevé).",
    },
    fcf: {
        title: "Free Cash Flow",
        short: "Cash dispo après investissements (capex).",
        detail:
            "FCF positif et stable = capacité à investir, rembourser, distribuer. FCF négatif durable = vigilance (croissance coûteuse ou pression).",
    },
    debt: {
        title: "Dette nette",
        short: "Dette – cash.",
        detail:
            "La dette nette montre le “poids” financier réel. Le ratio Net Debt / EBITDA sert à juger la soutenabilité.",
    },
    score: {
        title: "Score",
        short: "Synthèse rapide basée sur quelques signaux clés.",
        detail:
            "Ce n’est pas une recommandation absolue : c’est un repère visuel. L’objectif est de te guider vers les points à vérifier.",
    },
    notes: {
        title: "Notes 24h",
        short: "Un espace perso pour noter ce qui compte.",
        detail:
            "Tu peux écrire tes idées (points forts/faibles, questions). Les notes restent 24h pour comparer plusieurs entreprises sans te perdre.",
    },
};

function Dot({ tone }: { tone: "good" | "mid" | "bad" }) {
    const bg =
        tone === "good"
            ? "rgba(34,197,94,1)"
            : tone === "mid"
                ? "rgba(251,191,36,1)"
                : "rgba(239,68,68,1)";
    const glow =
        tone === "good"
            ? "rgba(34,197,94,0.22)"
            : tone === "mid"
                ? "rgba(251,191,36,0.22)"
                : "rgba(239,68,68,0.22)";
    return (
        <span
            style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: bg,
                boxShadow: `0 0 0 6px ${glow}`,
                display: "inline-block",
                flex: "0 0 auto",
            }}
        />
    );
}

function NavLink({
    href,
    label,
}: {
    href: string;
    label: string;
}) {
    const router = useRouter();
    const active = router.pathname === href;
    return (
        <Link
            href={href}
            style={{
                ...styles.navLinkTop,
                ...(active ? styles.navLinkTopActive : {}),
            }}
        >
            {label}
        </Link>
    );
}

function TipBubble({
    tipKey,
    onOpen,
}: {
    tipKey: keyof typeof TIPS;
    onOpen: (k: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const t = TIPS[tipKey];

    return (
        <span style={{ position: "relative", display: "inline-flex" }}>
            <button
                type="button"
                style={styles.tipChip}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => onOpen(tipKey)}
            >
                <span style={{ fontWeight: 900 }}>{t.title}</span>
                <span style={styles.tipChipDot} />
            </button>

            {open && (
                <span style={styles.tooltip}>
                    <span style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>
                        {t.title}
                    </span>
                    <span style={{ opacity: 0.9, lineHeight: 1.45 }}>{t.short}</span>
                    <span style={{ display: "block", marginTop: 10, opacity: 0.65, fontSize: 11 }}>
                        Clic pour ouvrir le détail
                    </span>
                </span>
            )}
        </span>
    );
}

function SideTab({
    active,
    title,
    desc,
    onClick,
}: {
    active: boolean;
    title: string;
    desc: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                ...styles.sideTab,
                ...(active ? styles.sideTabActive : {}),
            }}
        >
            <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>{title}</div>
            <div style={{ opacity: active ? 0.9 : 0.65, fontSize: 12, marginTop: 6 }}>
                {desc}
            </div>
        </button>
    );
}

export default function Concept() {
    const [active, setActive] = useState<SectionKey>("decouvrir");
    const [openTip, setOpenTip] = useState<string | null>(null);

    const title =
        active === "decouvrir"
            ? "FinanceLab : comprendre vite, décider mieux"
            : active === "comprendre"
                ? "Comprendre sans te perdre"
                : active === "diagnostic"
                    ? "Un diagnostic clair"
                    : "Des notes perso (24h)";

    const subtitle =
        active === "decouvrir"
            ? "Tape un ticker, lis l’essentiel, puis descends dans les blocs."
            : active === "comprendre"
                ? "Survole les bulles : aperçu immédiat. Clique : détail complet."
                : active === "diagnostic"
                    ? "Une synthèse visuelle qui te guide : vert / orange / rouge."
                    : "Écris ce qui compte pour toi, et garde le fil de ton analyse.";

    const content = useMemo(() => {
        if (active === "decouvrir") {
            return (
                <div style={styles.panelGrid}>
                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Ce que tu fais</div>
                        <div style={styles.panelText}>
                            Tu entres un <b>ticker</b> et tu obtiens une vue claire : marché,
                            fondamentaux, cash, dette, ratios, news.
                        </div>
                        <div style={styles.chipRow}>
                            <TipBubble tipKey="ticker" onOpen={setOpenTip} />
                            <TipBubble tipKey="score" onOpen={setOpenTip} />
                            <TipBubble tipKey="notes" onOpen={setOpenTip} />
                        </div>
                    </div>

                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Pourquoi c’est utile</div>
                        <div style={styles.panelText}>
                            L’objectif n’est pas de “prédire”, mais de t’aider à repérer vite :
                            <b> endettement</b>, <b>cash</b>, <b>rentabilité</b>, et les zones à vérifier.
                        </div>

                        <div style={styles.miniLegend}>
                            <div style={styles.legendLine}>
                                <Dot tone="good" /> <span style={styles.legendText}>Plutôt solide / rassurant</span>
                            </div>
                            <div style={styles.legendLine}>
                                <Dot tone="mid" /> <span style={styles.legendText}>À surveiller / nuance</span>
                            </div>
                            <div style={styles.legendLine}>
                                <Dot tone="bad" /> <span style={styles.legendText}>Risque élevé / prudence</span>
                            </div>
                        </div>
                    </div>

                    <div style={styles.panelCardWide}>
                        <div style={styles.panelTitle}>Mini démo (survole les métriques)</div>
                        <div style={styles.panelText}>
                            Un exemple de lecture rapide : tu survoles → tu comprends. Tu cliques → tu approfondis.
                        </div>

                        <div style={styles.demoGrid}>
                            <div style={styles.demoMetric}>
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="revenue" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>142,3 Md</div>
                                <div style={styles.demoSub}>Dernière période</div>
                            </div>

                            <div style={styles.demoMetric}>
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="ebitda" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>38,1 Md</div>
                                <div style={styles.demoSub}>Performance opé</div>
                            </div>

                            <div style={styles.demoMetric}>
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="fcf" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>21,4 Md</div>
                                <div style={styles.demoSub}>Cash dispo</div>
                            </div>

                            <div style={styles.demoMetric}>
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="debt" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>12,8 Md</div>
                                <div style={styles.demoSub}>Dette – cash</div>
                            </div>
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn}>
                                Aller au Dashboard
                            </Link>
                            <Link href="/community" style={styles.secondaryBtn}>
                                Ouvrir les Notes
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        if (active === "comprendre") {
            return (
                <div style={styles.panelGrid}>
                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Survol → aperçu</div>
                        <div style={styles.panelText}>
                            Quand tu survoles une bulle, tu as une définition courte. C’est fait pour aller vite.
                        </div>
                        <div style={styles.chipRow}>
                            <TipBubble tipKey="revenue" onOpen={setOpenTip} />
                            <TipBubble tipKey="ebitda" onOpen={setOpenTip} />
                            <TipBubble tipKey="fcf" onOpen={setOpenTip} />
                            <TipBubble tipKey="debt" onOpen={setOpenTip} />
                        </div>
                    </div>

                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Clic → détail</div>
                        <div style={styles.panelText}>
                            En cliquant, tu ouvres une fiche plus complète : comment interpréter, quoi comparer, quoi surveiller.
                        </div>
                        <div style={styles.panelHintBox}>
                            <div style={styles.panelHintTitle}>Astuce</div>
                            <div style={styles.panelHintText}>
                                Si tu veux un site “hyper réactif”, c’est exactement ça : micro-interactions partout, mais jamais lourd.
                            </div>
                        </div>
                    </div>

                    <div style={styles.panelCardWide}>
                        <div style={styles.panelTitle}>Objectif</div>
                        <div style={styles.panelText}>
                            Tu dois pouvoir expliquer une action en 60 secondes :
                            <b> croissance</b> (revenus), <b>rentabilité</b> (EBITDA/marges),
                            <b> cash</b> (FCF) et <b>dette</b> (soutenabilité).
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn}>
                                Tester maintenant
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        if (active === "diagnostic") {
            return (
                <div style={styles.panelGrid}>
                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Vert</div>
                        <div style={styles.panelText}>
                            Signaux plutôt solides : dette contenue, cash correct, rentabilité cohérente.
                        </div>
                        <div style={styles.signalLine}>
                            <Dot tone="good" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>
                                Exemple : Net Debt / EBITDA faible + FCF positif.
                            </div>
                        </div>
                    </div>

                    <div style={styles.panelCard}>
                        <div style={styles.panelTitle}>Orange</div>
                        <div style={styles.panelText}>
                            Mitigé : tu peux investir, mais tu dois comprendre pourquoi c’est “à surveiller”.
                        </div>
                        <div style={styles.signalLine}>
                            <Dot tone="mid" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>
                                Exemple : dette moyenne, ou cash irrégulier.
                            </div>
                        </div>
                    </div>

                    <div style={styles.panelCardWide}>
                        <div style={styles.panelTitle}>Rouge</div>
                        <div style={styles.panelText}>
                            Risque élevé : levier financier trop fort, cash tendu, ou signaux faibles sur la rentabilité.
                        </div>
                        <div style={styles.signalLine}>
                            <Dot tone="bad" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>
                                Exemple : Net Debt / EBITDA élevé + FCF négatif.
                            </div>
                        </div>

                        <div style={styles.panelHintBox}>
                            <div style={styles.panelHintTitle}>Important</div>
                            <div style={styles.panelHintText}>
                                Le diagnostic est un repère. Ensuite, tu descends dans les blocs pour vérifier les chiffres.
                            </div>
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn}>
                                Voir le diagnostic sur une action
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        // notes
        return (
            <div style={styles.panelGrid}>
                <div style={styles.panelCard}>
                    <div style={styles.panelTitle}>Notes perso</div>
                    <div style={styles.panelText}>
                        Ici ce n’est pas un “forum public”. C’est ton espace pour noter ce qui t’intéresse : points forts, risques, questions.
                    </div>
                    <div style={styles.chipRow}>
                        <TipBubble tipKey="notes" onOpen={setOpenTip} />
                    </div>
                </div>

                <div style={styles.panelCard}>
                    <div style={styles.panelTitle}>Durée 24h</div>
                    <div style={styles.panelText}>
                        Les notes restent visibles pendant 24 heures pour t’aider à comparer plusieurs entreprises sans perdre le fil.
                    </div>
                    <div style={styles.panelHintBox}>
                        <div style={styles.panelHintTitle}>Pourquoi 24h ?</div>
                        <div style={styles.panelHintText}>
                            C’est suffisamment long pour analyser, comparer, et revenir dessus — sans transformer la page en archive infinie.
                        </div>
                    </div>
                </div>

                <div style={styles.panelCardWide}>
                    <div style={styles.panelTitle}>Go</div>
                    <div style={styles.panelText}>
                        Tu peux aller dans Notes, écrire, puis revenir au Dashboard pour continuer la lecture.
                    </div>
                    <div style={styles.ctaRow}>
                        <Link href="/community" style={styles.primaryBtn}>
                            Ouvrir les Notes
                        </Link>
                        <Link href="/" style={styles.secondaryBtn}>
                            Retour au Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }, [active]);

    return (
        <div style={styles.page}>
            <div style={styles.bgGlow} />
            <div style={styles.container}>
                {/* Topbar */}
                <div style={styles.topbar}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>FL</div>
                        <div>
                            <div style={styles.brandTitle}>FinanceLab</div>
                            <div style={styles.brandSub}>Concept · lecture guidée · définitions · diagnostic</div>
                        </div>
                    </div>

                    <div style={styles.navTop}>
                        <NavLink href="/" label="Dashboard" />
                        <NavLink href="/concept" label="Concept" />
                        <NavLink href="/community" label="Notes" />
                    </div>

                    <div style={styles.pill}>
                        <span style={styles.pillDot} />
                        <span>Online</span>
                    </div>
                </div>

                {/* Main layout */}
                <div style={styles.layout}>
                    {/* Sidebar */}
                    <aside style={styles.sidebar}>
                        <div style={styles.sidebarTitle}>Concept</div>
                        <div style={styles.sidebarSub}>
                            Clique une section, tout se met à jour avec une transition.
                        </div>

                        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                            {SECTIONS.map((s) => (
                                <SideTab
                                    key={s.key}
                                    active={active === s.key}
                                    title={s.label}
                                    desc={s.desc}
                                    onClick={() => setActive(s.key)}
                                />
                            ))}
                        </div>

                        <div style={styles.sidebarFoot}>
                            <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.5 }}>
                                Survole les bulles pour un aperçu. Clique pour le détail.
                            </div>
                        </div>
                    </aside>

                    {/* Panel */}
                    <main style={styles.panel}>
                        <div style={styles.panelHero}>
                            <div style={styles.panelHeroTitle}>{title}</div>
                            <div style={styles.panelHeroSub}>{subtitle}</div>
                        </div>

                        <div style={styles.panelBody}>{content}</div>
                    </main>
                </div>

                {/* Modal tip */}
                {openTip && TIPS[openTip] && (
                    <div style={modalStyles.overlay} onClick={() => setOpenTip(null)}>
                        <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                            <div style={modalStyles.title}>{TIPS[openTip].title}</div>
                            <div style={modalStyles.desc}>{TIPS[openTip].detail}</div>
                            <button style={modalStyles.btn} onClick={() => setOpenTip(null)}>
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
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
    },
    modal: {
        width: "100%",
        maxWidth: 640,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17,24,39,0.95)",
        backdropFilter: "blur(10px)",
        padding: 18,
    },
    title: { fontWeight: 950, fontSize: 18, marginBottom: 10, letterSpacing: -0.2 },
    desc: { opacity: 0.9, lineHeight: 1.65, marginBottom: 14 },
    btn: {
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.08)",
        color: "#EAF0FF",
        cursor: "pointer",
        fontWeight: 900,
        width: "100%",
    },
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "#0B1020",
        color: "#EAF0FF",
        position: "relative",
        overflow: "hidden",
    },
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
        fontWeight: 900,
        letterSpacing: 0.5,
        background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(16,185,129,0.7))",
        color: "#07101F",
    },
    brandTitle: { fontWeight: 900, fontSize: 16, lineHeight: 1.1 },
    brandSub: { opacity: 0.75, fontSize: 13, marginTop: 2 },

    navTop: { display: "flex", gap: 10, flexWrap: "wrap" },
    navLinkTop: {
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 900,
        transition: "transform 140ms ease, background 140ms ease, border 140ms ease",
    },
    navLinkTopActive: {
        background: "rgba(99,102,241,0.22)",
        border: "1px solid rgba(99,102,241,0.35)",
        transform: "translateY(-1px)",
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
        fontWeight: 900,
    },
    pillDot: { width: 8, height: 8, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 0 6px rgba(34,197,94,0.12)" },

    layout: {
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: 14,
        alignItems: "start",
    },

    sidebar: {
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        padding: 14,
        position: "sticky",
        top: 14,
    },
    sidebarTitle: { fontWeight: 950, letterSpacing: -0.2, fontSize: 14 },
    sidebarSub: { marginTop: 8, opacity: 0.7, fontSize: 12, lineHeight: 1.5 },

    sideTab: {
        textAlign: "left",
        width: "100%",
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        color: "#EAF0FF",
        cursor: "pointer",
        transition: "transform 160ms ease, border 160ms ease, background 160ms ease",
    },
    sideTabActive: {
        border: "1px solid rgba(99,102,241,0.35)",
        background: "rgba(99,102,241,0.12)",
        transform: "translateY(-1px)",
    },
    sidebarFoot: {
        marginTop: 14,
        paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.08)",
    },

    panel: {
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        overflow: "hidden",
    },
    panelHero: {
        padding: 16,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
    },
    panelHeroTitle: { fontWeight: 950, letterSpacing: -0.4, fontSize: 20, margin: 0 },
    panelHeroSub: { marginTop: 8, opacity: 0.75, lineHeight: 1.5, fontSize: 13 },
    panelBody: { padding: 14 },

    panelGrid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 },
    panelCard: {
        gridColumn: "span 6",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        padding: 14,
        transition: "transform 180ms ease, border 180ms ease, background 180ms ease",
    },
    panelCardWide: {
        gridColumn: "span 12",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        padding: 14,
    },
    panelTitle: { fontWeight: 950, letterSpacing: -0.2, fontSize: 14 },
    panelText: { marginTop: 10, opacity: 0.82, lineHeight: 1.6, fontSize: 13 },

    chipRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
    tipChip: {
        appearance: "none",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        padding: "9px 10px",
        borderRadius: 999,
        cursor: "pointer",
        display: "inline-flex",
        gap: 10,
        alignItems: "center",
        transition: "transform 140ms ease, border 140ms ease, background 140ms ease",
    },
    tipChipDot: {
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "rgba(56,189,248,1)",
        boxShadow: "0 0 0 6px rgba(56,189,248,0.15)",
    },

    tooltip: {
        position: "absolute",
        top: "112%",
        left: 0,
        width: 280,
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(17,24,39,0.98)",
        backdropFilter: "blur(10px)",
        zIndex: 50,
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    },

    miniLegend: {
        marginTop: 12,
        display: "grid",
        gap: 10,
    },
    legendLine: { display: "flex", alignItems: "center", gap: 10 },
    legendText: { opacity: 0.85, fontSize: 13 },

    panelHintBox: {
        marginTop: 12,
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
    },
    panelHintTitle: { fontWeight: 950, fontSize: 13, letterSpacing: -0.2 },
    panelHintText: { marginTop: 8, opacity: 0.8, fontSize: 13, lineHeight: 1.55 },

    demoGrid: {
        marginTop: 12,
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 12,
    },
    demoMetric: {
        gridColumn: "span 3",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
        padding: 12,
        transition: "transform 180ms ease, border 180ms ease",
    },
    demoLabel: { fontSize: 12, opacity: 0.85 },
    demoValue: { marginTop: 8, fontWeight: 950, letterSpacing: -0.4, fontSize: 18 },
    demoSub: { marginTop: 6, opacity: 0.6, fontSize: 12 },

    signalLine: {
        marginTop: 12,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
    },

    ctaRow: { marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" },
    primaryBtn: {
        padding: "12px 14px",
        borderRadius: 14,
        textDecoration: "none",
        color: "#07101F",
        fontWeight: 950,
        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))",
        border: "1px solid rgba(255,255,255,0.12)",
    },
    secondaryBtn: {
        padding: "12px 14px",
        borderRadius: 14,
        textDecoration: "none",
        color: "#EAF0FF",
        fontWeight: 950,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
    },
};