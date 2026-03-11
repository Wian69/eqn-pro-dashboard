'use client';

import { useEffect, useState } from 'react';

export default function Security() {
    const [score, setScore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/security')
            .then(res => res.json())
            .then(data => {
                setScore(data.score);
                setLoading(false);
            })
            .catch(err => console.error('Failed to fetch security:', err));
    }, []);

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Security Monitoring</h1>
                <p style={{ color: 'var(--text-muted)' }}>Real-time threat detection and security posture assessment from Microsoft.</p>
            </header>

            <div className="dashboard-grid">
                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <h3 style={{ marginBottom: '8px' }}>Azure Monitor Alerts</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{loading ? '...' : (score?.currentScore ? 'Active' : '0')}</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Integrated with Microsoft Graph Security</p>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <h3 style={{ marginBottom: '8px' }}>Current Secure Score</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                        {loading ? '...' : (score?.currentScore || 'N/A')}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Out of {score?.maxScore || '...'}</p>
                </div>
            </div>

            <section style={{ marginTop: '48px' }}>
                <h2 style={{ marginBottom: '24px' }}>Tenant Health</h2>
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛡️</div>
                    <h3>Secure Architecture</h3>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                        Your tenant is currently reporting a Secure Score of {score?.currentScore || '...'} which indicates healthy baseline security practices.
                    </p>
                </div>
            </section>
        </div>
    );
}
