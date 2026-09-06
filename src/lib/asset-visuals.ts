export type AssetVisualClass = "crypto" | "stock" | "stable" | "land" | "cash";

const COIN_CDN =
  "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color";

const CRYPTO_LOGOS: Record<string, string> = {
  BTC: `${COIN_CDN}/btc.png`,
  ETH: `${COIN_CDN}/eth.png`,
  SOL: `${COIN_CDN}/sol.png`,
  USDC: `${COIN_CDN}/usdc.png`,
  USDT: `${COIN_CDN}/usdt.png`,
};

const TINT: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  SOL: "#9945FF",
  USDC: "#2775CA",
  USDT: "#26A17B",
  VUAA: "#C41230",
};

export function assetLogoSrc(
  ticker: string,
  assetClass?: AssetVisualClass,
): string | null {
  const t = ticker.toUpperCase();
  if (CRYPTO_LOGOS[t]) return CRYPTO_LOGOS[t];
  if (assetClass === "land") return "/logos/land.svg";
  if (assetClass === "cash") return "/logos/cash.svg";
  if (t === "VUAA") return "/logos/vuaa.svg";
  return null;
}

export function assetTint(ticker: string, assetClass?: AssetVisualClass): string {
  const t = ticker.toUpperCase();
  if (TINT[t]) return TINT[t];
  if (assetClass === "land") return "#FF9500";
  if (assetClass === "cash") return "#8E8E93";
  if (assetClass === "stock") return "#5856D6";
  return "#007AFF";
}

export function assetInitial(ticker: string): string {
  const clean = ticker.replace(/[^A-Za-z0-9]/g, "");
  return (clean.slice(0, 2) || "?").toUpperCase();
}
