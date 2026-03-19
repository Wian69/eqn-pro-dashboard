"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ChevronRight, AlertCircle, Search, Users, Monitor, RefreshCw, Power, Terminal, ExternalLink } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [searchingGroups, setSearchingGroups] = useState(false);
  const [allIntunePolicies, setAllIntunePolicies] = useState<any[]>([]);
  const [intuneError, setIntuneError] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceStates, setDeviceStates] = useState<any>(null);
  const [loadingStates, setLoadingStates] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchIntunePolicies();
  }, []);

  async function fetchDeviceStates(deviceId: string) {
    setLoadingStates(true);
    setDeviceStates(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/states`);
      const data = await res.json();
      setDeviceStates(data);
    } catch (e) {
      console.error("Failed to fetch device states", e);
    } finally {
      setLoadingStates(false);
    }
  }

  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceStates(selectedDevice.id);
    }
  }, [selectedDevice]);

  async function fetchUserDevices(userId: string) {
    setLoadingDevices(true);
    setUserDevices([]);
    setSelectedDevice(null);
    setDeviceStates(null);
    try {
      const res = await fetch(`/api/users/${userId}/devices`);
      const data = await res.json();
      const devices = Array.isArray(data) ? data : [];
      setUserDevices(devices);
      if (devices.length > 0) setSelectedDevice(devices[0]);
    } catch (e) {
      console.error("Failed to fetch user devices", e);
    } finally {
      setLoadingDevices(false);
    }
  }

  async function fetchIntunePolicies() {
    setIntuneError(null);
    try {
      const res = await fetch("/api/intune/policies");
      const data = await res.json();
      if (data.error) setIntuneError(data.error);
      setAllIntunePolicies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch Intune policies", e);
    }
  }

  async function fetchUsers(query = "") {
    setLoading(true);
    setError(null);
    try {
      const url = query ? `/api/users?q=${encodeURIComponent(query)}` : "/api/users";
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) setError(data.error);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  async function handleSelectUser(user: any) {
    setSelectedUser(user);
    setLoadingPolicies(true);
    fetchUserDevices(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}/policies`);
      const data = await res.json();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPolicies(false);
    }
  }

  const getAppliedIntunePolicies = () => {
    if (!policies.length || !allIntunePolicies.length) return [];
    
    const userGroupIds = policies.map(p => p.id);
    return allIntunePolicies.filter(ip => 
      ip.assignedGroupIds.includes('all-users') ||
      ip.assignedGroupIds.some((gid: string) => userGroupIds.includes(gid))
    );
  };

  const appliedIntunePolicies = getAppliedIntunePolicies();

  async function savePolicyEditing() {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      const res = await fetch(`/api/intune/policies/${editingPolicy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editingPolicy.displayName,
          description: editingPolicy.description,
          type: editingPolicy.type
        })
      });
      if (res.ok) {
        setEditingPolicy(null);
        fetchIntunePolicies(); // Refresh list
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update policy");
      }
    } catch (e) {
      alert("Error updating policy");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleRemoteAction(action: string) {
    if (!selectedDevice || !confirm(`Trigger ${action} on this device?`)) return;
    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        alert(`${action} triggered successfully!`);
      } else {
        const data = await res.json();
        alert(data.error || `Failed to trigger ${action}`);
      }
    } catch (e) {
      alert("Network error triggering action");
    }
  }

  async function handleRemoveGroup(groupId: string) {
    if (!selectedUser || !confirm("Remove user from this policy group?")) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/groups/${groupId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPolicies(policies.filter(p => p.id !== groupId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove group");
      }
    } catch (e) {
      alert("Error removing group");
    }
  }

  async function searchGroups() {
    if (!groupSearch) return;
    setSearchingGroups(true);
    try {
      const res = await fetch(`/api/groups?q=${encodeURIComponent(groupSearch)}`);
      const data = await res.json();
      setAvailableGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingGroups(false);
    }
  }

  async function handleAddGroup(groupId: string) {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      if (res.ok) {
        setShowAddModal(false);
        setGroupSearch("");
        handleSelectUser(selectedUser); // Refresh policies
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add user to group");
      }
    } catch (e) {
      alert("Error adding group");
    }
  }

  return (
    <div className="flex-col gap-4 animate-fade-in" style={{ position: 'relative' }}>
      {showAddModal && (
        // ... (existing modal remains same, but I'll update it later if needed)
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
               <h3 style={{ fontWeight: 600 }}>Assign Policy Group</h3>
               <button onClick={() => setShowAddModal(false)} className="btn" style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search Group Name..." 
                className="w-full"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
              />
              <button onClick={searchGroups} className="btn btn-primary">Search</button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {searchingGroups ? (
                <div style={{ padding: '1rem', textAlign: 'center' }}>Searching...</div>
              ) : availableGroups.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No groups found.</div>
              ) : (
                availableGroups.map(g => (
                  <div key={g.id} className="flex justify-between items-center" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex-col">
                      <span style={{ fontWeight: 500 }}>{g.displayName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.description || 'No description'}</span>
                    </div>
                    <button onClick={() => handleAddGroup(g.id)} className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Add</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {editingPolicy && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
               <h3 style={{ fontWeight: 600 }}>Edit Intune Policy</h3>
               <button onClick={() => setEditingPolicy(null)} className="btn" style={{ padding: '0.25rem' }}>✕</button>
            </div>
            
            <div className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Display Name</label>
                <input 
                  type="text" 
                  value={editingPolicy.displayName}
                  onChange={(e) => setEditingPolicy({...editingPolicy, displayName: e.target.value})}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                />
              </div>
              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Description</label>
                <textarea 
                  value={editingPolicy.description || ""}
                  onChange={(e) => setEditingPolicy({...editingPolicy, description: e.target.value})}
                  rows={3}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', resize: 'none' }}
                />
              </div>
              
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button onClick={() => setEditingPolicy(null)} className="btn w-full">Cancel</button>
                <button onClick={savePolicyEditing} disabled={savingPolicy} className="btn btn-primary w-full">
                  {savingPolicy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: 700 }}>User Policy Management</h2>
        <p className="text-muted">Select a user to view and modify their applied Intune policies directly.</p>
      </div>

      {(error || intuneError) && (
        <div className="card" style={{ border: '1px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle size={20} />
          <div>
            <p style={{ fontWeight: 600 }}>API Error</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>{error || intuneError}</p>
            {intuneError?.includes('denied') && <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-main)' }}>Tip: Ensure `DeviceManagementConfiguration.Read.All` is granted.</p>}
          </div>
        </div>
      )}

      <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
        {/* Users List */}
        <div className="card flex-col" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Active Users</h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex items-center gap-2 p-2 w-full" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input 
                  type="text" 
                  placeholder="Search name, email, or location..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
            </form>
          </div>
          <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>No users found.</div>
            ) : (
              users.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => handleSelectUser(u)}
                  className="flex items-center justify-between"
                  style={{ 
                    padding: '1rem 1.5rem', 
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    backgroundColor: selectedUser?.id === u.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    borderLeft: selectedUser?.id === u.id ? '3px solid var(--primary)' : '3px solid transparent'
                  }}
                >
                  <div className="flex-col">
                    <span style={{ fontWeight: 500 }}>{u.displayName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.userPrincipalName}</span>
                    {u.officeLocation && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>📍 {u.officeLocation}</span>}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected User Policies */}
        <div className="card flex-col" style={{ flex: 1, minHeight: '400px' }}>
          {selectedUser ? (
            <>
               <div className="flex items-center gap-4" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                 <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 }}>
                   {selectedUser.displayName.charAt(0)}
                 </div>
                 <div className="flex-col">
                   <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedUser.displayName}</h3>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedUser.jobTitle || 'No Title'}</span>
                 </div>
               </div>

                <div className="flex-col gap-3" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)' }}>
                  <div className="flex items-center justify-between">
                    <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Device Context</h4>
                    <span className="badge" style={{ fontSize: '0.6rem' }}>{userDevices.length} Device(s) Found</span>
                  </div>
                  {loadingDevices ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Checking devices...</div>
                  ) : userDevices.length === 0 ? (
                    <div className="flex-col gap-2" style={{ padding: '0.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No device is currently linked to this user in Intune.</p>
                      <button 
                        onClick={() => router.push('/devices')} 
                        className="btn w-full" 
                        style={{ fontSize: '0.75rem', padding: '0.4rem', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                      >
                         Find Device in Managed Devices ➔
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={selectedDevice?.id} 
                      onChange={(e) => setSelectedDevice(userDevices.find(d => d.id === e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                    >
                      {userDevices.map(d => (
                        <option key={d.id} value={d.id}>{d.deviceName} ({d.operatingSystem} {d.model})</option>
                      ))}
                    </select>
                  )}
                  {selectedDevice && (
                    <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      <span style={{ color: selectedDevice.complianceState === 'compliant' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        ● {selectedDevice.complianceState}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Last Sync: {new Date(selectedDevice.lastSyncDateTime).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {selectedDevice && (
                  <>
                    <div className="flex gap-4" style={{ marginBottom: '1.5rem' }}>
                      {/* Custom Remote Dial-In Panel */}
                      <div className="flex-col gap-2" style={{ flex: 1.5, padding: '1.5rem', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 130, 246, 0.05)', boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                          <Monitor size={20} /> CUSTOM REMOTE DIAL-IN
                        </h4>
                        <div className="flex-col gap-3">
                           <button 
                             onClick={() => router.push(`/remote-session/${selectedDevice.id}`)} 
                             className="btn btn-primary w-full flex items-center justify-center gap-3" 
                             style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-md)' }}
                           >
                              <ExternalLink size={20} /> START REMOTE SESSION NOW
                           </button>
                           <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', textAlign: 'center', fontWeight: 500 }}>
                             Interactive Desktop & Background Admin Console
                           </p>
                        </div>
                      </div>

                      {/* Admin Quick Actions */}
                      <div className="flex-col gap-2" style={{ flex: 1, padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-main)' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Terminal size={14} /> Background Actions
                        </h4>
                        <div className="flex-col gap-1">
                          <button onClick={() => handleRemoteAction('sync')} className="btn w-full flex items-center justify-center gap-2" style={{ fontSize: '0.7rem', padding: '0.5rem', border: '1px solid var(--border)' }}>
                             <RefreshCw size={12} /> Sync Device
                          </button>
                          <button onClick={() => handleRemoteAction('reboot')} className="btn w-full flex items-center justify-center gap-2" style={{ fontSize: '0.7rem', padding: '0.5rem', color: 'var(--danger)', border: '1px solid var(--danger)', backgroundColor: 'transparent' }}>
                             <Power size={12} /> Reboot Device
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '1.5rem 0', borderTop: '1px solid var(--border)', marginTop: '1rem' }}>
                      <h4 style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} color="var(--primary)" /> Live Device Status: {selectedDevice.deviceName}
                      </h4>
                      <div className="flex-col gap-2">
                        {deviceStates?.configurations?.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-2" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', backgroundColor: 'var(--bg-main)' }}>
                            <span>{c.displayName}</span>
                            <span className="badge" style={{ 
                              backgroundColor: c.state === 'succeeded' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: c.state === 'succeeded' ? 'var(--success)' : 'var(--danger)',
                              fontSize: '0.65rem'
                            }}>
                              {c.state}
                            </span>
                          </div>
                        ))}
                        {(!deviceStates?.configurations || deviceStates.configurations.length === 0) && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No live status reports available for this device.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                   <button onClick={() => setShowAddModal(true)} className="btn btn-primary w-full justify-center">
                     + Add Policy Group Membership
                   </button>
                </div>
            </>
          ) : (
            <div className="flex-col items-center justify-center h-full" style={{ padding: '4rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Shield size={48} color="var(--border)" style={{ marginBottom: '1rem' }} />
              <h3>Select a user</h3>
              <p style={{ fontSize: '0.875rem' }}>Choose a user from the list to view their effective policies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

