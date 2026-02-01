import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar } from 'recharts';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, HeartPulse, Clock } from 'lucide-react';
import { DashboardStats } from '../types';
import { Skeleton } from './ui/Skeleton';

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; subtext?: string; loading: boolean; colorClass?: string }> = ({ title, value, icon, subtext, loading, colorClass }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
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

export const Dashboard: React.FC<DashboardProps> = ({ stats, isLoading }) => {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 animate-pulse" />)}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      
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
            <h4 className="font-bold text-sm uppercase tracking-wide">Financial Health Check</h4>
            <p className="text-sm font-medium mt-1">{stats.financialHealth.message}</p>
          </div>
          <div className="text-right hidden sm:block">
             <p className="text-xs opacity-75">3-Month Avg</p>
             <p className="font-bold">{formatCurrency(stats.financialHealth.averageLast3Months)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Open Invoice (Current)" 
          value={formatCurrency(stats?.openInvoice || 0)} 
          icon={<CreditCard size={20} />} 
          subtext="Due in 12 days"
          loading={isLoading}
        />
        <StatCard 
          title="Upcoming Maturities" 
          value={formatCurrency(stats?.upcomingMaturities || 0)} 
          icon={<Clock size={20} />} 
          subtext="Next 7 Days"
          loading={isLoading}
          colorClass="text-orange-600 dark:text-orange-400"
        />
        <StatCard 
          title="Available Limit" 
          value={formatCurrency((stats?.totalLimit || 0) - (stats?.usedLimit || 0))} 
          icon={<AlertCircle size={20} />} 
          subtext={`${((stats?.usedLimit || 0) / (stats?.totalLimit || 1) * 100).toFixed(0)}% utilized`}
          loading={isLoading}
        />
        <StatCard 
          title="Last 3 Mo. Avg" 
          value={formatCurrency(stats?.financialHealth?.averageLast3Months || 0)} 
          icon={<TrendingDown size={20} />} 
          subtext="Rolling average baseline"
          loading={isLoading}
        />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-[400px] flex flex-col relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Expense vs Average</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Monthly Expense</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-full"></div> 3-Mo Average</div>
          </div>
        </div>
        
        {isLoading ? (
          <Skeleton className="w-full h-full" />
        ) : (
          <div className="flex-1 w-full min-h-0 relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats?.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b' }} 
                    tickFormatter={(value) => `R$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line type="monotone" dataKey="average" stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};