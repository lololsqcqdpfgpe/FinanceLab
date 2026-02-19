import type { NextApiRequest, NextApiResponse } from "next";

type Article = {
    title: string;
    url: string;
    site: string;
    date: string;
};

async function safeFetchJson(url: string) {
    try {
        const r = await fetch(url, {
            headers: { Accept: "application/json" },
        });

        if (!r.ok) {
            console.log("News API error:", r.status);
            return null;
        }

        return await r.json();
    } catch (e) {
        console.log("News fetch failed:", e);
        return null;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const symbol = String(req.query.symbol || "").trim();

    if (!symbol) {
        return res.status(200).json({ articles: [] });
    }

    const apiKey = process.env.FMP_API_KEY;

    /* ================================
       1️⃣ Tentative FMP (si clé valide)
    =================================== */

    if (apiKey) {
        const fmpUrl = `https://financialmodelingprep.com/stable/news?tickers=${encodeURIComponent(
            symbol
        )}&limit=10&apikey=${encodeURIComponent(apiKey)}`;

        const fmpData = await safeFetchJson(fmpUrl);

        if (Array.isArray(fmpData) && fmpData.length > 0) {
            const articles: Article[] = fmpData.map((a: any) => ({
                title: a.title ?? "Sans titre",
                url: a.url ?? "#",
                site: a.site ?? "FMP",
                date: a.publishedDate ?? new Date().toISOString(),
            }));

            return res.status(200).json({ articles });
        }
    }

    /* ================================
       2️⃣ Fallback gratuit (GDELT)
    =================================== */

    const gdeltUrl =
        `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
            symbol
        )}&mode=artlist&format=json&maxrecords=10&sort=datedesc`;

    const gdeltData = await safeFetchJson(gdeltUrl);

    if (gdeltData?.articles && Array.isArray(gdeltData.articles)) {
        const articles: Article[] = gdeltData.articles.map((a: any) => ({
            title: a.title ?? "Sans titre",
            url: a.url ?? "#",
            site:
                a.sourceCountry ??
                a.sourceCollectionIdentifier ??
                "GDELT",
            date: a.seendate ?? new Date().toISOString(),
        }));

        return res.status(200).json({ articles });
    }

    /* ================================
       3️⃣ Rien trouvé → retourne vide
    =================================== */

    return res.status(200).json({ articles: [] });
}