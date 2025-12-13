import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
    Files,
    Search,
    GitBranch,
    Bug,
    Blocks,
    Settings,
    MessageSquare,
    X,
    ChevronRight,
    ChevronDown,
    FileCode,
    Folder,
    FolderOpen,
    Terminal,
    Check,
    AlertCircle,
    Sparkles,
    Play,
    RefreshCw,
} from 'lucide-react';
import { viber, type ChangeSet } from './api/viber';
import { AgentChat, DiffViewer, ServiceStatus } from './components/Agent';

interface FileNode {
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
    content?: string;
    language?: string;
}

interface Tab {
    id: string;
    name: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
}

// Sample file structure for demo
const sampleFiles: FileNode[] = [
    {
        name: 'src',
        type: 'folder',
        path: '/src',
        children: [
            {
                name: 'index.ts',
                type: 'file',
                path: '/src/index.ts',
                language: 'typescript',
                content: `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1', routes);

app.listen(config.PORT, () => {
  logger.info(\`Server running on port \${config.PORT}\`);
});

export default app;
`,
            },
            {
                name: 'config',
                type: 'folder',
                path: '/src/config',
                children: [
                    {
                        name: 'index.ts',
                        type: 'file',
                        path: '/src/config/index.ts',
                        language: 'typescript',
                        content: `import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const config = envSchema.parse(process.env);
export const isDevelopment = config.NODE_ENV === 'development';
`,
                    },
                ],
            },
            {
                name: 'services',
                type: 'folder',
                path: '/src/services',
                children: [
                    {
                        name: 'user.service.ts',
                        type: 'file',
                        path: '/src/services/user.service.ts',
                        language: 'typescript',
                        content: `export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class UserService {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
`,
                    },
                ],
            },
        ],
    },
    {
        name: 'package.json',
        type: 'file',
        path: '/package.json',
        language: 'json',
        content: `{
  "name": "viber-demo-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "zod": "^3.22.4",
    "pino": "^8.17.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.2",
    "tsx": "^4.7.0",
    "vitest": "^1.1.0"
  }
}
`,
    },
    {
        name: 'tsconfig.json',
        type: 'file',
        path: '/tsconfig.json',
        language: 'json',
        content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`,
    },
];

function App() {
    const [activeView, setActiveView] = useState<'files' | 'search' | 'git' | 'debug' | 'extensions' | 'agent'>('agent');
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src', '/src/config', '/src/services']));
    const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems' | 'diff'>('diff');
    const [currentChangeSet, setCurrentChangeSet] = useState<ChangeSet | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        `VIBER IDE v0.1.0`,
        `Session: ${viber.getSessionId().slice(0, 8)}...`,
        '',
        '$ npm run dev',
        '',
        '> viber@0.1.0 dev',
        '> tsx watch src/index.ts',
        '',
        `[${new Date().toLocaleTimeString()}] Server running on port 3000`,
        `[${new Date().toLocaleTimeString()}] All services connected`,
        '',
    ]);
    const [commandInput, setCommandInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);

    const openFile = useCallback((file: FileNode) => {
        if (file.type !== 'file') return;

        const existingTab = tabs.find(t => t.path === file.path);
        if (existingTab) {
            setActiveTab(existingTab.id);
            return;
        }

        const newTab: Tab = {
            id: Date.now().toString(),
            name: file.name,
            path: file.path,
            content: file.content || '',
            language: file.language || 'plaintext',
            isDirty: false,
        };

        setTabs([...tabs, newTab]);
        setActiveTab(newTab.id);
    }, [tabs]);

    const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        if (activeTab === tabId) {
            setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }
    }, [tabs, activeTab]);

    const toggleFolder = useCallback((path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (!activeTab || !value) return;
        setTabs(prev => prev.map(t =>
            t.id === activeTab ? { ...t, content: value, isDirty: true } : t
        ));
    }, [activeTab]);

    const handleChangeSetGenerated = useCallback((changeSet: ChangeSet) => {
        setCurrentChangeSet(changeSet);
        setActivePanel('diff');
    }, []);

    const handleApprove = useCallback(async () => {
        if (!currentChangeSet) return;
        try {
            await viber.approveChangeSet(currentChangeSet.id);
            setCurrentChangeSet({ ...currentChangeSet, status: 'approved' });
            setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Change set approved`]);
        } catch (error) {
            console.error('Failed to approve:', error);
        }
    }, [currentChangeSet]);

    const handleReject = useCallback(async () => {
        if (!currentChangeSet) return;
        try {
            await viber.rejectChangeSet(currentChangeSet.id);
            setCurrentChangeSet({ ...currentChangeSet, status: 'rejected' });
            setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✗ Change set rejected`]);
        } catch (error) {
            console.error('Failed to reject:', error);
        }
    }, [currentChangeSet]);

    const handleApply = useCallback(async () => {
        if (!currentChangeSet) return;
        try {
            setTerminalOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] Applying changes...`]);
            const result = await viber.applyChangeSet(currentChangeSet.id, true);
            setCurrentChangeSet({ ...currentChangeSet, status: 'applied' });
            setTerminalOutput(prev => [
                ...prev,
                `[${new Date().toLocaleTimeString()}] ✓ Applied ${result.appliedFiles.length} file(s)`,
                ...result.appliedFiles.map(f => `  - ${f}`),
            ]);
        } catch (error) {
            console.error('Failed to apply:', error);
        }
    }, [currentChangeSet]);

    const executeCommand = useCallback(async () => {
        if (!commandInput.trim() || isExecuting) return;

        setIsExecuting(true);
        setTerminalOutput(prev => [...prev, `$ ${commandInput}`]);

        try {
            const result = await viber.executeCommand(commandInput);
            setTerminalOutput(prev => [
                ...prev,
                result.stdout || '',
                result.stderr ? `Error: ${result.stderr}` : '',
                `Exit code: ${result.exitCode}`,
                '',
            ]);
        } catch (error) {
            setTerminalOutput(prev => [...prev, `Error: Could not execute command`, '']);
        } finally {
            setCommandInput('');
            setIsExecuting(false);
        }
    }, [commandInput, isExecuting]);

    const renderFileTree = (nodes: FileNode[], depth = 0) => {
        return nodes.map(node => (
            <div key={node.path}>
                <div
                    className={`file-item ${node.type === 'folder' ? 'folder' : ''}`}
                    style={{ paddingLeft: 16 + depth * 16 }}
                    onClick={() => node.type === 'folder' ? toggleFolder(node.path) : openFile(node)}
                >
                    {node.type === 'folder' ? (
                        expandedFolders.has(node.path) ? (
                            <>
                                <ChevronDown size={16} className="file-icon" />
                                <FolderOpen size={16} className="file-icon" style={{ color: '#dcb67a' }} />
                            </>
                        ) : (
                            <>
                                <ChevronRight size={16} className="file-icon" />
                                <Folder size={16} className="file-icon" style={{ color: '#dcb67a' }} />
                            </>
                        )
                    ) : (
                        <FileCode size={16} className="file-icon" style={{ color: '#519aba' }} />
                    )}
                    <span>{node.name}</span>
                </div>
                {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
                    renderFileTree(node.children, depth + 1)
                )}
            </div>
        ));
    };

    const currentTabData = tabs.find(t => t.id === activeTab);

    return (
        <div className="ide-container">
            <div className="ide-main">
                {/* Activity Bar */}
                <div className="activity-bar">
                    <div
                        className={`activity-item ${activeView === 'agent' ? 'active' : ''}`}
                        onClick={() => setActiveView('agent')}
                        title="VIBER Agent"
                    >
                        <Sparkles size={24} />
                    </div>
                    <div
                        className={`activity-item ${activeView === 'files' ? 'active' : ''}`}
                        onClick={() => setActiveView('files')}
                        title="Explorer"
                    >
                        <Files size={24} />
                    </div>
                    <div
                        className={`activity-item ${activeView === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveView('search')}
                        title="Search"
                    >
                        <Search size={24} />
                    </div>
                    <div
                        className={`activity-item ${activeView === 'git' ? 'active' : ''}`}
                        onClick={() => setActiveView('git')}
                        title="Source Control"
                    >
                        <GitBranch size={24} />
                    </div>
                    <div
                        className={`activity-item ${activeView === 'debug' ? 'active' : ''}`}
                        onClick={() => setActiveView('debug')}
                        title="Run and Debug"
                    >
                        <Bug size={24} />
                    </div>
                    <div className="activity-spacer" />
                    <div className="activity-item" title="Settings">
                        <Settings size={24} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        {activeView === 'agent' && (
                            <>
                                <Sparkles size={14} />
                                <span style={{ marginLeft: 6 }}>VIBER Agent</span>
                            </>
                        )}
                        {activeView === 'files' && 'Explorer'}
                        {activeView === 'search' && 'Search'}
                        {activeView === 'git' && 'Source Control'}
                        {activeView === 'debug' && 'Run and Debug'}
                    </div>
                    <div className="sidebar-content">
                        {activeView === 'agent' && (
                            <AgentChat onChangeSetGenerated={handleChangeSetGenerated} />
                        )}
                        {activeView === 'files' && (
                            <div className="file-tree">
                                {renderFileTree(sampleFiles)}
                            </div>
                        )}
                        {activeView === 'search' && (
                            <div style={{ padding: '0 12px' }}>
                                <input
                                    className="chat-input"
                                    placeholder="Search files..."
                                    style={{ marginBottom: 12 }}
                                />
                            </div>
                        )}
                        {activeView === 'git' && (
                            <div style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                <p style={{ marginBottom: 8 }}>Changes (0)</p>
                                <p style={{ fontSize: 12 }}>No changes detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="editor-area">
                    {/* Tabs */}
                    {tabs.length > 0 && (
                        <div className="tabs-container">
                            {tabs.map(tab => (
                                <div
                                    key={tab.id}
                                    className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <FileCode size={14} style={{ color: '#519aba' }} />
                                    <span>{tab.isDirty ? `${tab.name} •` : tab.name}</span>
                                    <div className="tab-close" onClick={(e) => closeTab(tab.id, e)}>
                                        <X size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Editor Content */}
                    {currentTabData ? (
                        <div className="editor-content">
                            <Editor
                                height="100%"
                                language={currentTabData.language}
                                value={currentTabData.content}
                                theme="vs-dark"
                                onChange={handleEditorChange}
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: true },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    wordWrap: 'on',
                                }}
                            />
                        </div>
                    ) : (
                        <div className="welcome-screen">
                            <Sparkles size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
                            <h1>VIBER IDE</h1>
                            <p>Visual Intelligent Builder for Evolutionary Refactoring</p>
                            <div className="welcome-actions">
                                <div className="welcome-action" onClick={() => setActiveView('agent')}>
                                    <Sparkles size={20} />
                                    <span>Chat with VIBER Agent</span>
                                </div>
                                <div className="welcome-action" onClick={() => setActiveView('files')}>
                                    <Files size={20} />
                                    <span>Open Files</span>
                                </div>
                                <div className="welcome-action">
                                    <Play size={20} />
                                    <span>Run Dry-Run Pipeline</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Panel Area */}
            <div className="panel-area">
                <div className="panel-tabs">
                    <div
                        className={`panel-tab ${activePanel === 'diff' ? 'active' : ''}`}
                        onClick={() => setActivePanel('diff')}
                    >
                        <Sparkles size={14} style={{ marginRight: 4 }} />
                        Changes {currentChangeSet && `(${currentChangeSet.diffs.length})`}
                    </div>
                    <div
                        className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
                        onClick={() => setActivePanel('terminal')}
                    >
                        <Terminal size={14} style={{ marginRight: 4 }} />
                        Terminal
                    </div>
                    <div
                        className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
                        onClick={() => setActivePanel('output')}
                    >
                        Output
                    </div>
                    <div
                        className={`panel-tab ${activePanel === 'problems' ? 'active' : ''}`}
                        onClick={() => setActivePanel('problems')}
                    >
                        Problems
                    </div>
                </div>
                <div className="panel-content">
                    {activePanel === 'diff' && (
                        <DiffViewer
                            changeSet={currentChangeSet}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onApply={handleApply}
                        />
                    )}
                    {activePanel === 'terminal' && (
                        <div className="terminal-container">
                            <div className="terminal-output">
                                {terminalOutput.map((line, i) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                            <div className="terminal-input-line">
                                <span className="terminal-prompt">$ </span>
                                <input
                                    className="terminal-input"
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                                    placeholder="Enter command..."
                                    disabled={isExecuting}
                                />
                            </div>
                        </div>
                    )}
                    {activePanel === 'output' && (
                        <div>VIBER Agent Output</div>
                    )}
                    {activePanel === 'problems' && (
                        <div style={{ color: 'var(--text-secondary)' }}>No problems detected</div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="status-bar">
                <div className="status-item">
                    <GitBranch size={14} />
                    main
                </div>
                <div className="status-item">
                    <Check size={14} />
                    0 Problems
                </div>
                <div className="status-spacer" />
                <div className="status-item">
                    <ServiceStatus />
                </div>
                <div className="status-item">
                    TypeScript
                </div>
            </div>
        </div>
    );
}

export default App;
