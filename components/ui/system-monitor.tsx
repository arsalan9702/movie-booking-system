'use client';

import { useEffect, useState } from 'react';

interface NodeHealth {
  nodeId: string;
  status: string;
  isLeader: boolean;
  load: number;
  lastHeartbeat: number;
  timeSinceHeartbeat: number;
}

interface ClockState {
  nodeId: string;
  lamportClock: number;
  vectorClock: Record<string, number>;
  physicalTime: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function SystemMonitor() {
  const [health, setHealth] = useState<any>(null);
  const [clocks, setClocks] = useState<ClockState[]>([]);
  const [election, setElection] = useState<any>(null);
  const [replicas, setReplicas] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'clocks' | 'election' | 'replicas'>('health');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const readJsonSafe = async (res: Response, label: string) => {
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      const text = await res.text();
      throw new Error(`${label} not JSON (${res.status}): ${text.slice(0, 120)}`);
    }
    return res.json();
  };

  const fetchData = async () => {
    try {
      setErrorMsg(null);
      const healthUrl = API_BASE && API_BASE.length > 0 ? `${API_BASE}/health` : '/api/health';
      const clocksUrl = API_BASE && API_BASE.length > 0 ? `${API_BASE}/sync` : '/api/sync';
      const electionUrl = API_BASE && API_BASE.length > 0 ? `${API_BASE}/election` : '/api/election';
      const replicasUrl = API_BASE && API_BASE.length > 0 ? `${API_BASE}/replicas` : '/api/replicas';

      const [healthRes, clocksRes, electionRes, replicasRes] = await Promise.all([
        fetch(healthUrl),
        fetch(clocksUrl),
        fetch(electionUrl),
        fetch(replicasUrl),
      ]);

      const healthData = await readJsonSafe(healthRes, 'health');
      const clocksData = await readJsonSafe(clocksRes, 'sync');
      const electionData = await readJsonSafe(electionRes, 'election');
      const replicasData = await readJsonSafe(replicasRes, 'replicas');

      setHealth(healthData);
      setClocks(clocksData.nodes || []);
      setElection(electionData);
      setReplicas(replicasData);
    } catch (error: any) {
      console.error('Failed to fetch system data:', error);
      setErrorMsg(error?.message || 'Failed to fetch system data');
    }
  };

  const triggerElection = async (algorithm: 'bully' | 'ring') => {
    try {
      const electionUrl = API_BASE && API_BASE.length > 0 ? `${API_BASE}/election` : '/api/election';
      const response = await fetch(electionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm, nodeId: 'node-1' }),
      });
      await readJsonSafe(response, 'election-post');
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error('Failed to trigger election:', error);
    }
  };

  const tabs = [
    { id: 'health', label: '💚 Health Check', icon: '💚' },
    { id: 'clocks', label: '⏰ Clock Sync', icon: '⏰' },
    { id: 'election', label: '👑 Leader Election', icon: '👑' },
    { id: 'replicas', label: '📋 Replication', icon: '📋' },
  ];

  return (
    <div className="p-6">
      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-900/40 text-red-200 text-sm">
          {errorMsg}
        </div>
      )}
      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Health Tab */}
      {activeTab === 'health' && health && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Nodes</div>
              <div className="text-3xl font-bold text-white">{health.summary?.total || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Healthy</div>
              <div className="text-3xl font-bold text-green-400">{health.summary?.healthy || 0}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Unhealthy</div>
              <div className="text-3xl font-bold text-red-400">{health.summary?.unhealthy || 0}</div>
            </div>
          </div>

          <div className="space-y-2">
            {health.nodes?.map((node: NodeHealth) => (
              <div key={node.nodeId} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      node.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{node.nodeId}</span>
                        {node.isLeader && (
                          <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded-full">
                            👑 Leader
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        Last heartbeat: {Math.floor(node.timeSinceHeartbeat / 1000)}s ago
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Load</div>
                    <div className="text-xl font-semibold text-white">{node.load.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clocks Tab */}
      {activeTab === 'clocks' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              ⏰ Logical & Physical Clock Synchronization
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Lamport clocks ensure causal ordering, while vector clocks detect concurrent events
            </p>
          </div>

          {clocks.map((clock) => (
            <div key={clock.nodeId} className="bg-gray-800 rounded-lg p-4">
              <div className="font-semibold text-white mb-3">{clock.nodeId}</div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Lamport Clock</div>
                  <div className="text-2xl font-bold text-purple-400">{clock.lamportClock}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400 mb-1">Physical Time</div>
                  <div className="text-sm font-mono text-green-400">
                    {new Date(clock.physicalTime).toLocaleTimeString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400 mb-1">Vector Clock</div>
                  <div className="text-xs font-mono text-blue-400 break-all">
                    {JSON.stringify(clock.vectorClock)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Election Tab */}
      {activeTab === 'election' && election && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              👑 Leader Election Algorithms
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Bully: Higher ID nodes become leader • Ring: Token circulates to find highest ID
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => triggerElection('bully')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Trigger Bully Election
              </button>
              <button
                onClick={() => triggerElection('ring')}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
              >
                Trigger Ring Election
              </button>
            </div>
          </div>

          {election.leader && (
            <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-lg p-4 border-2 border-yellow-500/50">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">👑</span>
                <div>
                  <div className="text-sm text-yellow-400">Current Leader</div>
                  <div className="text-xl font-bold text-white">{election.leader.id}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Replicas Tab */}
      {activeTab === 'replicas' && replicas && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              📋 Data Replication & Consistency
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Master-Slave replication with eventual consistency • Quorum-based reads and writes
            </p>
          </div>

          {replicas.summary && replicas.summary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {replicas.summary.map((item: any) => (
                <div key={item.table_name} className="bg-gray-800 rounded-lg p-4">
                  <div className="text-lg font-semibold text-white mb-2">
                    {item.table_name}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Replicas</span>
                      <span className="text-green-400 font-semibold">{item.replica_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nodes</span>
                      <span className="text-blue-400 font-semibold">{item.node_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-gray-400">No replicas found. Create bookings to see replication in action.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}