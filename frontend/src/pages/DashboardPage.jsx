import { useCallback, useEffect, useState } from 'react';
import { Hash, PiggyBank, Receipt, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { buildQuery, formatCurrency, formatDate, monthLabel, toISODate } from '../lib/format.js';
import CategoryBadge from '../components/CategoryBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner from '../components/Spinner.jsx';
import StatCard from '../components/StatCard.jsx';

const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
];

export default function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  const [state, setState] = useState({
    loading: true,
    error: '',
    summary: null,
    trend: null,
    recent: [],
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    try {
      const [summary, trend, recent] = await Promise.all([
        api.get(`/expenses/summary${buildQuery({ from: toISODate(monthStart), to: toISODate(now) })}`),
        api.get(`/expenses/summary${buildQuery({ from: toISODate(sixMonthsAgo), to: toISODate(now) })}`),
        api.get(`/expenses${buildQuery({ limit: 6, sort: 'date_desc' })}`),
      ]);
      setState({ loading: false, error: '', summary, trend, recent: recent.expenses });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthName = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const totals = state.summary?.totals ?? { total: 0, count: 0, average: 0, largest: 0 };

  const trendData = (state.trend?.byMonth ?? []).map((row) => ({
    month: monthLabel(row.month),
    total: Number(row.total),
  }));

  const categoryData = (state.summary?.byCategory ?? [])
    .map((row, index) => ({
      name: row.name,
      value: Number(row.total),
      color: row.color || CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((row) => row.value > 0);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0] || 'there'}</h1>
          <p>Your spending overview for {monthName}.</p>
        </div>
      </header>

      {state.error ? <div className="alert alert-error">{state.error}</div> : null}

      {state.loading ? (
        <Spinner label="Loading your dashboard…" />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              icon={PiggyBank}
              label="Spent this month"
              value={formatCurrency(totals.total, currency)}
            />
            <StatCard icon={Receipt} label="Transactions" value={totals.count} />
            <StatCard
              icon={TrendingUp}
              label="Average"
              value={formatCurrency(totals.average, currency)}
            />
            <StatCard
              icon={Hash}
              label="Largest"
              value={formatCurrency(totals.largest, currency)}
            />
          </div>

          <div className="chart-grid">
            <div className="card">
              <div className="card-header">
                <h2>Monthly trend</h2>
                <span className="cell-muted">last 6 months</span>
              </div>
              <div className="card-body">
                {trendData.length === 0 ? (
                  <EmptyState title="No spending yet" description="Add an expense to see the trend." />
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} width={60} />
                        <Tooltip
                          formatter={(value) => formatCurrency(value, currency)}
                          contentStyle={{ borderRadius: 10, border: '1px solid #e6e8f0' }}
                        />
                        <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={46} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>By category</h2>
                <span className="cell-muted">this month</span>
              </div>
              <div className="card-body">
                {categoryData.length === 0 ? (
                  <EmptyState title="Nothing to break down" />
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={2}
                        >
                          {categoryData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value, currency)}
                          contentStyle={{ borderRadius: 10, border: '1px solid #e6e8f0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Recent expenses</h2>
            </div>
            {state.recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Head to the Expenses page to add your first one."
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.recent.map((expense) => (
                      <tr key={expense.id}>
                        <td className="cell-muted">{formatDate(expense.spent_at)}</td>
                        <td>{expense.description || <span className="cell-muted">—</span>}</td>
                        <td>
                          <CategoryBadge
                            name={expense.category_name}
                            color={expense.category_color}
                          />
                        </td>
                        <td className="amount" style={{ textAlign: 'right' }}>
                          {formatCurrency(expense.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
