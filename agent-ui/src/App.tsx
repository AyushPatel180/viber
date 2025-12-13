import { useState, useCallback, useEffect, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import {
    Files,
    Search,
    GitBranch,
    Bug,
    Blocks,
    Settings,
    X,
    ChevronRight,
    ChevronDown,
    FileCode,
    Folder,
    FolderOpen,
    Terminal,
    Check,
    Sparkles,
    Play,
    Send,
    PanelRightOpen,
    PanelRightClose,
    Loader2,
    ListTodo,
    FileText,
    BrainCircuit,
    Hammer,
    Eye,
    CheckCircle2,
    Circle,
    Clock,
    RotateCcw
} from 'lucide-react';
import { viber, type ChangeSet, type SpeculativeDiff } from './api/viber';

// Types for Antigravity-like features
interface Task {
    id: string;
    name: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    summary: string;
    steps: TaskStep[];
}

interface TaskStep {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    toolCalls?: ToolCall[];
}

interface ToolCall {
    id: string;
    tool: string;
    input: string;
    output?: string;
    status: 'running' | 'completed' | 'failed';
}

interface Artifact {
    id: string;
    type: 'plan' | 'task' | 'walkthrough' | 'other';
    title: string;
    path: string;
    content: string;
    lastEdited: Date;
}

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
    role: 'user' | 'assistant' | 'system';
    content: string;
    changeSet?: ChangeSet;
    isLoading?: boolean;
    toolCalls?: ToolCall[];
    taskId?: string;
}

// ... (Keep existing sampleFiles or expand them)
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
// ... (content)
`,
            },
            // ... (rest of files)
        ],
    }
];

function App() {
    // ... (Keep existing state)
    const [activeView, setActiveView] = useState<'files' | 'search' | 'git' | 'debug' | 'extensions'>('files');
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/src']));
    const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems'>('terminal');
    const [showAgentPanel, setShowAgentPanel] = useState(true);
    const [currentChangeSet, setCurrentChangeSet] = useState<ChangeSet | null>(null);

    // New Antigravity State
    const [agentTab, setAgentTab] = useState<'chat' | 'tasks' | 'artifacts'>('chat');
    const [currentTask, setCurrentTask] = useState<Task | null>(null);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: `I am **VIBER (Antigravity Mode)**.
      
I can:
1. **Plan** complex tasks
2. **Execute** tools (read files, run commands)
3. **Verify** changes with tests
4. **Manage** state via Artifacts

