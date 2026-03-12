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

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [saving, setSaving] = useState(false);

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
                setEditData(data.user);
            })
            .catch(err => {
                console.error('Failed to fetch user details:', err);
                setError(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to update user');
            }
            
            // Refresh original data
            const data = await fetch(`/api/users/${id}`).then(r => r.json());
            setUser(data.user);
            setIsEditing(false);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

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

    const renderDetail = (label: string, key: string, value: string | undefined | null) => (
        <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
            {isEditing ? (
                <input 
                    type="text" 
                    value={editData[key] || ''} 
                    onChange={(e) => setEditData({...editData, [key]: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                />
            ) : (
                <p style={{ fontSize: '1rem', color: '#fff', wordBreak: 'break-word' }}>{value || '—'}</p>
            )}
        </div>
    );

    return (
        <div>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
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
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {isEditing ? (
                        <>
                            <button 
                                onClick={() => { setIsEditing(false); setEditData(user); }} 
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave} 
                                style={{ padding: '8px 24px', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(true)} 
                            style={{ padding: '8px 24px', borderRadius: '8px', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Profile Information */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Profile Details
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {renderDetail('First Name', 'givenName', user.givenName)}
                        {renderDetail('Last Name', 'surname', user.surname)}
                        {renderDetail('Display Name', 'displayName', user.displayName)}
                        {renderDetail('Job Title', 'jobTitle', user.jobTitle)}
                        {renderDetail('Department', 'department', user.department)}
                        {renderDetail('User Type', 'userType', user.userType)}
                        {renderDetail('Usage Location', 'usageLocation', user.usageLocation)}
                        {renderDetail('Preferred Language', 'preferredLanguage', user.preferredLanguage)}
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</p>
                            <p style={{ fontSize: '1rem', color: '#fff', wordBreak: 'break-word' }}>{user.mail || '—'}</p>
                        </div>
                    </div>
                </div>

                {/* Contact & Location */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Contact & Location
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {renderDetail('Office Location', 'officeLocation', user.officeLocation)}
                        {renderDetail('Street Address', 'streetAddress', user.streetAddress)}
                        {renderDetail('City', 'city', user.city)}
                        {renderDetail('State/Province', 'state', user.state)}
                        {renderDetail('Postal Code', 'postalCode', user.postalCode)}
                        {renderDetail('Country/Region', 'country', user.country)}
                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Business Phone</p>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={Array.isArray(editData.businessPhones) ? editData.businessPhones[0] || '' : editData.businessPhones || ''} 
                                    onChange={(e) => setEditData({...editData, businessPhones: [e.target.value]})}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--glass)', color: '#fff' }}
                                />
                            ) : (
                                <p style={{ fontSize: '1rem', color: '#fff' }}>{user.businessPhones?.[0] || '—'}</p>
                            )}
                        </div>
                        {renderDetail('Mobile Phone', 'mobilePhone', user.mobilePhone)}
                    </div>
                </div>

                {/* Account & Activity Information */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Account & Licensing
                    </h2>
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Created Date</p>
                        <p style={{ fontSize: '1rem', color: '#fff' }}>{user.createdDateTime ? new Date(user.createdDateTime).toLocaleDateString() : '—'}</p>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Last Sign In</p>
                        <p style={{ fontSize: '1rem', color: '#fff' }}>{lastSignIn}</p>
                    </div>
                    
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
