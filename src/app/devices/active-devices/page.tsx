'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ActiveDevices() {
    const [activeDevices, setActiveDevices] = useState<any[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'deviceName', direction: 'asc' });
    const router = useRouter();

    useEffect(() => {
        fetch('/api/devices')
            .then(res => res.json())
            .then(data => {
                setActiveDevices(data.active || []);
                setFilteredDevices(data.active || []);
                setLoading(false);
            })
            .catch(err => console.error('Failed to fetch active devices:', err));
    }, []);

    useEffect(() => {
        let result = [...activeDevices];
        if (search) {
            result = result.filter(d =>
                d.deviceName?.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (sortConfig !== null) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
                const bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        setFilteredDevices(result);
    }, [search, activeDevices, sortConfig]);

    const toggleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '🔼' : '🔽';
    };

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Active Devices</h1>
                <p style={{ color: 'var(--text-muted)' }}>Real-time inventory of endpoints currently compliant with security policies.</p>
            </header>

            <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '8px' }}>Compliant Endpoints</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                        {loading ? '...' : activeDevices.length}
                    </div>
                </div>
                <div className="card">
                    <h3 style={{ marginBottom: '8px' }}>Policy Status</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>100%</div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Filter by Device Name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                    />
                </div>
                <h2 style={{ marginBottom: '24px' }}>Compliant Device List</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th onClick={() => toggleSort('deviceName')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Name {getSortIcon('deviceName')}
                            </th>
                            <th onClick={() => toggleSort('operatingSystem')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Operating System {getSortIcon('operatingSystem')}
                            </th>
                            <th onClick={() => toggleSort('lastSyncDateTime')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Last Sync Date {getSortIcon('lastSyncDateTime')}
                            </th>
                            <th style={{ padding: '12px' }}>Last Sync Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Synchronizing...</td></tr>
                        ) : filteredDevices.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No compliant devices match filters.</td></tr>
                        ) : filteredDevices.map((dev, i) => (
                            <tr
                                key={i}
                                onClick={() => router.push(`/devices/${dev.id}`)}
                                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '16px', fontWeight: '500' }}>{dev.deviceName}</td>
                                <td style={{ padding: '16px' }}>{dev.operatingSystem}</td>
                                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                                    {new Date(dev.lastSyncDateTime).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {new Date(dev.lastSyncDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
