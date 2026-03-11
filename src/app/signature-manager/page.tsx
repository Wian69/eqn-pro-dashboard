export default function SignatureManager() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Signature Manager</h1>
                <p style={{ color: 'var(--text-muted)' }}>Coordinated organizational email signatures and branding.</p>
            </header>
            <div className="glass-panel" style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
                    <div>
                        <h3 style={{ marginBottom: '16px' }}>Templates</h3>
                        <ul className="nav-list" style={{ padding: 0 }}>
                            <li className="nav-item active">Standard Corporate</li>
                            <li className="nav-item">Sales & Marketing</li>
                            <li className="nav-item">Support Desk</li>
                        </ul>
                    </div>
                    <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Preview</h4>
                        <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '16px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{'{'}DisplayName{'}'}</div>
                            <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{'{'}JobTitle{'}'} | EQN Pro</div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.875rem' }}>
                                <span>T: {'{'}Phone{'}'}</span>
                                <span>E: {'{'}Email{'}'}</span>
                            </div>
                            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                This email and any files transmitted with it are confidential...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
