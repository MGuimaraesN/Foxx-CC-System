import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar, BarChart, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, HeartPulse, Clock, Activity, AlertTriangle, PieChart as PieChartIcon } from 'lucide-react';
import { DashboardStats } from '../types';
import { Skeleton } from './ui/Skeleton';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  currency?: string;
  isPrivate?: boolean;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; subtext?: string; loading: boolean; colorClass?: string }> = ({ title, value, icon, subtext, loading, colorClass }) => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-32 mt-2" />
        ) : (
          <h3 className={`text-2xl font-bold mt-2 ${colorClass || 'text-slate-900 dark:text-white'}`}>{value}</h3>
        )}
      </div>
      <div className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400">
        {icon}
      </div>
    </div>
    {subtext && !loading && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ stats, isLoading, currency = 'BRL', isPrivate = false }) => {
  const { t, language } = useLanguage();

  const formatCurrency = (val: number) => {
    if (isPrivate) return 'R$ ••••';
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency }).format(val);
  };

  const formatMonthLabel = (value: string) => {
    if (!value) return value;
    const lower = value.trim().toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const monthIndex = monthMap[lower.slice(0, 3)];
    if (monthIndex === undefined) return value;
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language, { month: 'short' }).format(new Date(2024, monthIndex, 1));
  };

  // Sunburst / Pie Logic
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];
  const categoryData = React.useMemo(() => {
      if (!stats || !stats.expenseBreakdown || !Array.isArray(stats.expenseBreakdown)) return [];
      return stats.expenseBreakdown.map((item, index) => ({
          ...item,
          color: COLORS[index % COLORS.length]
      }));
  }, [stats]);

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 animate-pulse" />)}
      </div>
    );
  }

  // Forecast Logic
  const now = new Date();
  const currentDay = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentSpent = stats?.financialHealth?.currentMonthTotal || 0;
  const avg = stats?.financialHealth?.averageLast3Months || 0;

  // Conservative projection: Current Spent + (Average Daily Rate * Remaining Days)
  // This avoids skyrocketing numbers if currentSpent is high on day 1 (e.g. historical data)
  const daysRemaining = Math.max(0, daysInMonth - currentDay);
  const avgDaily = avg / 30;
  const projected = currentSpent + (avgDaily * daysRemaining);

  const pacePercentage = Math.min(100, (currentDay / daysInMonth) * 100);

  return (
    <div className="space-y-4">
      
      {/* Financial Health Banner */}
      {stats?.financialHealth && (
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${
          stats.financialHealth.status === 'HEALTHY' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' :
          stats.financialHealth.status === 'WARNING' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300' :
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
        }`}>
          <div className="p-2 bg-white/50 rounded-full">
            <HeartPulse size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm uppercase tracking-wide">{t('dashboard.financialHealth')}</h4>
            <p className="text-sm font-medium mt-1">{stats.financialHealth.message}</p>
          </div>
          <div className="text-right hidden sm:block">
             <p className="text-xs opacity-75">{t('dashboard.last3MoAvg')}</p>
             <p className="font-bold">{formatCurrency(stats.financialHealth.averageLast3Months)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={t('dashboard.openInvoice')}
          value={formatCurrency(stats?.openInvoice || 0)} 
          icon={<CreditCard size={20} />} 
          subtext={t('dashboard.dueIn') + ' 12 ' + t('dashboard.days')}
          loading={isLoading}
        />
        <StatCard 
          title={t('dashboard.upcomingMaturities')}
          value={formatCurrency(stats?.upcomingMaturities || 0)} 
          icon={<Clock size={20} />} 
          subtext={t('dashboard.next7Days')}
          loading={isLoading}
          colorClass="text-orange-600 dark:text-orange-400"
        />
        <StatCard 
          title={t('dashboard.availableLimit')}
          value={formatCurrency((stats?.totalLimit || 0) - (stats?.usedLimit || 0))} 
          icon={<AlertCircle size={20} />} 
          subtext={`${((stats?.usedLimit || 0) / (stats?.totalLimit || 1) * 100).toFixed(0)}% ${t('dashboard.utilized')}`}
          loading={isLoading}
        />
        <StatCard 
          title={t('dashboard.last3MoAvg')}
          value={formatCurrency(stats?.financialHealth?.averageLast3Months || 0)} 
          icon={<TrendingDown size={20} />} 
          subtext={t('dashboard.rollingAvgBaseline')}
          loading={isLoading}
        />

        {/* Limit Alert */}
        {((stats?.usedLimit || 0) / (stats?.totalLimit || 1)) > 0.8 && (
            <div className="col-span-full p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 animate-pulse">
                <AlertTriangle size={24} />
                <div>
                   <h4 className="font-bold">{t('dashboard.limitApproaching')}</h4>
                   <p className="text-sm">
                     {t('dashboard.limitUsedPrefix')} {((stats?.usedLimit || 0) / (stats?.totalLimit || 1) * 100).toFixed(0)}% {t('dashboard.limitUsedSuffix')}
                   </p>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[350px] flex flex-col relative">
            <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.expenseVsAvg')}</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> {t('dashboard.monthlyExpense')}</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-full"></div> {t('dashboard.threeMoAverage')}</div>
            </div>
            </div>

            {isLoading ? (
            <Skeleton className="w-full h-full" />
            ) : (
            <div className="flex-1 w-full min-h-[220px] min-w-0 relative">
                <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                    data={stats?.monthlyTrend} 
                    margin={{ top: 10, right: 10, left: 20, bottom: 0 }} // Aumentado o left para o número não fugir
                    barCategoryGap={24}
                    >
                    <defs>
                      <linearGradient id="monthlyBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="avgGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={formatMonthLabel}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => isPrivate ? '•' : `R$${(value/1000).toFixed(1)}k`}
                        width={45} // Largura fixa para garantir espaço do texto
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1f2937', borderRadius: '10px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                        cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                        formatter={(value: any, name: any) => {
                          const label = name === 'amount' ? t('dashboard.monthlyExpense') : name === 'average' ? t('dashboard.threeMoAverage') : name;
                          return [isPrivate ? 'R$ ••••' : formatCurrency(value), label];
                        }}
                        labelFormatter={(label: any) => formatMonthLabel(String(label))}
                    />
                    {/* Ajustado barSize para ser proporcional e adicionado raio nas bordas */}
                    <Bar dataKey="amount" fill="url(#monthlyBar)" radius={[6, 6, 0, 0]} barSize={32} /> 
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                      dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                      activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                    />
                    </ComposedChart>
                </ResponsiveContainer>
                </div>
            </div>
            )}
        </div>

        {/* Expense Breakdown (Donut Chart) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col relative min-h-[280px]">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <PieChartIcon size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.expenseBreakdown')}</h3>
                    <p className="text-xs text-slate-500">{t('transactions.category')}</p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-[200px] min-w-0 relative">
              <div className="absolute inset-0 z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                        <Pie
                            data={categoryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="100%"
                            stroke="none"
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                           contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                           itemStyle={{ color: '#fff' }}
                           wrapperStyle={{ zIndex: 30 }}
                           formatter={(value: any) => isPrivate ? '•••' : formatCurrency(value)}
                        />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                {/* Center Label */}
                <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('common.total')}</span>
                    <span className="text-2xs font-bold text-slate-900 dark:text-white mt-1">
                        {isPrivate ? '••••' : formatCurrency(categoryData.reduce((a, b) => a + b.value, 0))}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-3">
                {categoryData.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Charts Grid */}
        <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Spending Trend (New) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col relative h-[280px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.dailyTrend')}</h3>
                        <p className="text-xs text-slate-500">{t('dashboard.accumulatedSpend')}</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[200px] min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats?.dailyTrend || []}>
                        <defs>
                          <linearGradient id="dailyCurrent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1f2937', borderRadius: '10px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                        cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                        formatter={(value: any, name: any) => {
                          const label = name === 'current' ? t('dashboard.currentPeriod') : name === 'previous' ? t('dashboard.previousPeriod') : name;
                          return [isPrivate ? 'R$ ••••' : formatCurrency(value), label];
                        }}
                        />
                        <Area type="monotone" dataKey="current" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#dailyCurrent)" />
                        <Area type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" fill="none" dot={{ r: 2, fill: '#94a3b8', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Categories Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col relative h-[280px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <PieChartIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.topCategories')}</h3>
                        <p className="text-xs text-slate-500">{t('dashboard.highestSpend')}</p>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[200px] min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }} barCategoryGap={14}>
                        <defs>
                          <linearGradient id="topCats" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.95} />
                          </linearGradient>
                        </defs>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                width={100}
                                tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1f2937', borderRadius: '10px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                        cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                        formatter={(value: any, name: any) => {
                          const label = name === 'value' ? t('transactions.amount') : name;
                          return [isPrivate ? 'R$ ••••' : formatCurrency(value), label];
                        }}
                            />
                        <Bar dataKey="value" fill="url(#topCats)" radius={[0, 6, 6, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
