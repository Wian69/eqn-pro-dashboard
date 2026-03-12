'use client';

import { useEffect, useState } from 'react';

export default function Users() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    // For general sorting if needed, but the prompt says sort users according to region by office location
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'officeLocation', direction: 'asc' });

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

    // Filter users first
    let filteredUsers = [...users];
    if (search) {
        filteredUsers = filteredUsers.filter(u =>
            u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            u.mail?.toLowerCase().includes(search.toLowerCase())
        );
    }
    if (typeFilter !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.userType === typeFilter);
    }

    // Sort users
    if (sortConfig !== null) {
        filteredUsers.sort((a, b) => {
            const aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
            const bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Grouping logic
    const regions = ['Western Region', 'Southern Region', 'Eastern Region', 'Northern Region'];
    
    // Updated getRegion to handle new requirements
    const getRegion = (user: any) => {
        // 1. Check for No License users (Dedicated Category as requested)
        const hasLicense = user.assignedLicenses && user.assignedLicenses.length > 0;
        if (!hasLicense) {
            return 'No License Users';
        }

        // 2. Check for users without an office location (Move to Other as requested)
        if (!user.officeLocation) {
            return 'Other';
        }

        // 3. Region Detection strictly based on officeLocation
        const office = user.officeLocation.toLowerCase();
        for (const region of regions) {
            const regionKeyword = region.toLowerCase().replace(' region', '');
            if (office.includes(regionKeyword)) {
                return region;
            }
        }

        return 'Other';
    };

    const groupedUsers: Record<string, any[]> = {
        'Western Region': [],
        'Southern Region': [],
        'Eastern Region': [],
        'Northern Region': [],
        'No License Users': [],
        'Other': []
    };

    filteredUsers.forEach(user => {
        const region = getRegion(user);
        if (groupedUsers[region]) {
            groupedUsers[region].push(user);
        } else {
            groupedUsers['Other'].push(user);
        }
    });

    const renderUserTable = (usersList: any[], regionName: string, description?: string) => {
        if (usersList.length === 0) return null;
        
        return (
            <div key={regionName} style={{ marginBottom: '32px' }}>
                <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent)' }}>
                        {regionName} ({usersList.length})
                    </h2>
                    {description && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>
                    )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                <th onClick={() => toggleSort('displayName')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                    User {getSortIcon('displayName')}
                                </th>
                                <th onClick={() => toggleSort('mail')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                    Email {getSortIcon('mail')}
                                </th>
                                <th onClick={() => toggleSort('officeLocation')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                    Office Location {getSortIcon('officeLocation')}
                                </th>
                                <th onClick={() => toggleSort('userType')} style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                    Type {getSortIcon('userType')}
                                </th>
                                <th style={{ padding: '12px', cursor: 'pointer', userSelect: 'none' }}>
                                    Last Sign In
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.map((user, i) => {
                                const lastSignIn = user.signInActivity?.lastSignInDateTime 
                                    ? new Date(user.signInActivity.lastSignInDateTime).toLocaleString() 
                                    : 'Never or Unknown';

                                return (
                                    <tr 
                                        key={user.id || i} 
                                        onClick={() => user.id ? window.location.href = `/users/${user.id}` : null}
                                        style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', cursor: user.id ? 'pointer' : 'default' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} 
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                                                {user.displayName?.[0] || 'U'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {user.displayName}
                                                    {(user.mail?.toLowerCase().includes('@partner.eqncs.com') || user.userPrincipalName?.toLowerCase().includes('@partner.eqncs.com')) && (
                                                        <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                            Partner.EQNCS.com
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', wordBreak: 'break-all' }}>{user.mail || user.userPrincipalName}</td>
                                        <td style={{ padding: '16px' }}>{user.officeLocation || 'Unassigned'}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: user.userType === 'Member' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: user.userType === 'Member' ? '#22c55e' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                                {user.userType}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: lastSignIn === 'Never or Unknown' ? 'var(--text-muted)' : '#fff', whiteSpace: 'nowrap' }}>
                                            {lastSignIn}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>User Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Distribution lists and sign-in activity from Microsoft Graph.</p>
            </header>

            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Filter by User Name or Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: '300px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
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

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Loading Users...</div>
                ) : filteredUsers.length === 0 && !error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users match filters.</div>
                ) : (
                    <>
                        {renderUserTable(groupedUsers['Western Region'], 'Western Region')}
                        {renderUserTable(groupedUsers['Northern Region'], 'Northern Region')}
                        {renderUserTable(groupedUsers['Eastern Region'], 'Eastern Region')}
                        {renderUserTable(groupedUsers['Southern Region'], 'Southern Region')}
                        {renderUserTable(groupedUsers['Other'], 'Other (Unassigned or unknown)')}
                        {renderUserTable(groupedUsers['No License Users'], 'No License Users', 'Users that do not have any Microsoft 365 licensing assigned')}
                    </>
                )}
            </div>
        </div>
    );

}
