'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Devices() {
    const [devices, setDevices] = useState<any[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<any[]>([]);
    const [agents, setAgents] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [deploying, setDeploying] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'deviceName', direction: 'asc' });
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setError(null);
                const [devRes, agentRes] = await Promise.all([
                    fetch('/api/devices'),
                    fetch('/api/agent')
                ]);

                if (!devRes.ok) throw new Error('Failed to fetch Intune devices');
                if (!agentRes.ok) throw new Error('Failed to fetch EQN agents');

                const devData = await devRes.json();
                const agentData = await agentRes.json();

                setDevices(devData.devices || []);
                setAgents(agentData || {});
                setFilteredDevices(devData.devices || []);
            } catch (err: any) {
                console.error('Failed to fetch synchronization data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        let result = [...devices];

        if (search) {
            result = result.filter(d =>
                d.deviceName?.toLowerCase().includes(search.toLowerCase()) ||
                d.id?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(d => d.complianceState === statusFilter);
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
    }, [search, statusFilter, devices, sortConfig]);

    const toggleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const deployAgent = async (deviceId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('This will trigger an automated EQN Pro Agent deployment via Intune. Proceed?')) return;
        
        setDeploying(deviceId);
        try {
            const res = await fetch(`/api/devices/${deviceId}/deploy`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Deployment failed');
            alert('Success! Deployment script has been queued in Intune.');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeploying(null);
        }
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '🔼' : '🔽';
    };

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Device Inventory</h1>
                <p style={{ color: 'var(--text-muted)' }}>Monitor and manage real Intune-enrolled endpoints.</p>
            </header>
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Filter by Device Name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border)', background: '#111', color: '#fff', cursor: 'pointer' }}
                    >
                        <option value="all" style={{ background: '#111', color: '#fff' }}>All Statuses</option>
                        <option value="compliant" style={{ background: '#111', color: '#fff' }}>Compliant</option>
                        <option value="noncompliant" style={{ background: '#111', color: '#fff' }}>Non-Compliant</option>
                        <option value="unknown" style={{ background: '#111', color: '#fff' }}>Unknown</option>
                    </select>
                </div>
                {error && (
                    <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>⚠️</span>
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Connectivity Error</p>
                            <p style={{ fontSize: '0.875rem' }}>{error}</p>
                        </div>
                    </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th onClick={() => toggleSort('deviceName')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Device Name {getSortIcon('deviceName')}
                            </th>
                            <th onClick={() => toggleSort('operatingSystem')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                OS {getSortIcon('operatingSystem')}
                            </th>
                            <th onClick={() => toggleSort('complianceState')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Compliance {getSortIcon('complianceState')}
                            </th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th onClick={() => toggleSort('lastSyncDateTime')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Last Sync {getSortIcon('lastSyncDateTime')}
                            </th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>Loading Unified Inventory...</td></tr>
                        ) : filteredDevices.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No devices match your filters.</td></tr>
                        ) : filteredDevices.map((dev, i) => {
                            const isAgent = agents[dev.id];
                            return (
                                <tr
                                    key={i}
                                    onClick={() => router.push(`/devices/${dev.id}`)}
                                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{dev.deviceName}</td>
                                    <td style={{ padding: '16px' }}>{dev.operatingSystem}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ color: dev.complianceState === 'compliant' ? '#22c55e' : '#ef4444' }}>
                                            ● {dev.complianceState}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {isAgent ? (
                                            <span style={{ color: 'var(--accent)', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--accent)' }}>
                                                EQN PRO
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Managed</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        {new Date(dev.lastSyncDateTime).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        {isAgent && (
                                            <span style={{ color: '#22c55e', fontSize: '0.75rem' }}>Active Agent</span>
                                        )}
                                        {!isAgent && (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Management Only</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
