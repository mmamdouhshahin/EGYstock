import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { screenStocks } from './services/geminiService';
import { StockPerformance, ScreeningResult, ScreeningCriteria } from './types';
import { supabase } from './lib/supabaseClient';
import { 
  RefreshCcw, 
  Filter,
  BarChart3,
  Activity,
  Globe,
  Eye,
  EyeOff,
  ListFilter,
  Target,
  Zap,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Star,
  Bookmark,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell
} from 'recharts';

const EGX_INDICES = [
  { id: 'EGX30', name: 'EGX 30', description: 'Main Market Index' },
  { id: 'EGX70', name: 'EGX 70 EWI', description: 'SMEs Index' },
  { id: 'EGX100', name: 'EGX 100 EWI', description: 'Broader Market' },
  { id: 'EGX33', name: 'EGX 33 Shariah', description: 'Shariah Compliant' },
];

type SortKey = keyof StockPerformance | 'upside';

const App: React.FC = () => {
  const [data, setData] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState('EGX33');
  const [showOnlyUndervalued, setShowOnlyUndervalued] = useState(false);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' } | null>(null);

  const [criteria, setCriteria] = useState<ScreeningCriteria>({
    min6mChange: 10,
    max6mChange: 150,
    enabled6m: true,
    min1mChange: 5,
    max1mChange: -5,
    enabled1m: true,
    min1wChange: -10,
    max1wChange: 10,
    enabled1w: false,
    useAbsolute1m: true,
  });

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!supabase) return;
      try {
        const { data: savedStocks, error } = await supabase
          .from('watchlist')
          .select('symbol');
        
        if (error) throw error;
        if (savedStocks) {
          setWatchlist(savedStocks.map(s => s.symbol));
        }
      } catch (err) {
        console.error("Error fetching watchlist:", err);
      }
    };
    fetchWatchlist();
  }, []);

  const toggleWatchlist = async (stock: StockPerformance) => {
    if (!supabase) {
      alert("Supabase is not configured. Watchlist is unavailable.");
      return;
    }
    const isSaved = watchlist.includes(stock.symbol);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('symbol', stock.symbol);
        if (error) throw error;
        setWatchlist(prev => prev.filter(s => s !== stock.symbol));
      } else {
        const { error } = await supabase
          .from('watchlist')
          .insert([{ 
            symbol: stock.symbol, 
            name: stock.name, 
            price_at_save: stock.currentPrice 
          }]);
        if (error) throw error;
        setWatchlist(prev => [...prev, stock.symbol]);
      }
    } catch (err) {
      console.error("Supabase Operation Failed:", err);
      alert("Failed to update watchlist. Ensure the 'watchlist' table exists in your Supabase project.");
    }
  };

  const fetchStocks = useCallback(async (indexToFetch: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await screenStocks(indexToFetch);
      if (!result || !result.allStocks || result.allStocks.length === 0) {
        throw new Error("No stock data returned from the analysis.");
      }
      setData(result);
    } catch (err: any) {
      console.error("Fetch Stocks Error:", err);
      setError(err.message || `Failed to fetch ${indexToFetch} data. Please ensure your API_KEY is set in Vercel.`);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchStocks(selectedIndex);
  }, [selectedIndex]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStocks = useMemo(() => {
    if (!data) return [];
    
    let result = data.allStocks.filter(stock => {
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
      
      const meetsUndervalued = !showOnlyUndervalued || !!(stock.fairValue && stock.fairValue > stock.currentPrice);
      const meetsWatchlist = !showWatchlistOnly || watchlist.includes(stock.symbol);
      
      return meets6m && meets1m && meets1w && meetsUndervalued && meetsWatchlist;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'upside') {
          aValue = a.fairValue ? (a.fairValue - a.currentPrice) / a.currentPrice : -Infinity;
          bValue = b.fairValue ? (b.fairValue - b.currentPrice) / b.currentPrice : -Infinity;
        } else {
          aValue = a[sortConfig.key as keyof StockPerformance] ?? 0;
          bValue = b[sortConfig.key as keyof StockPerformance] ?? 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, criteria, showOnlyUndervalued, showWatchlistOnly, watchlist, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3 text-emerald-400" />;
  };

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
    <div className="min-h-screen bg-black text-slate-200">
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
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50 text-sm font-semibold shadow-lg"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold">Application Error</h3>
              <p className="text-sm opacity-90">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-xs font-bold underline hover:text-rose-300 transition-colors"
              >
                Retry Application
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-blue-400">
                  <Filter className="w-5 h-5" />
                  Performance Ranges
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      showWatchlistOnly 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    Watchlist ({watchlist.length})
                  </button>
                  <button 
                    onClick={() => setShowOnlyUndervalued(!showOnlyUndervalued)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                      showOnlyUndervalued 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    Undervalued
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className={`flex flex-col md:flex-row md:items-center gap-4 transition-opacity ${!criteria.enabled6m ? 'opacity-40' : 'opacity-100'}`}>
                  <div className="w-full md:w-32 flex items-center justify-between md:justify-start gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">6M Growth</span>
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
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[800px]">
              <div className="p-6 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center bg-slate-900/80 backdrop-blur-sm z-10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-emerald-400" />
                  Matched Stocks
                  <span className="text-slate-500 text-xs font-normal">({filteredStocks.length} Results)</span>
                </h2>
              </div>
              
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                  <p className="text-slate-400 text-sm">Gemini 3 Pro is analyzing the EGX Market...</p>
                </div>
              ) : error ? (
                <div className="flex-1 p-20 text-center text-slate-500 italic text-sm">
                  Failed to load stock data. Check error message above.
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="flex-1 p-20 text-center text-slate-500 italic text-sm">
                  No stocks match the current filters.
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-950">
                      <tr className="border-b border-slate-800">
                        <th className="px-6 py-4 w-10"></th>
                        <th className="px-4 py-4 cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('symbol')}>
                          <div className="flex items-center gap-2">Symbol <SortIcon columnKey="symbol" /></div>
                        </th>
                        <th className="px-6 py-4">Company</th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('currentPrice')}>
                          <div className="flex items-center justify-end gap-2">Price <SortIcon columnKey="currentPrice" /></div>
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('peRatio')}>
                          <div className="flex items-center justify-end gap-2">P/E <SortIcon columnKey="peRatio" /></div>
                        </th>
                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-900 transition-colors" onClick={() => handleSort('upside')}>
                          <div className="flex items-center justify-end gap-2">Fair Value <SortIcon columnKey="upside" /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredStocks.map((stock) => {
                        const isUndervalued = !!(stock.fairValue && stock.fairValue > stock.currentPrice);
                        const isSaved = watchlist.includes(stock.symbol);
                        const discount = isUndervalued ? ((stock.fairValue! - stock.currentPrice) / stock.currentPrice * 100).toFixed(1) : 0;
                        
                        return (
                          <tr key={stock.symbol} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => toggleWatchlist(stock)}
                                className={`transition-all transform hover:scale-125 ${isSaved ? 'text-amber-400' : 'text-slate-700 group-hover:text-slate-500'}`}
                              >
                                <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400' : ''}`} />
                              </button>
                            </td>
                            <td className="px-4 py-4 font-bold text-emerald-400 font-mono tracking-tight">{stock.symbol}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400 truncate max-w-[150px]">{stock.name}</td>
                            <td className="px-6 py-4 text-right mono text-slate-200 text-sm font-bold">
                              {stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-xs mono font-bold ${stock.peRatio && stock.peRatio < 20 && stock.peRatio > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                {stock.peRatio && stock.peRatio > 0 ? stock.peRatio.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className={`text-xs mono font-bold ${isUndervalued ? 'text-emerald-400' : 'text-slate-500'}`}>
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
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-purple-400">
                <BarChart3 className="w-4 h-4" />
                AI Market Pulse
              </h3>
              <div className="text-xs leading-relaxed text-slate-400 space-y-3">
                {data ? (
                  <p className="first-letter:text-2xl first-letter:font-bold first-letter:text-white leading-relaxed">{data.analysis}</p>
                ) : (
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-full"></div>
                    <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                  </div>
                )}
              </div>
            </section>

            {watchlist.length > 0 && (
              <section className="bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/20 p-6 rounded-2xl shadow-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-amber-400">
                  <Bookmark className="w-4 h-4" />
                  My Watchlist
                </h3>
                <div className="space-y-3">
                  {data?.allStocks
                    .filter(s => watchlist.includes(s.symbol))
                    .map(stock => (
                      <div key={stock.symbol} className="flex justify-between items-center group">
                        <span className="text-xs font-bold text-slate-200">{stock.symbol}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] mono text-slate-500">{stock.currentPrice}</span>
                          <button onClick={() => toggleWatchlist(stock)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}

            <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
              <h3 className="text-[10px] font-bold mb-4 text-slate-500 uppercase tracking-widest text-center">
                EGX Universe Overview
              </h3>
              {data && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.allStocks}>
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
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-semibold">
            EGX Market Intelligence • Powered by Gemini & Supabase
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;