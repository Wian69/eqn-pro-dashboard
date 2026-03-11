'use client';

import { useEffect, useState } from 'react';

export default function RecommendedAction() {
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/security')
            .then(res => res.json())
            .then(data => {
                // We use controlScores from the secureScore object as a proxy for recommended actions if we don't fetch full profiles
                const scores = data.score?.controlScores || [];
                // Map to a friendlier format
                setActions(scores.slice(0, 8).map((s: any) => ({
                    title: s.controlName?.replace(/([A-Z])/g, ' $1').trim() || 'Security Control',
                    impact: `+${s.score}`,
                    priority: s.score > 10 ? 'High' : 'Medium'
                })));
                setLoading(false);
            })
            .catch(err => console.error('Failed to fetch recommendations:', err));
    }, []);

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Recommended Actions</h1>
                <p style={{ color: 'var(--text-muted)' }}>Live security improvements prioritized from Microsoft Graph.</p>
            </header>
            <div className="glass-panel" style={{ padding: '24px' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Prioritizing actions...</div>
                ) : actions.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No recommended actions found at this time.</div>
                ) : actions.map((act, i) => (
                    <div key={i} style={{ padding: '20px', borderBottom: i < actions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{act.title}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Potential Impact: <span style={{ color: '#22c55e' }}>{act.impact}</span></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: act.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: act.priority === 'High' ? '#ef4444' : '#94a3b8' }}>
                                {act.priority}
                            </span>
                            <button style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Implement</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
