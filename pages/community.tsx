import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import type { CSSProperties } from "react";

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
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Math.random().toString(16).slice(2)}`;
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
        flex: "0 0 auto",
    };
    if (t === "good") return { ...base, background: "#22c55e", boxShadow: "0 0 0 6px rgba(34,197,94,0.12)" };
    if (t === "mid") return { ...base, background: "#f59e0b", boxShadow: "0 0 0 6px rgba(245,158,11,0.12)" };
    if (t === "bad") return { ...base, background: "#ef4444", boxShadow: "0 0 0 6px rgba(239,68,68,0.12)" };
    return { ...base, background: "rgba(255,255,255,0.25)", boxShadow: "0 0 0 6px rgba(255,255,255,0.06)" };
}

function sanitizeTitle(s: string) {
    return s.replace(/\s+/g, " ").trim().slice(0, 60);
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

function defaultState(seedTitle?: string): MindState {
    const centerX = 520;
    const centerY = 320;

    const createdAt = now();
    const root: MindNode = {
        id: uid("root"),
        title: seedTitle ? sanitizeTitle(seedTitle) : "Nouvelle note",
        body: "",
        tone: "none",
        x: centerX,
        y: centerY,
        createdAt,
        updatedAt: createdAt,
    };

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

/** auto arrange in a neat radial pattern around the root */
function autoArrange(state: MindState): MindState {
    if (!state.nodes.length) return state;
    const root = state.nodes[0];
    const others = state.nodes.slice(1);

    const rootChildrenIds = new Set(state.edges.filter((e) => e.from === root.id).map((e) => e.to));
    const rootChildren = others.filter((n) => rootChildrenIds.has(n.id));
    const rest = others.filter((n) => !rootChildrenIds.has(n.id));

    const placed: MindNode[] = [];
    const radius1 = 210;
    const radius2 = 370;

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

    return { ...state, nodes: [root, ...placed], updatedAt: now() };
}

function getNode(state: MindState, id?: string) {
    if (!id) return null;
    return state.nodes.find((n) => n.id === id) ?? null;
}

function centerOnNode(state: MindState, id: string): MindState {
    const n = getNode(state, id);
    if (!n) return state;
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

function buildTemplateAround(state: MindState, rootId: string, anchorTitle?: string): MindState {
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

    const baseR = 240;
    const startA = -Math.PI / 2;

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

    const nodes = state.nodes.map((n) =>
        n.id === root.id && anchorTitle ? { ...n, title: sanitizeTitle(anchorTitle), updatedAt: now() } : n
    );

    return {
        ...state,
        nodes: [...nodes, ...newNodes],
        edges: [...state.edges, ...newEdges],
        updatedAt: now(),
    };
}

function exportState(state: MindState) {
    return JSON.stringify(state, null, 2);
}

function importState(raw: string): MindState | null {
    const parsed = safeParseJSON<MindState>(raw);
    if (!parsed) return null;
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) return null;
    if (!parsed.edges || !Array.isArray(parsed.edges)) return null;
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

function snap(value: number, grid = 10) {
    return Math.round(value / grid) * grid;
}

export default function Community() {
    const router = useRouter();
    const reduced = usePrefersReducedMotion();

    const seedSymbol = typeof router.query.symbol === "string" ? router.query.symbol : "";

    const [state, setState] = useState<MindState>(() =>
        defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined)
    );
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
        if (typeof window === "undefined") return;
        const saved = safeParseJSON<MindState>(localStorage.getItem(STORAGE_KEY));
        if (saved && !isExpired(saved)) {
            setState(saved);
        } else {
            const fresh = defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
            setState(fresh);
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // if seedSymbol changes, rename root if still defaultish
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
            if (typeof window === "undefined") return;
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
        return state.nodes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
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

    const select = useCallback((id: string) => {
        setState((prev) => ({ ...prev, selectedId: id, updatedAt: now() }));
    }, []);

    const addNode = useCallback(
        (parentId?: string) => {
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
                    return { ...next, edges: [...next.edges, { id: uid("e"), from: parentId, to: n.id }] };
                }
                return next;
            });

            setNewTitle("");
        },
        [newTitle, state]
    );

    const removeSelected = useCallback(() => {
        const id = state.selectedId;
        if (!id) return;
        if (state.nodes.length === 1) return;

        setState((prev) => {
            const rootId = prev.nodes[0]?.id;
            const nextNodes = prev.nodes.filter((n) => n.id !== id);
            const nextEdges = prev.edges.filter((e) => e.from !== id && e.to !== id);
            const nextSelected = id === rootId ? (nextNodes[0]?.id ?? undefined) : rootId ?? nextNodes[0]?.id;
            return { ...prev, nodes: nextNodes, edges: nextEdges, selectedId: nextSelected, updatedAt: now() };
        });
    }, [state.selectedId, state.nodes.length]);

    const updateSelected = useCallback(
        (patch: Partial<MindNode>) => {
            const id = state.selectedId;
            if (!id) return;
            setState((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now() } : n)),
                updatedAt: now(),
            }));
        },
        [state.selectedId]
    );

    const connectToRoot = useCallback(
        (id: string) => {
            const root = state.nodes[0];
            if (!root) return;
            const exists = state.edges.some((e) => e.from === root.id && e.to === id);
            if (exists) return;
            setState((prev) => ({
                ...prev,
                edges: [...prev.edges, { id: uid("e"), from: root.id, to: id }],
                updatedAt: now(),
            }));
        },
        [state.nodes, state.edges]
    );

    const applyTemplate = useCallback(() => {
        const root = state.nodes[0];
        if (!root) return;
        setState((prev) => buildTemplateAround(prev, root.id, root.title));
    }, [state.nodes]);

    const resetAll = useCallback(() => {
        const fresh = defaultState(seedSymbol ? `Notes: ${seedSymbol}` : undefined);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        setState(fresh);
    }, [seedSymbol]);

    const doAutoArrange = useCallback(() => {
        setState((prev) => autoArrange(prev));
    }, []);

    const copyExport = useCallback(() => {
        const text = exportState(state);
        navigator.clipboard?.writeText(text);
    }, [state]);

    const doImport = useCallback(() => {
        const st = importState(importText);
        if (!st) return;
        setState(st);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
        setImportOpen(false);
        setImportText("");
    }, [importText]);

    // keyboard shortcuts
    useEffect(() => {
        if (typeof window === "undefined") return;
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase?.() ?? "";
            const typing = tag === "input" || tag === "textarea";

            if (e.key === "Escape") {
                setImportOpen(false);
            }

            if (typing) return;

            // focus / convenience
            if (e.key.toLowerCase() === "n") addNode(state.selectedId ?? state.nodes[0]?.id);
            if (e.key.toLowerCase() === "a") doAutoArrange();
            if (e.key.toLowerCase() === "c") setState((p) => centerOnNode(p, p.selectedId ?? p.nodes[0]?.id ?? ""));
            if (e.key.toLowerCase() === "t") applyTemplate();
            if (e.key === "Backspace" || e.key === "Delete") removeSelected();
            if (e.key === "0") setState((p) => ({ ...p, viewport: { ...p.viewport, zoom: 1 }, updatedAt: now() }));
            if (e.key === "+" || e.key === "=") setState((p) => ({ ...p, viewport: { ...p.viewport, zoom: clamp(p.viewport.zoom * 1.08, 0.65, 1.8) }, updatedAt: now() }));
            if (e.key === "-" || e.key === "_") setState((p) => ({ ...p, viewport: { ...p.viewport, zoom: clamp(p.viewport.zoom * 0.92, 0.65, 1.8) }, updatedAt: now() }));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [addNode, applyTemplate, doAutoArrange, removeSelected, state.selectedId, state.nodes]);

    // panning & zoom
    function onCanvasMouseDown(e: React.MouseEvent) {
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
                        ? {
                            ...n,
                            x: snap(worldX - dragRef.current!.dx, 8),
                            y: snap(worldY - dragRef.current!.dy, 8),
                            updatedAt: now(),
                        }
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
        e.preventDefault();

        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.06 : 0.94;
        const nextZoom = clamp(state.viewport.zoom * factor, 0.65, 1.8);

        const rect = canvasRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

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

    const headerTitle = "MyFinanceLab";
    const headerSub = "Notes (mindmap) — espace perso · conservation 24h";

    const timeLeft = prettyTimeLeft(state.expiresAt);

    const rootId = state.nodes[0]?.id;
    const canDelete = state.nodes.length > 1 && !!state.selectedId && state.selectedId !== rootId;

    // minimap (simple)
    const minimap = useMemo(() => {
        const nodes = state.nodes;
        if (!nodes.length) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x);
            maxY = Math.max(maxY, n.y);
        }
        const pad = 40;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const w = Math.max(1, maxX - minX);
        const h = Math.max(1, maxY - minY);

        return { minX, minY, w, h };
    }, [state.nodes]);

    return (
        <div style={styles.page}>
            <style jsx global>{`
        .flx-hoverlift {
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }
        .flx-hoverlift:hover {
          transform: translateY(-1px);
        }
        .flx-btn:hover { transform: translateY(-1px); }
        .flx-btn { transition: transform 160ms ease, filter 160ms ease; }
        .flx-card {
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }
        .flx-node {
          will-change: transform;
        }
        @keyframes flx-pop {
          from { transform: translateY(6px) scale(0.98); opacity: 0; }
          to { transform: translateY(0px) scale(1); opacity: 1; }
        }
        @keyframes flx-softpulse {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0); }
          50% { box-shadow: 0 0 0 10px rgba(99,102,241,0.12); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0); }
        }
      `}</style>

            <div style={styles.bgGlow} />
            <div style={styles.container}>
                {/* Topbar */}
                <div style={styles.topbar}>
                    <div style={styles.brand}>
                        <div style={styles.logo}>MFL</div>
                        <div>
                            <div style={styles.brandTitle}>{headerTitle}</div>
                            <div style={styles.brandSub}>{headerSub}</div>
                        </div>
                    </div>

                    <div style={styles.nav}>
                        <Link href="/" style={styles.navLink} className="flx-hoverlift">
                            Dashboard
                        </Link>
                        <Link href="/concept" style={styles.navLink} className="flx-hoverlift">
                            Concept
                        </Link>
                        <Link href="/community" style={{ ...styles.navLink, ...styles.navLinkActive }}>
                            Notes
                        </Link>
                    </div>

                    <div style={styles.pill} title="Données locales (navigateur)">
                        <span style={styles.pillDot} />
                        <span>Local</span>
                    </div>
                </div>

                {/* Hero */}
                <div style={styles.hero}>
                    <div style={styles.heroTop}>
                        <div>
                            <h1 style={styles.h1}>Notes — MindMap</h1>
                            <p style={styles.lead}>
                                Un espace pour <strong>capturer</strong> et <strong>structurer</strong> tes idées (thèse, risques,
                                catalyseurs, valorisation, technique…). Les notes sont gardées <strong>24 heures</strong>, puis reset.
                            </p>

                            <div style={styles.hotkeys}>
                                <span style={styles.hk}>N</span> Ajouter · <span style={styles.hk}>T</span> Template ·{" "}
                                <span style={styles.hk}>A</span> Arrange · <span style={styles.hk}>C</span> Centrer ·{" "}
                                <span style={styles.hk}>Del</span> Supprimer
                            </div>
                        </div>

                        <div style={styles.heroMeta}>
                            <div style={styles.metaCard} className="flx-card">
                                <div style={styles.metaLabel}>Expiration</div>
                                <div style={styles.metaValue}>{timeLeft}</div>
                                <div style={styles.metaSub}>Reset automatique</div>
                            </div>
                            <div style={styles.metaCard} className="flx-card">
                                <div style={styles.metaLabel}>Zoom</div>
                                <div style={styles.metaValue}>{Math.round(state.viewport.zoom * 100)}%</div>
                                <div style={styles.metaSub}>Molette / trackpad</div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.actionsRow}>
                        <div style={styles.addBox} className="flx-card">
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
                            <div style={styles.addHint}>Entrée = ajoute en enfant de la bulle sélectionnée</div>
                        </div>

                        <div style={styles.btnCol}>
                            <button
                                style={styles.primaryBtn}
                                className="flx-btn"
                                onClick={() => addNode(state.selectedId ?? state.nodes[0]?.id)}
                            >
                                Ajouter
                            </button>

                            <button style={styles.secondaryBtn} className="flx-btn" onClick={applyTemplate}>
                                Template analyse
                            </button>

                            <button style={styles.secondaryBtn} className="flx-btn" onClick={doAutoArrange}>
                                Auto-arrange
                            </button>
                        </div>

                        <div style={styles.searchBox} className="flx-card">
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
                                className="flx-hoverlift"
                                onClick={() => {
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

                        <button
                            style={styles.ghostBtn}
                            className="flx-hoverlift"
                            onClick={() => setState((p) => centerOnNode(p, p.selectedId ?? p.nodes[0]?.id ?? ""))}
                            title="Raccourci: C"
                        >
                            Centrer
                        </button>
                        <button style={styles.ghostBtn} className="flx-hoverlift" onClick={() => setImportOpen(true)}>
                            Import
                        </button>
                        <button style={styles.ghostBtn} className="flx-hoverlift" onClick={copyExport}>
                            Export
                        </button>
                        <button style={styles.dangerBtn} className="flx-hoverlift" onClick={resetAll}>
                            Reset
                        </button>
                    </div>
                </div>

                {/* Main layout: Canvas + Side panel */}
                <div style={styles.mainGrid}>
                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        style={{
                            ...styles.canvas,
                            cursor: dragId ? "grabbing" : isPanning ? "grabbing" : "grab",
                        }}
                        onMouseDown={onCanvasMouseDown}
                        onMouseMove={onCanvasMouseMove}
                        onMouseUp={onCanvasMouseUp}
                        onMouseLeave={onCanvasMouseUp}
                        onWheel={onWheel}
                    >
                        {/* subtle grid */}
                        <div style={styles.gridOverlay} />

                        {/* Edge layer (SVG) */}
                        <svg style={styles.svgLayer}>
                            {edgeLines.map(({ id, a, b }) => {
                                const ax = a.x * state.viewport.zoom + state.viewport.x;
                                const ay = a.y * state.viewport.zoom + state.viewport.y;
                                const bx = b.x * state.viewport.zoom + state.viewport.x;
                                const by = b.y * state.viewport.zoom + state.viewport.y;

                                const selected = state.selectedId === a.id || state.selectedId === b.id;

                                // simple "glow" by drawing 2 lines
                                return (
                                    <g key={id}>
                                        <line
                                            x1={ax}
                                            y1={ay}
                                            x2={bx}
                                            y2={by}
                                            stroke={selected ? "rgba(99,102,241,0.24)" : "rgba(255,255,255,0.07)"}
                                            strokeWidth={selected ? 6 : 3.5}
                                            strokeLinecap="round"
                                        />
                                        <line
                                            x1={ax}
                                            y1={ay}
                                            x2={bx}
                                            y2={by}
                                            stroke={selected ? "rgba(99,102,241,0.75)" : "rgba(255,255,255,0.14)"}
                                            strokeWidth={selected ? 2.2 : 1.4}
                                            strokeLinecap="round"
                                        />
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Nodes */}
                        {filteredNodes.map((n) => {
                            const x = n.x * state.viewport.zoom + state.viewport.x;
                            const y = n.y * state.viewport.zoom + state.viewport.y;
                            const isSel = state.selectedId === n.id;
                            const isHover = hoverId === n.id;

                            return (
                                <div
                                    key={n.id}
                                    data-node="1"
                                    className="flx-node"
                                    style={{
                                        ...styles.node,
                                        ...(isSel ? styles.nodeSelected : {}),
                                        transform: `translate(${x - 90}px, ${y - 34}px) scale(${isSel ? 1.03 : 1})`,
                                        opacity: isHover || isSel ? 1 : 0.94,
                                        animation: !reduced && isSel ? "flx-softpulse 900ms ease-out" : "none",
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

                                    {/* quick actions */}
                                    <div style={styles.nodeActions}>
                                        <button
                                            type="button"
                                            style={styles.nodeMiniBtn}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                addNode(n.id);
                                            }}
                                            title="Ajouter un enfant"
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            style={styles.nodeMiniBtn}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                connectToRoot(n.id);
                                            }}
                                            title="Lier au centre"
                                            disabled={n.id === rootId}
                                        >
                                            ⤴
                                        </button>
                                    </div>

                                    {/* Hover preview */}
                                    {isHover && !isSel && (
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

                        {/* Minimap */}
                        {minimap && (
                            <div style={styles.minimapWrap}>
                                <div style={styles.minimapTitle}>Map</div>
                                <svg width={140} height={110} style={{ display: "block" }}>
                                    {/* viewport rect */}
                                    {(() => {
                                        const vw = 520; // virtual view width approximation
                                        const vh = 320; // virtual view height approximation
                                        const worldLeft = (-state.viewport.x) / state.viewport.zoom;
                                        const worldTop = (-state.viewport.y) / state.viewport.zoom;

                                        const scaleX = 140 / minimap.w;
                                        const scaleY = 110 / minimap.h;

                                        const rx = (worldLeft - minimap.minX) * scaleX;
                                        const ry = (worldTop - minimap.minY) * scaleY;
                                        const rw = (vw / state.viewport.zoom) * scaleX;
                                        const rh = (vh / state.viewport.zoom) * scaleY;

                                        return (
                                            <rect
                                                x={rx}
                                                y={ry}
                                                width={rw}
                                                height={rh}
                                                fill="rgba(99,102,241,0.10)"
                                                stroke="rgba(99,102,241,0.55)"
                                                strokeWidth={1}
                                                rx={6}
                                            />
                                        );
                                    })()}

                                    {/* nodes */}
                                    {state.nodes.map((n) => {
                                        const sx = ((n.x - minimap.minX) / minimap.w) * 140;
                                        const sy = ((n.y - minimap.minY) / minimap.h) * 110;
                                        const sel = n.id === state.selectedId;
                                        return (
                                            <circle
                                                key={n.id}
                                                cx={sx}
                                                cy={sy}
                                                r={sel ? 3.2 : 2.2}
                                                fill={sel ? "rgba(56,189,248,0.95)" : "rgba(255,255,255,0.55)"}
                                            />
                                        );
                                    })}
                                </svg>
                            </div>
                        )}
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
                                                    className="flx-hoverlift"
                                                    type="button"
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
                                        className="flx-btn"
                                        onClick={() => addNode(selected.id)}
                                        type="button"
                                    >
                                        Ajouter un enfant
                                    </button>

                                    <button
                                        style={styles.secondaryBtnWide}
                                        className="flx-btn"
                                        onClick={() => connectToRoot(selected.id)}
                                        disabled={selected.id === rootId}
                                        type="button"
                                    >
                                        Lier au centre
                                    </button>

                                    <button
                                        style={styles.dangerBtnWide}
                                        className="flx-btn"
                                        onClick={removeSelected}
                                        disabled={!canDelete}
                                        type="button"
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
                            <div style={modalStyles.desc}>Colle un export JSON ici (ça remplace la mindmap actuelle).</div>

                            <textarea
                                style={modalStyles.textarea}
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder="{ ... }"
                            />

                            <div style={modalStyles.row}>
                                <button style={modalStyles.btnSoft} className="flx-btn" onClick={() => setImportOpen(false)} type="button">
                                    Annuler
                                </button>
                                <button
                                    style={modalStyles.btn}
                                    className="flx-btn"
                                    onClick={doImport}
                                    disabled={!importText.trim()}
                                    type="button"
                                >
                                    Importer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <div style={styles.footerLeft}>
                        <span style={styles.footerBadge}>MyFinanceLab</span>
                        <span style={{ opacity: 0.7 }}>· Notes personnelles (24h)</span>
                    </div>
                    <div style={{ opacity: 0.55 }}>Tip: Drag & drop · Molette = zoom · Vide = pan</div>
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
        fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
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
        width: 44,
        height: 44,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        fontWeight: 950,
        letterSpacing: 0.4,
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
        fontWeight: 900,
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
    lead: { marginTop: 10, marginBottom: 0, opacity: 0.85, lineHeight: 1.5, maxWidth: 760 },

    hotkeys: {
        marginTop: 12,
        opacity: 0.72,
        fontSize: 12,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
    },
    hk: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.22)",
        fontWeight: 900,
    },

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
    },
    gridOverlay: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        opacity: 0.10,
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

    nodeActions: {
        marginTop: 10,
        display: "flex",
        gap: 8,
        opacity: 0.85,
    },
    nodeMiniBtn: {
        width: 34,
        height: 30,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: "#EAF0FF",
        fontWeight: 950,
        cursor: "pointer",
    },

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
        animation: "flx-pop 140ms ease-out",
    },
    hoverTitle: { fontWeight: 950, marginBottom: 6 },
    hoverText: { opacity: 0.86, fontSize: 12, lineHeight: 1.5 },
    hoverHint: { marginTop: 10, opacity: 0.65, fontSize: 11 },

    minimapWrap: {
        position: "absolute",
        right: 12,
        bottom: 12,
        width: 160,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.28)",
        backdropFilter: "blur(10px)",
        padding: 10,
        boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        pointerEvents: "none",
    },
    minimapTitle: {
        fontSize: 11,
        opacity: 0.75,
        fontWeight: 900,
        marginBottom: 8,
        letterSpacing: 0.2,
    },

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