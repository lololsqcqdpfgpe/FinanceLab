import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const symbol = String(req.query.symbol || "").trim();
    const range = String(req.query.range || "6m").trim(); // 1m | 3m | 6m | 1y

    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    // Mets ta clé ici (comme dans tes autres routes API)
    const apiKey = "YOUR_API_KEY_HERE";

    const days =
        range === "1m" ? 30 :
            range === "3m" ? 90 :
                range === "1y" ? 365 :
                    180; // 6m par défaut

    try {
        const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(
            symbol
        )}?timeseries=${days}&apikey=${apiKey}`;

        const r = await fetch(url);
        const j = await r.json();

        const hist = Array.isArray(j?.historical) ? j.historical : [];
        const points = hist
            .slice()
            .reverse()
            .map((x: any) => ({
                date: String(x.date),
                close: Number(x.close),
                volume: Number(x.volume ?? 0),
            }))
            .filter((p) => Number.isFinite(p.close));

        return res.status(200).json({ symbol, range, points });
    } catch {
        return res.status(500).json({ error: "Failed to fetch history" });
    }
}