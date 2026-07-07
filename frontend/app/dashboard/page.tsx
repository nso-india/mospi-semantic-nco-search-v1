"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Legend,
  ComposedChart, Line,
  PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type TabType = "Usage" | "Audit Trail" | "Performance";

// Helper components
const StatCard = ({ title, value, accentColor }: { title: string, value: string | number, accentColor: string }) => (
  <div className="dashboard-card p-5 relative overflow-hidden flex flex-col justify-between">
    <div 
      className="absolute top-0 left-0 right-0 h-1" 
      style={{ background: accentColor }}
    />
    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2 mt-1">{title}</h3>
    <p className="text-3xl font-bold font-['Space_Grotesk'] text-[var(--text)]">{value ?? "—"}</p>
  </div>
);

const TrendChart = ({ trendData }: { trendData: any[] }) => {
  if (!trendData || trendData.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data yet</div>;
  return (
    <div className="h-64 mt-4 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--violet)" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="var(--violet)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
            itemStyle={{ color: 'var(--violet)' }}
          />
          <Area type="monotone" dataKey="count" stroke="var(--violet)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Searches" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const StackedTrendChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data yet</div>;
  return (
    <div className="h-64 mt-4 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
            cursor={{ fill: 'var(--bg-subtle)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)', paddingTop: '10px' }} />
          <Bar dataKey="matches" stackId="a" fill="var(--teal)" name="Matches" radius={[0, 0, 2, 2]} />
          <Bar dataKey="overrides" stackId="a" fill="var(--rose)" name="Overrides" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const HorizontalBarChart = ({ data, labelKey, valKey, color }: { data: any[], labelKey: string, valKey: string, color: string }) => {
  if (!data || data.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data yet</div>;
  const maxVal = Math.max(...data.map(d => d[valKey]), 1);
  return (
    <div className="mt-4 flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-[var(--text-secondary)] truncate mr-2" title={d[labelKey]}>{d[labelKey]}</span>
            <span className="text-[var(--text-muted)]">{d[valKey]}</span>
          </div>
          <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${(d[valKey] / maxVal) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ positive, negative }: { positive: number, negative: number }) => {
  const total = positive + negative;
  if (total === 0) return <div className="text-[var(--text-muted)] text-sm">No feedback yet</div>;
  
  const posPct = Math.round((positive / total) * 100);
  const strokeWidth = 15;
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const posLength = (posPct / 100) * circumference;
  
  return (
    <div className="flex items-center gap-6 mt-4">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r={radius}
            fill="transparent"
            stroke="var(--rose)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="transparent"
            stroke="var(--teal)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${posLength} ${circumference - posLength}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl font-bold font-['Space_Grotesk'] text-[var(--text)]">{posPct}%</span>
          <span className="text-[10px] text-[var(--text-muted)]">Positive</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></div>
          <span>👍 Positive ({positive})</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--rose)' }}></div>
          <span>👎 Negative ({negative})</span>
        </div>
      </div>
    </div>
  );
};

const PerformanceTrendChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data yet</div>;
  return (
    <div className="h-64 mt-4 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--teal)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
          <Area yAxisId="left" type="monotone" dataKey="avg_confidence" name="Avg Confidence (%)" fill="url(#colorConf)" stroke="var(--teal)" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="avg_latency" name="Avg Latency (ms)" stroke="var(--rose)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const LatencyPieChart = ({ distribution }: { distribution: any }) => {
  if (!distribution) return <div className="text-[var(--text-muted)] text-sm">No data</div>;
  const data = [
    { name: 'Fast (< 1s)', value: distribution.fast || 0, color: 'var(--teal)' },
    { name: 'Medium (1-3s)', value: distribution.medium || 0, color: 'var(--amber)' },
    { name: 'Slow (> 3s)', value: distribution.slow || 0, color: 'var(--rose)' },
  ].filter(d => d.value > 0);

  if (data.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data</div>;

  return (
    <div className="h-64 mt-4 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const LanguageRadarChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div className="text-[var(--text-muted)] text-sm">No data yet</div>;
  return (
    <div className="h-64 mt-4 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="language" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <Radar name="Confidence" dataKey="avg_confidence" stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.5} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const GemmaImpactPanel = ({ stats }: { stats: any }) => {
  if (!stats) return null;
  const total = stats.gemma_invocations + stats.vector_invocations;
  const gemmaPct = total > 0 ? Math.round((stats.gemma_invocations / total) * 100) : 0;
  
  return (
    <div className="dashboard-card p-5 mb-6 relative overflow-hidden bg-gradient-to-br from-[var(--surface)] to-[var(--bg-subtle)] border-[var(--violet)] border-l-4">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="var(--violet)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      
      <h3 className="text-xl font-bold font-['Space_Grotesk'] text-[var(--violet)] mb-1 flex items-center gap-2">
        <span className="text-2xl">✨</span> Gemma Model Impact
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6">Analyzing the intelligence layer powered by your local Gemma model.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Model Accuracy Comparison</h4>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">Gemma Augmented</div>
                <div className="text-xs text-[var(--text-muted)]">LLM Reranked ({stats.gemma_total_assignments} verified)</div>
              </div>
              <div className="text-2xl font-bold text-[var(--teal)]">{stats.gemma_accuracy}%</div>
            </div>
            <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--teal)] rounded-full" style={{ width: `${stats.gemma_accuracy}%` }} />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">Vector Only Baseline</div>
                <div className="text-xs text-[var(--text-muted)]">No LLM ({stats.vector_total_assignments} verified)</div>
              </div>
              <div className="text-xl font-bold text-[var(--text-secondary)]">{stats.vector_accuracy}%</div>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--text-muted)] rounded-full" style={{ width: `${stats.vector_accuracy}%` }} />
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Traffic Distribution</h4>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-[var(--violet)]">{gemmaPct}%</span>
            <span className="text-sm text-[var(--text-muted)] mb-1">of searches routed to Gemma</span>
          </div>
          <div className="h-4 w-full flex rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[var(--violet)] transition-all" style={{ width: `${gemmaPct}%` }} title={`Gemma: ${stats.gemma_invocations}`} />
            <div className="h-full bg-[var(--border-strong)] transition-all" style={{ width: `${100 - gemmaPct}%` }} title={`Vector: ${stats.vector_invocations}`} />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--violet)]"></div> Gemma ({stats.gemma_invocations})</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--border-strong)] border border-[var(--border)]"></div> Vector ({stats.vector_invocations})</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("Usage");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);

  const fetchData = async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);
    try {
      const [dashRes, auditRes] = await Promise.all([
        fetch(`/api/dashboard`, { credentials: "include" }),
        fetch(`/api/audit`, { credentials: "include" }),
      ]);

      if (dashRes.status === 401 || auditRes.status === 401) {
        localStorage.removeItem("userMode");
        window.location.href = "/";
        return;
      }

      if (!dashRes.ok) throw new Error(`Dashboard API error: ${dashRes.statusText}`);
      if (!auditRes.ok) throw new Error(`Audit API error: ${auditRes.statusText}`);

      const dashJson = await dashRes.json();
      const auditJson = await auditRes.json();

      setDashboardData(dashJson);
      setAuditData(auditJson);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--primary)] text-sm mb-3 inline-block font-medium transition-colors">
              ← Back to Search
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-['Space_Grotesk'] text-[var(--text)] tracking-tight">SkillWeave Dashboard</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/20 mt-1 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_5px_var(--danger)]"></div>
                <span className="text-[10px] font-bold text-danger uppercase tracking-wider">Live Tracking</span>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] mt-2">Real-time usage metrics, live audit trail, and performance analysis.</p>
          </div>
          <button 
            onClick={() => fetchData()}
            disabled={loading}
            className="mt-4 sm:mt-0 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-sm text-sm font-medium hover:bg-[var(--bg-subtle)] disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span> 
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-[var(--danger)] border border-red-200 dark:border-red-800 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto hide-scrollbar">
          {(["Usage", "Audit Trail", "Performance"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "border-[var(--violet)] text-[var(--violet)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {tab === "Usage" && "📈 "}
              {tab === "Audit Trail" && "📋 "}
              {tab === "Performance" && "⚡ "}
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="relative min-h-[400px]">
          {loading && (!dashboardData || !auditData) ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[var(--violet)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div key={activeTab} className="animate-fadeUp">
              {activeTab === "Usage" && <UsageTab data={dashboardData} />}
              {activeTab === "Audit Trail" && <AuditTab data={auditData} dashboardData={dashboardData} />}
              {activeTab === "Performance" && <PerformanceTab data={dashboardData} auditData={auditData} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageTab({ data }: { data: any }) {
  if (!data) return null;
  const t = data.totals || {};
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total searches" value={t.searches} accentColor="var(--violet)" />
        <StatCard title="Voice searches" value={t.voice_searches} accentColor="var(--coral)" />
        <StatCard title="Codes assigned" value={t.assignments} accentColor="var(--teal)" />
        <StatCard title="Override rate" value={`${t.override_rate ?? 0}%`} accentColor="var(--amber)" />
        <StatCard title="👍 Positive" value={t.feedback_positive} accentColor="var(--teal)" />
        <StatCard title="👎 Negative" value={t.feedback_negative} accentColor="var(--rose)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dashboard-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--text)] mb-4">Search trend (14 days)</h3>
          <TrendChart trendData={data.search_trend} />
        </div>
        <div className="space-y-6">
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Top queries</h3>
            <HorizontalBarChart data={data.top_queries} labelKey="query" valKey="count" color="var(--indigo)" />
          </div>
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Searches by language</h3>
            <HorizontalBarChart data={data.language_breakdown} labelKey="language" valKey="count" color="var(--violet)" />
          </div>
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Normalization Engine</h3>
            <HorizontalBarChart data={data.normalization_methods || []} labelKey="method" valKey="count" color="var(--teal)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTab({ data, dashboardData }: { data: any, dashboardData: any }) {
  const [searchFilter, setSearchFilter] = useState("");

  const filteredSearches = useMemo(() => {
    if (!data?.recent_searches) return [];
    if (!searchFilter) return data.recent_searches;
    return data.recent_searches.filter((s: any) => 
      s.query?.toLowerCase().includes(searchFilter.toLowerCase()) || 
      s.top_code?.includes(searchFilter)
    );
  }, [data?.recent_searches, searchFilter]);

  if (!data) return null;

  const getConfColor = (conf: number) => {
    if (conf >= 80) return "var(--teal)";
    if (conf >= 55) return "var(--amber)";
    return "var(--rose)";
  };

  const orRate = data.total_assignments ? Math.round((data.total_overrides / data.total_assignments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="System Accuracy" value={`${100 - orRate}%`} accentColor="var(--teal)" />
        <StatCard title="Assignments Logged" value={data.total_assignments} accentColor="var(--violet)" />
        <StatCard title="Overrides Logged" value={data.total_overrides} accentColor="var(--amber)" />
        <StatCard title="Override Rate" value={`${orRate}%`} accentColor="var(--coral)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dashboard-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--text)] mb-2">Verification Trend (14 days)</h3>
          <p className="text-xs text-[var(--text-muted)] mb-2">Tracking user-verified matches (Green) vs. overrides (Red)</p>
          <StackedTrendChart data={dashboardData?.verification_trend} />
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">User Feedback</h3>
            <DonutChart 
              positive={data.feedback?.positive || 0} 
              negative={data.feedback?.negative || 0} 
            />
          </div>
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Most Overridden Queries</h3>
            <HorizontalBarChart data={dashboardData?.most_overridden_queries || []} labelKey="query" valKey="count" color="var(--rose)" />
          </div>
        </div>
      </div>

      <div className="dashboard-card p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="font-semibold text-[var(--text)]">Recent Searches</h3>
          <input 
            type="text"
            placeholder="Filter by query or NCO code..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded text-sm text-[var(--text)] focus:outline-none focus:border-[var(--violet)] w-full sm:w-64 transition-colors placeholder-[var(--text-muted)]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="pb-3 pr-4 font-normal">Time</th>
                <th className="pb-3 pr-4 font-normal">Query</th>
                <th className="pb-3 pr-4 font-normal">Language</th>
                <th className="pb-3 pr-4 font-normal">Top Code</th>
                <th className="pb-3 pr-4 font-normal">Confidence</th>
                <th className="pb-3 pr-4 font-normal">Latency</th>
                <th className="pb-3 pr-4 font-normal text-center">Voice</th>
                <th className="pb-3 pr-4 font-normal text-center">Reranked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(!filteredSearches || filteredSearches.length === 0) ? (
                <tr><td colSpan={8} className="py-8 text-center text-[var(--text-muted)] italic">No matching queries found</td></tr>
              ) : (
                filteredSearches.map((s: any) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="py-3 pr-4 text-[var(--text-muted)]">{new Date(s.time).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--text)]">{s.query}</td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{s.language || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-[var(--violet)]">{s.top_code || "—"}</td>
                    <td className="py-3 pr-4 font-medium" style={{ color: getConfColor(s.confidence) }}>
                      {s.confidence ? `${s.confidence}%` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{s.latency_ms ? `${s.latency_ms}ms` : "—"}</td>
                    <td className="py-3 pr-4 text-center">{s.voice ? "🎙" : "—"}</td>
                    <td className="py-3 pr-4 text-center">{s.reranked ? "✓" : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-card p-5 overflow-hidden">
        <h3 className="font-semibold text-[var(--text)] mb-4">Recent Assignments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="pb-3 pr-4 font-normal">Time</th>
                <th className="pb-3 pr-4 font-normal">Query</th>
                <th className="pb-3 pr-4 font-normal">Assigned Code</th>
                <th className="pb-3 pr-4 font-normal">Suggested Code</th>
                <th className="pb-3 pr-4 font-normal">Status</th>
                <th className="pb-3 font-normal">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(!data.recent_assignments || data.recent_assignments.length === 0) ? (
                <tr><td colSpan={6} className="py-4 text-center text-[var(--text-muted)]">No data yet</td></tr>
              ) : (
                data.recent_assignments.map((a: any) => (
                  <tr key={a.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="py-3 pr-4 text-[var(--text-muted)]">{new Date(a.time).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--text)]">{a.query}</td>
                    <td className="py-3 pr-4 font-mono text-[var(--text-secondary)]">{a.assigned_code}</td>
                    <td className="py-3 pr-4 font-mono text-[var(--text-secondary)]">{a.suggested_code || "—"}</td>
                    <td className="py-3 pr-4">
                      {a.overridden ? (
                        <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">OVERRIDE</span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">MATCH</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] truncate max-w-xs" title={a.notes || ""}>{a.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function PerformanceTab({ data, auditData }: { data: any, auditData: any }) {
  if (!data) return null;
  const p = data.performance || {};

  return (
    <div className="space-y-6">
      <GemmaImpactPanel stats={data.gemma_stats} />
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Avg latency" value={`${p.avg_latency_ms ?? 0}ms`} accentColor="var(--violet)" />
        <StatCard title="p50 latency" value={`${p.p50_latency_ms ?? 0}ms`} accentColor="var(--indigo)" />
        <StatCard title="p90 latency" value={`${p.p90_latency_ms ?? 0}ms`} accentColor="var(--coral)" />
        <StatCard title="Avg confidence" value={`${p.avg_confidence ?? 0}%`} accentColor="var(--teal)" />
        <StatCard title="Low conf. rate" value={`${p.low_confidence_pct ?? 0}%`} accentColor="var(--rose)" />
        <StatCard title="Reranked searches" value={`${p.reranked_pct ?? 0}%`} accentColor="var(--amber)" />
        <StatCard title="Queries measured" value={p.total_queries_measured ?? 0} accentColor="var(--text-muted)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dashboard-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--text)] mb-4">Performance Trend (14 days)</h3>
          <p className="text-xs text-[var(--text-muted)] mb-2">Tracking Average Confidence vs. Latency over time</p>
          <PerformanceTrendChart data={data.performance_trend} />
        </div>

        <div className="space-y-6">
          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Latency breakdown</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">Target: p90 &lt; 3000ms with LLM reranking</p>
            
            <div className="space-y-4">
              {[
                { label: "Average", val: p.avg_latency_ms },
                { label: "p50", val: p.p50_latency_ms },
                { label: "p90", val: p.p90_latency_ms },
              ].map((m, i) => {
                const ms = m.val || 0;
                let color = "var(--teal)";
                if (ms >= 1000) color = "var(--amber)";
                if (ms >= 3000) color = "var(--rose)";
                // Scale up to ~5000ms max
                const pct = Math.min((ms / 5000) * 100, 100);
                
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[var(--text-secondary)]">{m.label}</span>
                      <span className="text-[var(--text-muted)]">{ms.toFixed(1)}ms</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-4">Avg Confidence by Language</h3>
            <LanguageRadarChart data={data.confidence_by_language} />
          </div>

          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-2">Latency Distribution</h3>
            <LatencyPieChart distribution={p.latency_distribution} />
          </div>

          <div className="dashboard-card p-5">
            <h3 className="font-semibold text-[var(--text)] mb-4">System health</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></div>
                <span className="text-[var(--text)]">Semantic search <span className="text-[var(--text-muted)] ml-1">→ Operational</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (auditData?.total_searches > 0) ? 'var(--teal)' : 'var(--amber)' }}></div>
                <span className="text-[var(--text)]">Audit logging <span className="text-[var(--text-muted)] ml-1">→ {auditData?.total_searches || 0} records</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></div>
                <span className="text-[var(--text)]">LLM reranker <span className="text-[var(--text-muted)] ml-1">→ {p.reranked_pct ?? 0}% searches reranked</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--teal)' }}></div>
                <span className="text-[var(--text)]">Voice (Whisper) <span className="text-[var(--text-muted)] ml-1">→ {data.totals?.voice_searches ?? 0} voice searches</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}