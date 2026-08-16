import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PartnerEarningsResponse, fetchPartnerEarnings } from '../../api/marketplaceApi';
import { getPartnerId } from '../../utils/session';

export function Earnings() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<PartnerEarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchPartnerEarnings(getPartnerId())
      .then((response) => {
        if (active) {
          setData(response);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load earnings.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading earnings...</div>;
  }

  if (!data) {
    return <div className="p-6">{error || 'Earnings unavailable.'}</div>;
  }

  const { stats, weeklyData, monthlyData, transactions } = data;
  const chartData = view === 'week' ? weeklyData : monthlyData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-sm text-white/80 mt-1">Track your income and payouts</p>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">This Week</span>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              INR {stats.weeklyEarnings.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
              <TrendingUp className="w-4 h-4" />
              <span>Live</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">This Month</span>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              INR {stats.monthlyEarnings.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
              <TrendingUp className="w-4 h-4" />
              <span>Live</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">Earnings Overview</h2>
            <Tabs value={view} onValueChange={(value) => setView(value as 'week' | 'month')}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={view === 'week' ? 'day' : 'week'} stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="amount" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Available for Payout</p>
              <p className="text-3xl font-bold text-primary mt-1">INR {stats.todayEarnings.toLocaleString()}</p>
            </div>
            <DollarSign className="w-12 h-12 text-primary/20" />
          </div>
          <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Download className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{transaction.customer}</h3>
                    <p className="text-xs text-muted-foreground">{transaction.service}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">INR {transaction.amount}</p>
                    <p className={`text-xs ${transaction.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {transaction.status}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{transaction.date}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
