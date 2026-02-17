import type { NextApiRequest, NextApiResponse } from "next";

async function safeJson(url: string) {
    const r = await fetch(url);
    if (!r.ok) return null;
    try {
        return await r.json();
    } catch {
        return null;
    }
}

function first(arr: any) {
    return Array.isArray(arr) && arr.length ? arr[0] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const symbol = String(req.query.symbol || "").trim();
    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FMP_API_KEY" });

    const base = "https://financialmodelingprep.com/stable";
    const q = (path: string) => `${base}/${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(apiKey)}`;

    // 1) Données marché (ça, on sait que ça marche chez toi)
    const quoteArr = await safeJson(q(`quote?symbol=${encodeURIComponent(symbol)}`));
    const quote = first(quoteArr);

    // 2) Profil entreprise (secteur, industrie, description…)
    const profileArr = await safeJson(q(`profile?symbol=${encodeURIComponent(symbol)}`));
    const profile = first(profileArr);

    // 3) Ratios (peut être vide selon plan)
    const ratiosArr = await safeJson(q(`ratios?symbol=${encodeURIComponent(symbol)}`));
    const ratios = first(ratiosArr);

    // 4) Key metrics (peut être vide selon plan)
    const metricsArr = await safeJson(q(`key-metrics?symbol=${encodeURIComponent(symbol)}`));
    const metrics = first(metricsArr);

    // 5) États financiers (souvent plus restrictif : on tente)
    const incomeArr = await safeJson(q(`income-statement?symbol=${encodeURIComponent(symbol)}`));
    const income = first(incomeArr);

    const balanceArr = await safeJson(q(`balance-sheet-statement?symbol=${encodeURIComponent(symbol)}`));
    const balance = first(balanceArr);

    const cashArr = await safeJson(q(`cash-flow-statement?symbol=${encodeURIComponent(symbol)}`));
    const cash = first(cashArr);

    const ok = quote || profile || ratios || metrics || income || balance || cash;
    if (!ok) return res.status(404).json({ error: "No data found" });

    // FCF : si pas donné directement, on essaie CFO - Capex
    const freeCashFlow =
        cash?.freeCashFlow ??
        (typeof cash?.operatingCashFlow === "number" && typeof cash?.capitalExpenditure === "number"
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

        // Valorisation / Ratios
        pe: quote?.pe ?? ratios?.priceEarningsRatio ?? null,
        eps: quote?.eps ?? null,
        pb: ratios?.priceToBookRatio ?? null,
        ps: ratios?.priceToSalesRatio ?? null,
        roe: ratios?.returnOnEquity ?? metrics?.roe ?? null,
        roa: ratios?.returnOnAssets ?? metrics?.roa ?? null,
        netMargin: ratios?.netProfitMargin ?? metrics?.netProfitMargin ?? null,
        operatingMargin: metrics?.operatingProfitMargin ?? null,
        grossMargin: metrics?.grossProfitMargin ?? null,

        // Résultats (si dispo)
        period: income?.date ?? null,
        revenue: income?.revenue ?? null,
        ebitda: income?.ebitda ?? null,
        operatingIncome: income?.operatingIncome ?? null,
        netIncome: income?.netIncome ?? null,

        // Bilan (si dispo)
        totalDebt: balance?.totalDebt ?? null,
        cashAndCashEquivalents: balance?.cashAndCashEquivalents ?? null,
        totalEquity: balance?.totalStockholdersEquity ?? null,

        // Cashflow (si dispo)
        operatingCashFlow: cash?.operatingCashFlow ?? null,
        capitalExpenditure: cash?.capitalExpenditure ?? null,
        freeCashFlow,
    });
}