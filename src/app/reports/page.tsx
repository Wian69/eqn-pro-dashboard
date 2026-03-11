export default function Reports() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Analytics & Reports</h1>
                <p style={{ color: 'var(--text-muted)' }}>Generate and export detailed compliance and activity reports.</p>
            </header>

            <div className="dashboard-grid">
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Compliance Summary</h3>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Overall Compliance</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#22c55e' }}>98%</div>
                    </div>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Security Events</h3>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Total Events (24h)</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6' }}>4,129</div>
                    </div>
                </div>
            </div>

            <section style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2>Available Reports</h2>
                    <button>Schedule Report</button>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    {[
                        { name: 'Monthly Compliance Audit', type: 'PDF', generated: 'Mar 01, 2026' },
                        { name: 'Device Inventory Export', type: 'CSV', generated: 'Yesterday' },
                        { name: 'Security Incident Log', type: 'Excel', generated: '2h ago' },
                    ].map((report, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>{report.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {report.type} • Last Generated: {report.generated}</div>
                            </div>
                            <button style={{ background: 'var(--glass)', border: '1px solid var(--border)', padding: '8px 16px' }}>Download</button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
