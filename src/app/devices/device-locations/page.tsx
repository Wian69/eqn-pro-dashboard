export default function DeviceLocations() {
    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Device Locations</h1>
                <p style={{ color: 'var(--text-muted)' }}>Geographic distribution of managed endpoints.</p>
            </header>
            <div className="glass-panel" style={{ padding: '40px', minHeight: '400px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🌍</div>
                    <h2>Live Map Unavailable</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Connecting to global geolocation services...</p>
                </div>
            </div>
        </div>
    );
}
