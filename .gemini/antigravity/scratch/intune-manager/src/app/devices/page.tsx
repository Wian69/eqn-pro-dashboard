"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, RefreshCw, AlertCircle, CheckCircle2, Monitor,
  Zap, UserPlus, Info, Terminal, Copy, Check, Save, Trash2, ArrowRight
} from "lucide-react";

export default function DevicesPage() {
  const router = useRouter();

  // Device State
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.error) setError(data.error);

      const intuneDevices = Array.isArray(data) ? data : [];
      const savedManual = localStorage.getItem("manual_devices");
      const manualDevices = savedManual ? JSON.parse(savedManual) : [];

      const merged = [...intuneDevices];
      manualDevices.forEach((md: any) => {
        if (!merged.find(d => d.serialNumber === md.serialNumber)) {
          merged.push(md);
        }
      });

      setDevices(merged);
    } catch (e) {
      setError("Failed to reach Intune API.");
    } finally {
      setLoading(false);
    }
  }


  async function handleAction(deviceId: string, action: string) {
    if (action === 'rebootNow' && !confirm("Quick-restart this device?")) return;
    setSyncingId(deviceId);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      alert(`${action === 'rebootNow' ? 'Restart' : 'Sync'} triggered.`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally { setSyncingId(null); }
  }


  return (
    <div className="flex-col gap-6 animate-fade-in" style={{ position: 'relative' }}>
      <div className="flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: '-0.03em' }}>Managed Endpoints</h2>
          <p className="text-muted" style={{ fontWeight: 500 }}>Global device inventory across Intune and manual targets.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDevices} className="btn" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Device / Identity</th>
              <th>Current Owner</th>
              <th>Platform / Spec</th>
              <th style={{ width: '150px' }}>Status</th>
              <th style={{ width: '250px', textAlign: 'right' }}>Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "4rem" }} className="text-muted">Analyzing tenant inventory...</td></tr>
            ) : devices.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "4rem" }} className="text-muted">No endpoints detected in this tenant.</td></tr>
            ) : (
              devices.map(device => (
                <tr key={device.id}>
                  <td>
                    <div className="flex-col">
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700 }}>{device.deviceName}</span>
                        {device.isManual && <span className="badge badge-primary">Manual</span>}
                      </div>
                      <span className="font-mono text-[0.7rem] text-muted">{device.serialNumber}</span>
                    </div>
                  </td>
                  <td className="text-muted font-medium">{device.userDisplayName || 'Unassigned'}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{device.operatingSystem}</div>
                    <div style={{ fontSize: '0.7rem' }} className="text-muted truncate max-w-[150px]">{device.manufacturer} {device.model}</div>
                  </td>
                  <td>
                    {device.complianceState === 'compliant' ? (
                      <span className="badge badge-success flex items-center gap-1.5 w-fit">
                        <CheckCircle2 size={10} /> Secure
                      </span>
                    ) : (
                      <span className="badge badge-danger flex items-center gap-1.5 w-fit">
                        <AlertCircle size={10} /> Action Req
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleAction(device.id, 'syncDevice')}
                        disabled={syncingId === device.id}
                        className="btn"
                        style={{ padding: '0.45rem', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}
                        title="Force Sync"
                      >
                        {syncingId === device.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ marginTop: 'auto', padding: '1.5rem', textAlign: 'center', opacity: 0.5 }}>
          <p style={{ fontSize: '0.75rem' }}>Some data may be unavailable due to API restrictions. Ensure direct Intune integration is verified.</p>
        </div>
      )}
    </div>
  );
}
