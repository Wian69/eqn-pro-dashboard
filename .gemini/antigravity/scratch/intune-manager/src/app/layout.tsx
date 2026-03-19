import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Intune Remote Pro",
  description: "Enterprise-grade remote management for Intune",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex h-screen w-full bg-main overflow-hidden">
        {/* Sidebar */}
        <aside style={{ width: '280px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '2rem' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '2.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
                ✦
              </div>
              <div>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Intune Pro</h1>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise Console</p>
              </div>
            </div>

            <nav className="flex-col gap-1">
              <Link href="/" className="nav-link">
                Dashboard
              </Link>
              <Link href="/users" className="nav-link">
                Users & Policies
              </Link>
              <Link href="/devices" className="nav-link">
                Managed Devices
              </Link>
            </nav>
          </div>

          <div style={{ marginTop: 'auto', padding: '2rem', borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Signaling Active</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-col w-full" style={{ overflowY: 'auto', position: 'relative' }}>
          <header style={{
            padding: '1.25rem 2.5rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              M365 Tenant: <span style={{ color: 'var(--text-main)' }}>Active Directory Connected</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="badge badge-success">Online</span>
            </div>
          </header>

          <div style={{ padding: '2.5rem' }}>
            {children}
          </div>
        </main>

        <style jsx global>{`
          .nav-link {
            display: flex;
            align-items: center;
            padding: 0.8rem 1.2rem;
            border-radius: var(--radius-md);
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-muted);
            transition: all 0.2s;
            text-decoration: none;
            margin-bottom: 4px;
          }
          .nav-link:hover {
            color: var(--text-main);
            background-color: rgba(255, 255, 255, 0.03);
          }
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
      </body>
    </html>
  );
}
