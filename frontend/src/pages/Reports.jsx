import { useState, useEffect, useCallback } from 'react'
import { Download, FileText, FileSpreadsheet, BarChart3, PieChart as PieIcon } from 'lucide-react'
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getYearlyStats, getCategoryBreakdown, getTransactions } from '../services/db'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, monthName, CHART_COLORS, shortMonthName } from '../utils/formatters'
import toast from 'react-hot-toast'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Reports() {
    const { user } = useAuth()
    const currency = user?.currency || 'EUR'
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [yearlyData, setYearlyData] = useState(null)
    const [breakdown, setBreakdown] = useState([])
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    const fetchData = useCallback(async () => {
        if (!user) return
        setLoading(true)
        try {
            const [yearly, breakdownRes] = await Promise.all([
                getYearlyStats(user.uid, year),
                getCategoryBreakdown(user.uid, {
                    start_date: `${year}-01-01`, end_date: `${year}-12-31`, type: 'expense'
                })
            ])
            setYearlyData(yearly)
            setBreakdown(breakdownRes.breakdown)
        } catch (err) {
            console.error('Error fetching reports:', err)
        }
        finally { setLoading(false) }
    }, [user, year])

    useEffect(() => { fetchData() }, [fetchData])

    const exportPDF = async () => {
        setExporting(true)
        try {
            const [{ default: jsPDF }] = await Promise.all([import('jspdf')])
            const { default: autoTable } = await import('jspdf-autotable')

            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.getWidth()

            // Header
            doc.setFillColor(99, 102, 241)
            doc.rect(0, 0, pageWidth, 40, 'F')
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.text('BudgApp — Rapport Financier', 14, 22)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.text(`Année ${year} — Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 32)

            // Summary
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('Résumé Annuel', 14, 55)

            const totals = yearlyData?.yearTotals || {}
            autoTable(doc, {
                startY: 60,
                head: [['Indicateur', 'Montant']],
                body: [
                    ['Total Revenus', formatCurrency(totals.income || 0, currency)],
                    ['Total Dépenses', formatCurrency(totals.expenses || 0, currency)],
                    ['Solde Net', formatCurrency(totals.balance || 0, currency)],
                    ['Taux d\'Épargne', totals.income > 0 ? `${((totals.balance / totals.income) * 100).toFixed(1)}%` : '0%'],
                ],
                headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 14, right: 14 },
            })

            // Monthly table
            const finalY = doc.lastAutoTable?.finalY + 12 || 120
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('Détail par Mois', 14, finalY)

            const monthlyRows = (yearlyData?.monthlyData || []).map((m, i) => [
                MONTHS_FR[i], formatCurrency(m.income, currency), formatCurrency(m.expenses, currency), formatCurrency(m.balance, currency)
            ])

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Mois', 'Revenus', 'Dépenses', 'Balance']],
                body: monthlyRows,
                headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 14, right: 14 },
            })

            // Footer
            const finalDocY = doc.lastAutoTable?.finalY + 20
            doc.setFontSize(10)
            doc.setTextColor(150)
            doc.text('Application développée par ELGHIATI Zakaria', pageWidth / 2, finalDocY, { align: 'center' })

            doc.save(`BudgApp_Rapport_${year}.pdf`)
            toast.success('📄 PDF téléchargé !')
        } catch (err) {
            console.error(err)
            toast.error('Erreur lors de la génération du PDF')
        } finally { setExporting(false) }
    }

    const exportExcel = async () => {
        setExporting(true)
        try {
            const { utils, writeFile } = await import('xlsx')
            const { transactions: txs } = await getTransactions(user.uid, { limit: 5000 })

            const rows = txs.map(t => ({
                'Date': t.date,
                'Type': t.type === 'income' ? 'Revenu' : 'Dépense',
                'Description': t.description,
                'Catégorie': t.category?.name || '',
                'Montant': t.amount,
                'Devise': user?.currency || 'EUR',
                'Moyen de paiement': t.payment_method || '',
                'Notes': t.notes || '',
                'Récurrent': t.is_recurring ? 'Oui' : 'Non'
            }))

            const wb = utils.book_new()
            const ws = utils.json_to_sheet(rows)
            ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 30 }, { wch: 10 }]
            utils.book_append_sheet(wb, ws, 'Transactions')

            // Summary sheet
            const tot = yearlyData?.yearTotals
            const summaryRows = [
                { 'Indicateur': 'Total Revenus', 'Valeur': tot?.income || 0 },
                { 'Indicateur': 'Total Dépenses', 'Valeur': tot?.expenses || 0 },
                { 'Indicateur': 'Solde Net', 'Valeur': tot?.balance || 0 },
                { 'Indicateur': '', 'Valeur': '' },
                { 'Indicateur': 'Développé par', 'Valeur': 'ELGHIATI Zakaria' }
            ]
            const ws2 = utils.json_to_sheet(summaryRows)
            utils.book_append_sheet(wb, ws2, 'Résumé')

            writeFile(wb, `BudgApp_${year}.xlsx`)
            toast.success('📊 Excel téléchargé !')
        } catch (err) {
            console.error(err)
            toast.error('Erreur lors de l\'export Excel')
        } finally { setExporting(false) }
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>{label}</div>
                {payload.map(p => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(p.value, currency)}</span>
                    </div>
                ))}
            </div>
        )
    }

    const chartData = (yearlyData?.monthlyData || []).map((m, i) => ({
        name: MONTHS_FR[i], Revenus: m.income, Dépenses: m.expenses, Épargne: Math.max(0, m.balance)
    }))

    const breakdownTotal = breakdown.reduce((s, b) => s + b.total, 0)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Rapports & Analyses</h1>
                    <p className="page-subtitle">Vue annuelle et export de données</p>
                </div>
                <div className="reports-actions-bar">
                    <select className="form-control" style={{ width: 'auto', minWidth: 90 }} value={year} onChange={e => setYear(+e.target.value)}>
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={exportPDF} disabled={exporting} title="Rapport PDF">
                            <FileText size={15} /><span className="hidden-mobile">PDF</span>
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={exportExcel} disabled={exporting} title="Export Excel">
                            <FileSpreadsheet size={15} /><span className="hidden-mobile">Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Year summary */}
            <div className="reports-stats-grid" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Revenus annuels', value: yearlyData?.yearTotals?.income || 0, color: 'var(--success-500)' },
                    { label: 'Dépenses annuelles', value: yearlyData?.yearTotals?.expenses || 0, color: 'var(--danger-500)' },
                    { label: 'Solde annuel', value: yearlyData?.yearTotals?.balance || 0, color: (yearlyData?.yearTotals?.balance || 0) >= 0 ? 'var(--success-500)' : 'var(--danger-500)' },
                    {
                        label: 'Taux d\'épargne', value: null, color: 'var(--brand-500)',
                        extra: yearlyData?.yearTotals?.income > 0
                            ? `${((yearlyData.yearTotals.balance / yearlyData.yearTotals.income) * 100).toFixed(1)}%`
                            : '0%'
                    },
                ].map(s => (
                    <div key={s.label} className="card reports-stat-card">
                        <div className="reports-stat-label">{s.label}</div>
                        <div className="reports-stat-value" style={{ color: s.color }}>
                            {s.extra || formatCurrency(s.value, currency)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20, width: '100%' }}>
                {[
                    { key: 'overview', label: '📈 Évolution' },
                    { key: 'breakdown', label: '🍕 Catégories' },
                ].map(t => (
                    <button key={t.key} className={`tab-item${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}
                        style={{ flex: 1, textAlign: 'center' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading-overlay" style={{ minHeight: 300 }}>
                    <div className="spinner" style={{ width: 36, height: 36 }} />
                </div>
            ) : activeTab === 'overview' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Bar Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Revenus vs Dépenses par mois</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="Revenus" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Line Chart Savings */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Tendance de l'épargne</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ height: 240 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line type="monotone" dataKey="Épargne" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1', stroke: 'var(--bg-card)', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Monthly table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Détail mensuel {year}</h3>
                        </div>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Mois</th>
                                        <th>Revenus</th>
                                        <th>Dépenses</th>
                                        <th>Balance</th>
                                        <th>Taux épargne</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(yearlyData?.monthlyData || []).map((m, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{MONTHS_FR[i]} {year}</td>
                                            <td className="amount-income">{formatCurrency(m.income, currency)}</td>
                                            <td className="amount-expense">{formatCurrency(m.expenses, currency)}</td>
                                            <td style={{ fontWeight: 700, color: m.balance >= 0 ? 'var(--success-500)' : 'var(--danger-500)' }}>
                                                {formatCurrency(m.balance, currency)}
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: m.income > 0 && m.balance >= 0 ? 'var(--success-500)' : 'var(--danger-500)' }}>
                                                    {m.income > 0 ? `${((m.balance / m.income) * 100).toFixed(1)}%` : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Category breakdown */
                <div className="reports-breakdown-grid">
                    <div className="card">
                        <div className="card-header">
                            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Dépenses par catégorie — {year}</h3>
                        </div>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Catégorie</th>
                                        <th>Transactions</th>
                                        <th>Montant</th>
                                        <th>Part</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdown.map((b, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color || CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name || 'Sans catégorie'}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.count}</td>
                                            <td className="amount-expense">{formatCurrency(b.total, currency)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${b.percentage}%`, background: b.color || CHART_COLORS[i % CHART_COLORS.length], borderRadius: 99 }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{b.percentage}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Donut chart */}
                    <div className="card card-body reports-donut-card">
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Répartition</h3>
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={breakdown.map((b, i) => ({ ...b, fill: b.color || CHART_COLORS[i % CHART_COLORS.length] }))}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="total">
                                        {breakdown.map((b, i) => <Cell key={i} fill={b.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={v => formatCurrency(v, currency)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--danger-500)' }}>{formatCurrency(breakdownTotal, currency)}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total dépenses {year}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
