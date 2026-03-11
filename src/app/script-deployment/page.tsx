export default function ScriptDeployment() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Script Deployment</h1>
                <p style={{ color: 'var(--text-muted)' }}>Automate tasks with remote PowerShell and Bash execution.</p>
            </header>
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
                    <h3>Available Scripts</h3>
                    <button>New Script</button>
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                    {[
                        { name: 'Clear System Temp', type: 'PowerShell', lastRun: '1h ago', status: 'Success' },
                        { name: 'Deploy VPN Config', type: 'Bash', lastRun: '3d ago', status: 'Success' },
                        { name: 'Install Chrome', type: 'PowerShell', lastRun: 'Never', status: 'Pending' },
                    ].map((script, i) => (
                        <div key={i} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>{script.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{script.type} • Last run: {script.lastRun}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: script.status === 'Success' ? '#22c55e' : '#eab308' }}>● {script.status}</span>
                                <button style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'var(--glass)', color: '#fff' }}>Run Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
