import Link from "next/link";

export default function Concept() {
    return (
        <div style={styles.page}>
            <div style={styles.bgGlow} />
            <div style={styles.container}>
                <div style={styles.topbar}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>FL</div>
                        <div>
                            <div style={styles.brandTitle}>FinanceLab</div>
                            <div style={styles.brandSub}>Le “Morningstar pédagogique” pour apprendre l’analyse fondamentale</div>
                        </div>
                    </div>

                    <div style={styles.nav}>
                        <Link href="/" style={styles.navLink}>Dashboard</Link>
                        <Link href="/concept" style={{ ...styles.navLink, ...styles.navLinkActive }}>Concept</Link>
                        <Link href="/community" style={styles.navLink}>Communauté</Link>
                    </div>

                    <div style={styles.pill}>
                        <span style={styles.pillDot} />
                        <span>Prototype</span>
                    </div>
                </div>

                <div style={styles.hero}>
                    <div style={styles.heroLeft}>
                        <div style={styles.kicker}>📌 Concept</div>
                        <h1 style={styles.h1}>Un site premium qui rend la finance compréhensible</h1>
                        <p style={styles.lead}>
                            Tu tapes une entreprise → tu vois les <b>fondamentaux essentiels</b>, des <b>explications claires</b>, un
                            <b>diagnostic automatique</b> (dette / cash-flow) + les <b>news récentes</b>.
                            <br />
                            Objectif : permettre à n’importe qui de faire une analyse simple, propre et argumentée.
                        </p>

                        <div style={styles.ctaRow}>
                            <Link href="/" style={styles.primaryBtn}>Tester le Dashboard</Link>
                            <Link href="/community" style={styles.secondaryBtn}>Aller à la Communauté</Link>
                        </div>

                        <div style={styles.badges}>
                            <span style={styles.badge}>✅ Simple</span>
                            <span style={styles.badge}>✅ Pédagogique</span>
                            <span style={styles.badge}>✅ Automatisé</span>
                            <span style={styles.badge}>✅ Gratuit à déployer</span>
                        </div>
                    </div>

                    <div style={styles.heroRight}>
                        <div style={styles.mockCard}>
                            <div style={styles.mockTitle}>Ce que l’utilisateur obtient</div>
                            <ul style={styles.ul}>
                                <li>📊 Chiffres clés (CA, EBITDA, dette, FCF…)</li>
                                <li>🧠 “Clique sur EBITDA” → explication + comment interpréter</li>
                                <li>⚠️ Diagnostic : dette trop élevée ? cash-flow négatif ?</li>
                                <li>📰 Actualités auto (30 derniers jours)</li>
                                <li>💬 Discussion / avis / analyses partagées</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div style={styles.grid}>
                    <section style={styles.card}>
                        <div style={styles.cardTitle}>🎯 Problème</div>
                        <div style={styles.cardText}>
                            Les sites financiers sont soit trop techniques, soit trop “bruités”.
                            Les débutants ne savent pas <b>quoi regarder</b> ni <b>comment interpréter</b>.
                        </div>
                    </section>

                    <section style={styles.card}>
                        <div style={styles.cardTitle}>💡 Solution</div>
                        <div style={styles.cardText}>
                            FinanceLab montre uniquement l’essentiel, avec des explications cliquables et un diagnostic automatique.
                            → On apprend en regardant de vrais chiffres.
                        </div>
                    </section>

                    <section style={styles.card}>
                        <div style={styles.cardTitle}>✨ Différenciation</div>
                        <div style={styles.cardText}>
                            <b>“Data + pédagogie + communauté”</b> dans la même interface.
                            Les gens apprennent, puis publient leur analyse.
                        </div>
                    </section>

                    <section style={styles.card}>
                        <div style={styles.cardTitle}>🧱 Roadmap (facile)</div>
                        <div style={styles.cardText}>
                            1) Score /100 + conseils automatiques<br />
                            2) Comparaison secteur (moyennes)<br />
                            3) Historique sur plusieurs années<br />
                            4) “Watchlist” et alertes
                        </div>
                    </section>
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerBadge}>FinanceLab</span>
                    <span style={{ opacity: 0.7 }}>· Concept page</span>
                </div>
            </div>
        </div>
    );
}

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
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 14px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
        backdropFilter: "blur(10px)",
    },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
        width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 800,
        background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(16,185,129,0.7))", color: "#07101F",
    },
    brandTitle: { fontWeight: 900, fontSize: 16, lineHeight: 1.1 },
    brandSub: { opacity: 0.75, fontSize: 13, marginTop: 2 },

    nav: { display: "flex", gap: 10, flexWrap: "wrap" },
    navLink: {
        padding: "8px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)", color: "#EAF0FF", textDecoration: "none", fontSize: 12, fontWeight: 800,
    },
    navLinkActive: { background: "rgba(99,102,241,0.22)", border: "1px solid rgba(99,102,241,0.45)" },

    pill: {
        display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 12,
    },
    pillDot: { width: 8, height: 8, borderRadius: 999, background: "#22c55e", boxShadow: "0 0 0 6px rgba(34,197,94,0.12)" },

    hero: {
        marginTop: 18, padding: 18, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)",
        display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 14,
    },
    heroLeft: { display: "grid", gap: 12 },
    heroRight: {},
    kicker: { fontWeight: 900, opacity: 0.8 },
    h1: { margin: 0, fontSize: 32, letterSpacing: -0.6 },
    lead: { margin: 0, opacity: 0.85, lineHeight: 1.6 },

    ctaRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 },
    primaryBtn: {
        padding: "12px 14px", borderRadius: 14, textDecoration: "none", color: "#07101F", fontWeight: 900,
        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))",
        border: "1px solid rgba(255,255,255,0.12)",
    },
    secondaryBtn: {
        padding: "12px 14px", borderRadius: 14, textDecoration: "none", color: "#EAF0FF", fontWeight: 900,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
    },

    badges: { display: "flex", gap: 10, flexWrap: "wrap" },
    badge: {
        padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)", fontSize: 12, fontWeight: 800, opacity: 0.9,
    },

    mockCard: {
        padding: 14, borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
    },
    mockTitle: { fontWeight: 900, marginBottom: 10 },
    ul: { margin: 0, paddingLeft: 18, opacity: 0.9, lineHeight: 1.7 },

    grid: {
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 14,
    },
    card: {
        gridColumn: "span 6",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        padding: 14,
    },
    cardTitle: { fontWeight: 900, marginBottom: 8 },
    cardText: { opacity: 0.85, lineHeight: 1.6 },

    footer: {
        marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 10, fontSize: 12, alignItems: "center",
    },
    footerBadge: {
        padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)", fontWeight: 900,
    },
};