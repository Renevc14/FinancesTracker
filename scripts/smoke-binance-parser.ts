import { parseBinanceSpotCsv } from "../src/lib/imports/binance/spot";

const sample = `Date(UTC),Pair,Side,Price,Executed,Amount,Fee
2026-05-09 13:17:15,BTCUSDT,BUY,80735,0.0099BTC,799.2765USDT,0.0000099BTC
2026-05-10 10:00:00,ETHUSDT,BUY,3500,0.1ETH,350USDT,0.0001ETH
2026-05-11 12:00:00,ETHUSDT,HOLD,3500,0.1ETH,350USDT,0
`;

const preview = parseBinanceSpotCsv(sample);
console.log(
  JSON.stringify(
    {
      totalRows: preview.totalRows,
      parsed: preview.parsed.length,
      errors: preview.errors.length,
      first: preview.parsed[0],
      errorSample: preview.errors[0],
    },
    null,
    2,
  ),
);

if (preview.parsed.length !== 2) {
  console.error("Expected 2 parsed trades");
  process.exit(1);
}
if (preview.errors.length !== 1) {
  console.error("Expected 1 error for HOLD side");
  process.exit(1);
}
console.log("OK binance spot parser smoke");
