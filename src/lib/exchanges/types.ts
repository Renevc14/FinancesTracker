export type Balance = {
  asset: string;
  free: string;
  locked: string;
  total: string;
};

export type Trade = {
  externalId: string;
  timestamp: Date;
  symbol: string;
  side: "buy" | "sell";
  quantity: string;
  price: string;
  quoteQuantity: string;
  fee: string;
  feeAsset: string;
};

export type RewardEvent = {
  externalId: string;
  timestamp: Date;
  asset: string;
  amount: string;
  source: "auto_invest" | "simple_earn" | "staking" | "airdrop" | "other";
};

export type ConnectionTest = {
  ok: boolean;
  scopes: string[];
  error?: string;
};

export interface ExchangeClient {
  readonly providerName: string;
  testConnection(): Promise<ConnectionTest>;
  getBalances(): Promise<Balance[]>;
  getTrades?(symbols?: string[]): Promise<Trade[]>;
}
