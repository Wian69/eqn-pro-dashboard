export default function Policies() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Security Policies</h1>
                <p style={{ color: 'var(--text-muted)' }}>Define and deploy global security configurations.</p>
            </header>
            <div className="dashboard-grid">
                {[
                    { title: 'BitLocker Enforcement', target: 'All Windows', status: 'Active' },
                    { title: 'Firewall Config v2', target: 'Laptops', status: 'Drafting' },
                    { title: 'Update Ring - Pilot', target: 'IT Group', status: 'Active' },
                    { title: 'App Restrictions', target: 'Marketing', status: 'Disabled' },
                ].map((policy, i) => (
                    <div key={i} className="card">
                        <h3 style={{ marginBottom: '8px' }}>{policy.title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>Target: {policy.target}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: policy.status === 'Active' ? '#22c55e' : '#eab308' }}>
                                {policy.status}
                            </span>
                            <button style={{ padding: '6px 12px', fontSize: '0.875rem' }}>Edit</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
