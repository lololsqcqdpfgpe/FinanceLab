import type { NextApiRequest, NextApiResponse } from "next";

async function safeJson(url: string) {
    try {
        const r = await fetch(url);

        if (r.status === 429) {
            return { __error: "quota" };
        }

        if (!r.ok) {
            return null;
        }

        return await r.json();
    } catch {
        return null;
    }
}

function first(arr: any) {
    return Array.isArray(arr) && arr.length ? arr[0] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const symbol = String(req.query.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FMP_API_KEY" });

    const base = "https://financialmodelingprep.com/stable";
    const q = (path: string) =>
        `${base}/${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(apiKey)}`;

    try {
        // On lance tout en parallèle pour aller plus vite
        const [
            quoteArr,
            profileArr,
            ratiosArr,
            metricsArr,
            incomeArr,
            balanceArr,
            cashArr
        ] = await Promise.all([
            safeJson(q(`quote?symbol=${symbol}`)),
            safeJson(q(`profile?symbol=${symbol}`)),
            safeJson(q(`ratios?symbol=${symbol}`)),
            safeJson(q(`key-metrics?symbol=${symbol}`)),
            safeJson(q(`income-statement?symbol=${symbol}`)),
            safeJson(q(`balance-sheet-statement?symbol=${symbol}`)),
            safeJson(q(`cash-flow-statement?symbol=${symbol}`)),
        ]);

        // Gestion quota propre
        if (
            quoteArr?.__error === "quota" ||
            profileArr?.__error === "quota"
        ) {
            return res.status(429).json({
                error: "429 quota",
                message: "Limite API atteinte. Attends le reset FMP."
            });
        }

        const quote = first(quoteArr);
        const profile = first(profileArr);
        const ratios = first(ratiosArr);
        const metrics = first(metricsArr);
        const income = first(incomeArr);
        const balance = first(balanceArr);
        const cash = first(cashArr);

        if (!quote && !profile) {
            return res.status(404).json({ error: "No data found" });
        }

        const freeCashFlow =
            cash?.freeCashFlow ??
            (typeof cash?.operatingCashFlow === "number" &&
                typeof cash?.capitalExpenditure === "number"
                ? cash.operatingCashFlow - Math.abs(cash.capitalExpenditure)
                : null);

        return res.status(200).json({
            symbol,

            // Identité
            name: profile?.companyName ?? quote?.name ?? null,
            sector: profile?.sector ?? null,
            industry: profile?.industry ?? null,
            country: profile?.country ?? null,
            exchange: quote?.exchange ?? null,
            description: profile?.description ?? null,

            // Marché
            price: quote?.price ?? null,
            marketCap: quote?.marketCap ?? null,
            volume: quote?.volume ?? null,
            dayLow: quote?.dayLow ?? null,
            dayHigh: quote?.dayHigh ?? null,
            yearLow: quote?.yearLow ?? null,
            yearHigh: quote?.yearHigh ?? null,

            // Ratios
            pe: quote?.pe ?? ratios?.priceEarningsRatio ?? null,
            eps: quote?.eps ?? null,
            pb: ratios?.priceToBookRatio ?? null,
            ps: ratios?.priceToSalesRatio ?? null,
            roe: ratios?.returnOnEquity ?? metrics?.roe ?? null,
            roa: ratios?.returnOnAssets ?? metrics?.roa ?? null,
            netMargin: ratios?.netProfitMargin ?? metrics?.netProfitMargin ?? null,
            operatingMargin: metrics?.operatingProfitMargin ?? null,
            grossMargin: metrics?.grossProfitMargin ?? null,

            // Résultats
            period: income?.date ?? null,
            revenue: income?.revenue ?? null,
            ebitda: income?.ebitda ?? null,
            operatingIncome: income?.operatingIncome ?? null,
            netIncome: income?.netIncome ?? null,

            // Bilan
            totalDebt: balance?.totalDebt ?? null,
            cashAndCashEquivalents: balance?.cashAndCashEquivalents ?? null,
            totalEquity: balance?.totalStockholdersEquity ?? null,

            // Cash flow
            operatingCashFlow: cash?.operatingCashFlow ?? null,
            capitalExpenditure: cash?.capitalExpenditure ?? null,
            freeCashFlow,
        });

    } catch (e) {
        return res.status(500).json({ error: "Server error" });
    }
}