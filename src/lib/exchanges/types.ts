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

export type LoanPosition = {
  externalRef: string;
  product: "flexible" | "stable";
  loanCoin: string;
  totalDebt: number;
  collateralCoin: string;
  collateralAmount: number;
  currentLtv: number | null;
};

export type WalletBreakdown = {
  asset: string;
  spot: number;
  earn: number;
  funding: number;
  collateral: number;
  total: number;
};

export type CustodySnapshot = {
  wallets: WalletBreakdown[];
  loans: LoanPosition[];
  rewards: RewardEvent[];
  warnings: string[];
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
