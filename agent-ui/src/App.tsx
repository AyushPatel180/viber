import { useState, useEffect } from 'react';

interface ServiceHealth {
    name: string;
    port: number;
    icon: string;
    status: 'healthy' | 'unhealthy' | 'loading';
    stats?: Record<string, unknown>;
}

interface Activity {
    id: string;
    time: string;
    service: string;
    message: string;
}

const SERVICES: ServiceHealth[] = [
    { name: 'Orchestrator', port: 3000, icon: '🎯', status: 'loading' },
    { name: 'CKG Service', port: 3001, icon: '🕸️', status: 'loading' },
    { name: 'Vector Service', port: 3002, icon: '📊', status: 'loading' },
    { name: 'Speculative Engine', port: 3003, icon: '⚡', status: 'loading' },
    { name: 'Sandbox Executor', port: 3004, icon: '📦', status: 'loading' },
    { name: 'Oracle Adapter', port: 3005, icon: '🔮', status: 'loading' },
    { name: 'Policy Service', port: 3006, icon: '🔐', status: 'loading' },
    { name: 'Audit Service', port: 3007, icon: '📝', status: 'loading' },
];

function App() {
    const [services, setServices] = useState<ServiceHealth[]>(SERVICES);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [stats, setStats] = useState({
        totalNodes: 0,
        totalTokens: 0,
        pendingChangeSets: 0,
        auditEntries: 0,
    });

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 10000);
        return () => clearInterval(interval);
    }, []);

    async function checkHealth() {
        const updated = await Promise.all(
            services.map(async (service) => {
                try {
                    const res = await fetch(`http://localhost:${service.port}/health`);
                    const data = await res.json();

                    addActivity(service.name.toLowerCase().replace(' ', ''), `Health check passed`);

                    return {
                        ...service,
                        status: 'healthy' as const,
                        stats: data.stats,
                    };
                } catch {
                    return { ...service, status: 'unhealthy' as const };
                }
            })
        );

        setServices(updated);

        // Update stats from CKG and others
        const ckgStats = updated.find(s => s.name === 'CKG Service')?.stats;
        const specStats = updated.find(s => s.name === 'Speculative Engine')?.stats;
        const auditStats = updated.find(s => s.name === 'Audit Service')?.stats;

        setStats({
            totalNodes: (ckgStats as { totalNodes?: number })?.totalNodes ?? 0,
            totalTokens: 0,
            pendingChangeSets: (specStats as { pendingChangeSets?: number })?.pendingChangeSets ?? 0,
            auditEntries: (auditStats as { totalEntries?: number })?.totalEntries ?? 0,
        });
    }

    function addActivity(service: string, message: string) {
        const activity: Activity = {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            service,
            message,
        };
        setActivities(prev => [activity, ...prev.slice(0, 9)]);
    }

    const healthyCount = services.filter(s => s.status === 'healthy').length;

    return (
        <div className="app">
            <header className="header">
                <h1>🚀 VIBER Agent Manager</h1>
                <div className="header-status">
                    <span className="status-dot" />
                    <span>{healthyCount}/{services.length} Services Running</span>
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Services Online</div>
                    <div className={`stat-value ${healthyCount === services.length ? 'success' : 'warning'}`}>
                        {healthyCount}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">CKG Nodes</div>
                    <div className="stat-value">{stats.totalNodes.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pending Changes</div>
                    <div className={`stat-value ${stats.pendingChangeSets > 0 ? 'warning' : ''}`}>
                        {stats.pendingChangeSets}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Audit Entries</div>
                    <div className="stat-value">{stats.auditEntries}</div>
                </div>
            </div>

            <h2 className="section-title">Services</h2>
            <div className="services-grid">
                {services.map((service) => (
                    <div key={service.port} className="service-card">
                        <div className="service-icon">{service.icon}</div>
                        <div className="service-info">
                            <div className="service-name">{service.name}</div>
                            <div className="service-port">Port {service.port}</div>
                        </div>
                        <div className={`service-status ${service.status}`}>
                            {service.status === 'loading' ? (
                                <>
                                    <span className="spinner" style={{ width: 12, height: 12 }} />
                                    Checking
                                </>
                            ) : (
                                <>
                                    <span className="status-dot" style={{
                                        background: service.status === 'healthy' ? 'var(--success)' : 'var(--error)'
                                    }} />
                                    {service.status === 'healthy' ? 'Healthy' : 'Offline'}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-section">
                {activities.length === 0 ? (
                    <div className="loading">
                        <span className="spinner" />
                        Waiting for activity...
                    </div>
                ) : (
                    <ul className="activity-list">
                        {activities.map((activity) => (
                            <li key={activity.id} className="activity-item">
                                <span className="activity-time">{activity.time}</span>
                                <span className={`activity-badge ${activity.service}`}>
                                    {activity.service}
                                </span>
                                <span className="activity-message">{activity.message}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default App;
