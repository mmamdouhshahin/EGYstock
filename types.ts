
export interface StockPerformance {
  symbol: string;
  name: string;
  currentPrice: number;
  change6m: number;
  change1m: number;
  change1w: number;
  peRatio?: number;
  fairValue?: number;
  lastUpdated: string;
  sector?: string;
}

export interface ScreeningResult {
  matchingStocks: StockPerformance[];
  allStocks: StockPerformance[];
  analysis: string;
  sources: Array<{ title: string; uri: string }>;
}

export interface ScreeningCriteria {
  min6mChange: number;
  max6mChange: number;
  enabled6m: boolean;
  min1mChange: number;
  max1mChange: number;
  enabled1m: boolean;
  min1wChange: number;
  max1wChange: number;
  enabled1w: boolean;
  useAbsolute1m: boolean;
}
