// pages/api/financials.ts
import type { NextApiRequest, NextApiResponse } from "next";

type ApiData = {
    error?: string;

    symbol?: string;
    name?: string;
    exchange?: string;
    sector?: string;
    industry?: string;
    country?: string;
    description?: string;

    price?: number | null;
    marketCap?: number | null;
    volume?: number | null;
    dayLow?: number | null;
    dayHigh?: number | null;
    yearLow?: number | null;
    yearHigh?: number | null;

    period?: string | null;
    revenue?: number | null;
    ebitda?: number | null;
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
function pickFirstString(x: any): string | null {
    return typeof x === "string" && x.trim() ? x.trim() : null;
}

function extractErrMessage(payload: any): string | null {
    if (!payload) return null;
    if (typeof payload === "string") return payload;
    if (typeof payload?.error === "string") return payload.error;
    if (typeof payload?.message === "string") return payload.message;
    return null;
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

// Finnhub financials-reported: report.ic / report.bs / report.cf
function getFromReport(report: any, blocks: ("ic" | "bs" | "cf")[], concepts: string[]): number | null {
    if (!report) return null;
    for (const b of blocks) {
        const arr = report?.[b];
        if (!Array.isArray(arr)) continue;
        for (const c of concepts) {
            const row = arr.find((x: any) => x?.concept === c);
            const v = row?.value;
            const n = toNum(v);
            if (n != null) return n;
        }
    }
    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiData>) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Missing symbol" });

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FINNHUB_API_KEY (Vercel env var)" });

    const base = "https://finnhub.io/api/v1";
    const q = (path: string) => `${base}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(apiKey)}`;

    try {
        // ✅ Appels
        const [quoteR, profR, metR, finR] = await Promise.all([
            fetchJson(q(`/quote?symbol=${encodeURIComponent(symbol)}`)),
            fetchJson(q(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`)),
            fetchJson(q(`/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`)),
            fetchJson(q(`/stock/financials-reported?symbol=${encodeURIComponent(symbol)}&freq=annual`)),
        ]);

        // ✅ Gestion erreurs quota / token invalide
        const errMsg =
            extractErrMessage(quoteR.json) ||
            extractErrMessage(profR.json) ||
            extractErrMessage(metR.json) ||
            extractErrMessage(finR.json);

        const any429 = [quoteR, profR, metR, finR].some((x) => x.status === 429);
        if (any429) {
            res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
            return res.status(200).json({ error: "Quota Finnhub atteint (429). Attends 1 minute et réessaie." });
        }

        // Si Finnhub renvoie une erreur texte même avec status 200 parfois
        if (errMsg && /limit|quota|rate|token|api key/i.test(errMsg)) {
            res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
            return res.status(200).json({ error: `Erreur Finnhub: ${errMsg}` });
        }

        const quote = quoteR.ok ? quoteR.json : null;
        const profile = profR.ok ? profR.json : null;
        const metric = metR.ok ? metR.json?.metric : null;

        const firstReport =
            Array.isArray(finR.json?.data) && finR.json.data.length ? finR.json.data[0] : null;
        const report = firstReport?.report ?? null;

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

        // Financials (annual latest)
        const revenue = getFromReport(report, ["ic"], ["us-gaap_Revenues", "ifrs-full_Revenue"]);
        const ebitda = getFromReport(report, ["ic"], [
            "us-gaap_EarningsBeforeInterestTaxesDepreciationAmortization",
            "ifrs-full_EBITDA",
        ]);
        const operatingIncome = getFromReport(report, ["ic"], ["us-gaap_OperatingIncomeLoss", "ifrs-full_OperatingProfitLoss"]);
        const netIncome = getFromReport(report, ["ic"], ["us-gaap_NetIncomeLoss", "ifrs-full_ProfitLoss"]);

        const totalDebt = getFromReport(report, ["bs"], ["us-gaap_Debt", "us-gaap_LongTermDebt", "ifrs-full_Borrowings"]);
        const cashAndCashEquivalents = getFromReport(report, ["bs"], [
            "us-gaap_CashAndCashEquivalentsAtCarryingValue",
            "ifrs-full_CashAndCashEquivalents",
        ]);
        const totalEquity = getFromReport(report, ["bs"], ["us-gaap_StockholdersEquity", "ifrs-full_Equity"]);

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

            name: pickFirstString(profile?.name) ?? pickFirstString(profile?.companyName) ?? null,
            sector: pickFirstString(profile?.finnhubIndustry) ?? null,
            industry: pickFirstString(profile?.finnhubIndustry) ?? null,
            country: pickFirstString(profile?.country) ?? null,
            exchange: pickFirstString(profile?.exchange) ?? null,
            description: pickFirstString(profile?.description) ?? null,

            price,
            marketCap,
            volume,
            dayLow,
            dayHigh,
            yearLow,
            yearHigh,

            period: pickFirstString(firstReport?.reportDate) ?? pickFirstString(firstReport?.filingDate) ?? null,
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

        // Si vraiment rien
        const hasUseful = payload.price != null || payload.name != null || payload.revenue != null;
        if (!hasUseful) return res.status(404).json({ error: "No data found for this symbol" });

        // ✅ cache pour réduire quota
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
        return res.status(200).json(payload);
    } catch (e: any) {
        return res.status(200).json({ error: "Erreur réseau serveur (Finnhub). Réessaie." });
    }
}