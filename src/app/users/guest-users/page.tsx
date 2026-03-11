'use client';

import { useEffect, useState } from 'react';

export default function GuestUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'displayName', direction: 'asc' });

    useEffect(() => {
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                setUsers(data.guests || []);
                setFilteredUsers(data.guests || []);
                setLoading(false);
            })
            .catch(err => console.error('Failed to fetch guest users:', err));
    }, []);

    useEffect(() => {
        let result = [...users];
        if (search) {
            result = result.filter(u =>
                u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
                u.mail?.toLowerCase().includes(search.toLowerCase())
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
        setFilteredUsers(result);
    }, [search, users, sortConfig]);

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
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Guest Users</h1>
                <p style={{ color: 'var(--text-muted)' }}>External collaborators and invited guest accounts from Graph.</p>
            </header>
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Filter by Guest Name or Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                    />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th onClick={() => toggleSort('displayName')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                Guest Name {getSortIcon('displayName')}
                            </th>
                            <th onClick={() => toggleSort('mail')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                External Email {getSortIcon('mail')}
                            </th>
                            <th onClick={() => toggleSort('id')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                ID {getSortIcon('id')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No guest users match filters.</td></tr>
                        ) : filteredUsers.map((user, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '16px' }}>{user.displayName}</td>
                                <td style={{ padding: '16px' }}>{user.mail || user.userPrincipalName}</td>
                                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user.id}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
