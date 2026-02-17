import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Post = {
    id: string;
    author: string;
    message: string;
    createdAt: number;
};

function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function Community() {
    const storageKey = "financelab_forum_posts_v1";

    const [author, setAuthor] = useState("Anonyme");
    const [message, setMessage] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);

    // Charger depuis le navigateur
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            const arr = raw ? (JSON.parse(raw) as Post[]) : [];
            setPosts(Array.isArray(arr) ? arr : []);
        } catch {
            setPosts([]);
        }
    }, []);

    // Sauvegarder dès que ça change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(posts));
        } catch { }
    }, [posts]);

    const canPost = useMemo(() => message.trim().length >= 3, [message]);

    const addPost = () => {
        if (!canPost) return;
        const p: Post = {
            id: uid(),
            author: author.trim() ? author.trim() : "Anonyme",
            message: message.trim(),
            createdAt: Date.now(),
        };
        setPosts((prev) => [p, ...prev]);
        setMessage("");
    };

    const clearAll = () => {
        if (!confirm("Supprimer tous les messages ?")) return;
        setPosts([]);
    };

    return (
        <div style={styles.page}>
            <div style={styles.bgGlow} />
            <div style={styles.container}>
                <div style={styles.topbar}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>FL</div>
                        <div>
                            <div style={styles.brandTitle}>FinanceLab</div>
                            <div style={styles.brandSub}>Communauté (mode local)</div>
                        </div>
                    </div>

                    <div style={styles.nav}>
                        <Link href="/" style={styles.navLink}>Dashboard</Link>
                        <Link href="/concept" style={styles.navLink}>Concept</Link>
                        <Link href="/community" style={{ ...styles.navLink, ...styles.navLinkActive }}>Communauté</Link>
                    </div>

                    <button onClick={clearAll} style={styles.smallBtn}>
                        Effacer
                    </button>
                </div>

                <div style={styles.hero}>
                    <h1 style={styles.h1}>Forum</h1>
                    <p style={styles.lead}>
                        Ici on teste un forum <b>gratuit</b> et <b>super simple</b>.
                        <br />
                        ⚠️ Les messages sont stockés <b>sur ton navigateur</b> (pas encore public).
                    </p>

                    <div style={styles.form}>
                        <div style={styles.inputWrap}>
                            <div style={styles.label}>Pseudo</div>
                            <input
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                style={styles.input}
                                placeholder="Ton pseudo"
                            />
                        </div>

                        <div style={styles.inputWrap}>
                            <div style={styles.label}>Message</div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={styles.textarea}
                                placeholder="Pose une question, partage une analyse…"
                            />
                            <div style={styles.hint}>Min 3 caractères · Entrée = nouvelle ligne</div>
                        </div>

                        <button
                            onClick={addPost}
                            disabled={!canPost}
                            style={{ ...styles.button, ...(canPost ? {} : styles.buttonDisabled) }}
                        >
                            Publier
                        </button>
                    </div>
                </div>

                <div style={styles.card}>
                    <div style={styles.cardTitle}>Messages ({posts.length})</div>

                    {posts.length === 0 ? (
                        <div style={{ opacity: 0.7, paddingTop: 10 }}>
                            Aucun message pour l’instant. Poste le premier 🙂
                        </div>
                    ) : (
                        <div style={styles.postList}>
                            {posts.map((p) => (
                                <div key={p.id} style={styles.post}>
                                    <div style={styles.postTop}>
                                        <div style={styles.postAuthor}>{p.author}</div>
                                        <div style={styles.postDate}>
                                            {new Date(p.createdAt).toLocaleString("fr-FR")}
                                        </div>
                                    </div>
                                    <div style={styles.postMsg}>{p.message}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerBadge}>FinanceLab</span>
                    <span style={{ opacity: 0.7 }}>
                        · Prochaine étape : rendre le forum public (GitHub ou autre)
                    </span>
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
        flexWrap: "wrap",
    },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
        width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 900,
        background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(16,185,129,0.7))", color: "#07101F",
    },
    brandTitle: { fontWeight: 900, fontSize: 16 },
    brandSub: { opacity: 0.75, fontSize: 13, marginTop: 2 },

    nav: { display: "flex", gap: 10, flexWrap: "wrap" },
    navLink: {
        padding: "8px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)", color: "#EAF0FF", textDecoration: "none",
        fontSize: 12, fontWeight: 900,
    },
    navLinkActive: { background: "rgba(99,102,241,0.22)", border: "1px solid rgba(99,102,241,0.45)" },

    smallBtn: {
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        cursor: "pointer",
        fontWeight: 900,
        fontSize: 12,
    },

    hero: {
        marginTop: 18, padding: 18, borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)",
    },
    h1: { margin: 0, fontSize: 28, letterSpacing: -0.4 },
    lead: { marginTop: 10, opacity: 0.85, lineHeight: 1.5 },

    form: {
        marginTop: 14,
        display: "grid",
        gap: 12,
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
    },
    inputWrap: { display: "grid", gap: 8 },
    label: { fontSize: 12, opacity: 0.7, fontWeight: 900 },
    input: {
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        outline: "none",
    },
    textarea: {
        width: "100%",
        minHeight: 110,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        outline: "none",
        resize: "vertical",
        lineHeight: 1.5,
    },
    hint: { fontSize: 12, opacity: 0.6 },

    button: {
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))",
        color: "#07101F",
        fontWeight: 900,
        cursor: "pointer",
    },
    buttonDisabled: { opacity: 0.55, cursor: "not-allowed" },

    card: {
        marginTop: 14,
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
    },
    cardTitle: { fontWeight: 900, marginBottom: 10 },

    postList: { display: "grid", gap: 10 },
    post: {
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
    },
    postTop: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
    postAuthor: { fontWeight: 900 },
    postDate: { opacity: 0.6, fontSize: 12 },
    postMsg: { marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap", lineHeight: 1.55 },

    footer: {
        marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 10, fontSize: 12, alignItems: "center",
    },
    footerBadge: {
        padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)", fontWeight: 900,
    },
};