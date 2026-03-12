'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserDetails(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const id = params.id;
    
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [manager, setManager] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        fetch(`/api/users/${id}`)
            .then(async res => {
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.details || err.error || `Error ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setUser(data.user);
                setManager(data.manager);
            })
            .catch(err => {
                console.error('Failed to fetch user details:', err);
                setError(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Loading User Details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '40px' }}>
                <Link href="/users" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    ← Back to Users
                </Link>
                <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                    <p style={{ fontWeight: 'bold' }}>Failed to load user</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ padding: '40px' }}>
                <Link href="/users" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    ← Back to Users
                </Link>
                <p>User not found.</p>
            </div>
        );
    }

    const lastSignIn = user.signInActivity?.lastSignInDateTime 
        ? new Date(user.signInActivity.lastSignInDateTime).toLocaleString() 
        : 'Never or Unknown';

    const renderDetail = (label: string, value: string | undefined | null) => (
        <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '1rem', color: '#fff', wordBreak: 'break-word' }}>{value || '—'}</p>
        </div>
    );

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <Link href="/users" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                    ← Back to Users
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', flexShrink: 0 }}>
                        {user.displayName?.[0] || 'U'}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {user.displayName}
                            {user.accountEnabled === false ? (
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 'normal' }}>
                                    Disabled
                                </span>
                            ) : (
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontWeight: 'normal' }}>
                                    Active
                                </span>
                            )}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{user.userPrincipalName}</p>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Profile Information */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Profile Details
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {renderDetail('First Name', user.givenName)}
                        {renderDetail('Last Name', user.surname)}
                        {renderDetail('Job Title', user.jobTitle)}
                        {renderDetail('Department', user.department)}
                        {renderDetail('User Type', user.userType)}
                        {renderDetail('Email', user.mail)}
                    </div>
                </div>

                {/* Contact & Location */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Contact & Location
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {renderDetail('Office Location', user.officeLocation)}
                        {renderDetail('City', user.city)}
                        {renderDetail('State/Province', user.state)}
                        {renderDetail('Country/Region', user.country)}
                        {renderDetail('Business Phone', user.businessPhones?.[0])}
                        {renderDetail('Mobile Phone', user.mobilePhone)}
                    </div>
                </div>

                {/* Account & Activity Information */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Account & Licensing
                    </h2>
                    {renderDetail('Created Date', user.createdDateTime ? new Date(user.createdDateTime).toLocaleDateString() : undefined)}
                    {renderDetail('Last Sign In', lastSignIn)}
                    
                    <div style={{ marginTop: '24px' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Manager</p>
                        {manager ? (
                            <Link href={`/users/${manager.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textDecoration: 'none', color: '#fff', border: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {manager.displayName?.[0] || 'M'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{manager.displayName}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{manager.jobTitle || 'Manager'}</p>
                                </div>
                            </Link>
                        ) : (
                            <p style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>No manager assigned</p>
                        )}
                    </div>

                    <div style={{ marginTop: '24px' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Assigned Licenses ({user.assignedLicenses?.length || 0})</p>
                        {user.assignedLicenses && user.assignedLicenses.length > 0 ? (
                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {user.assignedLicenses.map((license: any, idx: number) => (
                                    <li key={idx} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                                        SKU ID: {license.skuId}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>No licenses assigned</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
