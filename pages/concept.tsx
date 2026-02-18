import Link from "next/link";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import type { CSSProperties } from "react";

type SectionKey = "decouvrir" | "comprendre" | "diagnostic" | "notes";

const SECTIONS: { key: SectionKey; label: string; desc: string; kbd: string }[] = [
    { key: "decouvrir", label: "Découvrir", desc: "À quoi sert FinanceLab", kbd: "1" },
    { key: "comprendre", label: "Comprendre", desc: "Définitions au survol", kbd: "2" },
    { key: "diagnostic", label: "Diagnostic", desc: "Vert / Orange / Rouge", kbd: "3" },
    { key: "notes", label: "Notes", desc: "Bloc perso 24h", kbd: "4" },
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

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => setReduced(!!mq.matches);

        onChange();
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    return reduced;
}

function Dot({ tone }: { tone: "good" | "mid" | "bad" }) {
    const bg =
        tone === "good" ? "rgba(34,197,94,1)" : tone === "mid" ? "rgba(251,191,36,1)" : "rgba(239,68,68,1)";
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

function NavLink({ href, label }: { href: string; label: string }) {
    const router = useRouter();
    const active = router.pathname === href;

    return (
        <Link
            href={href}
            className={`flx-navlink ${active ? "is-active" : ""}`}
            style={{
                ...styles.navLinkTop,
                ...(active ? styles.navLinkTopActive : {}),
            }}
        >
            {label}
        </Link>
    );
}

function TipBubble({ tipKey, onOpen }: { tipKey: keyof typeof TIPS; onOpen: (k: string) => void }) {
    const [open, setOpen] = useState(false);
    const t = TIPS[tipKey];
    const reduced = usePrefersReducedMotion();

    return (
        <span style={{ position: "relative", display: "inline-flex" }}>
            <button
                type="button"
                style={styles.tipChip}
                className="flx-hoverlift"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={() => onOpen(tipKey)}
                aria-haspopup="dialog"
                aria-label={`Ouvrir la définition : ${t.title}`}
            >
                <span style={{ fontWeight: 900 }}>{t.title}</span>
                <span style={styles.tipChipDot} />
            </button>

            {open && (
                <span style={{ ...styles.tooltip, animation: reduced ? "none" : "flx-pop 140ms ease-out" }}>
                    <span style={{ fontWeight: 900, display: "block", marginBottom: 6 }}>{t.title}</span>
                    <span style={{ opacity: 0.9, lineHeight: 1.45 }}>{t.short}</span>
                    <span style={{ display: "block", marginTop: 10, opacity: 0.65, fontSize: 11 }}>Clic pour ouvrir le détail</span>
                    <span style={styles.tooltipArrow} />
                </span>
            )}
        </span>
    );
}

function SideTab({
    active,
    title,
    desc,
    kbd,
    onClick,
}: {
    active: boolean;
    title: string;
    desc: string;
    kbd: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flx-sidetab ${active ? "is-active" : ""}`}
            style={{
                ...styles.sideTab,
                ...(active ? styles.sideTabActive : {}),
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>{title}</div>
                <span style={styles.kbd}>{kbd}</span>
            </div>

            <div style={{ opacity: active ? 0.9 : 0.65, fontSize: 12, marginTop: 6 }}>{desc}</div>

            <div style={styles.tabBarWrap}>
                <div style={{ ...styles.tabBar, width: active ? "72%" : "18%" }} />
            </div>
        </button>
    );
}

export default function Concept() {
    const router = useRouter();
    const reduced = usePrefersReducedMotion();

    const [active, setActive] = useState<SectionKey>("decouvrir");
    const [openTip, setOpenTip] = useState<string | null>(null);
    const [animKey, setAnimKey] = useState(0);

    const panelTopRef = useRef<HTMLDivElement | null>(null);

    // URL sync (?s=diagnostic) + hash (#diagnostic)
    useEffect(() => {
        if (!router.isReady) return;

        const q = (router.query?.s as string | undefined) ?? undefined;
        const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
        const incoming = (q || hash) as SectionKey | "";

        if (incoming && ["decouvrir", "comprendre", "diagnostic", "notes"].includes(incoming)) {
            setActive(incoming as SectionKey);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.isReady]);

    const setSection = useCallback(
        (k: SectionKey) => {
            setActive(k);
            setAnimKey((x) => x + 1);

            if (!reduced) {
                setTimeout(() => panelTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
            }

            router.replace({ pathname: router.pathname, query: { ...router.query, s: k } }, undefined, { shallow: true });
            if (typeof window !== "undefined") window.location.hash = k;
        },
        [router, reduced]
    );

    // keyboard shortcuts: 1-4 + Esc close modal
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenTip(null);

            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            if (e.key === "1") setSection("decouvrir");
            if (e.key === "2") setSection("comprendre");
            if (e.key === "3") setSection("diagnostic");
            if (e.key === "4") setSection("notes");
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setSection]);

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
                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Ce que tu fais</div>
                        <div style={styles.panelText}>
                            Tu entres un <b>ticker</b> et tu obtiens une vue claire : marché, fondamentaux, cash, dette, ratios, news.
                        </div>
                        <div style={styles.chipRow}>
                            <TipBubble tipKey="ticker" onOpen={setOpenTip} />
                            <TipBubble tipKey="score" onOpen={setOpenTip} />
                            <TipBubble tipKey="notes" onOpen={setOpenTip} />
                        </div>

                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>Rythme</span>
                            <span style={{ opacity: 0.78 }}>Tu lis en 2 min · tu creuses en 10</span>
                        </div>
                    </div>

                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Pourquoi c’est utile</div>
                        <div style={styles.panelText}>
                            L’objectif n’est pas de “prédire”, mais de t’aider à repérer vite : <b>endettement</b>, <b>cash</b>,{" "}
                            <b>rentabilité</b>, et les zones à vérifier.
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

                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>Focus</span>
                            <span style={{ opacity: 0.78 }}>Dette · FCF · Marges · PER</span>
                        </div>
                    </div>

                    <div style={styles.panelCardWide} className="flx-card">
                        <div style={styles.panelTitle}>Mini démo (survole les métriques)</div>
                        <div style={styles.panelText}>Un exemple de lecture rapide : tu survoles → tu comprends. Tu cliques → tu approfondis.</div>

                        <div style={styles.demoGrid}>
                            <div style={styles.demoMetric} className="flx-metric">
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="revenue" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>142,3 Md</div>
                                <div style={styles.demoSub}>Dernière période</div>
                            </div>

                            <div style={styles.demoMetric} className="flx-metric">
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="ebitda" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>38,1 Md</div>
                                <div style={styles.demoSub}>Performance opé</div>
                            </div>

                            <div style={styles.demoMetric} className="flx-metric">
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="fcf" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>21,4 Md</div>
                                <div style={styles.demoSub}>Cash dispo</div>
                            </div>

                            <div style={styles.demoMetric} className="flx-metric">
                                <div style={styles.demoLabel}>
                                    <TipBubble tipKey="debt" onOpen={setOpenTip} />
                                </div>
                                <div style={styles.demoValue}>12,8 Md</div>
                                <div style={styles.demoSub}>Dette – cash</div>
                            </div>
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn} className="flx-btn">
                                Aller au Dashboard
                            </Link>
                            <Link href="/community" style={styles.secondaryBtn} className="flx-btn">
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
                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Survol → aperçu</div>
                        <div style={styles.panelText}>Quand tu survoles une bulle, tu as une définition courte. C’est fait pour aller vite.</div>
                        <div style={styles.chipRow}>
                            <TipBubble tipKey="revenue" onOpen={setOpenTip} />
                            <TipBubble tipKey="ebitda" onOpen={setOpenTip} />
                            <TipBubble tipKey="fcf" onOpen={setOpenTip} />
                            <TipBubble tipKey="debt" onOpen={setOpenTip} />
                        </div>

                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>UX</span>
                            <span style={{ opacity: 0.78 }}>Survol = rapide · clic = précis</span>
                        </div>
                    </div>

                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Clic → détail</div>
                        <div style={styles.panelText}>
                            En cliquant, tu ouvres une fiche plus complète : comment interpréter, quoi comparer, quoi surveiller.
                        </div>
                        <div style={styles.panelHintBox}>
                            <div style={styles.panelHintTitle}>Astuce</div>
                            <div style={styles.panelHintText}>
                                Tu veux un site “hyper réactif” : micro-interactions partout, mais jamais lourd. C’est exactement ce style.
                            </div>
                        </div>

                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>Règle</span>
                            <span style={{ opacity: 0.78 }}>Toujours comparer dans le temps</span>
                        </div>
                    </div>

                    <div style={styles.panelCardWide} className="flx-card">
                        <div style={styles.panelTitle}>Objectif</div>
                        <div style={styles.panelText}>
                            Tu dois pouvoir expliquer une action en 60 secondes : <b>croissance</b> (revenus), <b>rentabilité</b> (EBITDA/marges),{" "}
                            <b>cash</b> (FCF) et <b>dette</b> (soutenabilité).
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn} className="flx-btn">
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
                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Vert</div>
                        <div style={styles.panelText}>Signaux plutôt solides : dette contenue, cash correct, rentabilité cohérente.</div>
                        <div style={styles.signalLine}>
                            <Dot tone="good" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>Exemple : Net Debt / EBITDA faible + FCF positif.</div>
                        </div>
                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>Lecture</span>
                            <span style={{ opacity: 0.78 }}>Ok pour creuser</span>
                        </div>
                    </div>

                    <div style={styles.panelCard} className="flx-card">
                        <div style={styles.panelTitle}>Orange</div>
                        <div style={styles.panelText}>Mitigé : tu peux investir, mais tu dois comprendre pourquoi c’est “à surveiller”.</div>
                        <div style={styles.signalLine}>
                            <Dot tone="mid" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>Exemple : dette moyenne, ou cash irrégulier.</div>
                        </div>
                        <div style={styles.microFooter}>
                            <span style={styles.microPill}>Action</span>
                            <span style={{ opacity: 0.78 }}>Identifier la cause</span>
                        </div>
                    </div>

                    <div style={styles.panelCardWide} className="flx-card">
                        <div style={styles.panelTitle}>Rouge</div>
                        <div style={styles.panelText}>
                            Risque élevé : levier financier trop fort, cash tendu, ou signaux faibles sur la rentabilité.
                        </div>
                        <div style={styles.signalLine}>
                            <Dot tone="bad" />
                            <div style={{ opacity: 0.85, lineHeight: 1.45 }}>Exemple : Net Debt / EBITDA élevé + FCF négatif.</div>
                        </div>

                        <div style={styles.panelHintBox}>
                            <div style={styles.panelHintTitle}>Important</div>
                            <div style={styles.panelHintText}>Le diagnostic est un repère. Ensuite, tu descends dans les blocs pour vérifier les chiffres.</div>
                        </div>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn} className="flx-btn">
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
                <div style={styles.panelCard} className="flx-card">
                    <div style={styles.panelTitle}>Notes perso</div>
                    <div style={styles.panelText}>
                        Ici ce n’est pas un “forum public”. C’est ton espace pour noter ce qui t’intéresse : points forts, risques, questions.
                    </div>
                    <div style={styles.chipRow}>
                        <TipBubble tipKey="notes" onOpen={setOpenTip} />
                    </div>
                    <div style={styles.microFooter}>
                        <span style={styles.microPill}>But</span>
                        <span style={{ opacity: 0.78 }}>Garder ton raisonnement</span>
                    </div>
                </div>

                <div style={styles.panelCard} className="flx-card">
                    <div style={styles.panelTitle}>Durée 24h</div>
                    <div style={styles.panelText}>
                        Les notes restent visibles pendant 24 heures pour t’aider à comparer plusieurs entreprises sans perdre le fil.
                    </div>
                    <div style={styles.panelHintBox}>
                        <div style={styles.panelHintTitle}>Pourquoi 24h ?</div>
                        <div style={styles.panelHintText}>
                            Suffisamment long pour analyser, comparer, et revenir dessus — sans transformer la page en archive infinie.
                        </div>
                    </div>
                    <div style={styles.microFooter}>
                        <span style={styles.microPill}>Flow</span>
                        <span style={{ opacity: 0.78 }}>Dashboard ↔ Notes</span>
                    </div>
                </div>

                <div style={styles.panelCardWide} className="flx-card">
                    <div style={styles.panelTitle}>Go</div>
                    <div style={styles.panelText}>Tu peux aller dans Notes, écrire, puis revenir au Dashboard pour continuer.</div>
                    <div style={styles.ctaRow}>
                        <Link href="/community" style={styles.primaryBtn} className="flx-btn">
                            Ouvrir les Notes
                        </Link>
                        <Link href="/" style={styles.secondaryBtn} className="flx-btn">
                            Retour au Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }, [active]); // <-- volontairement minimal, pas besoin d’ajouter setOpenTip (stable)

    const sectionProgress = useMemo(() => {
        const idx = SECTIONS.findIndex((s) => s.key === active);
        const pct = ((idx + 1) / SECTIONS.length) * 100;
        return Math.max(10, Math.min(100, pct));
    }, [active]);

    return (
        <div style={styles.page}>
            <style jsx global>{`
        @keyframes flx-pop {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes flx-fadeup {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes flx-shimmer {
          0% {
            transform: translateX(-40%) rotate(10deg);
            opacity: 0;
          }
          35% {
            opacity: 0.25;
          }
          100% {
            transform: translateX(140%) rotate(10deg);
            opacity: 0;
          }
        }
        .flx-card {
          position: relative;
        }
        .flx-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 18px;
          pointer-events: none;
          background: radial-gradient(600px 200px at 30% 0%, rgba(255, 255, 255, 0.06), transparent 60%);
          opacity: 0.85;
        }
        .flx-card::after {
          content: "";
          position: absolute;
          top: -20%;
          left: -40%;
          width: 60%;
          height: 160%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transform: rotate(10deg);
          opacity: 0;
          pointer-events: none;
        }
        .flx-card:hover::after {
          animation: flx-shimmer 900ms ease-out;
          opacity: 1;
        }

        .flx-hoverlift:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
        }
        .flx-metric:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.28);
        }
        .flx-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>

            <div style={styles.bgGlow} />
            <div style={styles.noise} aria-hidden />

            <div style={styles.container}>
                {/* Topbar */}
                <div style={styles.topbar} className="flx-card">
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

                    <div style={styles.pill} title="Statut">
                        <span style={styles.pillDot} />
                        <span>Online</span>
                    </div>
                </div>

                {/* Main layout */}
                <div style={styles.layout}>
                    {/* Sidebar */}
                    <aside style={styles.sidebar} className="flx-card">
                        <div style={styles.sidebarTitle}>Concept</div>
                        <div style={styles.sidebarSub}>
                            Clique une section (ou <b>1–4</b>). <span style={{ opacity: 0.65 }}>Esc</span> ferme la pop-up.
                        </div>

                        <div style={styles.progressWrap} aria-hidden>
                            <div style={{ ...styles.progressBar, width: `${sectionProgress}%` }} />
                        </div>

                        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                            {SECTIONS.map((s) => (
                                <SideTab
                                    key={s.key}
                                    active={active === s.key}
                                    title={s.label}
                                    desc={s.desc}
                                    kbd={s.kbd}
                                    onClick={() => setSection(s.key)}
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
                    <main style={styles.panel} className="flx-card">
                        <div style={styles.panelHero} ref={panelTopRef}>
                            <div style={styles.panelHeroTitle}>{title}</div>
                            <div style={styles.panelHeroSub}>{subtitle}</div>

                            <div style={styles.heroChips}>
                                <span style={styles.heroChip}>Survol</span>
                                <span style={styles.heroChip}>Clic</span>
                                <span style={styles.heroChip}>Diagnostic</span>
                                <span style={styles.heroChip}>Notes 24h</span>
                            </div>
                        </div>

                        <div style={styles.panelBody}>
                            <div
                                key={animKey}
                                style={{
                                    animation: reduced ? "none" : "flx-fadeup 220ms ease-out",
                                }}
                            >
                                {content}
                            </div>
                        </div>
                    </main>
                </div>

                {/* Modal tip */}
                {openTip && TIPS[openTip] && (
                    <div style={modalStyles.overlay} onClick={() => setOpenTip(null)} role="presentation">
                        <div
                            style={{
                                ...modalStyles.modal,
                                animation: reduced ? "none" : "flx-pop 160ms ease-out",
                            }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-label={TIPS[openTip].title}
                        >
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

const modalStyles: Record<string, CSSProperties> = {
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
        boxShadow: "0 18px 70px rgba(0,0,0,0.45)",
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

const styles: Record<string, CSSProperties> = {
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
    noise: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: 0.06,
        mixBlendMode: "overlay",
        backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
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
        boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
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
    sidebarFoot: { marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" },

    progressWrap: {
        marginTop: 12,
        height: 10,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(99,102,241,0.75), rgba(56,189,248,0.55))",
        transition: "width 220ms ease",
    },

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
    kbd: {
        fontSize: 11,
        fontWeight: 950,
        opacity: 0.85,
        padding: "4px 8px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
    },
    tabBarWrap: {
        marginTop: 10,
        height: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
    },
    tabBar: {
        height: "100%",
        borderRadius: 999,
        background: "linear-gradient(90deg, rgba(99,102,241,0.70), rgba(16,185,129,0.45))",
        transition: "width 220ms ease",
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
    heroChips: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" },
    heroChip: {
        fontSize: 11,
        fontWeight: 950,
        opacity: 0.9,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
    },
    panelBody: { padding: 14 },

    panelGrid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 },
    panelCard: {
        gridColumn: "span 6",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        padding: 14,
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

    microFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
    },
    microPill: {
        fontSize: 11,
        fontWeight: 950,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        opacity: 0.92,
    },

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
    tooltipArrow: {
        position: "absolute",
        top: -6,
        left: 18,
        width: 12,
        height: 12,
        background: "rgba(17,24,39,0.98)",
        borderLeft: "1px solid rgba(255,255,255,0.10)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        transform: "rotate(45deg)",
    },

    miniLegend: { marginTop: 12, display: "grid", gap: 10 },
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

    demoGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 },
    demoMetric: {
        gridColumn: "span 3",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
        padding: 12,
    },
    demoLabel: { fontSize: 12, opacity: 0.85 },
    demoValue: { marginTop: 8, fontWeight: 950, letterSpacing: -0.4, fontSize: 18 },
    demoSub: { marginTop: 6, opacity: 0.6, fontSize: 12 },

    signalLine: { marginTop: 12, display: "flex", gap: 12, alignItems: "flex-start" },

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