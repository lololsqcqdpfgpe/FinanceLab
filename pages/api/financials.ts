// pages/api/financials.ts
import type { NextApiRequest, NextApiResponse } from "next";

type ApiData = {
    error?: string;

    symbol?: string;
    name?: string | null;
    exchange?: string | null;
    sector?: string | null;
    industry?: string | null;
    country?: string | null;
    description?: string | null;

    price?: number | null;
    marketCap?: number | null;
    volume?: number | null;
    dayLow?: number | null;
    dayHigh?: number | null;
    yearLow?: number | null;
    yearHigh?: number | null;

    period?: string | null; // ✅
    revenue?: number | null;
    ebitda?: number | null; // ✅
    operatingIncome?: number | null;
    netIncome?: number | null;

    totalDebt?: number | null;
    cashAndCashEquivalents?: number | null;
    totalEquity?: number | null;

    operatingCashFlow?: number | null;
    capitalExpenditure?: number | null;
    freeCashFlow?: number | null;

    pe?: number | null;
    eps?: number | null;
    pb?: number | null;
    ps?: number | null;
    roe?: number | null;
    roa?: number | null;
    grossMargin?: number | null;
    operatingMargin?: number | null;
    netMargin?: number | null;
};

function toNum(x: any): number | null {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}
function pickStr(x: any): string | null {
    return typeof x === "string" && x.trim() ? x.trim() : null;
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

// report.ic / report.bs / report.cf (concept/value)
function getFromReport(report: any, blocks: ("ic" | "bs" | "cf")[], concepts: string[]): number | null {
    if (!report) return null;
    for (const b of blocks) {
        const arr = report?.[b];
        if (!Array.isArray(arr)) continue;
        for (const c of concepts) {
            const row = arr.find((x: any) => x?.concept === c);
            const n = toNum(row?.value);
            if (n != null) return n;
        }
    }
    return null;
}

function pickLatestReport(finJson: any) {
    const data = Array.isArray(finJson?.data) ? finJson.data : [];
    if (!data.length) return null;

    // ✅ trie par reportDate/filingDate desc
    const sorted = [...data].sort((a, b) => {
        const da = Date.parse(a?.reportDate ?? a?.filingDate ?? "");
        const db = Date.parse(b?.reportDate ?? b?.filingDate ?? "");
        return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    });

    return sorted[0];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiData>) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FINNHUB_API_KEY" });

    const base = "https://finnhub.io/api/v1";
    const q = (path: string) => `${base}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(apiKey)}`;

    try {
        const [quoteR, profR, metR, finR] = await Promise.all([
            fetchJson(q(`/quote?symbol=${encodeURIComponent(symbol)}`)),
            fetchJson(q(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`)),
            fetchJson(q(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`)),
            fetchJson(q(`/stock/financials-reported?symbol=${encodeURIComponent(symbol)}&freq=annual`)),
        ]);

        // quota
        if ([quoteR, profR, metR, finR].some((x) => x.status === 429)) {
            res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
            return res.status(200).json({ error: "Quota Finnhub atteint (429). Attends 1 minute et réessaie." });
        }

        const quote = quoteR.ok ? quoteR.json : null;
        const profile = profR.ok ? profR.json : null;
        const metric = metR.ok ? metR.json?.metric : null;

        const latest = pickLatestReport(finR.json);
        const report = latest?.report ?? null;

        // ✅ period : on prend reportDate puis filingDate, sinon fallback year
        const period =
            pickStr(latest?.reportDate) ??
            pickStr(latest?.filingDate) ??
            (latest?.year ? String(latest.year) : null);

        // Market
        const price = toNum(quote?.c);
        const dayHigh = toNum(quote?.h);
        const dayLow = toNum(quote?.l);
        const volume = toNum(quote?.v);

        const yearHigh = toNum(metric?.["52WeekHigh"]);
        const yearLow = toNum(metric?.["52WeekLow"]);

        // Ratios / metrics (TTM)
        const pe = toNum(metric?.peTTM);
        const pb = toNum(metric?.pb);
        const ps = toNum(metric?.psTTM);
        const eps = toNum(metric?.epsTTM);
        const roe = toNum(metric?.roeTTM);
        const roa = toNum(metric?.roaTTM);
        const grossMargin = toNum(metric?.grossMarginTTM);
        const operatingMargin = toNum(metric?.operatingMarginTTM);
        const netMargin = toNum(metric?.netMarginTTM);

        // Income statement (annual latest)
        const revenue = getFromReport(report, ["ic"], [
            "us-gaap_Revenues",
            "us-gaap_SalesRevenueNet",
            "ifrs-full_Revenue",
        ]);

        const operatingIncome = getFromReport(report, ["ic"], [
            "us-gaap_OperatingIncomeLoss",
            "ifrs-full_OperatingProfitLoss",
        ]);

        const netIncome = getFromReport(report, ["ic"], [
            "us-gaap_NetIncomeLoss",
            "us-gaap_ProfitLoss",
            "ifrs-full_ProfitLoss",
        ]);

        // ✅ D&A (pour calculer EBITDA si besoin)
        const depreciationAmortization = getFromReport(report, ["cf", "ic"], [
            "us-gaap_DepreciationDepletionAndAmortization",
            "us-gaap_DepreciationAndAmortization",
            "ifrs-full_DepreciationAmortisationImpairmentExpense",
        ]);

        // ✅ EBITDA : d’abord report direct, sinon fallback
        let ebitda =
            getFromReport(report, ["ic"], [
                "us-gaap_EarningsBeforeInterestTaxesDepreciationAmortization",
                "ifrs-full_EBITDA",
            ]) ??
            toNum(metric?.ebitdaTTM); // si Finnhub le fournit

        if (ebitda == null && operatingIncome != null && depreciationAmortization != null) {
            ebitda = operatingIncome + depreciationAmortization;
        }

        // Balance sheet
        const totalDebt = getFromReport(report, ["bs"], [
            "us-gaap_Debt",
            "us-gaap_LongTermDebt",
            "us-gaap_LongTermDebtNoncurrent",
            "ifrs-full_Borrowings",
        ]);

        const cashAndCashEquivalents = getFromReport(report, ["bs"], [
            "us-gaap_CashAndCashEquivalentsAtCarryingValue",
            "us-gaap_CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
            "ifrs-full_CashAndCashEquivalents",
        ]);

        const totalEquity = getFromReport(report, ["bs"], [
            "us-gaap_StockholdersEquity",
            "ifrs-full_Equity",
        ]);

        // Cash flow
        const operatingCashFlow = getFromReport(report, ["cf"], [
            "us-gaap_NetCashProvidedByUsedInOperatingActivities",
            "ifrs-full_CashFlowsFromUsedInOperatingActivities",
        ]);

        const capitalExpenditure = getFromReport(report, ["cf"], [
            "us-gaap_PaymentsToAcquirePropertyPlantAndEquipment",
            "ifrs-full_PurchaseOfPropertyPlantAndEquipment",
        ]);

        const freeCashFlow =
            operatingCashFlow != null && capitalExpenditure != null
                ? operatingCashFlow - Math.abs(capitalExpenditure)
                : null;

        const marketCap =
            toNum(profile?.marketCapitalization) != null
                ? Math.round(Number(profile.marketCapitalization) * 1e6) // Finnhub = millions
                : null;

        const payload: ApiData = {
            symbol,

            name: pickStr(profile?.name) ?? pickStr(profile?.companyName),
            sector: pickStr(profile?.finnhubIndustry),
            industry: pickStr(profile?.finnhubIndustry),
            country: pickStr(profile?.country),
            exchange: pickStr(profile?.exchange),
            description: pickStr(profile?.description),

            price,
            marketCap,
            volume,
            dayLow,
            dayHigh,
            yearLow,
            yearHigh,

            period,
            revenue,
            ebitda,
            operatingIncome,
            netIncome,

            totalDebt,
            cashAndCashEquivalents,
            totalEquity,

            operatingCashFlow,
            capitalExpenditure,
            freeCashFlow,

            pe,
            eps,
            pb,
            ps,
            roe,
            roa,
            grossMargin,
            operatingMargin,
            netMargin,
        };

        // au moins un minimum utile
        const hasUseful = payload.price != null || payload.name != null || payload.revenue != null || payload.ebitda != null;
        if (!hasUseful) return res.status(404).json({ error: "No data found for this symbol (Finnhub)" });

        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
        return res.status(200).json(payload);
    } catch {
        return res.status(200).json({ error: "Erreur réseau serveur (Finnhub). Réessaie." });
    }
}