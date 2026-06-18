'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { name: 'Dashboard', path: '/' },
    {
        name: 'Devices',
        path: '/devices',
        subItems: [
            // { name: 'Active Devices', path: '/devices/active-devices' },
            { name: 'Device Locations', path: '/devices/device-locations' },
        ]
    },
    // { name: 'Policies', path: '/policies' },
    // { name: 'Remote Dial In', path: '/remote-dial-in' },
    { name: 'Reports', path: '/reports' },
    { name: 'Billing', path: '/reports' }, // Pointing to reports page for now
    { name: 'Mail Tracker', path: '/mail-tracker' },
    // { name: 'Script Deployment', path: '/script-deployment' },
    {
        name: 'Security',
        path: '/security',
        subItems: [
            { name: 'Microsoft Score', path: '/security/microsoft-score' },
            { name: 'Recommended Action', path: '/security/recommended-action' },
        ]
    },
    // { name: 'Signature Manager', path: '/signature-manager' },
    {
        name: 'Users',
        path: '/users'
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span style={{ fontSize: '1.8rem' }}>∑</span>
                EQN Pro
            </div>
            <nav style={{ overflowY: 'auto', flex: 1 }}>
                <ul className="nav-list">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <Link
                                href={item.path}
                                className={`nav-item ${pathname === item.path || pathname.startsWith(item.path + '/') ? 'active' : ''}`}
                            >
                                {item.name}
                            </Link>
                            {item.subItems && (pathname === item.path || pathname.startsWith(item.path + '/')) && (
                                <ul className="sub-nav-list">
                                    {item.subItems.map((sub) => (
                                        <li key={sub.path}>
                                            <Link
                                                href={sub.path}
                                                className={`sub-nav-item ${pathname === sub.path ? 'active' : ''}`}
                                            >
                                                {sub.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    v1.0.0
                </div>
            </div>
        </aside>
    );
}
