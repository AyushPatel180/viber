import { useState, useCallback } from 'react';
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
    Bell,
    Check,
    AlertCircle,
} from 'lucide-react';

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

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

// Sample file structure
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
import { config } from './config';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(config.PORT, () => {
  console.log(\`Server running on port \${config.PORT}\`);
});
`,
            },
            {
                name: 'config.ts',
                type: 'file',
                path: '/src/config.ts',
                language: 'typescript',
                content: `export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};
`,
            },
            {
                name: 'services',
                type: 'folder',
                path: '/src/services',
                children: [
                    {
                        name: 'agent.service.ts',
                        type: 'file',
                        path: '/src/services/agent.service.ts',
                        language: 'typescript',
                        content: `export class AgentService {
  async generateCode(prompt: string): Promise<string> {
    // VIBER Agent implementation
    return \`// Generated code for: \${prompt}\`;
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
  "name": "viber-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
`,
    },
];

function App() {
    const [activeView, setActiveView] = useState<'files' | 'search' | 'git' | 'debug' | 'extensions' | 'chat'>('files');
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src', '/src/services']));
    const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems'>('terminal');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'assistant', content: 'Hello! I\'m VIBER Agent. How can I help you with your code today?' },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        '$ npm run dev',
        '',
        '> viber@0.1.0 dev',
        '> tsx watch src/index.ts',
        '',
        '[12:03:08] Server running on port 3000',
        '[12:03:08] Connected to CKG service',
        '[12:03:08] Connected to Vector service',
        '',
    ]);

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

    const sendChatMessage = useCallback(() => {
        if (!chatInput.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: chatInput,
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');

        // Simulate agent response
        setTimeout(() => {
            const response: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I'll help you with: "${chatInput}"\n\nAnalyzing your codebase and generating changes...`,
            };
            setChatMessages(prev => [...prev, response]);
        }, 500);
    }, [chatInput]);

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

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
        <div className="ide-container">
            {/* Main Content */}
            <div className="ide-main">
                {/* Activity Bar */}
                <div className="activity-bar">
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
                    <div
                        className={`activity-item ${activeView === 'extensions' ? 'active' : ''}`}
                        onClick={() => setActiveView('extensions')}
                        title="Extensions"
                    >
                        <Blocks size={24} />
                    </div>
                    <div
                        className={`activity-item ${activeView === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveView('chat')}
                        title="VIBER Agent"
                    >
                        <MessageSquare size={24} />
                    </div>
                    <div className="activity-spacer" />
                    <div className="activity-item" title="Settings">
                        <Settings size={24} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        {activeView === 'files' && 'Explorer'}
                        {activeView === 'search' && 'Search'}
                        {activeView === 'git' && 'Source Control'}
                        {activeView === 'debug' && 'Run and Debug'}
                        {activeView === 'extensions' && 'Extensions'}
                        {activeView === 'chat' && 'VIBER Agent'}
                    </div>
                    <div className="sidebar-content">
                        {activeView === 'files' && (
                            <div className="file-tree">
                                {renderFileTree(sampleFiles)}
                            </div>
                        )}
                        {activeView === 'chat' && (
                            <div className="chat-panel">
                                <div className="chat-messages">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className={`chat-message ${msg.role}`}>
                                            <div className="chat-message-content">
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chat-input-container">
                                    <input
                                        className="chat-input"
                                        placeholder="Ask VIBER Agent..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                    />
                                </div>
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
                            <div style={{ padding: '0 12px', color: 'var(--text-secondary)' }}>
                                <p>No changes detected</p>
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
                    {currentTab ? (
                        <div className="editor-content">
                            <Editor
                                height="100%"
                                language={currentTab.language}
                                value={currentTab.content}
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
                            <h1>VIBER IDE</h1>
                            <p>Visual Intelligent Builder for Evolutionary Refactoring</p>
                            <div className="welcome-actions">
                                <div className="welcome-action" onClick={() => setActiveView('files')}>
                                    <Files size={20} />
                                    <span>Open Folder</span>
                                </div>
                                <div className="welcome-action" onClick={() => setActiveView('chat')}>
                                    <MessageSquare size={20} />
                                    <span>Chat with VIBER Agent</span>
                                </div>
                                <div className="welcome-action">
                                    <GitBranch size={20} />
                                    <span>Clone Repository</span>
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
                    {activePanel === 'terminal' && (
                        <div className="terminal-output">
                            {terminalOutput.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            <span className="terminal-prompt">$ </span>
                            <span style={{ opacity: 0.5 }}>|</span>
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
                    <AlertCircle size={14} />
                    8 Services Running
                </div>
                <div className="status-item">
                    TypeScript
                </div>
                <div className="status-item">
                    <Bell size={14} />
                </div>
            </div>
        </div>
    );
}

export default App;
