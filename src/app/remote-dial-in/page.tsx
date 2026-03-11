export default function RemoteDialIn() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Remote Dial In</h1>
                <p style={{ color: 'var(--text-muted)' }}>Securely connect to remote endpoints with zero-trust architecture.</p>
            </header>
            <div className="glass-panel" style={{ padding: '32px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '24px' }}>📡</div>
                    <h2 style={{ marginBottom: '16px' }}>Ready for Connection</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Enter a device ID or select an active endpoint from the devices list to initiate a secure remote session.</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Enter Device ID..."
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff', flex: 1 }}
                        />
                        <button>Connect</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
