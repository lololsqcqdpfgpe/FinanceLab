import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

/**
 * FinanceLab — Notes / MindMap (local + TTL 24h)
 * - No backend, no auth, no forum
 * - Designed to feel "product-grade" and reactive
 */

type NodeTone = "good" | "mid" | "bad" | "none";

type MindNode = {
    id: string;
    title: string;
    body: string;
    tone: NodeTone;
    x: number;
    y: number;
    createdAt: number;
    updatedAt: number;
};

type MindEdge = {
    id: string;
    from: string;
    to: string;
};

type MindState = {
    version: number;
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
    nodes: MindNode[];
    edges: MindEdge[];
    selectedId?: string;
    viewport: { x: number; y: number; zoom: number };
};

const STORAGE_KEY = "financelab_mindmap_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

function now() {
    return Date.now();
}

function uid(prefix = "n") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Math.random()
        .toString(16)
        .slice(2)}`;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function toneLabel(t: NodeTone) {
    if (t === "good") return "Positif";
    if (t === "mid") return "Moyen";
    if (t === "bad") return "Négatif";
    return "Neutre";
}

function toneDotStyle(t: NodeTone): React.CSSProperties {
    const base: React.CSSProperties = {
        width: 10,
        height: 10,
        borderRadius: 999,
        display: "inline-block",
        boxShadow: "0 0 0 6px rgba(255,255,255,0.04)",
    };
    if (t === "good") return { ...base, background: "#22c55e" };
    if (t === "mid") return { ...base, background: "#f59e0b" };
    if (t === "bad") return { ...base, background: "#ef4444" };
    return { ...base, background: "rgba(255,255,255,0.25)" };
}

function sanitizeTitle(s: string) {
    return s.replace(/\s+/g, " ").trim().slice(0, 60);
}

function defaultState(seedTitle?: string): MindState {
    const centerX = 520;
    const centerY = 320;
    const root: MindNode = {
        id: uid("root"),
        title: seedTitle ? sanitizeTitle(seedTitle) : "Nouvelle note",
        body: "",
        tone: "none",
        x: centerX,
        y: centerY,
        createdAt: now(),
        updatedAt: now(),
    };

    const createdAt = now();
    return {
        version: 1,
        createdAt,
        updatedAt: createdAt,
        expiresAt: createdAt + TTL_MS,
        nodes: [root],
        edges: [],
        selectedId: root.id,
        viewport: { x: 0, y: 0, zoom: 1 },
    };
}

function safeParseJSON<T>(s: string | null): T | null {
    if (!s) return null;
    try {
        return JSON.parse(s) as T;
    } catch {
        return null;
    }
}

function isExpired(st: MindState) {
    return !st.expiresAt || st.expiresAt <= now();
}

function setWithTTL(st: MindState): MindState {
    const createdAt = st.createdAt ?? now();
    return {
        ...st,
        createdAt,
        updatedAt: now(),
        expiresAt: createdAt + TTL_MS,
    };
}

/** auto arrange in a neat radial pattern around the root */
function autoArrange(state: MindState): MindState {
    if (!state.nodes.length) return state;
    const root = state.nodes[0];
    const others = state.nodes.slice(1);

    // group children-ish: nodes that have an incoming edge from root first
    const rootChildrenIds = new Set(
        state.edges.filter((e) => e.from === root.id).map((e) => e.to)
    );
    const rootChildren = others.filter((n) => rootChildrenIds.has(n.id));
    const rest = others.filter((n) => !rootChildrenIds.has(n.id));

    const placed: MindNode[] = [];

    const radius1 = 200;
    const radius2 = 360;

    const placeRing = (arr: MindNode[], radius: number, startAngle: number) => {
        const k = Math.max(arr.length, 1);
        for (let i = 0; i < arr.length; i++) {
            const a = startAngle + (i * (Math.PI * 2)) / k;
            const x = root.x + Math.cos(a) * radius;
            const y = root.y + Math.sin(a) * radius;
            placed.push({ ...arr[i], x, y, updatedAt: now() });
        }
    };

    placeRing(rootChildren, radius1, -Math.PI / 2);
    placeRing(rest, radius2, -Math.PI / 2 + 0.35);

    return {
        ...state,
        nodes: [root, ...placed],
        updatedAt: now(),
    };
}

function getNode(state: MindState, id?: string) {
    if (!id) return null;
    return state.nodes.find((n) => n.id === id) ?? null;
}

function centerOnNode(state: MindState, id: string): MindState {
    const n = getNode(state, id);
    if (!n) return state;
    // viewport shifts canvas; we center node in visible area using a stable target
    // since we don't know real container size here, we aim for 520x320 virtual center
    const targetX = 520;
    const targetY = 320;
    return {
        ...state,
        viewport: {
            ...state.viewport,
            x: targetX - n.x,
            y: targetY - n.y,
        },
        selectedId: id,
        updatedAt: now(),
    };
}

function buildTemplateAround(
    state: MindState,
    rootId: string,
    anchorTitle?: string
): MindState {
    const root = getNode(state, rootId);
    if (!root) return state;

    const blocks = [
        { t: "Thèse", body: "Pourquoi c’est intéressant (ou non) en 5 lignes.", tone: "none" as NodeTone },
        { t: "Risques", body: "3 risques concrets (dette, marges, cycle, concurrence, réglementation...).", tone: "bad" as NodeTone },
        { t: "Catalyseurs", body: "Ce qui peut faire bouger le cours (résultats, guidance, produit, macro...).", tone: "good" as NodeTone },
        { t: "Valorisation", body: "PER / croissance / marge / comparaison secteur. Conclusion simple.", tone: "mid" as NodeTone },
        { t: "Technique", body: "Tendance, niveaux, zones, momentum. Ce qui invalide / confirme.", tone: "mid" as NodeTone },
        { t: "News", body: "1–3 infos à retenir + impact sur la thèse.", tone: "none" as NodeTone },
    ];

    const baseR = 230;
    const startA = -Math.PI / 2;

    let next = { ...state };
    const newNodes: MindNode[] = [];
    const newEdges: MindEdge[] = [];

    for (let i = 0; i < blocks.length; i++) {
        const a = startA + (i * (Math.PI * 2)) / blocks.length;
        const x = root.x + Math.cos(a) * baseR;
        const y = root.y + Math.sin(a) * baseR;

        const nn: MindNode = {
            id: uid("n"),
            title: blocks[i].t,
            body: blocks[i].body,
            tone: blocks[i].tone,
            x,
            y,
            createdAt: now(),
            updatedAt: now(),
        };
        newNodes.push(nn);
        newEdges.push({ id: uid("e"), from: root.id, to: nn.id });
    }

    // Optional: rename root with anchorTitle
    const nodes = next.nodes.map((n) =>
        n.id === root.id && anchorTitle
            ? { ...n, title: sanitizeTitle(anchorTitle), updatedAt: now() }
            : n
    );

    next = {
        ...next,
        nodes: [...nodes, ...newNodes],
        edges: [...next.edges, ...newEdges],
        updatedAt: now(),
    };

    return next;
}

function exportState(state: MindState) {
    const payload = JSON.stringify(state, null, 2);
    return payload;
}

function importState(raw: string): MindState | null {
    const parsed = safeParseJSON<MindState>(raw);
    if (!parsed) return null;
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) return null;
    if (!parsed.edges || !Array.isArray(parsed.edges)) return null;
    // refresh TTL on import
    return setWithTTL({
        ...parsed,
        version: 1,
        updatedAt: now(),
        viewport: parsed.viewport ?? { x: 0, y: 0, zoom: 1 },
    });
}

function prettyTimeLeft(expiresAt: number) {
    const ms = Math.max(0, expiresAt - now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h <= 0) return `${m} min`;
    return `${h} h ${m} min`;
}

export default function Community() {
    const router = useRouter();
    const seedSymbol = typeof router.query.symbol === "string" ? router.query.symbol : "";

    const [state, setState] = useState<MindState>(() => defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined));
    const [hydrated, setHydrated] = useState(false);

    const [newTitle, setNewTitle] = useState("");
    const [search, setSearch] = useState("");
    const [hoverId, setHoverId] = useState<string | null>(null);

    const [isPanning, setIsPanning] = useState(false);
    const panRef = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

    const [dragId, setDragId] = useState<string | null>(null);
    const dragRef = useRef<{ dx: number; dy: number } | null>(null);

    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState("");

    const canvasRef = useRef<HTMLDivElement | null>(null);

    // hydrate from localStorage
    useEffect(() => {
        const saved = safeParseJSON<MindState>(localStorage.getItem(STORAGE_KEY));
        if (saved && !isExpired(saved)) {
            setState(saved);
        } else {
            // if expired, reset cleanly
            const fresh = defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
            setState(fresh);
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // if seedSymbol changes (rare), offer a nice behavior: rename root if still defaultish
    useEffect(() => {
        if (!hydrated) return;
        if (!seedSymbol) return;
        setState((prev) => {
            const root = prev.nodes[0];
            if (!root) return prev;
            const maybeDefault = root.title === "Nouvelle note" || root.title.startsWith("Notes:");
            if (!maybeDefault) return prev;
            return setWithTTL({
                ...prev,
                nodes: prev.nodes.map((n, i) =>
                    i === 0 ? { ...n, title: sanitizeTitle(`Notes: ${seedSymbol}`), updatedAt: now() } : n
                ),
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seedSymbol, hydrated]);

    // persist (debounced)
    useEffect(() => {
        if (!hydrated) return;
        const t = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(setWithTTL(state)));
        }, 120);
        return () => clearTimeout(t);
    }, [state, hydrated]);

    // auto cleanup on expire
    useEffect(() => {
        if (!hydrated) return;
        const id = window.setInterval(() => {
            setState((prev) => {
                if (!isExpired(prev)) return prev;
                const fresh = defaultState();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
                return fresh;
            });
        }, 15000);
        return () => window.clearInterval(id);
    }, [hydrated]);

    const selected = useMemo(() => getNode(state, state.selectedId), [state]);

    const filteredNodes = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return state.nodes;
        return state.nodes.filter((n) => {
            return (
                n.title.toLowerCase().includes(q) ||
                n.body.toLowerCase().includes(q)
            );
        });
    }, [state.nodes, search]);

    const edgeLines = useMemo(() => {
        const byId = new Map(state.nodes.map((n) => [n.id, n]));
        return state.edges
            .map((e) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) return null;
                return { id: e.id, a, b };
            })
            .filter(Boolean) as { id: string; a: MindNode; b: MindNode }[];
    }, [state.edges, state.nodes]);

    function select(id: string) {
        setState((prev) => ({ ...prev, selectedId: id, updatedAt: now() }));
    }

    function addNode(parentId?: string) {
        const title = sanitizeTitle(newTitle) || "Nouvelle idée";
        const base = parentId ? getNode(state, parentId) : state.nodes[0];
        const bx = base?.x ?? 520;
        const by = base?.y ?? 320;

        const n: MindNode = {
            id: uid("n"),
            title,
            body: "",
            tone: "none",
            x: bx + 220 + (Math.random() * 40 - 20),
            y: by + (Math.random() * 120 - 60),
            createdAt: now(),
            updatedAt: now(),
        };

        setState((prev) => {
            const next: MindState = {
                ...prev,
                nodes: [...prev.nodes, n],
                selectedId: n.id,
                updatedAt: now(),
            };
            if (parentId) {
                return {
                    ...next,
                    edges: [...next.edges, { id: uid("e"), from: parentId, to: n.id }],
                };
            }
            return next;
        });

        setNewTitle("");
    }

    function removeSelected() {
        const id = state.selectedId;
        if (!id) return;
        // never delete root if it's the only node
        if (state.nodes.length === 1) return;

        setState((prev) => {
            const rootId = prev.nodes[0]?.id;
            const nextNodes = prev.nodes.filter((n) => n.id !== id);
            const nextEdges = prev.edges.filter((e) => e.from !== id && e.to !== id);
            const nextSelected = id === rootId ? (nextNodes[0]?.id ?? undefined) : (rootId ?? nextNodes[0]?.id);
            return { ...prev, nodes: nextNodes, edges: nextEdges, selectedId: nextSelected, updatedAt: now() };
        });
    }

    function updateSelected(patch: Partial<MindNode>) {
        const id = state.selectedId;
        if (!id) return;
        setState((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
                n.id === id ? { ...n, ...patch, updatedAt: now() } : n
            ),
            updatedAt: now(),
        }));
    }

    function connectToRoot(id: string) {
        const root = state.nodes[0];
        if (!root) return;
        // avoid duplicate edges
        const exists = state.edges.some((e) => e.from === root.id && e.to === id);
        if (exists) return;
        setState((prev) => ({
            ...prev,
            edges: [...prev.edges, { id: uid("e"), from: root.id, to: id }],
            updatedAt: now(),
        }));
    }

    function applyTemplate() {
        const root = state.nodes[0];
        if (!root) return;
        setState((prev) => buildTemplateAround(prev, root.id, root.title));
    }

    function resetAll() {
        const fresh = defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        setState(fresh);
    }

    function doAutoArrange() {
        setState((prev) => autoArrange(prev));
    }

    function copyExport() {
        const text = exportState(state);
        navigator.clipboard?.writeText(text);
    }

    function doImport() {
        const st = importState(importText);
        if (!st) return;
        setState(st);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
        setImportOpen(false);
        setImportText("");
    }

    // panning & zoom
    function onCanvasMouseDown(e: React.MouseEvent) {
        // Only pan if clicking empty canvas (not on nodes)
        if ((e.target as HTMLElement)?.dataset?.node === "1") return;
        setIsPanning(true);
        panRef.current = { sx: e.clientX, sy: e.clientY, vx: state.viewport.x, vy: state.viewport.y };
    }

    function onCanvasMouseMove(e: React.MouseEvent) {
        if (dragId && dragRef.current) {
            const rect = canvasRef.current?.getBoundingClientRect();
            const mx = e.clientX - (rect?.left ?? 0);
            const my = e.clientY - (rect?.top ?? 0);

            const worldX = (mx - state.viewport.x) / state.viewport.zoom;
            const worldY = (my - state.viewport.y) / state.viewport.zoom;

            setState((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) =>
                    n.id === dragId
                        ? { ...n, x: worldX - dragRef.current!.dx, y: worldY - dragRef.current!.dy, updatedAt: now() }
                        : n
                ),
                updatedAt: now(),
            }));
            return;
        }

        if (!isPanning || !panRef.current) return;
        const dx = e.clientX - panRef.current.sx;
        const dy = e.clientY - panRef.current.sy;
        setState((prev) => ({
            ...prev,
            viewport: { ...prev.viewport, x: panRef.current!.vx + dx, y: panRef.current!.vy + dy },
            updatedAt: now(),
        }));
    }

    function onCanvasMouseUp() {
        setIsPanning(false);
        panRef.current = null;
        setDragId(null);
        dragRef.current = null;
    }

    function onWheel(e: React.WheelEvent) {
        if (!canvasRef.current) return;
        // Ctrl/trackpad: smoother; we allow standard wheel too
        e.preventDefault();

        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.06 : 0.94;
        const nextZoom = clamp(state.viewport.zoom * factor, 0.65, 1.6);

        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // keep the point under mouse stable
        const wx = (mx - state.viewport.x) / state.viewport.zoom;
        const wy = (my - state.viewport.y) / state.viewport.zoom;

        const nx = mx - wx * nextZoom;
        const ny = my - wy * nextZoom;

        setState((prev) => ({
            ...prev,
            viewport: { x: nx, y: ny, zoom: nextZoom },
            updatedAt: now(),
        }));
    }

    function startDragNode(e: React.MouseEvent, node: MindNode) {
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        const mx = e.clientX - (rect?.left ?? 0);
        const my = e.clientY - (rect?.top ?? 0);
        const wx = (mx - state.viewport.x) / state.viewport.zoom;
        const wy = (my - state.viewport.y) / state.viewport.zoom;

        setDragId(node.id);
        dragRef.current = { dx: wx - node.x, dy: wy - node.y };
        select(node.id);
    }

    const headerTitle = "FinanceLab";
    const headerSub = "Notes (mindmap) — espace perso · conservation 24h";

    const timeLeft = prettyTimeLeft(state.expiresAt);

    return (
        <div style={styles.page}>
            <div style={styles.bgGlow} />
            <div style={styles.container}>
                {/* Topbar */}
                <div style={styles.topbar}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>FL</div>
                        <div>
                            <div style={styles.brandTitle}>{headerTitle}</div>
                            <div style={styles.brandSub}>{headerSub}</div>
                        </div>
                    </div>

                    <div style={styles.nav}>
                        <Link href="/" style={styles.navLink}>Dashboard</Link>
                        <Link href="/concept" style={styles.navLink}>Concept</Link>
                        <Link href="/community" style={{ ...styles.navLink, ...styles.navLinkActive }}>Notes</Link>
                    </div>

                    <div style={styles.pill}>
                        <span style={styles.pillDot} />
                        <span>En ligne</span>
                    </div>
                </div>

                {/* Hero actions */}
                <div style={styles.hero}>
                    <div style={styles.heroTop}>
                        <div>
                            <h1 style={styles.h1}>Notes — MindMap</h1>
                            <p style={styles.lead}>
                                Un espace pour <strong>capturer</strong> et <strong>structurer</strong> tes idées (1 entreprise, 1 thèse, 3 risques, 2 catalyseurs…).
                                Les notes sont gardées <strong>24 heures</strong>, puis se réinitialisent.
                            </p>
                        </div>

                        <div style={styles.heroMeta}>
                            <div style={styles.metaCard}>
                                <div style={styles.metaLabel}>Expiration</div>
                                <div style={styles.metaValue}>{timeLeft}</div>
                                <div style={styles.metaSub}>Reset automatique</div>
                            </div>
                            <div style={styles.metaCard}>
                                <div style={styles.metaLabel}>Zoom</div>
                                <div style={styles.metaValue}>{Math.round(state.viewport.zoom * 100)}%</div>
                                <div style={styles.metaSub}>Molette / trackpad</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.actionsRow}>
                        <div style={styles.addBox}>
                            <div style={styles.addLabel}>Créer une bulle</div>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Ex: Dette / Marge nette / Idée d’achat…"
                                style={styles.input}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") addNode(state.selectedId ?? state.nodes[0]?.id);
                                }}
                            />
                            <div style={styles.addHint}>
                                Entrée = ajoute en enfant de la bulle sélectionnée
                            </div>
                        </div>

                        <div style={styles.btnCol}>
                            <button style={styles.primaryBtn} onClick={() => addNode(state.selectedId ?? state.nodes[0]?.id)}>
                                Ajouter
                            </button>

                            <button style={styles.secondaryBtn} onClick={applyTemplate}>
                                Template analyse
                            </button>

                            <button style={styles.secondaryBtn} onClick={doAutoArrange}>
                                Auto-arrange
                            </button>
                        </div>

                        <div style={styles.searchBox}>
                            <div style={styles.addLabel}>Rechercher</div>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Filtrer titres / contenus…"
                                style={styles.input}
                            />
                            <div style={styles.addHint}>
                                {filteredNodes.length}/{state.nodes.length} bulles affichées
                            </div>
                        </div>
                    </div>

                    <div style={styles.quickRow}>
                        {["AAPL", "MSFT", "NVDA", "TSLA", "AIR.PA"].map((s) => (
                            <button
                                key={s}
                                style={styles.chip}
                                onClick={() => {
                                    // rename root and center
                                    setState((prev) => {
                                        const root = prev.nodes[0];
                                        if (!root) return prev;
                                        const next = {
                                            ...prev,
                                            nodes: prev.nodes.map((n, i) =>
                                                i === 0 ? { ...n, title: `Notes: ${s}`, updatedAt: now() } : n
                                            ),
                                            updatedAt: now(),
                                        };
                                        return centerOnNode(next, root.id);
                                    });
                                }}
                            >
                                {s}
                            </button>
                        ))}

                        <div style={{ flex: 1 }} />

                        <button style={styles.ghostBtn} onClick={() => setState((p) => centerOnNode(p, p.nodes[0]?.id ?? ""))}>
                            Centrer
                        </button>
                        <button style={styles.ghostBtn} onClick={() => setImportOpen(true)}>
                            Import
                        </button>
                        <button style={styles.ghostBtn} onClick={copyExport}>
                            Export
                        </button>
                        <button style={styles.dangerBtn} onClick={resetAll}>
                            Reset
                        </button>
                    </div>
                </div>

                {/* Main layout: Canvas + Side panel */}
                <div style={styles.mainGrid}>
                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        style={styles.canvas}
                        onMouseDown={onCanvasMouseDown}
                        onMouseMove={onCanvasMouseMove}
                        onMouseUp={onCanvasMouseUp}
                        onMouseLeave={onCanvasMouseUp}
                        onWheel={onWheel}
                    >
                        {/* Edge layer (SVG) */}
                        <svg style={styles.svgLayer}>
                            {edgeLines.map(({ id, a, b }) => {
                                const ax = (a.x * state.viewport.zoom) + state.viewport.x;
                                const ay = (a.y * state.viewport.zoom) + state.viewport.y;
                                const bx = (b.x * state.viewport.zoom) + state.viewport.x;
                                const by = (b.y * state.viewport.zoom) + state.viewport.y;

                                const selected = state.selectedId === a.id || state.selectedId === b.id;
                                return (
                                    <line
                                        key={id}
                                        x1={ax}
                                        y1={ay}
                                        x2={bx}
                                        y2={by}
                                        stroke={selected ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.14)"}
                                        strokeWidth={selected ? 2.2 : 1.4}
                                    />
                                );
                            })}
                        </svg>

                        {/* Nodes */}
                        {filteredNodes.map((n) => {
                            const x = (n.x * state.viewport.zoom) + state.viewport.x;
                            const y = (n.y * state.viewport.zoom) + state.viewport.y;
                            const isSel = state.selectedId === n.id;
                            const isHover = hoverId === n.id;

                            return (
                                <div
                                    key={n.id}
                                    data-node="1"
                                    style={{
                                        ...styles.node,
                                        ...(isSel ? styles.nodeSelected : {}),
                                        transform: `translate(${x - 90}px, ${y - 34}px) scale(${isSel ? 1.02 : 1})`,
                                        opacity: isHover || isSel ? 1 : 0.94,
                                    }}
                                    onMouseEnter={() => setHoverId(n.id)}
                                    onMouseLeave={() => setHoverId(null)}
                                    onMouseDown={(e) => startDragNode(e, n)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        select(n.id);
                                    }}
                                >
                                    <div style={styles.nodeTop}>
                                        <span style={toneDotStyle(n.tone)} />
                                        <div style={styles.nodeTitle}>{n.title}</div>
                                    </div>

                                    <div style={styles.nodeSub}>
                                        {n.body?.trim()
                                            ? n.body.trim().slice(0, 76) + (n.body.trim().length > 76 ? "…" : "")
                                            : "Clique pour écrire…"}
                                    </div>

                                    {/* Hover preview */}
                                    {(isHover && !isSel) && (
                                        <div style={styles.hoverCard}>
                                            <div style={styles.hoverTitle}>{n.title}</div>
                                            <div style={styles.hoverText}>
                                                {n.body?.trim() ? n.body.trim().slice(0, 180) : "Aucun détail pour le moment."}
                                            </div>
                                            <div style={styles.hoverHint}>Clique pour ouvrir</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Side panel */}
                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <div style={styles.panelTitle}>Détails</div>
                            <div style={styles.panelSub}>
                                {selected ? (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                                        <span style={toneDotStyle(selected.tone)} />
                                        <span style={{ opacity: 0.85 }}>{toneLabel(selected.tone)}</span>
                                    </span>
                                ) : (
                                    <span style={{ opacity: 0.7 }}>Sélectionne une bulle</span>
                                )}
                            </div>
                        </div>

                        {!selected ? (
                            <div style={styles.panelEmpty}>
                                <div style={{ opacity: 0.8, lineHeight: 1.6 }}>
                                    Clique une bulle pour éditer.
                                    <div style={{ marginTop: 10, opacity: 0.7 }}>
                                        Astuce : “Template analyse” te crée une structure complète en 1 clic.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.panelBody}>
                                <div style={styles.formRow}>
                                    <div style={styles.formLabel}>Titre</div>
                                    <input
                                        style={styles.formInput}
                                        value={selected.title}
                                        onChange={(e) => updateSelected({ title: sanitizeTitle(e.target.value) })}
                                        placeholder="Titre court…"
                                    />
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formLabel}>Signal</div>
                                    <div style={styles.toneRow}>
                                        {(["good", "mid", "bad", "none"] as NodeTone[]).map((t) => {
                                            const active = selected.tone === t;
                                            return (
                                                <button
                                                    key={t}
                                                    onClick={() => updateSelected({ tone: t })}
                                                    style={{
                                                        ...styles.toneBtn,
                                                        ...(active ? styles.toneBtnActive : {}),
                                                    }}
                                                >
                                                    <span style={toneDotStyle(t)} />
                                                    <span>{toneLabel(t)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formLabel}>Contenu</div>
                                    <textarea
                                        style={styles.formTextarea}
                                        value={selected.body}
                                        onChange={(e) => updateSelected({ body: e.target.value })}
                                        placeholder="Écris ta thèse, tes chiffres, tes risques…"
                                    />
                                </div>

                                <div style={styles.panelBtns}>
                                    <button
                                        style={styles.secondaryBtnWide}
                                        onClick={() => addNode(selected.id)}
                                    >
                                        Ajouter un enfant
                                    </button>

                                    <button
                                        style={styles.secondaryBtnWide}
                                        onClick={() => connectToRoot(selected.id)}
                                        disabled={selected.id === state.nodes[0]?.id}
                                    >
                                        Lier au centre
                                    </button>

                                    <button
                                        style={styles.dangerBtnWide}
                                        onClick={removeSelected}
                                        disabled={state.nodes.length <= 1}
                                    >
                                        Supprimer
                                    </button>
                                </div>

                                <div style={styles.metaFooter}>
                                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                                        Mis à jour : {new Date(selected.updatedAt).toLocaleString("fr-FR")}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Import modal */}
                {importOpen && (
                    <div style={modalStyles.overlay} onClick={() => setImportOpen(false)}>
                        <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                            <div style={modalStyles.title}>Import</div>
                            <div style={modalStyles.desc}>
                                Colle un export JSON ici (ça remplace la mindmap actuelle).
                            </div>

                            <textarea
                                style={modalStyles.textarea}
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder="{ ... }"
                            />

                            <div style={modalStyles.row}>
                                <button style={modalStyles.btnSoft} onClick={() => setImportOpen(false)}>
                                    Annuler
                                </button>
                                <button style={modalStyles.btn} onClick={doImport} disabled={!importText.trim()}>
                                    Importer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <div style={styles.footerLeft}>
                        <span style={styles.footerBadge}>FinanceLab</span>
                        <span style={{ opacity: 0.7 }}>· Notes personnelles (24h)</span>
                    </div>
                    <div style={{ opacity: 0.55 }}>
                        Tip: Drag & drop · Molette = zoom · Vide = pan
                    </div>
                </div>
            </div>
        </div>
    );
}

const modalStyles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.66)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
    },
    modal: {
        width: "100%",
        maxWidth: 720,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17,24,39,0.96)",
        backdropFilter: "blur(10px)",
        padding: 18,
    },
    title: { fontWeight: 900, fontSize: 16, marginBottom: 10 },
    desc: { opacity: 0.85, lineHeight: 1.55, marginBottom: 12 },
    textarea: {
        width: "100%",
        minHeight: 240,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        color: "#EAF0FF",
        padding: 12,
        outline: "none",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize: 12,
        lineHeight: 1.55,
    },
    row: { display: "flex", gap: 10, marginTop: 12 },
    btnSoft: {
        flex: 1,
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        fontWeight: 900,
        cursor: "pointer",
    },
    btn: {
        flex: 1,
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))",
        color: "#07101F",
        fontWeight: 900,
        cursor: "pointer",
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
    container: { position: "relative", maxWidth: 1200, margin: "0 auto", padding: "24px 18px 34px" },

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

    nav: { display: "flex", gap: 10, flexWrap: "wrap" },
    navLink: {
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 900,
    },
    navLinkActive: {
        background: "rgba(99,102,241,0.22)",
        border: "1px solid rgba(99,102,241,0.35)",
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
        fontWeight: 800,
    },
    pillDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "#22c55e",
        boxShadow: "0 0 0 6px rgba(34,197,94,0.12)",
    },

    hero: {
        marginTop: 18,
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
    },
    heroTop: { display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" },
    heroMeta: { display: "flex", gap: 10, flexWrap: "wrap" },
    metaCard: {
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.18)",
        minWidth: 160,
    },
    metaLabel: { fontSize: 12, opacity: 0.7, marginBottom: 6, fontWeight: 800 },
    metaValue: { fontSize: 18, fontWeight: 950, letterSpacing: -0.2 },
    metaSub: { marginTop: 4, fontSize: 12, opacity: 0.6 },

    h1: { margin: 0, fontSize: 28, letterSpacing: -0.4 },
    lead: { marginTop: 10, marginBottom: 0, opacity: 0.85, lineHeight: 1.5, maxWidth: 720 },

    actionsRow: {
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr 1fr",
        gap: 12,
    },

    addBox: {
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.20)",
    },
    addLabel: { fontSize: 12, opacity: 0.7, marginBottom: 8, fontWeight: 800 },
    addHint: { fontSize: 12, opacity: 0.6, marginTop: 8 },

    searchBox: {
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.20)",
    },

    input: {
        width: "100%",
        padding: "12px 12px",
        fontSize: 14,
        borderRadius: 12,
        outline: "none",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
    },

    btnCol: { display: "grid", gap: 10 },

    primaryBtn: {
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(56,189,248,0.55))",
        color: "#07101F",
        fontWeight: 950,
        cursor: "pointer",
    },
    secondaryBtn: {
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        fontWeight: 950,
        cursor: "pointer",
    },

    quickRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" },
    chip: {
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 900,
    },
    ghostBtn: {
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.18)",
        color: "#EAF0FF",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 900,
    },
    dangerBtn: {
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.08)",
        color: "#EAF0FF",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 950,
    },

    mainGrid: {
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "1.7fr 1fr",
        gap: 14,
    },

    canvas: {
        position: "relative",
        height: 640,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
        cursor: "grab",
    },
    svgLayer: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    },

    node: {
        position: "absolute",
        width: 180,
        padding: 12,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.26)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 14px 50px rgba(0,0,0,0.25)",
        transition: "transform 180ms ease, border-color 180ms ease, background 180ms ease, opacity 180ms ease",
        userSelect: "none",
    },
    nodeSelected: {
        border: "1px solid rgba(99,102,241,0.55)",
        background: "rgba(99,102,241,0.08)",
    },
    nodeTop: { display: "flex", alignItems: "center", gap: 10 },
    nodeTitle: { fontWeight: 950, letterSpacing: -0.2, lineHeight: 1.15 },
    nodeSub: { marginTop: 8, opacity: 0.72, fontSize: 12, lineHeight: 1.35 },

    hoverCard: {
        position: "absolute",
        left: "100%",
        top: 0,
        marginLeft: 12,
        width: 280,
        padding: 12,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17,24,39,0.96)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
        pointerEvents: "none",
    },
    hoverTitle: { fontWeight: 950, marginBottom: 6 },
    hoverText: { opacity: 0.86, fontSize: 12, lineHeight: 1.5 },
    hoverHint: { marginTop: 10, opacity: 0.65, fontSize: 11 },

    panel: {
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        overflow: "hidden",
        minHeight: 640,
    },
    panelHeader: { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    panelTitle: { fontWeight: 950, letterSpacing: -0.2 },
    panelSub: { marginTop: 6, fontSize: 12, opacity: 0.75 },
    panelEmpty: { padding: 14 },

    panelBody: { padding: 14, display: "grid", gap: 12 },

    formRow: { display: "grid", gap: 8 },
    formLabel: { fontSize: 12, opacity: 0.75, fontWeight: 900 },
    formInput: {
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: "#EAF0FF",
        outline: "none",
        fontWeight: 800,
    },
    formTextarea: {
        width: "100%",
        minHeight: 190,
        resize: "vertical",
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.18)",
        color: "#EAF0FF",
        outline: "none",
        lineHeight: 1.55,
    },

    toneRow: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
    toneBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        fontWeight: 950,
        cursor: "pointer",
    },
    toneBtnActive: {
        background: "rgba(99,102,241,0.18)",
        border: "1px solid rgba(99,102,241,0.35)",
    },

    panelBtns: { display: "grid", gap: 10, marginTop: 4 },
    secondaryBtnWide: {
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        fontWeight: 950,
        cursor: "pointer",
    },
    dangerBtnWide: {
        padding: "12px 12px",
        borderRadius: 14,
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.08)",
        color: "#EAF0FF",
        fontWeight: 950,
        cursor: "pointer",
    },

    metaFooter: { marginTop: 6 },

    footer: {
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        fontSize: 12,
    },
    footerLeft: { display: "flex", alignItems: "center", gap: 10 },
    footerBadge: {
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.06)",
        fontWeight: 950,
    },
};