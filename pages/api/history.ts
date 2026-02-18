import type { NextApiRequest, NextApiResponse } from "next";

type Range = "1m" | "3m" | "6m" | "1y";
type PricePoint = { date: string; close: number; volume?: number };

type OkResponse = { symbol: string; range: Range; points: PricePoint[] };
type ErrResponse = { error: string; details?: any };

const RANGE_TO_DAYS: Record<Range, number> = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
};

function normalizeSymbol(input: string) {
    return input.trim().toUpperCase();
}

function normalizeRange(input: string): Range {
    const r = input.trim().toLowerCase() as Range;
    return (["1m", "3m", "6m", "1y"] as const).includes(r) ? r : "6m";
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<OkResponse | ErrResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const symbol = normalizeSymbol(String(req.query.symbol ?? ""));
    const range = normalizeRange(String(req.query.range ?? "6m"));

    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "Server misconfigured: missing FMP_API_KEY" });
    }

    const days = RANGE_TO_DAYS[range];

    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
        symbol
    )}?timeseries=${days}&apikey=${encodeURIComponent(apiKey)}`;

    try {
        const r = await fetch(url, { headers: { Accept: "application/json" } });

        if (!r.ok) {
            const text = await r.text().catch(() => "");
            res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
            return res.status(r.status).json({
                error: "FMP request failed",
                details: { status: r.status, body: text.slice(0, 250) },
            });
        }

        const j = await r.json();
        const hist = Array.isArray(j?.historical) ? j.historical : [];

        const points: PricePoint[] = hist
            .slice()
            .reverse()
            .map((x: any) => ({
                date: String(x?.date ?? ""),
                close: Number(x?.close),
                volume: Number.isFinite(Number(x?.volume)) ? Number(x.volume) : undefined,
            }))
            .filter((p: PricePoint) => p.date && Number.isFinite(p.close));

        if (points.length === 0) {
            res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
            return res.status(404).json({
                error: "No historical data found for this symbol",
                details: { symbol, range },
            });
        }

        res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=86400");
        return res.status(200).json({ symbol, range, points });
    } catch (e: any) {
        res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
        return res.status(500).json({
            error: "Failed to fetch history",
            details: e?.message ?? String(e),
        });
    }
}