
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { screenStocks } from './services/geminiService';
import { StockPerformance, ScreeningResult, ScreeningCriteria } from './types';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCcw, 
  Info, 
  Filter,
  BarChart3,
  ExternalLink,
  Activity,
  Globe,
  Eye,
  EyeOff,
  ListFilter,
  Target,
  Zap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

const EGX_INDICES = [
  { id: 'EGX30', name: 'EGX 30', description: 'Main Market Index' },
  { id: 'EGX70', name: 'EGX 70 EWI', description: 'SMEs Index' },
  { id: 'EGX100', name: 'EGX 100 EWI', description: 'Broader Market' },
  { id: 'EGX33', name: 'EGX 33 Shariah', description: 'Shariah Compliant' },
];

const App: React.FC = () => {
  const [data, setData] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState('EGX33');
  const [criteria, setCriteria] = useState<ScreeningCriteria>({
    min6mChange: 10,
    max6mChange: 100,
    enabled6m: true,
    min1mChange: 5,
    max1mChange: -5,
    enabled1m: true,
    min1wChange: -10,
    max1wChange: 10,
    enabled1w: false,
    useAbsolute1m: true,
  });

  const fetchStocks = useCallback(async (indexToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await screenStocks(indexToFetch);
      setData(result);
    } catch (err) {
      setError(`Failed to fetch ${indexToFetch} data. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks(selectedIndex);
  }, [selectedIndex, fetchStocks]);

  const filteredStocks = useMemo(() => {
    if (!data) return [];
    return data.allStocks.filter(stock => {
      const meets6m = !criteria.enabled6m || (stock.change6m >= criteria.min6mChange && stock.change6m <= criteria.max6mChange);
      const meets1w = !criteria.enabled1w || (stock.change1w >= criteria.min1wChange && stock.change1w <= criteria.max1wChange);
      let meets1m = true;
      if (criteria.enabled1m) {
        if (criteria.useAbsolute1m) {
          meets1m = stock.change1m >= criteria.min1mChange || stock.change1m <= criteria.max1mChange;
        } else {
          meets1m = stock.change1m >= criteria.min1mChange;
        }
      }
      return meets6m && meets1m && meets1w;
    });
  }, [data, criteria]);

  const ToggleButton = ({ enabled, onClick }: { enabled: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border ${
        enabled 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
          : 'bg-slate-800/50 border-slate-700 text-slate-500'
      }`}
    >
      {enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {enabled ? 'Active' : 'Ignored'}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Activity className="w-8 h-8 text-emerald-400" />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                EGX Screener AI
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300">
                <Globe className="w-4 h-4 text-slate-500" />
                <select 
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                >
                  {EGX_INDICES.map(idx => (
                    <option key={idx.id} value={idx.id} className="bg-slate-900 text-slate-200">
                      {idx.name}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => fetchStocks(selectedIndex)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50 text-sm font-semibold shadow-lg shadow-emerald-900/20"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Scanning...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
                  <Filter className="w-5 h-5" />
                  Performance Ranges
                </h2>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">Indexing: <b className="text-emerald-400">{selectedIndex}</b></span>
                  {data && <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">Universe: {data.allStocks.length} Stocks</span>}
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 6 Months Row */}
                <div className={`flex flex-col md:flex-row md:items-center gap-4 transition-opacity ${!criteria.enabled6m ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="w-full md:w-32 flex items-center justify-between md:justify-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">6M Performance</span>
                    <ToggleButton enabled={criteria.enabled6m} onClick={() => setCriteria({...criteria, enabled6m: !criteria.enabled6m})} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Min</span>
                      <input 
                        type="range" min="-100" max="300" value={criteria.min6mChange}
                        disabled={!criteria.enabled6m}
                        onChange={(e) => setCriteria({...criteria, min6mChange: Number(e.target.value)})}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-emerald-400 w-10 text-right font-bold">{criteria.min6mChange}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Max</span>
                      <input 
                        type="range" min="-100" max="300" value={criteria.max6mChange}
                        disabled={!criteria.enabled6m}
                        onChange={(e) => setCriteria({...criteria, max6mChange: Number(e.target.value)})}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-emerald-400 w-10 text-right font-bold">{criteria.max6mChange}%</span>
                    </div>
                  </div>
                </div>

                {/* 1 Week Row */}
                <div className={`flex flex-col md:flex-row md:items-center gap-4 transition-opacity ${!criteria.enabled1w ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="w-full md:w-32 flex items-center justify-between md:justify-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">1W Performance</span>
                    <ToggleButton enabled={criteria.enabled1w} onClick={() => setCriteria({...criteria, enabled1w: !criteria.enabled1w})} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Min</span>
                      <input 
                        type="range" min="-50" max="100" value={criteria.min1wChange}
                        disabled={!criteria.enabled1w}
                        onChange={(e) => setCriteria({...criteria, min1wChange: Number(e.target.value)})}
                        className="flex-1 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-indigo-400 w-10 text-right font-bold">{criteria.min1wChange}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Max</span>
                      <input 
                        type="range" min="-50" max="100" value={criteria.max1wChange}
                        disabled={!criteria.enabled1w}
                        onChange={(e) => setCriteria({...criteria, max1wChange: Number(e.target.value)})}
                        className="flex-1 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-indigo-400 w-10 text-right font-bold">{criteria.max1wChange}%</span>
                    </div>
                  </div>
                </div>

                {/* 1 Month Row */}
                <div className={`flex flex-col md:flex-row md:items-center gap-4 transition-opacity ${!criteria.enabled1m ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="w-full md:w-32 flex items-center justify-between md:justify-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">1M Thresholds</span>
                    <ToggleButton enabled={criteria.enabled1m} onClick={() => setCriteria({...criteria, enabled1m: !criteria.enabled1m})} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Upper +</span>
                      <input 
                        type="range" min="0" max="100" value={criteria.min1mChange}
                        disabled={!criteria.enabled1m}
                        onChange={(e) => setCriteria({...criteria, min1mChange: Number(e.target.value)})}
                        className="flex-1 accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-blue-400 w-10 text-right font-bold">+{criteria.min1mChange}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] mono text-slate-500 w-8">Lower -</span>
                      <input 
                        type="range" min="-100" max="0" value={criteria.max1mChange}
                        disabled={!criteria.enabled1m}
                        onChange={(e) => setCriteria({...criteria, max1mChange: Number(e.target.value)})}
                        className="flex-1 accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] mono text-rose-400 w-10 text-right font-bold">{criteria.max1mChange}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Results Table */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[800px]">
              <div className="p-6 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-emerald-400" />
                  Showing {filteredStocks.length} Matching Stocks
                  <span className="text-slate-500 text-xs font-normal">of {data?.allStocks.length || 0} total found</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {criteria.enabled6m && (
                    <span className="px-2 py-1 bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 rounded text-[10px] uppercase font-bold tracking-tight">
                      6M: {criteria.min6mChange}% to {criteria.max6mChange}%
                    </span>
                  )}
                  {criteria.enabled1w && (
                    <span className="px-2 py-1 bg-indigo-950/20 text-indigo-400 border border-indigo-500/10 rounded text-[10px] uppercase font-bold tracking-tight">
                      1W: {criteria.min1wChange}% to {criteria.max1wChange}%
                    </span>
                  )}
                </div>
              </div>
              
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                  <p className="text-slate-400 text-sm">Querying exhaustive constituent data for {selectedIndex}...</p>
                </div>
              ) : error ? (
                <div className="flex-1 p-12 text-center text-rose-400">{error}</div>
              ) : filteredStocks.length === 0 ? (
                <div className="flex-1 p-20 text-center text-slate-500 italic text-sm">
                  No stocks in the entire {selectedIndex} universe match your filters.
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-950">
                      <tr className="border-b border-slate-800">
                        <th className="px-6 py-4 bg-slate-950/95 backdrop-blur-sm">Symbol</th>
                        <th className="px-6 py-4 bg-slate-950/95 backdrop-blur-sm">Company</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">Price (EGP)</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">P/E</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">Fair Value</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">6M %</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">1M %</th>
                        <th className="px-6 py-4 text-right bg-slate-950/95 backdrop-blur-sm">1W %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredStocks.map((stock) => {
                        const isUndervalued = stock.fairValue && stock.fairValue > stock.currentPrice;
                        const discount = isUndervalued ? ((stock.fairValue! - stock.currentPrice) / stock.currentPrice * 100).toFixed(1) : 0;
                        
                        return (
                          <tr key={stock.symbol} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="px-6 py-4 font-bold text-emerald-400 font-mono tracking-tight">{stock.symbol}</td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-200">{stock.name}</td>
                            <td className="px-6 py-4 text-right mono text-slate-300 text-sm font-bold">
                              {stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-xs mono font-bold ${stock.peRatio && stock.peRatio < 10 ? 'text-amber-400' : 'text-slate-400'}`}>
                                {stock.peRatio && stock.peRatio > 0 ? stock.peRatio.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className={`text-xs mono font-bold ${isUndervalued ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {stock.fairValue && stock.fairValue > 0 ? stock.fairValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                                </span>
                                {isUndervalued && (
                                  <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                                    <Zap className="w-2.5 h-2.5" />
                                    +{discount}% Upside
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded text-[11px] font-bold ${criteria.enabled6m ? 'text-emerald-400 border border-emerald-500/20' : 'text-slate-600'}`}>
                                {stock.change6m}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${
                                !criteria.enabled1m ? 'text-slate-600 bg-slate-800/20' : 
                                stock.change1m >= 0 ? 'text-blue-400 bg-blue-400/10' : 'text-rose-400 bg-rose-400/10'
                              }`}>
                                {stock.change1m}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${
                                !criteria.enabled1w ? 'text-slate-600 bg-slate-800/20' :
                                stock.change1w >= 0 ? 'text-indigo-400 bg-indigo-400/10' : 'text-orange-400 bg-orange-400/10'
                              }`}>
                                {stock.change1w}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            {/* AI Market Pulse */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-purple-400">
                <BarChart3 className="w-4 h-4" />
                AI Analysis
              </h3>
              <div className="text-xs leading-relaxed text-slate-400 space-y-3">
                {data ? (
                  <p className="first-letter:text-2xl first-letter:font-bold first-letter:text-white leading-relaxed">{data.analysis}</p>
                ) : (
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                    <div className="h-3 bg-slate-800 rounded w-4/6"></div>
                  </div>
                )}
              </div>
            </section>

            {/* Fair Value Potential */}
            {data && (
              <section className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-emerald-400">
                  <Target className="w-4 h-4" />
                  Value Picks
                </h3>
                <div className="space-y-4">
                  {data.allStocks
                    .filter(s => s.fairValue && s.fairValue > s.currentPrice)
                    .sort((a, b) => ((b.fairValue! - b.currentPrice) / b.currentPrice) - ((a.fairValue! - a.currentPrice) / a.currentPrice))
                    .slice(0, 3)
                    .map(stock => (
                      <div key={stock.symbol} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-200">{stock.symbol}</span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            +{((stock.fairValue! - stock.currentPrice) / stock.currentPrice * 100).toFixed(0)}% Upside
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Price: {stock.currentPrice}</span>
                          <span>Fair: {stock.fairValue}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            {/* Distribution Map */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-bold mb-4 text-slate-500 uppercase tracking-widest">
                {selectedIndex} Universe Overview
              </h3>
              {data && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.allStocks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="symbol" hide />
                      <YAxis stroke="#475569" fontSize={9} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '10px', color: '#f1f5f9' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Bar dataKey="change6m" radius={[1, 1, 0, 0]}>
                        {data.allStocks.map((entry, index) => {
                          const isMatch = filteredStocks.some(s => s.symbol === entry.symbol);
                          return <Cell key={`cell-${index}`} fill={isMatch ? '#10b981' : '#1e293b'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Sources */}
            {data?.sources && data.sources.length > 0 && (
              <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
                <h3 className="text-[10px] font-bold mb-3 text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  Grounded Sources
                </h3>
                <div className="space-y-2">
                  {data.sources.slice(0, 5).map((source, idx) => (
                    <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2 p-2 rounded hover:bg-slate-800 transition-all text-[10px] text-slate-400 group border border-transparent hover:border-slate-700"
                    >
                      <ExternalLink className="w-2.5 h-2.5 mt-0.5 shrink-0 group-hover:text-blue-400 transition-colors" />
                      <span className="truncate group-hover:text-slate-200 transition-colors">{source.title}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-semibold">
            Comprehensive Stock Analysis for EGX
          </p>
          <div className="flex justify-center gap-6 text-[10px] text-slate-600 italic">
             <span>Data: Gemini AI Search Grounding</span>
             <span>Region: Egypt</span>
             <span>Estimates: Analyst Target Medians</span>
          </div>
          <p className="text-slate-700 text-[10px] border-t border-slate-900 pt-4 max-w-2xl mx-auto">
            Risk Warning: Financial data provided by AI models may contain inaccuracies. Always verify with official EGX sources before making investment decisions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
