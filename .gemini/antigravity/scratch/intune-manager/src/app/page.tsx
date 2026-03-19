"use client";

import { useEffect, useState } from "react";
import { Users, MonitorSmartphone, ShieldCheck, Activity, AlertCircle, TrendingUp, Zap } from "lucide-react";

export default function DashboardHome() {
  const [stats, setStats] = useState({ users: 0, devices: 0, compliance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersRes, devicesRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/devices")
        ]);

        const users = await usersRes.json();
        const devices = await devicesRes.json();

        if (users.error || devices.error) {
          setError(users.error || devices.error);
        }

        const userList = Array.isArray(users) ? users : [];
        const deviceList = Array.isArray(devices) ? devices : [];

        const compliant = deviceList.filter((d: any) => d.complianceState === 'compliant').length;
        const complianceRate = deviceList.length ? Math.round((compliant / deviceList.length) * 100) : 0;

        setStats({
          users: userList.length,
          devices: deviceList.length,
          compliance: complianceRate
        });
      } catch (e: any) {
        console.error("Failed to load dashboard stats", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-end" style={{ marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: '-0.03em' }}>Tenant Command</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Global status and environment health overview.</p>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '99px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          v2.0 REBUILD ACTIVE
        </div>
      </div>

      {error && (
        <div className="card" style={{ border: '1px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={20} />
          <div>
            <p style={{ fontWeight: 600 }}>Connection Error</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>{error}</p>
          </div>
        </div>
      )}

      <div className="grid-cards">
        {/* Metric Card: Users */}
        <div className="card flex-col gap-4" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex justify-between items-start">
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Identities</p>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{loading ? "..." : stats.users}</h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-bold text-success">
            <TrendingUp size={12} /> Live Sync Active
          </div>
        </div>

        {/* Metric Card: Devices */}
        <div className="card flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Managed Endpoints</p>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{loading ? "..." : stats.devices}</h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)' }}>
              <MonitorSmartphone size={20} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] font-bold text-success">
            <Activity size={12} /> Real-time Monitoring
          </div>
        </div>

        {/* Metric Card: Compliance */}
        <div className="card flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Security Compliance</p>
              <h3 style={{ fontSize: "1.75rem", fontWeight: 800 }}>{loading ? "..." : `${stats.compliance}%`}</h3>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ width: `${stats.compliance}%`, height: '100%', backgroundColor: 'var(--success)', transition: 'width 1.5s ease-out' }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Tenant Information Card */}
        <div className="card flex-col gap-6" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <Zap className="text-primary" size={24} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Intune Service Status</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            All Microsoft Intune services are currently operational. Device synchronization is active and healthy.
          </p>
          <div className="flex gap-3">
            <button className="btn btn-primary w-full" onClick={() => window.location.href = '/devices'}>View Managed Devices</button>
          </div>
        </div>
      </div>
    </div>
  );
}
