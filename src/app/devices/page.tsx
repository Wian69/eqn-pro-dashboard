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

    const resetAgent = async (deviceId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to reset this agent? This will purge its history and status, allowing for a fresh deployment.')) return;
        
        try {
            const res = await fetch(`/api/agent/${deviceId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.details || 'Reset failed');
            }
            // Refresh data
            window.location.reload();
        } catch (err: any) {
            alert(err.message);
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
                        ) : (() => {
                            const linkedAgentIds = new Set<string>();
                            const rows = filteredDevices.map((dev, i) => {
                                // IMPROVED MATCHING LOGIC
                                const isAgent = Object.values(agents).find((a: any) => {
                                    const serialMatch = dev.serialNumber && a.deviceId && 
                                        dev.serialNumber.trim().toLowerCase() === a.deviceId.trim().toLowerCase();
                                    
                                    const hostnameMatch = dev.deviceName && a.hostname && 
                                        dev.deviceName.toLowerCase().includes(a.hostname.toLowerCase());
                                    
                                    const uuidMatch = dev.id === a.deviceId;
                                    
                                    return serialMatch || hostnameMatch || uuidMatch;
                                });

                                if (isAgent) {
                                    linkedAgentIds.add((isAgent as any).deviceId);
                                }

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
                                            {isAgent ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                                                    {(isAgent as any).status === 'online' ? (
                                                        <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                            ✅ ACTIVE AGENT
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                                ❌ OFFLINE
                                                            </span>
                                                            <button
                                                                onClick={(e) => resetAgent((isAgent as any).deviceId, e)}
                                                                className="btn-secondary"
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.7rem',
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: '1px solid #ef4444',
                                                                    color: '#ef4444'
                                                                }}
                                                            >
                                                                Reset
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => deployAgent(dev.id, e)}
                                                    disabled={deploying === dev.id}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        background: deploying === dev.id ? '#333' : 'var(--accent)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        cursor: deploying === dev.id ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        opacity: deploying === dev.id ? 0.7 : 1
                                                    }}
                                                >
                                                    {deploying === dev.id ? '⌛ Deploying...' : '🚀 Deploy Agent'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            });

                            // Find unlinked agents
                            const unlinkedAgents = Object.values(agents).filter((a: any) => !linkedAgentIds.has(a.deviceId));
                            
                            if (unlinkedAgents.length > 0) {
                                rows.push(
                                    <tr key="unlinked-header">
                                        <td colSpan={6} style={{ padding: '32px 16px 8px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem', border: 'none' }}>
                                            ⚠️ UNLINKED CLOUD AGENTS ({unlinkedAgents.length})
                                        </td>
                                    </tr>
                                );
                                
                                unlinkedAgents.forEach((a: any, idx) => {
                                    rows.push(
                                        <tr key={`unlinked-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255, 107, 0, 0.05)' }}>
                                            <td style={{ padding: '16px', fontWeight: '500' }}>{a.hostname || 'Unknown'}</td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)' }}>Non-Intune / Unmatched</td>
                                            <td style={{ padding: '16px' }}><span style={{ color: '#f59e0b' }}>● Unlinked</span></td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ color: 'var(--accent)', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid var(--accent)' }}>
                                                    EQN PRO
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                                {new Date(a.lastSeen).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <span style={{ color: a.status === 'online' ? '#22c55e' : '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                    {a.status === 'online' ? '✅ ACTIVE' : '❌ OFFLINE'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                });
                            }

                            return rows;
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
