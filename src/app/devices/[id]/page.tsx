'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Terminal, Info, History, ArrowLeft, RefreshCw, CheckCircle2,
    Wifi, Cpu, HardDrive, Database, Globe, Zap, MessageSquare, MapPin,
    ShieldCheck, Activity, Package, Search, AlertTriangle, Trash2,
    Settings, Monitor, ChevronLeft, Power, RotateCw, Edit3, Shield, Cloud
} from 'lucide-react';

export default function DeviceDetails() {
    const { id } = useParams();
    const router = useRouter();
    const [device, setDevice] = useState<any>(null);
    const [agentData, setAgentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [customScript, setCustomScript] = useState('');
    const [scriptResults, setScriptResults] = useState<any[]>([]);
    const [appSearch, setAppSearch] = useState('');
    const [flaggedApps, setFlaggedApps] = useState(['Steam', 'Discord', 'Torrent', 'Battle.net', 'Epic Games', 'Riot']);
    const [bootstrapStatus, setBootstrapStatus] = useState<'none' | 'pending' | 'syncing' | 'deployed'>('none');
    const [instantMessage, setInstantMessage] = useState('');

    const isAgentOnline = () => {
        if (!agentData?.lastSeen) return false;
        const lastSeen = new Date(agentData.lastSeen).getTime();
        const now = new Date().getTime();
        return (now - lastSeen) < 65000;
    };

    const getRelativeTime = (timestamp: string) => {
        if (!timestamp) return 'N/A';
        const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 5) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return new Date(timestamp).toLocaleTimeString();
    };

    const isFetching = useRef(false);
    const deviceRef = useRef<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (isFetching.current) return;
            isFetching.current = true;
            try {
                const res = await fetch(`/api/devices/${id}`);
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.details || errorData.error || `Failed to fetch device: ${res.status}`);
                }
                const data = await res.json();
                setDevice(data);
                deviceRef.current = data;

                const agentsRes = await fetch('/api/agent');
                if (!agentsRes.ok) throw new Error(`Failed to fetch agents: ${agentsRes.status}`);
                const agents = await agentsRes.json();
                const matchedAgent = Object.values(agents).find((a: any) =>
                    a.deviceId === data.serialNumber || a.hostname === data.deviceName
                );
                if (matchedAgent) setAgentData(matchedAgent);
            } catch (err: any) {
                console.error('Initial data fetch failed:', err);
                setError(err.message);
            } finally {
                setLoading(false);
                isFetching.current = false;
            }
        };

        fetchData();

        const interval = setInterval(async () => {
            const currentDevice = deviceRef.current;
            if (!currentDevice || isFetching.current) return;
            isFetching.current = true;
            try {
                const res = await fetch('/api/agent');
                if (!res.ok) throw new Error(`Agent API returned ${res.status}`);
                const agents = await res.json();
                const matchedAgent = Object.values(agents).find((a: any) =>
                    a.deviceId === currentDevice.serialNumber || a.hostname === currentDevice.deviceName
                );
                if (matchedAgent) setAgentData(matchedAgent);
            } catch (err) {
                console.warn('Periodic agent sync failed (will retry):', err);
            } finally {
                isFetching.current = false;
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        if (agentData?.commands) {
            const results = agentData.commands.filter((c: any) => c.status === 'completed' || c.status === 'failed');
            setScriptResults(results.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
    }, [agentData]);

    const handleAction = async (action: string, promptName = false) => {
        let newName = '';
        if (promptName) {
            newName = prompt('Enter new device name:') || '';
            if (!newName) return;
        }
        setActionLoading(action);
        setMessage(null);
        try {
            if (agentData) {
                const agentRes = await fetch('/api/agent', {
                    method: 'PUT',
                    body: JSON.stringify({
                        deviceId: agentData.deviceId,
                        command: action === 'rebootNow' ? 'restart' : action === 'syncDevice' ? 'sync' : 'rename',
                        params: { newName }
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const agentResult = await agentRes.json();
                if (agentResult.success) {
                    setMessage({ type: 'success', text: `INSTANT command queued via Live Agent.` });
                    return;
                }
            }
            const res = await fetch(`/api/devices/${id}`, {
                method: 'POST',
                body: JSON.stringify({ action, newName }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) setMessage({ type: 'success', text: `Action initiated via Intune Graph API.` });
            else setMessage({ type: 'error', text: data.error || 'Action failed.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error.' });
        } finally {
            setActionLoading(null);
        }
    };

    const runCustomScript = async () => {
        if (!customScript.trim() || !agentData) return;
        setActionLoading('runScript');
        try {
            const res = await fetch('/api/agent', {
                method: 'PUT',
                body: JSON.stringify({
                    deviceId: agentData.deviceId,
                    command: 'runScript',
                    params: { code: customScript }
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Script pushed to agent.' });
                setCustomScript('');
            }
        } catch (err) { } finally { setActionLoading(null); }
    };

    const uninstallApplication = async (app: any) => {
        if (!agentData || !confirm(`Are you sure you want to remotely uninstall ${app.name}?`)) return;
        setActionLoading(`uninstall-${app.id}`);
        try {
            const res = await fetch('/api/agent', {
                method: 'PUT',
                body: JSON.stringify({
                    deviceId: agentData.deviceId,
                    command: 'uninstallApp',
                    params: { appId: app.id }
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) setMessage({ type: 'success', text: `Uninstallation of ${app.name} initiated.` });
        } catch (err) { } finally { setActionLoading(null); }
    };

    const deployAgent = async () => {
        if (!confirm('This will trigger an automated EQN Pro Agent deployment via Intune. Proceed?')) return;
        
        setActionLoading('deploy');
        try {
            const res = await fetch(`/api/devices/${id}/deploy`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Deployment failed');
            setMessage({ type: 'success', text: 'Success! Deployment script has been queued in Intune.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const sendInstantMessage = async () => {
        if (!instantMessage.trim() || !agentData) return;
        setActionLoading('sendMessage');
        try {
            const escapedMsg = instantMessage.replace(/"/g, '""').replace(/'/g, "''");
            const psPayload = `$UserScript = @'
Add-Type -AssemblyName PresentationFramework;
Add-Type -AssemblyName System.Windows.Forms;

# 1. Fallback: WTSSendMessage (The ultimate Session 0 bypass)
$WTSDefinition = @"
using System;
using System.Runtime.InteropServices;
public class WTS {
    [DllImport("wtsapi32.dll", SetLastError = true)]
    public static extern bool WTSSendMessage(IntPtr hServer, int SessionId, String pTitle, int TitleLength, String pMessage, int MessageLength, int Style, int Timeout, out int pResponse, bool bWait);
}
"@
try {
    Add-Type -TypeDefinition $WTSDefinition -ErrorAction SilentlyContinue
    $resp = 0
    $title = "IT Support Alert"
    # Try sessions 1-5 (common interactive sessions)
    1..5 | ForEach-Object { [WTS]::WTSSendMessage([IntPtr]::Zero, $_, $title, ($title.Length * 2), "${escapedMsg}", (${escapedMsg}.Length * 2), 0x40, 0, [ref]$resp, $false) }
} catch {}

# 2. Fallback: msg.exe and VBS
try { msg * /TIME:300 "${escapedMsg}" } catch {}
try { (New-Object -ComObject WScript.Shell).Popup("${escapedMsg}", 0, "IT Support Alert", 0x40 + 0x1000) } catch {}

# 3. Branded WPF Window
$logoPath = 'C:/ProgramData/EQNProAgent/logo.png';
$logoUri = "file:///$logoPath";
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="IT Alert" Height="380" Width="480" WindowStyle="None" AllowsTransparency="True" Background="Transparent" WindowStartupLocation="CenterScreen" Topmost="True">
    <Border Background="#111111" CornerRadius="16" BorderBrush="#005a9c" BorderThickness="2">
        <Grid Margin="25">
            <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
            <Image Grid.Row="0" Source="$$logo" Height="60" Margin="0,0,0,20" Stretch="Uniform"/>
            <TextBlock Grid.Row="1" Text="${escapedMsg}" Foreground="White" FontSize="18" TextWrapping="Wrap" TextAlignment="Center" VerticalAlignment="Center" FontWeight="SemiBold"/>
            <StackPanel Grid.Row="2" Margin="0,20,0,0">
                <TextBlock Text="Sent by Equinox IT Support: for more information email us: itsupport@eqncs.com" Foreground="#666" FontSize="10" HorizontalAlignment="Center" Margin="0,0,0,15"/>
                <Button Name="btn" Content="Acknowledge" Height="36" Width="140" Background="#005a9c" Foreground="White" BorderThickness="0" FontSize="14" FontWeight="Bold">
                    <Button.Resources>
                        <Style TargetType="Border"><Setter Property="CornerRadius" Value="18"/></Style>
                    </Button.Resources>
                </Button>
            </StackPanel>
        </Grid>
    </Border>
</Window>
"@;
if (Test-Path $logoPath) { $xaml = $xaml.Replace('$$logo', $logoUri) }
$window = [Windows.Markup.XamlReader]::Load([System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xaml)));
$window.FindName('btn').Add_Click({$window.Close()});
$window.Topmost = $true;
$window.ShowDialog() | Out-Null;
'@;

$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($UserScript));
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand $encoded";
$principal = New-ScheduledTaskPrincipal -GroupId "S-1-5-32-545" -RunLevel Highest -LogonType Interactive; 
Register-ScheduledTask -TaskName 'EQNBroadcast' -Action $action -Principal $principal -Force;
Start-ScheduledTask 'EQNBroadcast';
Start-Sleep -Seconds 30; # Increased persistence
Unregister-ScheduledTask 'EQNBroadcast' -Confirm:$false;
"Broadcast delivered (WTS + VBS + msg.exe + WPF)"`;

            const res = await fetch('/api/agent', {
                method: 'PUT',
                body: JSON.stringify({
                    deviceId: agentData.deviceId,
                    command: 'runScript',
                    params: { code: psPayload }
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Ironclad broadcast triggered. Checking device...' });
                setInstantMessage('');
                // Clear message after 5 seconds to avoid "stuck" feeling
                setTimeout(() => setMessage(null), 5000);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to broadcast message.' });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="loading-container">Polishing device details...</div>;
    if (!device || device.error || !device.id) return <div className="error-container">Device not found.</div>;

    return (
        <div className="page-container">
            {error && (
                <div className="glass-panel" style={{ marginBottom: '24px', padding: '24px', border: '1px solid #ef4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#ef4444' }}>
                        <AlertTriangle size={32} />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Device Connectivity Error</h2>
                            <p style={{ opacity: 0.8 }}>{error}</p>
                        </div>
                    </div>
                </div>
            )}
            {/* Nav & Breadcrumbs */}
            <nav className="breadcrumb">
                <button onClick={() => router.push('/devices')} className="nav-btn">
                    <ChevronLeft size={16} /> Dashboard
                </button>
                <span className="sep">/</span>
                <span className="current">{device.deviceName}</span>
            </nav>

            {/* Hero Section */}
            <header className="hero-panel">
                <div className="hero-identity">
                    <div className="hero-icon">
                        <img src="/equinox-logo.png" alt="Equinox" style={{ width: '50px', filter: 'brightness(0) invert(1)' }} onError={(e) => {
                            // Fallback to Icon if logo fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>';
                        }} />
                    </div>
                    <div className="hero-text">
                        <div className="hero-title-row">
                            <h1>{device.deviceName}</h1>
                            <div className={`status-badge ${device.complianceState}`}>
                                <Shield size={14} />
                                {device.complianceState?.toUpperCase()}
                            </div>
                        </div>
                        <div className="hero-meta">
                            <span><Settings size={14} /> {device.managementAgent}</span>
                            <span className="dot">•</span>
                            <span>SN: {device.serialNumber || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="management-strip">
                    <button className="mgmt-btn danger" disabled={!!actionLoading} onClick={() => handleAction('rebootNow')}>
                        <Power size={18} /> {actionLoading === 'rebootNow' ? '' : 'Restart'}
                    </button>
                    <button className="mgmt-btn accent" disabled={!!actionLoading} onClick={() => handleAction('syncDevice')}>
                        <RotateCw size={18} className={actionLoading === 'syncDevice' ? 'animate-spin' : ''} /> {actionLoading === 'syncDevice' ? '' : 'Sync'}
                    </button>
                    <button className="mgmt-btn" disabled={!!actionLoading} onClick={() => handleAction('setDeviceName', true)}>
                        <Edit3 size={18} /> {actionLoading === 'setDeviceName' ? '' : 'Rename'}
                    </button>
                </div>
            </header>

            {message && <div className={`global-alert ${message.type}`}>{message.text}</div>}

            {/* Grid 1: Performance & Map */}
            <div className="content-grid two-cols">
                <section className="glass-panel metrics-panel">
                    <div className="panel-header">
                        <div className="panel-title"><Activity size={18} color="var(--accent)" /> Hardware Vitality</div>
                        <div className={`connection-tag ${isAgentOnline() ? 'online' : 'offline'}`}>
                            {isAgentOnline() && <span className="pulse-dot"></span>}
                            {isAgentOnline() ? 'LIVE AGENT' : 'AGENT OFFLINE'}
                        </div>
                    </div>

                    <div className="metrics-list">
                        <MetricBar label="Processor (CPU)" value={agentData?.cpuUsage || 0} icon={<Cpu size={14} />} sub={device.processorFamily || 'Managed Processor'} />
                        <MetricBar
                            label="Memory (RAM)"
                            value={agentData?.ramUsage || 0}
                            icon={<Database size={14} />}
                            color="#3b82f6"
                            sub={agentData?.totalRam ? `${agentData.totalRam} GB Installed` : (device.physicalMemoryInBytes > 0 ? `${(device.physicalMemoryInBytes / (1024 ** 3)).toFixed(0)} GB Installed` : '16 GB (Estimated)')}
                        />
                        <MetricBar
                            label="Primary Disk"
                            value={agentData ? (100 - (agentData.hddFree / agentData.hddTotal * 100)) : 0}
                            icon={<HardDrive size={14} />}
                            color="#22c55e"
                            sub={agentData ? `${agentData.hddFree} GB Free / ${agentData.hddTotal} GB` : 'Telemetry required'}
                        />
                    </div>
                </section>

                <section className="glass-panel map-panel">
                    {agentData?.coords ? (
                        <iframe className="map-frame" src={`https://maps.google.com/maps?q=${agentData.coords}&z=7&output=embed`} />
                    ) : (
                        <div className="map-placeholder">
                            <MapPin size={48} color="rgba(255,255,255,0.1)" />
                            <span>Awaiting geographic telemetry...</span>
                        </div>
                    )}
                </section>
            </div>

            {/* Grid 2: Network & Operations */}
            <div className="content-grid three-cols">
                <section className="glass-panel network-panel">
                    <div className="panel-header">
                        <div className="panel-title"><Globe size={18} color="#00d2ff" /> Network Intel</div>
                    </div>
                    <div className="net-stats">
                        <div className="net-stat-item">
                            <label>Public Endpoint</label>
                            <p>{agentData?.publicIp || 'Protected'}</p>
                        </div>
                        <div className="net-stat-item">
                            <label>Local Interface</label>
                            <p>{agentData?.localIp || 'Searching...'}</p>
                        </div>
                        <div className="net-stat-item span-2">
                            <label>Internet Service Provider</label>
                            <p>{agentData?.isp || 'Enterprise Gateway'}</p>
                        </div>
                    </div>
                </section>

                <section className="glass-panel ops-panel">
                    <div className="panel-header">
                        <div className="panel-title"><Zap size={18} color="#eab308" /> Command Ops</div>
                    </div>
                    <div className="ops-status">
                        <div className="pulse-big">
                            <div className={`core ${isAgentOnline() ? 'active' : ''}`}></div>
                            <div className={`ring ${isAgentOnline() ? 'active' : ''}`}></div>
                        </div>
                        <div className="ops-text">
                            <h3>{isAgentOnline() ? 'Operational' : 'Disconnected'}</h3>
                            <p>{agentData?.lastSeen ? `Last heartbeat: ${getRelativeTime(agentData.lastSeen)}` : 'Establishing connection...'}</p>
                        </div>
                    </div>
                </section>

                <section className="glass-panel message-panel">
                    <div className="panel-header">
                        <div className="panel-title"><MessageSquare size={18} color="#3b82f6" /> Remote Broadcast</div>
                    </div>
                    <div className="msg-input-group">
                        <textarea
                            value={instantMessage}
                            onChange={(e) => setInstantMessage(e.target.value)}
                            placeholder="Type a corporate alert..."
                            disabled={!isAgentOnline()}
                        />
                        <button className="msg-btn" onClick={sendInstantMessage} disabled={!isAgentOnline() || !instantMessage.trim()}>
                            {actionLoading === 'sendMessage' ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            Send Now
                        </button>
                    </div>
                </section>
            </div>

            {/* Grid 3: Software Management */}
            <div className="content-grid one-col">
                <section className="glass-panel apps-panel">
                    <div className="panel-header">
                        <div className="panel-title"><Package size={18} color="#a855f7" /> Software Inventory & Compliance</div>
                        <div className="search-box">
                            <Search size={14} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search installed applications..."
                                value={appSearch}
                                onChange={(e) => setAppSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="apps-container">
                        <div className="apps-table-header">
                            <div>Application Name</div>
                            <div>Publisher</div>
                            <div>Version</div>
                            <div>Status</div>
                            <div style={{ textAlign: 'right' }}>Action</div>
                        </div>
                        <div className="apps-list">
                            {(agentData?.software || [])
                                .filter((app: any) => !appSearch || app.name?.toLowerCase().includes(appSearch.toLowerCase()))
                                .map((app: any, idx: number) => {
                                    const isFlagged = flaggedApps.some(f => app.name?.toLowerCase().includes(f.toLowerCase()));
                                    return (
                                        <div key={idx} className={`app-row ${isFlagged ? 'flagged' : ''}`}>
                                            <div className="app-name">
                                                {isFlagged && <AlertTriangle size={14} className="warn-icon" />}
                                                <span>{app.name}</span>
                                            </div>
                                            <div className="app-meta">{app.publisher || 'Unknown'}</div>
                                            <div className="app-meta">{app.version || 'N/A'}</div>
                                            <div className="app-status">
                                                <span className={`status-pill ${isFlagged ? 'warn' : 'ok'}`}>
                                                    {isFlagged ? 'Non-Policy' : 'Compliant'}
                                                </span>
                                            </div>
                                            <div className="app-actions">
                                                {(() => {
                                                    const isPending = actionLoading === `uninstall-${app.id}` ||
                                                        (agentData?.commands || []).some((c: any) => c.command === 'uninstallApp' && c.status === 'pending' && c.params?.appId === app.id);

                                                    return (
                                                        <button
                                                            className="uninstall-btn"
                                                            onClick={() => uninstallApplication(app)}
                                                            disabled={isPending}
                                                        >
                                                            {isPending ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                                            Uninstall
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            {(!agentData?.software || agentData.software.length === 0) && (
                                <div className="no-apps">No software inventory data available yet.</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* Grid 4: Console & Details */}
            <div className="content-grid console-grid">
                <section className="glass-panel console-panel">
                    <div className="panel-header">
                        <div className="panel-title"><Terminal size={18} color="#fff" /> Live Script Console</div>
                        <div className="console-meta">{scriptResults.length} Past Executions</div>
                    </div>
                    <div className="console-body">
                        <div className="input-row">
                            <textarea
                                value={customScript}
                                onChange={(e) => setCustomScript(e.target.value)}
                                placeholder="Get-Service | Where-Object { $_.Status -eq 'Stopped' }"
                                disabled={!isAgentOnline()}
                            />
                            <button className="console-run" onClick={runCustomScript} disabled={!isAgentOnline() || !customScript.trim()}>
                                {actionLoading === 'runScript' ? 'Executing...' : 'Run'}
                            </button>
                        </div>
                        <div className="console-history">
                            {scriptResults.map((res, i) => {
                                let label = res.command || 'Action';
                                let detail = '';
                                if (res.command === 'restart') label = 'System Restart';
                                if (res.command === 'sync') label = 'Cloud Sync';
                                if (res.command === 'rename') label = `Rename: ${res.params?.newName}`;
                                if (res.command === 'runScript') {
                                    const code = res.params?.code || '';
                                    if (code.includes('PresentationFramework')) {
                                        label = 'Broadcast Message';
                                        // Try to extract text inside Text=" ... "
                                        const match = code.match(/Text="([^"]+)"/);
                                        if (match) detail = match[1];
                                    } else if (code.includes('WScript.Shell')) {
                                        label = 'Popup Message';
                                        const match = code.match(/Popup\("([^"]+)"/);
                                        if (match) detail = match[1];
                                    } else {
                                        label = 'Custom Script';
                                        detail = code.length > 50 ? code.substring(0, 50) + '...' : code;
                                    }
                                }

                                return (
                                    <div key={i} className={`history-item ${res.status}`}>
                                        <div className="history-header">
                                            <div className="header-left">
                                                <span className="time">{new Date(res.timestamp).toLocaleTimeString()}</span>
                                                <span className="script-snippet">{label}</span>
                                            </div>
                                            <span className="status">{res.status}</span>
                                        </div>
                                        {detail && (
                                            <div className="script-full">{detail}</div>
                                        )}
                                        <pre className="output">{res.output || res.error}</pre>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <div className="side-panels">
                    <section className="glass-panel info-panel">
                        <div className="panel-header">
                            <div className="panel-title"><Info size={18} /> Specifications</div>
                        </div>
                        <div className="spec-table">
                            <SpecRow label="Manufacturer" value={device.manufacturer} />
                            <SpecRow label="Model" value={device.model} />
                            <SpecRow label="OS Version" value={device.osVersion} bold />
                            <SpecRow label="Agent Version" value={agentData?.agentVersion || '1.0.0'} />
                        </div>
                        <div className="portal-links">
                            <a
                                href={`https://intune.microsoft.com/#view/Microsoft_Intune_Devices/DeviceSettingsMenuBlade/~/overview/mdmDeviceId/${device.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="portal-btn intune"
                            >
                                <Globe size={14} />
                                View in Intune Portal
                            </a>
                        </div>
                    </section>

                    <section className="glass-panel history-panel">
                        <div className="panel-header">
                            <div className="panel-title"><History size={18} /> Cloud Sync</div>
                        </div>
                        <div className="sync-box">
                            <div className="sync-main">
                                <label>Last Successful Sync</label>
                                <h3>{new Date(device.lastSyncDateTime).toLocaleDateString()}</h3>
                                <p>{new Date(device.lastSyncDateTime).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style jsx global>{`
                :root {
                    --bg: #0a0a0c;
                    --panel-bg: rgba(255, 255, 255, 0.03);
                    --border: rgba(255, 255, 255, 0.08);
                    --accent: #00d2ff;
                    --accent-deep: #005a9c;
                    --text-muted: rgba(255, 255, 255, 0.5);
                }

                .page-container {
                    padding: 40px;
                    background: var(--bg);
                    min-height: 100vh;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                .nav-btn {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-muted);
                    padding: 8px 16px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nav-btn:hover { background: var(--panel-bg); color: #fff; border-color: rgba(255,255,255,0.2); }

                .breadcrumb { display: flex; alignItems: center; gap: 12px; margin-bottom: 32px; }
                .breadcrumb .sep { color: var(--text-muted); }
                .breadcrumb .current { font-weight: 600; }

                .hero-panel {
                    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
                    border-radius: 24px;
                    border: 1px solid var(--border);
                    padding: 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                    backdrop-filter: blur(20px);
                }

                .hero-identity { display: flex; align-items: center; gap: 24px; }
                .hero-icon {
                    width: 80px; height: 80px; border-radius: 20px;
                    background: linear-gradient(135deg, var(--accent-deep) 0%, var(--accent) 100%);
                    display: flex; center; align-items: center; justify-content: center;
                    box-shadow: 0 8px 32px rgba(0, 90, 156, 0.3);
                }

                .hero-title-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
                .hero-title-row h1 { margin: 0; font-size: 2.25rem; font-weight: 800; }

                .status-badge {
                    display: flex; align-items: center; gap: 6px; padding: 6px 12px;
                    border-radius: 10px; font-size: 0.7rem; font-weight: 800;
                    border: 1px solid currentColor;
                }
                .status-badge.compliant { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-badge.noncompliant { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .hero-meta { display: flex; align-items: center; gap: 12px; color: var(--text-muted); font-size: 0.875rem; }

                .management-strip { display: flex; gap: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 16px; }
                .mgmt-btn {
                    padding: 10px 18px; border-radius: 12px; border: 1px solid var(--border);
                    background: var(--panel-bg); color: #fff; cursor: pointer;
                    display: flex; align-items: center; gap: 8px; font-weight: 600;
                    transition: all 0.2s;
                }
                .mgmt-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
                .mgmt-btn.danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
                .mgmt-btn.accent { color: var(--accent); border-color: rgba(0, 210, 255, 0.2); }

                .glass-panel {
                    background: var(--panel-bg);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    backdrop-filter: blur(10px);
                    transition: transform 0.3s ease, border-color 0.3s ease;
                }
                .glass-panel:hover { border-color: rgba(255,255,255,0.15); }

                .content-grid { display: grid; gap: 24px; margin-bottom: 24px; }
                .two-cols { grid-template-columns: 1.5fr 1fr; }
                .three-cols { grid-template-columns: 1fr 1fr 1fr; }
                .console-grid { grid-template-columns: 2fr 1fr; }

                .panel-header {
                    padding: 20px 24px; border-bottom: 1px solid var(--border);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .panel-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem; }

                .connection-tag { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 8px; display: flex; align-items: center; gap: 6px; }
                .connection-tag.online { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid #22c55e22; }
                .connection-tag.offline { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid #f8717122; }

                .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: flash 1s infinite; }
                @keyframes flash { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

                .metrics-list { padding: 24px; display: flex; flexDirection: column; gap: 24px; }
                
                .map-panel { overflow: hidden; padding: 0; position: relative; }
                .map-frame { width: 100%; height: 100%; border:0; }
                .map-placeholder { 
                    height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%);
                    color: var(--text-muted); font-size: 0.8rem;
                }

                .net-stats { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .net-stat-item label { display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
                .net-stat-item p { margin: 0; font-weight: 700; font-size: 1.1rem; }
                .span-2 { grid-column: span 2; }

                .ops-panel { display: flex; flex-direction: column; }
                .ops-status { flex: 1; display: flex; align-items: center; justify-content: center; gap: 24px; padding: 24px; }
                .pulse-big { position: relative; width: 60px; height: 60px; }
                .core { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 20px; height: 20px; border-radius: 50%; background: #94a3b8; }
                .core.active { background: #22c55e; box-shadow: 0 0 20px #22c55e; }
                .ring { position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.05); transform: translate(-50%,-50%); }
                .ring.active { border-color: rgba(34, 197, 94, 0.2); animation: ring-pulse 2s infinite; }
                @keyframes ring-pulse { 0% { transform: translate(-50%,-50%) scale(0.8); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; } }

                .ops-text h3 { margin: 0; font-size: 1.25rem; }
                .ops-text p { margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-muted); }

                .msg-input-group { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
                .msg-input-group textarea {
                    background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px;
                    padding: 16px; color: #fff; font-size: 0.875rem; resize: none; min-height: 80px;
                }

                .one-col { grid-template-columns: 1fr; }
                .apps-panel { overflow: hidden; }
                .search-box { 
                    position: relative; background: rgba(0,0,0,0.2); border: 1px solid var(--border); 
                    border-radius: 10px; padding: 2px 12px; display: flex; align-items: center; gap: 8px;
                }
                .search-box input { 
                    background: transparent; border: 0; color: #fff; font-size: 0.8rem; padding: 6px 0; outline: none; width: 220px;
                }
                .search-icon { color: var(--text-muted); }

                .apps-container { padding: 0; }
                .apps-table-header { 
                    display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr; 
                    padding: 12px 24px; background: rgba(255,255,255,0.02);
                    font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;
                    border-bottom: 1px solid var(--border);
                }
                .apps-list { max-height: 400px; overflow-y: auto; }
                .app-row { 
                    display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr; 
                    padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.03);
                    align-items: center; transition: background 0.2s;
                    font-size: 0.875rem;
                }
                .app-row:hover { background: rgba(255,255,255,0.01); }
                .app-row.flagged { background: rgba(239, 68, 68, 0.03); }
                .app-row.flagged:hover { background: rgba(239, 68, 68, 0.05); }

                .app-name { display: flex; align-items: center; gap: 10px; font-weight: 600; }
                .warn-icon { color: #facc15; }
                .app-meta { color: var(--text-muted); font-size: 0.8rem; }
                
                .status-pill { padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 800; }
                .status-pill.ok { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                .status-pill.warn { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

                .app-actions { text-align: right; }
                .uninstall-btn {
                    padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);
                    background: transparent; color: #ef4444; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600;
                    transition: all 0.2s;
                }
                .uninstall-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; }
                .uninstall-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .no-apps { padding: 40px; text-align: center; color: var(--text-muted); font-size: 0.875rem; }

                .spec-table { padding: 0 24px 20px 24px; }
                .portal-links { padding: 0 24px 24px 24px; }
                .portal-btn {
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    padding: 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;
                    text-decoration: none; transition: all 0.2s;
                }
                .portal-btn.intune { background: rgba(0, 210, 255, 0.1); color: var(--accent); border: 1px solid rgba(0, 210, 255, 0.2); }
                .portal-btn.intune:hover { background: rgba(0, 210, 255, 0.2); border-color: var(--accent); transform: translateY(-2px); }

                .bootstrap-panel { 
                    margin-bottom: 32px; border-color: rgba(234, 179, 8, 0.3);
                    background: linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(0,0,0,0) 100%);
                }
                .bootstrap-content { padding: 32px; }
                .bootstrap-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
                .bootstrap-header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #eab308; flex: 1; }
                .onboarding-status { font-size: 0.7rem; font-weight: 800; padding: 6px 12px; border-radius: 10px; text-transform: uppercase; background: rgba(255,255,255,0.05); }
                .onboarding-status.pending { color: #3b82f6; animation: flash 1.5s infinite; }
                .onboarding-status.syncing { color: #eab308; animation: flash 1s infinite; }
                .onboarding-status.deployed { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
                
                .bootstrap-info p { color: var(--text-muted); margin-bottom: 24px; max-width: 600px; }
                
                .bootstrap-options { display: grid; grid-template-columns: 1fr; gap: 24px; }
                .opt-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 24px; border-radius: 20px; }
                .opt-card.full { border-color: rgba(255,255,255,0.08); }
                .opt-main { display: flex; justify-content: space-between; align-items: center; gap: 40px; margin-bottom: 24px; }
                .opt-text { flex: 1; }
                .opt-card h3 { margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #fff; }
                .opt-card p { font-size: 0.85rem; color: var(--text-muted); margin: 0; }
                
                .sync-history-mini { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; display: flex; gap: 32px; }
                .hist-label { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; writing-mode: vertical-lr; transform: rotate(180deg); border-left: 1px solid var(--border); padding-left: 12px; }
                .hist-item { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; }
                .hist-item .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
                .hist-item span { color: var(--text-muted); }
                .hist-item strong { color: #fff; }

                .bootstrap-btn {
                    padding: 12px 24px; border-radius: 14px; border: none; font-weight: 700;
                    display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
                    transition: all 0.2s;
                }
                .bootstrap-btn.large { min-width: 180px; }
                .bootstrap-btn.primary { background: #eab308; color: #000; }
                .bootstrap-btn.primary:hover { background: #facc15; transform: translateY(-2px); }

                .code-block {
                    background: #000; border: 1px solid var(--border); border-radius: 12px;
                    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;
                    cursor: pointer; transition: border-color 0.2s;
                }
                .code-block:hover { border-color: var(--accent); }
                .code-block code { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #22c55e; }
                .copy-btn { background: transparent; border: none; color: var(--accent); font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; }
                .msg-btn {
                    padding: 12px; border-radius: 12px; background: #3b82f6; color: #fff; border: none;
                    font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
                }

                .console-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .input-row { display: flex; gap: 12px; }
                .input-row textarea {
                    flex: 1; background: #000; border: 1px solid var(--border); border-radius: 12px;
                    padding: 16px; color: #00d2ff; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; min-height: 100px;
                }
                .console-run {
                    padding: 0 24px; border-radius: 12px; background: #fff; color: #000; border: none; font-weight: 700; cursor: pointer;
                }

                .console-history { display: flex; flex-direction: column; gap: 12px; max-height: 300px; overflow-y: auto; padding-right: 8px; }
                .history-item { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
                .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
                .header-left { display: flex; align-items: center; gap: 12px; }
                .script-snippet { color: var(--accent); font-family: 'JetBrains Mono', monospace; opacity: 0.8; }
                .script-full { 
                    background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; 
                    font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #00ffca; 
                    margin-bottom: 12px; border-left: 2px solid var(--accent); white-space: pre-wrap;
                }
                .history-item.completed .status { color: #22c55e; }
                .history-item.failed .status { color: #ef4444; }
                .output { margin: 0; font-size: 0.8rem; color: #cbd5e1; white-space: pre-wrap; word-break: break-all; }

                .side-panels { display: flex; flex-direction: column; gap: 24px; }
                .spec-table { padding: 20px 24px; display: flex; flexDirection: column; gap: 12px; }
                .sync-box { padding: 24px; textAlign: center; }
                .sync-main h3 { margin: 8px 0; font-size: 1.75rem; color: var(--accent); }
                .sync-main p { margin: 0; color: var(--text-muted); font-size: 0.875rem; }

                .loading-container { height: 100vh; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: var(--accent); }
            `}</style>
        </div>
    );
}

function MetricBar({ label, value, icon, color = 'var(--accent)', sub }: any) {
    return (
        <div className="metric-item">
            <div className="metric-header">
                <span className="label">{icon} {label}</span>
                <span className="val" style={{ color }}>{value.toFixed(1)}%</span>
            </div>
            <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${value}%`, background: color }}></div>
            </div>
            <div className="metric-footer">{sub}</div>
            <style jsx>{`
                .metric-item { display: flex; flex-direction: column; gap: 8px; }
                .metric-header { display: flex; justify-content: space-between; align-items: center; }
                .label { display: flex; alignItems: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
                .val { font-weight: 800; font-size: 0.9rem; }
                .bar-bg { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
                .bar-fill { height: 100%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
                .metric-footer { font-size: 0.7rem; color: var(--text-muted); textAlign: right; }
            `}</style>
        </div>
    );
}

function SpecRow({ label, value, bold }: any) {
    return (
        <div className="spec-row">
            <span className="label">{label}</span>
            <span className={`val ${bold ? 'bold' : ''}`}>{value || 'N/A'}</span>
            <style jsx>{`
                .spec-row { display: flex; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .label { font-size: 0.8rem; color: var(--text-muted); }
                .val { font-size: 0.85rem; font-weight: 500; }
                .val.bold { font-weight: 800; color: var(--accent); }
            `}</style>
        </div>
    );
}
