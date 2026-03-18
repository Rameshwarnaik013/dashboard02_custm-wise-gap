'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart, ComposedChart
} from 'recharts'
import './globals.css'
import styles from './dashboard.module.css'

const MONTHS = ['Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26']

function formatCustomer(name) {
  if (!name) return ''
  // Known suffix/keyword replacements (case-insensitive, whole-word aware)
  const result = name
    // Insert space between lowercase→uppercase transitions (camelCase)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between letter→digit and digit→letter
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Insert space between sequences of uppercase letters followed by uppercase+lowercase
    // e.g. "ABCTraders" → "ABC Traders"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Replace known suffixes (must come after spacing so they match correctly)
    .replace(/\bpvt\s*ltd\b/gi, 'Pvt Ltd')
    .replace(/\bpvt\b/gi, 'Pvt')
    .replace(/\bltd\b/gi, 'Ltd')
    .replace(/\bllp\b/gi, 'LLP')
    .replace(/\bindia\b/gi, 'India')
    .replace(/\bfoods\b/gi, 'Foods')
    .replace(/\btraders\b/gi, 'Traders')
    .replace(/\benterprises\b/gi, 'Enterprises')
    .replace(/\bindustries\b/gi, 'Industries')
    .replace(/\bagro\b/gi, 'Agro')
    .replace(/\bintl\b/gi, 'Intl')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Title-case each word (so all-caps names like "ABCTRADERS" become "Abctraders" → we catch via regex above)
  return result
    .split(' ')
    .map(w => {
      if (['Pvt', 'Ltd', 'LLP', 'Intl'].includes(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function formatNum(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (abs >= 1000) return (v / 1000).toFixed(1) + 'K'
  return v.toFixed(1)
}

function formatPct(v) {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return '—'
  return (v * 100).toFixed(1) + '%'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{
      background: '#1a1a26', border: '1px solid #252535', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, fontFamily: 'DM Mono, monospace',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: '#7878a0', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{formatNum(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState('ALL')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [activeMetrics, setActiveMetrics] = useState({ Projection_KG: true, SO_KG: true, Gap: true })

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => { setRawData(d); setLoading(false) })
  }, [])

  const channels = useMemo(() => {
    const ch = [...new Set(rawData.map(r => r.channel))].sort()
    return ['ALL', ...ch]
  }, [rawData])

  const customers = useMemo(() => {
    let d = rawData
    if (selectedChannel !== 'ALL') d = d.filter(r => r.channel === selectedChannel)
    return [...new Set(d.map(r => r.customer))].sort()
  }, [rawData, selectedChannel])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const q = customerSearch.toLowerCase().replace(/\s+/g, '')
    return customers.filter(c => c.toLowerCase().includes(q) || formatCustomer(c).toLowerCase().includes(customerSearch.toLowerCase()))
  }, [customers, customerSearch])

  const toggleCustomer = useCallback((c) => {
    setSelectedCustomers(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }, [])

  const clearCustomers = () => setSelectedCustomers([])

  const filtered = useMemo(() => {
    let d = rawData
    if (selectedChannel !== 'ALL') d = d.filter(r => r.channel === selectedChannel)
    if (selectedCustomers.length > 0) d = d.filter(r => selectedCustomers.includes(r.customer))
    return d
  }, [rawData, selectedChannel, selectedCustomers])

  // Build monthly aggregated chart data
  const chartData = useMemo(() => {
    return MONTHS.map(month => {
      const monthData = filtered.filter(r => r.month === month)
      const proj = monthData.filter(r => r.metric === 'Projection_KG').reduce((s, r) => s + r.value, 0)
      const so = monthData.filter(r => r.metric === 'SO_KG').reduce((s, r) => s + r.value, 0)
      const gap = monthData.filter(r => r.metric === 'Gap').reduce((s, r) => s + r.value, 0)
      const gapPct = proj !== 0 ? gap / proj : null
      return { month, Projection_KG: proj || null, SO_KG: so || null, Gap: gap || null, GapPct: gapPct }
    })
  }, [filtered])

  // Summary KPIs
  const kpis = useMemo(() => {
    const totalProj = chartData.reduce((s, r) => s + (r.Projection_KG || 0), 0)
    const totalSO = chartData.reduce((s, r) => s + (r.SO_KG || 0), 0)
    const totalGap = chartData.reduce((s, r) => s + (r.Gap || 0), 0)
    const avgGapPct = totalProj !== 0 ? totalGap / totalProj : 0
    return { totalProj, totalSO, totalGap, avgGapPct }
  }, [chartData])

  // Table data per customer (latest full aggregation)
  const tableData = useMemo(() => {
    const custSet = selectedCustomers.length > 0 ? selectedCustomers : customers.slice(0, 50)
    return custSet.slice(0, 100).map(cust => {
      const d = filtered.filter(r => r.customer === cust)
      const proj = d.filter(r => r.metric === 'Projection_KG').reduce((s, r) => s + r.value, 0)
      const so = d.filter(r => r.metric === 'SO_KG').reduce((s, r) => s + r.value, 0)
      const gap = d.filter(r => r.metric === 'Gap').reduce((s, r) => s + r.value, 0)
      const gapPct = proj !== 0 ? gap / proj : null
      return { customer: cust, proj, so, gap, gapPct }
    }).sort((a, b) => Math.abs(b.proj) - Math.abs(a.proj))
  }, [filtered, customers, selectedCustomers])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#6c63ff', fontFamily: 'Syne, sans-serif', fontSize: 18 }}>
      Loading data…
    </div>
  )

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>◈</span>
          <div>
            <h1 className={styles.title}>Sales Trend Dashboard</h1>
            <p className={styles.subtitle}>Projection · SO · Gap Analysis</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.badge}>{rawData.length.toLocaleString()} records</span>
        </div>
      </header>

      {/* Filters */}
      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Channel</label>
          <select
            className={styles.select}
            value={selectedChannel}
            onChange={e => { setSelectedChannel(e.target.value); setSelectedCustomers([]) }}
          >
            {channels.map(ch => (
              <option key={ch} value={ch}>
                {ch === 'ALL' ? '— All Channels —' : ch.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, s => s.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            Customer Search
            {selectedCustomers.length > 0 && (
              <button className={styles.clearBtn} onClick={clearCustomers}>Clear ({selectedCustomers.length})</button>
            )}
          </label>
          <input
            className={styles.input}
            placeholder="Type to search customers…"
            value={customerSearch}
            onChange={e => setCustomerSearch(e.target.value)}
          />
          {customerSearch && (
            <div className={styles.dropdown}>
              {filteredCustomers.slice(0, 20).map(c => (
                <div
                  key={c}
                  className={`${styles.dropdownItem} ${selectedCustomers.includes(c) ? styles.dropdownItemActive : ''}`}
                  onClick={() => toggleCustomer(c)}
                >
                  <span className={styles.checkmark}>{selectedCustomers.includes(c) ? '✓' : '○'}</span>
                  {formatCustomer(c)}
                </div>
              ))}
              {filteredCustomers.length === 0 && <div className={styles.dropdownEmpty}>No customers found</div>}
            </div>
          )}
          {selectedCustomers.length > 0 && (
            <div className={styles.tags}>
              {selectedCustomers.map(c => (
                <span key={c} className={styles.tag} onClick={() => toggleCustomer(c)}>
                  {formatCustomer(c)} ×
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Metrics</label>
          <div className={styles.metricToggles}>
            {[
              { key: 'Projection_KG', label: 'Projection', color: '#6c63ff' },
              { key: 'SO_KG', label: 'SO KG', color: '#43e97b' },
              { key: 'Gap', label: 'Gap', color: '#ff6584' },
            ].map(m => (
              <button
                key={m.key}
                className={`${styles.metricToggle} ${activeMetrics[m.key] ? styles.metricToggleActive : ''}`}
                style={{ '--mc': m.color }}
                onClick={() => setActiveMetrics(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
              >
                <span className={styles.dot} style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className={styles.kpis}>
        {[
          { label: 'Total Projection', value: formatNum(kpis.totalProj) + ' KG', color: '#6c63ff', icon: '▲' },
          { label: 'Total SO', value: formatNum(kpis.totalSO) + ' KG', color: '#43e97b', icon: '◆' },
          { label: 'Total Gap', value: formatNum(kpis.totalGap) + ' KG', color: kpis.totalGap >= 0 ? '#43e97b' : '#ff6584', icon: '●' },
          { label: 'Avg Gap %', value: formatPct(kpis.avgGapPct), color: kpis.avgGapPct >= 0 ? '#43e97b' : '#ff6584', icon: '%' },
        ].map(k => (
          <div key={k.label} className={styles.kpiCard}>
            <div className={styles.kpiIcon} style={{ color: k.color }}>{k.icon}</div>
            <div className={styles.kpiValue} style={{ color: k.color }}>{k.value}</div>
            <div className={styles.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </section>

      {/* Main Trend Chart */}
      <section className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Monthly Trend — Projection vs SO vs Gap</h2>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="month" tick={{ fill: '#7878a0', fontFamily: 'DM Mono', fontSize: 11 }} axisLine={{ stroke: '#252535' }} tickLine={false} />
            <YAxis tick={{ fill: '#7878a0', fontFamily: 'DM Mono', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatNum(v)} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: 'DM Mono', fontSize: 12, color: '#7878a0' }} />
            <ReferenceLine y={0} stroke="#252535" strokeDasharray="4 4" />
            {activeMetrics.Projection_KG && <Area type="monotone" dataKey="Projection_KG" name="Projection KG" stroke="#6c63ff" fill="#6c63ff22" strokeWidth={2} dot={false} />}
            {activeMetrics.SO_KG && <Line type="monotone" dataKey="SO_KG" name="SO KG" stroke="#43e97b" strokeWidth={2} dot={false} />}
            {activeMetrics.Gap && <Bar dataKey="Gap" name="Gap" fill="#ff658440" stroke="#ff6584" radius={[3,3,0,0]} />}
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* Gap % Trend */}
      <section className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Gap % Trend (Gap / Projection KG)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="month" tick={{ fill: '#7878a0', fontFamily: 'DM Mono', fontSize: 11 }} axisLine={{ stroke: '#252535' }} tickLine={false} />
            <YAxis tick={{ fill: '#7878a0', fontFamily: 'DM Mono', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(0) + '%'} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div style={{ background: '#1a1a26', border: '1px solid #252535', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'DM Mono' }}>
                  <div style={{ color: '#7878a0', marginBottom: 6 }}>{label}</div>
                  <div style={{ color: '#ff6584' }}>Gap %: <strong>{formatPct(payload[0]?.value)}</strong></div>
                </div>
              )
            }} />
            <ReferenceLine y={0} stroke="#252535" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="GapPct" name="Gap %" stroke="#ff6584" fill="#ff658422" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Data Table */}
      <section className={styles.tableSection}>
        <h2 className={styles.chartTitle}>
          Customer Summary
          <span className={styles.tableSubtitle}>showing top {Math.min(tableData.length, 100)} by Projection KG</span>
        </h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Projection KG</th>
                <th>SO KG</th>
                <th>Gap KG</th>
                <th>Gap %</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(row => {
                const gapColor = row.gap >= 0 ? '#43e97b' : '#ff6584'
                return (
                  <tr key={row.customer}>
                    <td style={{ fontFamily: 'DM Mono', fontSize: 12 }}>{formatCustomer(row.customer)}</td>
                    <td style={{ color: '#6c63ff', textAlign: 'right', fontFamily: 'DM Mono' }}>{formatNum(row.proj)}</td>
                    <td style={{ color: '#43e97b', textAlign: 'right', fontFamily: 'DM Mono' }}>{formatNum(row.so)}</td>
                    <td style={{ color: gapColor, textAlign: 'right', fontFamily: 'DM Mono' }}>{formatNum(row.gap)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono' }}>
                      <span style={{
                        background: row.gapPct !== null ? (row.gapPct >= 0 ? '#43e97b22' : '#ff658422') : 'transparent',
                        color: row.gapPct !== null ? (row.gapPct >= 0 ? '#43e97b' : '#ff6584') : '#7878a0',
                        padding: '2px 8px', borderRadius: 4, fontSize: 12
                      }}>
                        {formatPct(row.gapPct)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
