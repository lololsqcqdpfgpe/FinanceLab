// pages/api/news.ts
import type { NextApiRequest, NextApiResponse } from "next";

type Article = { title: string; url: string; site: string; date: string };

function isoDate(d: Date) {
    // YYYY-MM-DD
    return d.toISOString().slice(0, 10);
}

async function fetchJson(url: string) {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text().catch(() => "");
    let json: any = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = null;
    }
    return { ok: r.ok, status: r.status, json, text };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Symbol missing" });

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FINNHUB_API_KEY" });

    // Finnhub: company-news nécessite from/to (YYYY-MM-DD)
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 14); // 14 derniers jours

    const base = "https://finnhub.io/api/v1";
    const url =
        `${base}/company-news?symbol=${encodeURIComponent(symbol)}` +
        `&from=${encodeURIComponent(isoDate(from))}` +
        `&to=${encodeURIComponent(isoDate(to))}` +
        `&token=${encodeURIComponent(apiKey)}`;

    try {
        const r = await fetchJson(url);

        // Si quota / token invalide / erreur API => on renvoie 200 avec articles=[] (comme ça ton dashboard ne casse pas)
        if (!r.ok) {
            res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
            return res.status(200).json({
                source: "FINNHUB",
                articles: [] as Article[],
                error: `Finnhub news error (${r.status})`,
            });
        }

        const raw = Array.isArray(r.json) ? r.json : [];

        const articles: Article[] = raw
            .filter((a: any) => a?.headline && a?.url)
            .slice(0, 12)
            .map((a: any) => ({
                title: String(a.headline),
                url: String(a.url),
                site: a.source ? String(a.source) : "Finnhub",
                date: a.datetime ? new Date(Number(a.datetime) * 1000).toISOString() : new Date().toISOString(),
            }));

        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
        return res.status(200).json({ source: "FINNHUB", articles });
    } catch {
        // Réseau / timeout => pareil: on ne casse pas l’UI
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json({
            source: "FINNHUB",
            articles: [] as Article[],
            error: "Network error while fetching Finnhub news",
        });
    }
}