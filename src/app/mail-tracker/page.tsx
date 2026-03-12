'use client';

import { useEffect, useState } from 'react';

export default function MailTracker() {
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [trackedUsers, setTrackedUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingTracked, setLoadingTracked] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Add Tracking State
    const [isAdding, setIsAdding] = useState(false);
    const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
    const [trackingDuration, setTrackingDuration] = useState('7');
    const [savingTracking, setSavingTracking] = useState(false);

    // View Mail Logs State
    const [viewingUser, setViewingUser] = useState<any | null>(null);
    const [userMails, setUserMails] = useState<any[]>([]);
    const [loadingMails, setLoadingMails] = useState(false);
    const [mailError, setMailError] = useState<string | null>(null);

    const fetchTrackedUsers = async () => {
        setLoadingTracked(true);
        try {
            const res = await fetch('/api/mail-tracker/tracked');
            if (!res.ok) throw new Error('Failed to fetch tracked users');
            const data = await res.json();
            setTrackedUsers(data.trackedUsers || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingTracked(false);
        }
    };

    useEffect(() => {
        // Fetch all active users for the dropdown
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                // Filter out external/guests if preferred, or just show all
                setAllUsers(data.active || []);
            })
            .catch(err => {
                console.error(err);
                setError('Failed to load user list.');
            })
            .finally(() => setLoadingUsers(false));

        fetchTrackedUsers();
    }, []);

    const handleStartTracking = async () => {
        if (!selectedUserToAdd) return;
        setSavingTracking(true);
        try {
            const res = await fetch('/api/mail-tracker/tracked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUserToAdd,
                    durationDays: trackingDuration === 'unlimited' ? null : parseInt(trackingDuration)
                })
            });
            if (!res.ok) throw new Error('Failed to start tracking');
            
            setIsAdding(false);
            setSelectedUserToAdd('');
            await fetchTrackedUsers(); // refresh the list
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSavingTracking(false);
        }
    };

    const handleStopTracking = async (userId: string) => {
        if (!confirm('Are you sure you want to stop tracking this user?')) return;
        
        try {
            const res = await fetch('/api/mail-tracker/tracked', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) throw new Error('Failed to stop tracking');
            
            // If we are currently viewing this user, we can clear it or leave it
            if (viewingUser?.id === userId) {
                setViewingUser(null);
                setUserMails([]);
            }

            await fetchTrackedUsers(); // refresh the list
        } catch (err: any) {
            alert(err.message);
        }
    };

    const viewUserMails = async (user: any) => {
        setViewingUser(user);
        setLoadingMails(true);
        setMailError(null);
        setUserMails([]);
        
        try {
            const res = await fetch(`/api/mail-tracker/${user.id}`);
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.details || data.error || 'Failed to fetch emails');
            }
            
            setUserMails(data.messages || []);
        } catch (err: any) {
            setMailError(err.message);
        } finally {
            setLoadingMails(false);
        }
    };

    const isExpired = (dateString: string | null) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    return (
        <div>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Mail Tracker</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Monitor and automate daily reports for sent emails of specific users.</p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)} 
                        style={{ padding: '8px 24px', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        + Track New User
                    </button>
                )}
            </header>

            {error && (
                <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                    Error: {error}
                </div>
            )}

            {/* Add Tracking Form */}
            {isAdding && (
                <div className="glass-panel" style={{ marginBottom: '32px', padding: '24px', border: '1px solid var(--accent)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#fff' }}>Start Mail Flow Tracking</h2>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Select User</label>
                            <select 
                                value={selectedUserToAdd} 
                                onChange={e => setSelectedUserToAdd(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: '#111', color: '#fff' }}
                                disabled={loadingUsers}
                            >
                                <option value="">Select a user...</option>
                                {allUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.displayName} ({u.userPrincipalName})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Tracking Duration</label>
                            <select 
                                value={trackingDuration} 
                                onChange={e => setTrackingDuration(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: '#111', color: '#fff' }}
                            >
                                <option value="1">1 Day</option>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                                <option value="unlimited">Unlimited (Manual Only)</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                onClick={() => setIsAdding(false)} 
                                style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                                disabled={savingTracking}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleStartTracking} 
                                style={{ padding: '12px 24px', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                disabled={savingTracking || !selectedUserToAdd}
                            >
                                {savingTracking ? 'Saving...' : 'Start Tracking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
                
                {/* Currently Tracked Users List */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        Actively Tracked Users ({trackedUsers.length})
                    </h2>
                    
                    {loadingTracked ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading tracked users...</p>
                    ) : trackedUsers.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No users are currently being tracked.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '12px' }}>User</th>
                                        <th style={{ padding: '12px' }}>Email</th>
                                        <th style={{ padding: '12px' }}>Expires</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackedUsers.map(user => {
                                        const expired = isExpired(user.expiresAt);
                                        return (
                                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', background: viewingUser?.id === user.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{user.displayName}</td>
                                                <td style={{ padding: '12px' }}>{user.mail}</td>
                                                <td style={{ padding: '12px' }}>
                                                    {user.expiresAt ? (
                                                        <span style={{ color: expired ? '#ef4444' : '#fff' }}>
                                                            {new Date(user.expiresAt).toLocaleDateString()} {expired && '(Expired)'}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>Unlimited</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button 
                                                            onClick={() => viewUserMails(user)}
                                                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--accent)', background: viewingUser?.id === user.id ? 'var(--accent)' : 'transparent', color: viewingUser?.id === user.id ? '#000' : 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem' }}
                                                        >
                                                            View Sent Mails
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStopTracking(user.id)}
                                                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem' }}
                                                        >
                                                            Untrack
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mail Viewer Panel */}
                {viewingUser && (
                    <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Sent Items: {viewingUser.displayName}</span>
                            <button onClick={() => setViewingUser(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                        </h2>
                        
                        {loadingMails ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Fetching sent emails...</div>
                        ) : mailError ? (
                            <div style={{ padding: '24px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                                <p style={{ fontWeight: 'bold' }}>Error fetching emails</p>
                                <p>{mailError}</p>
                            </div>
                        ) : userMails.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No sent emails found for this user in their Sent Items folder.</p>
                        ) : (
                            <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--background)' }}>
                                        <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '12px' }}>Date Sent</th>
                                            <th style={{ padding: '12px' }}>Subject</th>
                                            <th style={{ padding: '12px' }}>To Recipients</th>
                                            <th style={{ padding: '12px' }}>📎</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userMails.map((mail, i) => (
                                            <tr key={mail.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                    {new Date(mail.sentDateTime).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '12px', verticalAlign: 'top' }}>
                                                    {mail.subject || '(No Subject)'}
                                                </td>
                                                <td style={{ padding: '12px', verticalAlign: 'top', fontSize: '0.875rem' }}>
                                                    {mail.toRecipients?.map((r: any) => r.emailAddress?.address).join(', ') || 'Unknown'}
                                                    {mail.ccRecipients && mail.ccRecipients.length > 0 && (
                                                        <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            CC: {mail.ccRecipients.map((r: any) => r.emailAddress?.address).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px', verticalAlign: 'top', textAlign: 'center' }}>
                                                    {mail.hasAttachments ? '📎' : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                
            </div>
        </div>
    );
}
