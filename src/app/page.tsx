'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [stats, setStats] = useState({ userCount: 0, deviceCount: 0, secureScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard Overview</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome back to EQN Pro. Live data synchronized via Microsoft Graph.</p>
      </header>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)' }}>●</span> Active Devices
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
            {loading ? '...' : stats.deviceCount}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Managed via Intune</div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#22c55e' }}>●</span> Microsoft Secure Score
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
            {loading ? '...' : stats.secureScore}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Global Security Posture</div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#eab308' }}>●</span> Total Users
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
            {loading ? '...' : stats.userCount}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Across Directory Tenant</div>
        </div>
      </div>

      <section style={{ marginTop: '48px' }}>
        <h2 style={{ marginBottom: '24px' }}>Real-time Summary</h2>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Your dashboard is now successfully connected to Microsoft Graph. Navigate through the sidebar to view detailed live reports on users, devices, and security configurations.
          </p>
        </div>
      </section>
    </div>
  );
}
