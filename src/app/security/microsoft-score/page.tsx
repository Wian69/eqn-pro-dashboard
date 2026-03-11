'use client';

import { useEffect, useState } from 'react';

export default function MicrosoftScore() {
    const [score, setScore] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/security')
            .then(res => res.json())
            .then(data => {
                setScore(data.score);
                setLoading(false);
            })
            .catch(err => console.error('Failed to fetch security score:', err));
    }, []);

    const percentage = score ? (score.currentScore / score.maxScore) * 100 : 0;

    return (
        <div>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Microsoft Secure Score</h1>
                <p style={{ color: 'var(--text-muted)' }}>Security posture measurement based on live Microsoft Graph data.</p>
            </header>
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '16px' }}>
                    {loading ? '...' : score?.currentScore}
                </div>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ height: '12px', background: 'var(--border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 1s ease-out' }}></div>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Max possible score for your tenant: {score?.maxScore || '...'}.
                        {percentage > 70 ? ' Great job on your security posture!' : ' Consider implementing more recommended actions.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