How can I help you today?`,
        },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        `VIBER Agent (Antigravity Mode) initialized`,
        `Connected to Orchestrator at http://localhost:3000`,
        '',
    ]);

    // Messages Scroll Ref
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    // ... (Keep existing handlers: openFile, closeTab, toggleFolder, handleEditorChange)

    // Emulate Antigravity Workflow
    const startAntigravityTask = async (description: string) => {
        if (!description.trim() || isGenerating) return;

        // 1. User Message
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: description };
        setMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsGenerating(true);

        // 2. Initialize Task
        const taskId = Date.now().toString();
        const newTask: Task = {
            id: taskId,
            name: `Task: ${description.slice(0, 30)}...`,
            status: 'in-progress',
            summary: 'Initializing task...',
            steps: [],
        };
        setCurrentTask(newTask);

        // 3. Simulated "Thinking" / Planning Step
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Analyzing request and creating implementation plan...',
                isLoading: true,
                toolCalls: [{ id: 't1', tool: 'create_plan', input: 'implementation_plan.md', status: 'running' }]
            }]);
        }, 500);

        // 4. Create Artifact (Plan)
        setTimeout(() => {
            const planArtifact: Artifact = {
                id: 'a1',
                type: 'plan',
                title: 'implementation_plan.md',
                path: '/viber/plans/implementation_plan.md',
                content: `# Implementation Plan\n\n## Goal\n${description}\n\n## Proposed Changes\n- [ ] Analyze codebase\n- [ ] Generate diffs\n- [ ] Verify changes`,
                lastEdited: new Date()
            };
            setArtifacts(prev => [...prev, planArtifact]);

            // Update message to show tool completion
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.isLoading) {
                    return [...prev.slice(0, -1), {
                        ...last,
                        isLoading: false,
                        content: `I have created an **Implementation Plan**. Please review it in the Artifacts tab.`,
                        toolCalls: [{ id: 't1', tool: 'create_plan', input: 'implementation_plan.md', output: 'Created implementation_plan.md', status: 'completed' }]
                    }];
                }
                return prev;
            });

            // Update Task Status
            setCurrentTask(t => t ? ({
                ...t,
                summary: 'Plan created. Ready to execute.',
                steps: [...t.steps, { id: 's1', description: 'Create Implementation Plan', status: 'completed' }]
            }) : null);

            // Trigger Diff Generation (Speculative Engine)
            generateDiffs(description);

        }, 2000);
    };

    const generateDiffs = async (prompt: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Generating code changes...',
            isLoading: true,
            toolCalls: [
                { id: 't2', tool: 'read_files', input: '/src/**/*', status: 'completed' },
                { id: 't3', tool: 'speculative_engine', input: prompt, status: 'running' }
            ]
        }]);

        try {
            const changeSet = await viber.generateDiff(prompt);
            setCurrentChangeSet(changeSet);

            setMessages(prev => {
                const last = prev[prev.length - 1];
                return [...prev.slice(0, -1), {
                    ...last,
                    isLoading: false,
                    content: `I have generated **${changeSet.diffs.length} changes**. Please review the diffs below.`,
                    toolCalls: [
                        { id: 't2', tool: 'read_files', input: '/src/**/*', output: 'Read 15 files', status: 'completed' },
                        { id: 't3', tool: 'speculative_engine', input: prompt, output: `Generated ${changeSet.diffs.length} diffs`, status: 'completed' }
                    ],
                    changeSet
                }];
            });

            setCurrentTask(t => t ? ({
                ...t,
                steps: [...t.steps, { id: 's2', description: 'Generate Code Changes', status: 'completed' }]
            }) : null);

        } catch (e) {
            // Error handling
        } finally {
            setIsGenerating(false);
        }
    };

    // ... (Keep existing approve/apply/terminal logic)

    return (
        <div className="ide-container">
            <div className="ide-main">
                {/* Activity Bar (Keep existing) */}

                {/* Sidebar (Keep existing) */}

                {/* Center Editor (Keep existing) */}

                {/* RIGHT PANEL - ANTIGRAVITY AGENT */}
                {showAgentPanel && (
                    <div className="agent-panel">
                        {/* Header */}
                        <div className="agent-header">
                            <div className="agent-title">
                                <BrainCircuit size={18} />
                                <span>VIBER Antigravity</span>
                            </div>
                            <div className="agent-header-actions">
                                <button className="agent-close" onClick={() => setShowAgentPanel(false)}>
                                    <PanelRightClose size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Task Banner (if active) */}
                        {currentTask && (
                            <div className="task-banner">
                                <div className="task-banner-header">
                                    <span className={`task-status-dot ${currentTask.status}`}></span>
                                    <span className="task-name">{currentTask.name}</span>
                                </div>
                                <div className="task-summary">{currentTask.summary}</div>
                            </div>
                        )}

                        {/* Agent Tabs */}
                        <div className="agent-tabs">
                            <div
                                className={`agent-tab ${agentTab === 'chat' ? 'active' : ''}`}
                                onClick={() => setAgentTab('chat')}
                            >
                                <Sparkles size={14} /> Chat
                            </div>
                            <div
                                className={`agent-tab ${agentTab === 'tasks' ? 'active' : ''}`}
                                onClick={() => setAgentTab('tasks')}
                            >
                                <ListTodo size={14} /> Tasks
                            </div>
                            <div
                                className={`agent-tab ${agentTab === 'artifacts' ? 'active' : ''}`}
                                onClick={() => setAgentTab('artifacts')}
                            >
                                <FileText size={14} /> Artifacts
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="agent-content">

                            {/* === CHAT VIEW === */}
                            {agentTab === 'chat' && (
                                <>
                                    <div className="agent-messages">
                                        {messages.map(msg => (
                                            <div key={msg.id} className={`agent-message ${msg.role}`}>
                                                {/* Tool Calls Visualization */}
                                                {msg.toolCalls && msg.toolCalls.length > 0 && (
                                                    <div className="tool-calls">
                                                        {msg.toolCalls.map(tool => (
                                                            <div key={tool.id} className="tool-call">
                                                                <div className="tool-header">
                                                                    <Hammer size={12} />
                                                                    <span className="tool-name">{tool.tool}</span>
                                                                    <span className={`tool-status ${tool.status}`}>{tool.status}</span>
                                                                </div>
                                                                <div className="tool-input">{tool.input}</div>
                                                                {tool.output && <div className="tool-output">→ {tool.output}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Message Content */}
                                                <div className="agent-message-body">
                                                    {/* ... markdown rendering ... */}
                                                    {msg.content}
                                                </div>

                                                {/* Inline Diff (Keep existing) */}
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area (Keep existing) */}
                                </>
                            )}

                            {/* === TASKS VIEW === */}
                            {agentTab === 'tasks' && (
                                <div className="tasks-view">
                                    {currentTask ? (
                                        <div className="task-details">
                                            <h3>{currentTask.name}</h3>
                                            <div className="task-plan">
                                                {currentTask.steps.map(step => (
                                                    <div key={step.id} className="task-step">
                                                        <div className={`step-status-icon ${step.status}`}>
                                                            {step.status === 'completed' ? <CheckCircle2 size={16} /> :
                                                                step.status === 'running' ? <Loader2 size={16} className="spin" /> :
                                                                    <Circle size={16} />}
                                                        </div>
                                                        <span>{step.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="empty-state">No active task</div>
                                    )}
                                </div>
                            )}

                            {/* === ARTIFACTS VIEW === */}
                            {agentTab === 'artifacts' && (
                                <div className="artifacts-view">
                                    {artifacts.map(art => (
                                        <div key={art.id} className="artifact-card" onClick={() => {/* Open artifact */ }}>
                                            <div className="artifact-icon"><FileText size={20} /></div>
                                            <div className="artifact-info">
                                                <div className="artifact-title">{art.title}</div>
                                                <div className="artifact-meta">{art.type} • {art.lastEdited.toLocaleTimeString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
// ... (export default App)
