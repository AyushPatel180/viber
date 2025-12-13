import { useState, useCallback, useEffect } from 'react';
import { viber, type ChangeSet, type SpeculativeDiff } from '../api/viber';
import { Check, X, Play, AlertCircle, Loader2 } from 'lucide-react';

interface DiffViewerProps {
    changeSet: ChangeSet | null;
    onApprove: () => void;
    onReject: () => void;
    onApply: () => void;
}

export function DiffViewer({ changeSet, onApprove, onReject, onApply }: DiffViewerProps) {
    if (!changeSet) {
        return (
            <div className="diff-empty">
                <p>No changes to review</p>
            </div>
        );
    }

    return (
        <div className="diff-viewer">
            <div className="diff-header">
                <div className="diff-title">
                    <span className="diff-status" data-status={changeSet.status}>
                        {changeSet.status}
                    </span>
                    <span>Change Set: {changeSet.id.slice(0, 8)}</span>
                </div>
                <div className="diff-actions">
                    {changeSet.status === 'pending' && (
                        <>
                            <button className="diff-btn approve" onClick={onApprove}>
                                <Check size={14} /> Approve
                            </button>
                            <button className="diff-btn reject" onClick={onReject}>
                                <X size={14} /> Reject
                            </button>
                        </>
                    )}
                    {changeSet.status === 'approved' && (
                        <button className="diff-btn apply" onClick={onApply}>
                            <Play size={14} /> Apply Changes
                        </button>
                    )}
                </div>
            </div>
            <div className="diff-prompt">
                <strong>Prompt:</strong> {changeSet.prompt}
            </div>
            <div className="diff-files">
                {changeSet.diffs.map((diff) => (
                    <DiffBlock key={diff.id} diff={diff} />
                ))}
            </div>
        </div>
    );
}

function DiffBlock({ diff }: { diff: SpeculativeDiff }) {
    const [expanded, setExpanded] = useState(true);

    const getTypeColor = () => {
        switch (diff.diffType) {
            case 'insert': return 'var(--success)';
            case 'delete': return 'var(--error)';
            case 'replace': return 'var(--warning)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div className="diff-block">
            <div className="diff-block-header" onClick={() => setExpanded(!expanded)}>
                <span className="diff-file-path">{diff.filePath}</span>
                <div className="diff-block-meta">
                    <span className="diff-type" style={{ color: getTypeColor() }}>
                        {diff.diffType}
                    </span>
                    <span className="diff-lines">
                        L{diff.startLine}{diff.endLine ? `-${diff.endLine}` : ''}
                    </span>
                    <span className="diff-confidence">
                        {Math.round(diff.confidence * 100)}% confidence
                    </span>
                </div>
            </div>
            {expanded && (
                <div className="diff-content">
                    {diff.originalContent && (
                        <div className="diff-original">
                            <div className="diff-label">- Original</div>
                            <pre>{diff.originalContent}</pre>
                        </div>
                    )}
                    <div className="diff-proposed">
                        <div className="diff-label">+ Proposed</div>
                        <pre>{diff.proposedContent}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

interface AgentChatProps {
    onChangeSetGenerated: (changeSet: ChangeSet) => void;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    changeSet?: ChangeSet;
    isLoading?: boolean;
}

export function AgentChat({ onChangeSetGenerated }: AgentChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: `👋 **Welcome to VIBER Agent!**

I can help you with:
• **Generate code** - "Add error handling to the API endpoints"
• **Refactor** - "Extract this logic into a helper function"
• **Fix bugs** - "Fix the null pointer exception in user.service.ts"
• **Add features** - "Add pagination to the list endpoint"

What would you like me to help you with?`,
        },
    ]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        const loadingMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '',
            isLoading: true,
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInput('');
        setIsGenerating(true);

        try {
            // Generate diff using speculative engine
            const changeSet = await viber.generateDiff(input);

            const responseMessage: ChatMessage = {
                id: loadingMessage.id,
                role: 'assistant',
                content: `I've analyzed your request and generated ${changeSet.diffs.length} change(s).

**Files affected:**
${changeSet.diffs.map(d => `• \`${d.filePath}\` (${d.diffType})`).join('\n')}

Review the diff panel on the right to approve or reject the changes.`,
                changeSet,
            };

            setMessages(prev => prev.map(m => m.id === loadingMessage.id ? responseMessage : m));
            onChangeSetGenerated(changeSet);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: loadingMessage.id,
                role: 'system',
                content: `⚠️ **Error generating changes**

${error instanceof Error ? error.message : 'Could not connect to VIBER services. Make sure all services are running.'}`,
            };

            setMessages(prev => prev.map(m => m.id === loadingMessage.id ? errorMessage : m));
        } finally {
            setIsGenerating(false);
        }
    }, [input, isGenerating, onChangeSetGenerated]);

    return (
        <div className="agent-chat">
            <div className="chat-messages">
                {messages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        {msg.isLoading ? (
                            <div className="chat-loading">
                                <Loader2 className="spin" size={16} />
                                <span>Analyzing codebase and generating changes...</span>
                            </div>
                        ) : (
                            <div className="chat-message-content" dangerouslySetInnerHTML={{
                                __html: formatMarkdown(msg.content)
                            }} />
                        )}
                    </div>
                ))}
            </div>
            <div className="chat-input-area">
                <textarea
                    className="chat-textarea"
                    placeholder="Describe what you want to change..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    disabled={isGenerating}
                />
                <button
                    className="chat-send-btn"
                    onClick={sendMessage}
                    disabled={isGenerating || !input.trim()}
                >
                    {isGenerating ? <Loader2 className="spin" size={18} /> : 'Send'}
                </button>
            </div>
        </div>
    );
}

function formatMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br />');
}

export function ServiceStatus() {
    const [services, setServices] = useState<Array<{ name: string; status: 'up' | 'down'; latencyMs: number }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkServices = async () => {
            try {
                const metrics = await viber.getMetrics();
                setServices(metrics.services.map(s => ({
                    ...s,
                    status: s.status as 'up' | 'down',
                })));
            } catch {
                setServices([]);
            } finally {
                setLoading(false);
            }
        };

        checkServices();
        const interval = setInterval(checkServices, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <span>Checking services...</span>;

    const upCount = services.filter(s => s.status === 'up').length;
    const totalCount = services.length || 8;

    return (
        <div className="service-status" title={services.map(s => `${s.name}: ${s.status}`).join('\n')}>
            {upCount === totalCount ? (
                <Check size={14} style={{ color: 'var(--success)' }} />
            ) : (
                <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
            )}
            <span>{upCount}/{totalCount} Services</span>
        </div>
    );
}
