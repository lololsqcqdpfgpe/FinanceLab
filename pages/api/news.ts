import type { NextApiRequest, NextApiResponse } from "next";

type Article = { title: string; url: string; site: string; date: string };

async function tryJson(url: string) {
    const r = await fetch(url);
    if (!r.ok) return null;
    try {
        return await r.json();
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const symbol = String(req.query.symbol || "").trim();
    if (!symbol) return res.status(400).json({ error: "Symbol missing" });

    const apiKey = process.env.FMP_API_KEY;

    // 1) Tentative FMP (si tu as accès)
    if (apiKey) {
        const fmpUrl = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${encodeURIComponent(
            symbol
        )}&limit=10&apikey=${encodeURIComponent(apiKey)}`;

        const fmpData = await tryJson(fmpUrl);

        const fmpArticles: Article[] = Array.isArray(fmpData)
            ? fmpData.map((a: any) => ({
                title: a.title,
                url: a.url,
                site: a.site ?? "FMP",
                date: a.publishedDate ?? new Date().toISOString(),
            }))
            : [];

        // si FMP renvoie quelque chose, on retourne ça
        if (fmpArticles.length > 0) {
            return res.status(200).json({ source: "FMP", articles: fmpArticles });
        }
    }

    // 2) Fallback GRATUIT (pas de clé) : GDELT
    // On cherche des news liées au symbole (ex: TSLA / AAPL)
    const gdeltUrl =
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(symbol)}` +
        `&mode=artlist&format=json&maxrecords=10&sort=datedesc`;

    const gdeltData = await tryJson(gdeltUrl);

    const gdeltArticles: Article[] = Array.isArray(gdeltData?.articles)
        ? gdeltData.articles.map((a: any) => ({
            title: a.title,
            url: a.url,
            site: a.sourceCountry ?? a.sourceCollectionIdentifier ?? "GDELT",
            date: a.seendate ?? a.date ?? new Date().toISOString(),
        }))
        : [];

    return res.status(200).json({ source: "GDELT", articles: gdeltArticles });
}