'use client';

import { useEffect, useState } from 'react';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'displayName', direction: 'asc' });

    useEffect(() => {
        setError(null);
        fetch('/api/users')
            .then(async res => {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.details || errorData.error || `API Error: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setUsers(data.all || []);
                setFilteredUsers(data.all || []);
            })
            .catch(err => {
                console.error('Failed to fetch users:', err);
                setError(err.message);
                setUsers([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        let result = [...users];
        if (search) {
            result = result.filter(u =>
                u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
                u.mail?.toLowerCase().includes(search.toLowerCase())
            );
        }
        if (typeFilter !== 'all') {
            result = result.filter(u => u.userType === typeFilter);
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
        setFilteredUsers(result);
    }, [search, typeFilter, users, sortConfig]);

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
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>User Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Manage real identities and access levels from Microsoft Graph.</p>
            </header>
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Filter by User Name or Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{ padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border)', background: '#111', color: '#fff', cursor: 'pointer' }}
                    >
                        <option value="all" style={{ background: '#111', color: '#fff' }}>All Types</option>
                        <option value="Member" style={{ background: '#111', color: '#fff' }}>Member</option>
                        <option value="Guest" style={{ background: '#111', color: '#fff' }}>Guest</option>
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
                            <th onClick={() => toggleSort('displayName')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                User {getSortIcon('displayName')}
                            </th>
                            <th onClick={() => toggleSort('mail')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Email {getSortIcon('mail')}
                            </th>
                            <th onClick={() => toggleSort('userType')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Type {getSortIcon('userType')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading Users...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users match filters.</td></tr>
                        ) : filteredUsers.map((user, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {user.displayName?.[0] || 'U'}
                                    </div>
                                    {user.displayName}
                                </td>
                                <td style={{ padding: '16px' }}>{user.mail || user.userPrincipalName}</td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: user.userType === 'Member' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: user.userType === 'Member' ? '#22c55e' : '#94a3b8' }}>
                                        {user.userType}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
