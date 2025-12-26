console.log('Tona: Content script loaded');

const MESSAGE_LIMIT = TONA_CONFIG.MESSAGE_LIMIT;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'analyzeChat') {
        analyzeCurrentChat(request.context);
        injectModal();
        forceFreshAnalysis();
        sendResponse({success: true});
    }
});

function analyzeCurrentChat(context) {
    console.log('Tona: Analyzing chat with context:', context);
    
    let messageContainers = document.querySelectorAll('[data-testid="msg-container"]');
    
    if (messageContainers.length === 0) {
        messageContainers = document.querySelectorAll('[data-testid="conversation-message"]');
    }
    
    if (messageContainers.length === 0) {
        messageContainers = document.querySelectorAll('[data-testid*="msg"]');
    }
    
    if (messageContainers.length === 0) {
        messageContainers = document.querySelectorAll('.message-in, .message-out');
    }
    
    if (messageContainers.length === 0) {
        messageContainers = document.querySelectorAll('[data-testid*="message"], [data-testid*="msg"]');
    }
    
    if (messageContainers.length === 0) {
        messageContainers = document.querySelectorAll('[role="row"]');
    }
    
    console.log('Tona: Found', messageContainers.length, 'message containers');
    
    const recentMessages = [];
    
    const lastMessages = Array.from(messageContainers).slice(-MESSAGE_LIMIT);
    
    lastMessages.forEach((container, index) => {
        let messageElement = container.querySelector('[data-testid="msg-text"]');
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid="conversation-message-text"]');
        }
        if (!messageElement) {
            messageElement = container.querySelector('.selectable-text');
        }
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid*="text"]');
        }
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid="msg-text"]');
        }
        
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid*="emoji"]');
        }
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid*="media"]');
        }
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid*="image"]');
        }
        if (!messageElement) {
            messageElement = container.querySelector('[data-testid*="document"]');
        }
        
        if (!messageElement) {
            messageElement = container;
        }
        
        const timestampElement = container.querySelector('[data-testid="msg-meta"]') || 
                               container.querySelector('[data-testid="conversation-message-time"]') ||
                               container.querySelector('[data-testid*="time"]');
        const isOutgoing = container.closest('[data-testid="msg-out"]') !== null || 
                          container.classList.contains('message-out');
        
        let messageText = '';
        let emojiImages = null;
        
        if (container.querySelector('img[src^="blob:"]')) {
            messageText = '[Image]';
        }
        else if (messageElement && messageElement.textContent.trim()) {
            let text = messageElement.textContent.trim();
            
            emojiImages = messageElement.querySelectorAll('img[data-plain-text]');
            if (emojiImages.length > 0) {
                const emojis = Array.from(emojiImages).map(img => img.getAttribute('data-plain-text')).join('');
                messageText = text + emojis;
            } else {
                messageText = text;
            }
        } else if (container.textContent.trim()) {
            let text = container.textContent.trim();
            emojiImages = container.querySelectorAll('img[data-plain-text]');
            if (emojiImages.length > 0) {
                const emojis = Array.from(emojiImages).map(img => img.getAttribute('data-plain-text')).join('');
                messageText = text + emojis;
            } else {
                messageText = text;
            }
        } else {
            messageText = '[Media/Emoji]';
        }
        
        if (messageText && emojiImages && emojiImages.length > 0) {
            const timestampPattern = /^\d{1,2}:\d{2}\s*/;
            if (timestampPattern.test(messageText)) {
                messageText = messageText.replace(timestampPattern, '');
            }
        }
        
        const messageData = {
            text: messageText,
            timestamp: timestampElement ? timestampElement.textContent : '',
            isOutgoing: isOutgoing,
            sender: isOutgoing ? 'You' : 'Sender',
            element: container
        };
        
        recentMessages.push(messageData);
        
        container.style.backgroundColor = 'rgba(120, 85, 40, 0.25)';
        container.style.borderRadius = '8px';
        container.style.padding = '4px';
        container.style.margin = '2px 0';
        container.style.border = '1px solid rgba(120, 85, 40, 0.3)';
        
        console.log(`Tona: Message ${index + 1} stored and highlighted:`, {
            sender: messageData.sender,
            text: messageData.text,
            timestamp: messageData.timestamp,
            isOutgoing: messageData.isOutgoing,
            element: container
        });
    });
    
    console.log('Tona: Highlighted', recentMessages.length, 'recent messages');
    console.log('Tona: Complete list of stored and highlighted messages:', recentMessages);
    
    window.tonaExtractedMessages = recentMessages;
    
    addTonaButton();
    
    const modalOverlay = document.getElementById('tona-modal-overlay');
    if (modalOverlay && modalOverlay.style.display === 'flex') {
        resetModalForNewChat();
    }
}

function injectModal() {
    if (document.getElementById('tona-modal-overlay')) {
        return;
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="tona-modal-overlay">
            <div class="dashboard-modal">
                <!-- Header -->
                <div class="dashboard-header">
                    <div class="header-left">
                        <div class="logo">Tona •</div>
                        <div class="status-indicator">
                            <div class="status-dot"></div>
                            <span>General Conversation Mode</span>
                        </div>
                    </div>
                    <button class="close-button">✕</button>
                </div>

                <!-- Main Content -->
                <div class="dashboard-content">
                    <!-- Chat History Panel -->
                    <div class="chat-panel">
                        <div class="chat-header">
                            <div class="chat-info">
                                <div class="chat-participant">Sender</div>
                                <div class="chat-platform">WhatsApp</div>
                            </div>
                            <div class="live-badge">
                                <div class="live-dot"></div>
                                LIVE
                            </div>
                        </div>
                        
                        <div class="chat-messages" id="chatMessages">
                            <!-- Messages will be populated here -->
                        </div>
                    </div>

                    <!-- Analysis Panel -->
                    <div class="analysis-panel">
                        <div class="analysis-tabs">
                            <div class="tab active" data-tab="assistant">AI Assistant</div>
                            <div class="tab" data-tab="stats">Statistics</div>
                            <div class="tab" data-tab="insights">Insights</div>
                        </div>

                        <!-- AI Assistant Tab -->
                        <div class="analysis-content active" id="assistant-tab">
                            <div class="assistant-container">
                                <div class="assistant-messages" id="assistantMessages">
                                    <!-- Messages will be populated dynamically -->
                                </div>

                                <div class="assistant-input-container">
                                    <textarea class="assistant-input" placeholder="Ask me anything about this conversation..."></textarea>
                                    <button class="send-button">Send</button>
                                </div>
                            </div>
                        </div>

                        <!-- Statistics Tab -->
                        <div class="analysis-content" id="stats-tab">
                            <!-- Conversation Metrics -->
                            <div class="analysis-section">
                                <div class="section-title">Conversation Dynamics</div>
                                <div class="stat-card">
                                    <div class="stat-header">
                                        <span class="stat-label">Energy Balance</span>
                                        <span class="stat-value">68%</span>
                                    </div>
                                    <div class="stat-bar">
                                        <div class="stat-fill" style="width: 68%"></div>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-header">
                                        <span class="stat-label">Engagement Level</span>
                                        <span class="stat-value">Low</span>
                                    </div>
                                    <div class="stat-bar">
                                        <div class="stat-fill" style="width: 35%; background: #f87171;"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Response Patterns -->
                            <div class="analysis-section">
                                <div class="section-title">Your Response Patterns</div>
                                <div class="metrics-grid">
                                    <div class="metric-card">
                                        <div class="metric-value">7m</div>
                                        <div class="metric-label">Avg Response Time</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">8</div>
                                        <div class="metric-label">Words per Message</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">23%</div>
                                        <div class="metric-label">Question Rate</div>
                                    </div>
                                    <div class="metric-card">
                                        <div class="metric-value">Low</div>
                                        <div class="metric-label">Emoji Usage</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Topic Analysis -->
                            <div class="analysis-section">
                                <div class="section-title">Conversation Topics</div>
                                <div style="background: #1a1a1a; padding: 16px; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                        <span style="color: #ccc; font-size: 14px;">Sports</span>
                                        <span style="color: #f39c12; font-size: 14px;">45%</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                        <span style="color: #ccc; font-size: 14px;">Work/Life Balance</span>
                                        <span style="color: #f39c12; font-size: 14px;">30%</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="color: #ccc; font-size: 14px;">Social Plans</span>
                                        <span style="color: #f39c12; font-size: 14px;">25%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Insights Tab -->
                        <div class="analysis-content" id="insights-tab">
                            <!-- Communication Style -->
                            <div class="analysis-section">
                                <div class="section-title">Their Communication Style</div>
                                <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                    <ul style="list-style: none; color: #ccc; font-size: 14px; line-height: 1.8;">
                                        <li>• Uses enthusiasm to engage (exclamation marks)</li>
                                        <li>• Shows genuine concern for your wellbeing</li>
                                        <li>• Initiates social activities</li>
                                        <li>• Maintains friendly, inclusive tone</li>
                                        <li>• Shares experiences to connect</li>
                                    </ul>
                                </div>
                            </div>



                            <!-- Conversation Tips -->
                            <div class="analysis-section">
                                <div class="section-title">General Conversation Tips</div>
                                <div style="background: #1a1a1a; padding: 16px; border-radius: 8px;">
                                    <ul style="list-style: none; color: #ccc; font-size: 14px; line-height: 1.8;">
                                        <li>• Match their energy - they're enthusiastic!</li>
                                        <li>• Ask follow-up questions to show interest</li>
                                        <li>• Share something about yourself</li>
                                        <li>• Use emojis occasionally to warm up tone</li>
                                        <li>• Acknowledge their concern about work-life balance</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalCSS = `
        <style id="tona-modal-css">
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: transparent;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            padding: 20px;
            pointer-events: none;
        }

        .dashboard-modal {
            background: #1a1a1a;
            border-radius: 16px;
            width: 100%;
            max-width: 1200px;
            height: 85vh;
            max-height: 800px;
            display: flex;
            overflow: hidden;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8), 0 10px 40px rgba(0, 0, 0, 0.6);
            border: 1px solid #333;
            position: relative;
            pointer-events: auto;
            min-width: 0;
        }

        /* Header */
        .dashboard-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            background: #1a1a1a;
            padding: 20px 30px;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
            cursor: move;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #f39c12;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #999;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #4ade80;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .close-button {
            background: none;
            border: none;
            color: #999;
            font-size: 18px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .close-button:hover {
            background: #333;
            color: #fff;
        }

        /* Main Content Area */
        .dashboard-content {
            display: flex;
            width: 100%;
            padding-top: 80px;
            min-width: 0;
            overflow: hidden;
        }

        /* Chat History Panel */
        .chat-panel {
            flex: 1;
            background: #1a1a1a;
            border-right: 1px solid #333;
            display: flex;
            flex-direction: column;
            min-width: 0;
            overflow: hidden;
        }

        .chat-header {
            padding: 20px;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .chat-info {
            flex: 1;
        }

        .chat-participant {
            font-size: 16px;
            color: #fff;
            margin-bottom: 4px;
        }

        .chat-platform {
            font-size: 14px;
            color: #666;
        }

        .live-badge {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            animation: live-breathe 2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
            position: relative;
        }

        .live-dot {
            width: 6px;
            height: 6px;
            background: #ef4444;
            border-radius: 50%;
            animation: live-pulse 2s ease-in-out infinite;
            position: relative;
        }

        @keyframes live-breathe {
            0%, 100% {
                transform: scale(1);
                background: rgba(239, 68, 68, 0.1);
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
            }
            50% {
                transform: scale(1.02);
                background: rgba(239, 68, 68, 0.2);
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
            }
        }

        @keyframes live-pulse {
            0%, 100% {
                opacity: 0.7;
                transform: scale(1);
            }
            50% {
                opacity: 1;
                transform: scale(1.3);
            }
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            min-width: 0;
        }

        .message {
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            border-radius: 8px;
            transition: background 0.2s;
            min-width: 0;
            overflow: hidden;
        }

        .message:nth-child(odd) {
            background: rgba(255, 255, 255, 0.05);
        }

        .message:nth-child(even) {
            background: rgba(255, 255, 255, 0.05);
        }

        .message:hover {
            background: rgba(243, 156, 18, 0.1);
        }

        .message.selected {
            background: rgba(243, 156, 18, 0.2);
            border: 1px solid rgba(243, 156, 18, 0.3);
        }

        .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 14px;
            flex-shrink: 0;
        }

        .message-content {
            flex: 1;
            min-width: 0;
            overflow: hidden;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .message-sender {
            font-size: 14px;
            color: #f39c12;
        }

        .message-time {
            font-size: 12px;
            color: #666;
        }

        .message-text {
            color: #ccc;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
            word-break: break-all;
            overflow-wrap: break-word;
            max-width: 100%;
            overflow: hidden;
        }
        
        .message-text a {
            word-break: break-all;
            overflow-wrap: break-word;
            color: #f39c12;
            text-decoration: none;
        }
        
        .message-text a:hover {
            text-decoration: underline;
        }

        .message-indicators {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }

        .tone-badge {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: #999;
        }

        .tone-badge.positive { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
        .tone-badge.neutral { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
        .tone-badge.negative { background: rgba(248, 113, 113, 0.2); color: #f87171; }
        .tone-badge.question { background: rgba(147, 51, 234, 0.2); color: #a78bfa; }

        /* Analysis Panel */
        .analysis-panel {
            width: 400px;
            background: #0f0f0f;
            display: flex;
            flex-direction: column;
        }

        .analysis-tabs {
            display: flex;
            border-bottom: 1px solid #333;
        }

        .tab {
            flex: 1;
            padding: 16px;
            text-align: center;
            color: #666;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            font-size: 13px;
        }

        .tab:hover {
            color: #999;
        }

        .tab.active {
            color: #f39c12;
            border-bottom-color: #f39c12;
        }

        .analysis-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: none;
        }

        .analysis-content.active {
            display: block;
        }

        /* Chat Assistant Tab */
        .assistant-container {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .assistant-messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 16px;
        }

        .assistant-message {
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
        }

        .assistant-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f39c12;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a1a;
            font-size: 16px;
            flex-shrink: 0;
        }

        .assistant-bubble {
            background: #1a1a1a;
            padding: 12px 16px;
            border-radius: 12px;
            color: #ccc;
            font-size: 14px;
            line-height: 1.5;
            max-width: 85%;
        }

        .user-message {
            justify-content: flex-end;
        }

        .user-message .assistant-bubble {
            background: rgba(243, 156, 18, 0.2);
            margin-left: auto;
        }

        .assistant-input-container {
            display: flex;
            gap: 8px;
            padding-top: 16px;
            border-top: 1px solid #333;
        }

        .assistant-input {
            flex: 1;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            color: #ccc;
            font-size: 14px;
            resize: none;
            height: 80px;
        }

        .assistant-input:focus {
            outline: none;
            border-color: #f39c12;
        }

        .send-button {
            background: #f39c12;
            color: #1a1a1a;
            border: none;
            border-radius: 8px;
            padding: 0 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .send-button:hover {
            background: #e67e22;
            transform: translateY(-1px);
        }

        /* Quick Actions */
        .quick-actions {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .quick-action {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 16px;
            padding: 6px 12px;
            font-size: 12px;
            color: #999;
            cursor: pointer;
            transition: all 0.2s;
        }

        .quick-action:hover {
            border-color: #f39c12;
            color: #f39c12;
        }

        /* Analysis Sections */
        .analysis-section {
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 14px;
            color: #f39c12;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Statistics */
        .stat-card {
            background: #1a1a1a;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .stat-label {
            color: #999;
            font-size: 13px;
        }

        .stat-value {
            color: #f39c12;
            font-size: 20px;
            font-weight: bold;
        }

        .stat-bar {
            height: 4px;
            background: #333;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 8px;
        }

        .stat-fill {
            height: 100%;
            background: #f39c12;
            transition: width 0.3s;
        }

        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .metric-card {
            background: #1a1a1a;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }

        .metric-value {
            font-size: 24px;
            color: #f39c12;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .metric-label {
            font-size: 12px;
            color: #666;
        }

        /* Suggestion Cards */
        .suggestion-card {
            background: #1a1a1a;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            border: 1px solid #333;
            cursor: pointer;
            transition: all 0.2s;
        }

        .suggestion-card:hover {
            border-color: #f39c12;
            transform: translateY(-2px);
        }

        .suggestion-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }

        .suggestion-text {
            color: #ccc;
            font-size: 14px;
            line-height: 1.4;
        }

        /* Scrollbar Styling */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #0f0f0f;
        }

        ::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #444;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .tona-loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(243, 156, 18, 0.1);
            border-radius: 50%;
            animation: breathe 2s ease-in-out infinite;
            box-shadow: 0 0 30px rgba(243, 156, 18, 0.3);
            position: relative;
        }

        .tona-loading-spinner::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 8px;
            height: 8px;
            background: #f39c12;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes breathe {
            0%, 100% {
                transform: scale(1);
                border-color: rgba(243, 156, 18, 0.1);
                box-shadow: 0 0 30px rgba(243, 156, 18, 0.3);
            }
            50% {
                transform: scale(1.1);
                border-color: rgba(243, 156, 18, 0.4);
                box-shadow: 0 0 40px rgba(243, 156, 18, 0.6);
            }
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(1);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.2);
            }
        }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.head.insertAdjacentHTML('beforeend', modalCSS);
    
    initializeModal();
}

function initializeModal() {
    const modalOverlay = document.getElementById('tona-modal-overlay');
    const dashboardModal = modalOverlay.querySelector('.dashboard-modal');
    const dashboardHeader = modalOverlay.querySelector('.dashboard-header');
    const tabs = modalOverlay.querySelectorAll('.tab');
    const quickActions = modalOverlay.querySelectorAll('.quick-action');
    const sendBtn = modalOverlay.querySelector('.send-button');
    const assistantInput = modalOverlay.querySelector('.assistant-input');
    const closeBtn = modalOverlay.querySelector('.close-button');
    
    window.tonaStatsLoaded = false;
    window.tonaInsightsLoaded = false;
    
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    dashboardHeader.addEventListener('mousedown', function(e) {
        if (e.target === closeBtn) return;
        
        isDragging = true;
        const rect = dashboardModal.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        dashboardModal.style.transition = 'none';
        document.body.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - dashboardModal.offsetWidth;
        const maxY = window.innerHeight - dashboardModal.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));
        
        dashboardModal.style.position = 'fixed';
        dashboardModal.style.left = clampedX + 'px';
        dashboardModal.style.top = clampedY + 'px';
        dashboardModal.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            dashboardModal.style.transition = 'box-shadow 0.3s ease';
            document.body.style.cursor = 'default';
        }
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            modalOverlay.querySelectorAll('.analysis-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabName = this.getAttribute('data-tab');
            const targetTab = modalOverlay.querySelector('#' + tabName + '-tab');
            targetTab.classList.add('active');
            
            if (tabName === 'stats' && !window.tonaStatsLoaded) {
                showStatisticsLoadingAnimation();
            } else if (tabName === 'insights' && !window.tonaInsightsLoaded) {
                showInsightsLoadingAnimation();
            }
        });
    });
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target.closest('.message')) {
            const message = e.target.closest('.message');
            modalOverlay.querySelectorAll('.message').forEach(m => m.classList.remove('selected'));
            message.classList.add('selected');
        }
    });
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-action')) {
            const input = modalOverlay.querySelector('.assistant-input');
            input.value = e.target.textContent;
            input.focus();
        }
    });
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target.closest('.suggestion-card')) {
            const card = e.target.closest('.suggestion-card');
            const text = card.querySelector('.suggestion-text').textContent;
            navigator.clipboard.writeText(text);
            
            const originalBorder = card.style.borderColor;
            card.style.borderColor = '#4ade80';
            
            setTimeout(() => {
                card.style.borderColor = originalBorder;
            }, 1000);
        }
    });
    
    sendBtn.addEventListener('click', async function() {
        const input = modalOverlay.querySelector('.assistant-input');
        if (input.value.trim()) {
            const userQuery = input.value.trim();
            
            const messagesContainer = modalOverlay.querySelector('.assistant-messages');
            const userMsg = document.createElement('div');
            userMsg.className = 'assistant-message user-message';
            userMsg.innerHTML = `<div class="assistant-bubble">${userQuery}</div>`;
            messagesContainer.appendChild(userMsg);
            
            input.value = '';
            
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'assistant-message';
            loadingMsg.innerHTML = `
                <div class="assistant-avatar">T</div>
                <div class="assistant-bubble">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 16px; height: 16px; border: 2px solid #f39c12; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        Analyzing your conversation...
                    </div>
                </div>
            `;
            messagesContainer.appendChild(loadingMsg);
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            try {
                const response = await callLLMServer(userQuery);
                
                loadingMsg.remove();
                
                const aiMsg = document.createElement('div');
                aiMsg.className = 'assistant-message';
                aiMsg.innerHTML = `
                    <div class="assistant-avatar">T</div>
                    <div class="assistant-bubble">
                        <div style="margin-bottom: 12px; white-space: pre-wrap;">${response.response.trim()}</div>
                        <div style="margin-top: 12px;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Click to copy suggestions for WhatsApp:</div>
                            ${response.suggestions.map(suggestion => 
                                `<div style="background: rgba(243, 156, 18, 0.1); padding: 8px; margin: 4px 0; border-radius: 4px; cursor: pointer; font-size: 13px; border: 1px solid rgba(243, 156, 18, 0.3);" onclick="copyToClipboard('${suggestion.replace(/'/g, "\\'")}')">${suggestion}</div>`
                            ).join('')}
                        </div>
                    </div>
                `;
                messagesContainer.appendChild(aiMsg);
                
                updateStatisticsTab(response.user_tone_analysis, response.conversation_summary);
                
            } catch (error) {
                console.error('Tona: LLM server error:', error);
                
                loadingMsg.remove();
                
                const errorMsg = document.createElement('div');
                errorMsg.className = 'assistant-message';
                errorMsg.innerHTML = `
                    <div class="assistant-avatar">T</div>
                    <div class="assistant-bubble">
                        Sorry, I'm having trouble connecting to the analysis server. Please check your internet connection and try again.
                    </div>
                `;
                messagesContainer.appendChild(errorMsg);
            }
            
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });
    
    assistantInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });
    
    closeBtn.addEventListener('click', () => {
        closeModal();
    });
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const event = new CustomEvent('tona-copy-success', { detail: { text } });
        document.dispatchEvent(event);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4ade80;
            color: #1a1a1a;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10002;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        notification.textContent = 'Copied to clipboard!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
    });
}

async function callLLMServer(userQuery) {
    const serverUrl = TONA_CONFIG.SERVER_URL;
    
    const chatHistory = window.tonaExtractedMessages || [];
    
    const serverMessages = chatHistory.map(msg => ({
        text: msg.text,
        timestamp: msg.timestamp,
        isOutgoing: msg.isOutgoing,
        sender: msg.sender
    }));
    
    const requestData = {
        chat_history: serverMessages,
        user_query: userQuery,
        user_id: 'tona_user_' + Date.now()
    };
    
    console.log('Tona: Sending request to LLM server:', requestData);
    
    const response = await fetch(`${serverUrl}/analyze_chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Tona: Received LLM response:', result);
    
    return result;
}

async function generateInitialAnalysis() {
    const assistantMessages = document.getElementById('assistantMessages');
    if (!assistantMessages) return;
    
    assistantMessages.innerHTML = '';
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'assistant-message';
    loadingMsg.innerHTML = `
        <div class="assistant-avatar">T</div>
        <div class="assistant-bubble">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 16px; height: 16px; border: 2px solid #f39c12; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                Analyzing your conversation...
            </div>
        </div>
    `;
    assistantMessages.appendChild(loadingMsg);
    
    const statsPromise = updateStatisticsTabWithStats();
    
    try {
        const response = await callLLMServer("What are some good responses I could send to continue this conversation?");
        
        loadingMsg.remove();
        
        const aiMsg = document.createElement('div');
        aiMsg.className = 'assistant-message';
        aiMsg.innerHTML = `
            <div class="assistant-avatar">T</div>
            <div class="assistant-bubble">
                <div style="white-space: pre-wrap;">Hey! I've had a look at your messages. ${response.response.trim()}</div>
                <div style="margin-top: 12px;">
                    <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Click to copy suggestions for WhatsApp:</div>
                    ${response.suggestions.map(suggestion => 
                        `<div style="background: rgba(243, 156, 18, 0.1); padding: 8px; margin: 4px 0; border-radius: 4px; cursor: pointer; font-size: 13px; border: 1px solid rgba(243, 156, 18, 0.3);" onclick="copyToClipboard('${suggestion.replace(/'/g, "\\'")}')">${suggestion}</div>`
                    ).join('')}
                </div>
            </div>
        `;
        assistantMessages.appendChild(aiMsg);
        
        statsPromise.catch(error => {
            console.error('Tona: Stats analysis failed:', error);
        });
        
    } catch (error) {
        console.error('Tona: Initial analysis error:', error);
        
        loadingMsg.remove();
        
        const fallbackMsg = document.createElement('div');
        fallbackMsg.className = 'assistant-message';
        fallbackMsg.innerHTML = `
            <div class="assistant-avatar">T</div>
            <div class="assistant-bubble">
                Hi! I'm here to help you with your conversation. Ask me anything about how to respond or improve your communication!
            </div>
        `;
        assistantMessages.appendChild(fallbackMsg);
        
        const quickActionsDiv = document.createElement('div');
        quickActionsDiv.className = 'quick-actions';
        quickActionsDiv.innerHTML = `
            <div class="quick-action">What's the best response?</div>
            <div class="quick-action">Analyze their mood</div>
            <div class="quick-action">Help me be more engaging</div>
            <div class="quick-action">What topics should I bring up?</div>
            <div class="quick-action">How should I respond to this?</div>
            <div class="quick-action">Give me conversation starters</div>
        `;
        assistantMessages.appendChild(quickActionsDiv);
    }
}

let isStatsUpdateInProgress = false;

async function callStatsServer() {
    const statsServerUrl = TONA_CONFIG.STATS_SERVER_URL || 'http://localhost:8001';
    
    const chatHistory = window.tonaExtractedMessages || [];
    
    const serverMessages = chatHistory.map(msg => ({
        text: msg.text,
        timestamp: msg.timestamp,
        isOutgoing: msg.isOutgoing,
        sender: msg.sender
    }));
    
    const requestData = {
        chat_history: serverMessages,
        user_id: 'tona_user_' + Date.now()
    };
    
    console.log('Tona: Sending request to stats server:', requestData);
    
    try {
        console.log('Tona: Making request to stats server at:', statsServerUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${statsServerUrl}/generate_stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Tona: Stats server response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Tona: Received stats response:', result);
        
        return result;
    } catch (error) {
        console.error('Tona: Stats server error:', error);
        throw error;
    }
}

async function updateStatisticsTabWithStats() {
    if (isStatsUpdateInProgress) {
        console.log('Tona: Stats update already in progress, skipping...');
        return;
    }
    
    isStatsUpdateInProgress = true;
    
    try {
        showStatisticsLoadingAnimation();
        showInsightsLoadingAnimation();
        
        const statsData = await callStatsServer();
        
        hideStatisticsLoadingAnimation();
        hideInsightsLoadingAnimation();
        
        updateStatisticsTabFromData(statsData);
        updateInsightsTabFromData(statsData);
        
        console.log('Tona: Successfully updated stats and insights with real data');
    } catch (error) {
        console.error('Tona: Failed to update statistics:', error);
        
        hideStatisticsLoadingAnimation();
        hideInsightsLoadingAnimation();
        
        updateStatisticsTab({}, '');
        
        window.tonaStatsLoaded = true;
        window.tonaInsightsLoaded = true;
    } finally {
        isStatsUpdateInProgress = false;
    }
}

function showStatisticsLoadingAnimation() {
    const statsTab = document.getElementById('stats-tab');
    if (!statsTab) {
        console.log('Tona: Stats tab not found, cannot show loading animation');
        return;
    }
    
    const existingOverlay = document.getElementById('stats-loading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'stats-loading-overlay';
    loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(26, 26, 26, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: 8px;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div class="tona-loading-spinner"></div>
            <div style="color: #f39c12; font-size: 16px; font-weight: 500;">Analyzing conversation...</div>
            <div style="color: #999; font-size: 14px;">Generating comprehensive statistics</div>
        </div>
    `;
    
    statsTab.style.position = 'relative';
    statsTab.appendChild(loadingOverlay);
    console.log('Tona: Statistics loading animation shown');
}

function hideStatisticsLoadingAnimation() {
    const loadingOverlay = document.getElementById('stats-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
        console.log('Tona: Statistics loading animation hidden');
    } else {
        console.log('Tona: Statistics loading overlay not found to hide');
    }
}

function showInsightsLoadingAnimation() {
    const insightsTab = document.getElementById('insights-tab');
    if (!insightsTab) {
        console.log('Tona: Insights tab not found, cannot show loading animation');
        return;
    }
    
    const existingOverlay = document.getElementById('insights-loading-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'insights-loading-overlay';
    loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(26, 26, 26, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: 8px;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div class="tona-loading-spinner"></div>
            <div style="color: #f39c12; font-size: 16px; font-weight: 500;">Analyzing communication style...</div>
            <div style="color: #999; font-size: 14px;">Generating personalized insights</div>
        </div>
    `;
    
    insightsTab.style.position = 'relative';
    insightsTab.appendChild(loadingOverlay);
    console.log('Tona: Insights loading animation shown');
}

function hideInsightsLoadingAnimation() {
    const loadingOverlay = document.getElementById('insights-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
        console.log('Tona: Insights loading animation hidden');
    } else {
        console.log('Tona: Insights loading overlay not found to hide');
    }
}

function updateStatisticsTabFromData(statsData) {
    const statsTab = document.getElementById('stats-tab');
    if (!statsTab) return;
    
    const dynamics = statsData.conversation_dynamics;
    if (dynamics) {
        const energyElement = statsTab.querySelector('.stat-card:nth-child(1) .stat-value');
        if (energyElement) {
            energyElement.textContent = dynamics.energy_balance;
            
            const energyFill = statsTab.querySelector('.stat-card:nth-child(1) .stat-fill');
            if (energyFill) {
                const width = dynamics.energy_balance === 'High' ? 75 : 
                             dynamics.energy_balance === 'Medium' ? 55 : 35;
                energyFill.style.width = width + '%';
                energyFill.style.backgroundColor = width > 60 ? '#4ade80' : width > 40 ? '#f39c12' : '#f87171';
            }
        }
        
        const engagementElement = statsTab.querySelector('.stat-card:nth-child(2) .stat-value');
        if (engagementElement) {
            engagementElement.textContent = dynamics.engagement_level;
            
            const engagementFill = statsTab.querySelector('.stat-card:nth-child(2) .stat-fill');
            if (engagementFill) {
                const width = dynamics.engagement_level === 'High' ? 75 : 
                             dynamics.engagement_level === 'Medium' ? 55 : 35;
                engagementFill.style.width = width + '%';
                engagementFill.style.backgroundColor = width > 60 ? '#4ade80' : width > 40 ? '#f39c12' : '#f87171';
            }
        }
    }
    
    const patterns = statsData.response_patterns;
    if (patterns) {
        const metricsGrid = statsTab.querySelector('.metrics-grid');
        if (metricsGrid) {
            const metricCards = metricsGrid.querySelectorAll('.metric-card');
            if (metricCards.length >= 4) {
                metricCards[0].querySelector('.metric-value').textContent = patterns.avg_response_time;
                metricCards[1].querySelector('.metric-value').textContent = patterns.words_per_message;
                metricCards[2].querySelector('.metric-value').textContent = patterns.question_rate;
                metricCards[3].querySelector('.metric-value').textContent = patterns.emoji_usage;
            }
        }
    }
    
    const topics = statsData.conversation_topics;
    if (topics && topics.topics) {
        const topicsContainer = statsTab.querySelector('.analysis-section:nth-child(3)');
        if (topicsContainer) {
            const topicsDiv = topicsContainer.querySelector('div[style*="background: #1a1a1a"]');
            if (topicsDiv) {
                let topicsHTML = '';
                topics.topics.forEach(topic => {
                    topicsHTML += `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <span style="color: #ccc; font-size: 14px;">${topic.topic}</span>
                            <span style="color: #f39c12; font-size: 14px;">${topic.percentage}</span>
                        </div>
                    `;
                });
                topicsDiv.innerHTML = topicsHTML;
            }
        }
    }
    
    window.tonaStatsLoaded = true;
}

function updateInsightsTabFromData(statsData) {
    const insightsTab = document.getElementById('insights-tab');
    if (!insightsTab) return;
    
    const communicationStyle = statsData.communication_style;
    if (communicationStyle && communicationStyle.style_points) {
        const styleContainer = insightsTab.querySelector('.analysis-section:nth-child(1)');
        if (styleContainer) {
            const styleList = styleContainer.querySelector('ul');
            if (styleList) {
                let styleHTML = '';
                communicationStyle.style_points.forEach(point => {
                    styleHTML += `<li>• ${point}</li>`;
                });
                styleList.innerHTML = styleHTML;
            }
        }
    }
    
    const conversationTips = statsData.conversation_tips;
    if (conversationTips && conversationTips.tips) {
        const tipsContainer = insightsTab.querySelector('.analysis-section:nth-child(2)');
        if (tipsContainer) {
            const tipsList = tipsContainer.querySelector('ul');
            if (tipsList) {
                let tipsHTML = '';
                conversationTips.tips.forEach(tip => {
                    tipsHTML += `<li>• ${tip}</li>`;
                });
                tipsList.innerHTML = tipsHTML;
            }
        }
    }
    
    window.tonaInsightsLoaded = true;
}

function updateStatisticsTab(userTone, conversationSummary) {
    const statsTab = document.getElementById('stats-tab');
    if (!statsTab) return;
    
    const engagementElement = statsTab.querySelector('.stat-card:nth-child(2) .stat-value');
    if (engagementElement) {
        const engagementLevel = userTone.engagement_style === 'engaged' ? 'High' : 
                              userTone.engagement_style === 'reserved' ? 'Low' : 'Medium';
        engagementElement.textContent = engagementLevel;
        
        const engagementFill = statsTab.querySelector('.stat-card:nth-child(2) .stat-fill');
        if (engagementFill) {
            const width = userTone.engagement_style === 'engaged' ? 75 : 
                         userTone.engagement_style === 'reserved' ? 35 : 55;
            engagementFill.style.width = width + '%';
            engagementFill.style.background = width > 60 ? '#4ade80' : width > 40 ? '#f39c12' : '#f87171';
        }
    }
    
    const metricsGrid = statsTab.querySelector('.metrics-grid');
    if (metricsGrid) {
        const metricCards = metricsGrid.querySelectorAll('.metric-card');
        if (metricCards.length >= 4) {
            metricCards[0].querySelector('.metric-value').textContent = '5m';
            metricCards[1].querySelector('.metric-value').textContent = userTone.avg_message_length || '8';
            const questionRate = Math.round((userTone.question_rate || 0.2) * 100);
            metricCards[2].querySelector('.metric-value').textContent = questionRate + '%';
            const emojiLevel = userTone.emoji_usage === 'high' ? 'High' : 
                              userTone.emoji_usage === 'low' ? 'Low' : 'Medium';
            metricCards[3].querySelector('.metric-value').textContent = emojiLevel;
        }
    }
}

async function openModal() {
    const modalOverlay = document.getElementById('tona-modal-overlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
        populateChatMessages();
        
        const assistantMessages = document.getElementById('assistantMessages');
        if (assistantMessages && assistantMessages.children.length === 0) {
            await generateInitialAnalysis();
        }
    }
}

function closeModal() {
    const modalOverlay = document.getElementById('tona-modal-overlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
    }
}

async function resetModalForNewChat() {
    console.log('Tona: Resetting modal for new chat analysis');
    
    window.tonaStatsLoaded = false;
    window.tonaInsightsLoaded = false;
    
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (chatMessagesContainer) {
        chatMessagesContainer.innerHTML = '';
        populateChatMessages();
    }
    
    const assistantMessages = document.getElementById('assistantMessages');
    if (assistantMessages) {
        assistantMessages.innerHTML = '';
        await generateInitialAnalysis();
    }
    
    const statsTab = document.getElementById('stats-tab');
    if (statsTab) {
        updateStatisticsTab({
            formality_level: "medium",
            response_length: "short",
            emoji_usage: "low",
            engagement_style: "reserved",
            avg_message_length: 0,
            question_rate: 0,
            exclamation_rate: 0,
            common_phrases: [],
            writing_style: "neutral",
            greeting_style: "standard",
            response_patterns: []
        }, "New conversation analysis in progress...");
    }
}

async function forceFreshAnalysis() {
    console.log('Tona: Forcing fresh analysis');
    
    const modalOverlay = document.getElementById('tona-modal-overlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
    }
    
    await resetModalForNewChat();
}

const sampleMessages = [
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Hey! Did you see what happened at the game last night? That last minute goal was insane!",
        time: "2:34 PM",
        tags: ["Excited", "Casual"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "No didn't catch it, was working late",
        time: "2:41 PM",
        tags: ["Brief", "Disengaged"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Ah man you're always working! You gotta find some balance. Anyway, we're planning to watch the next match at Dave's place this weekend. You should definitely come!",
        time: "2:43 PM",
        tags: ["Friendly", "Inviting", "Concerned"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Yeah, I've been swamped with this project deadline",
        time: "2:45 PM",
        tags: ["Defensive", "Busy"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "I get it, but you can't work forever! When was the last time you took a break?",
        time: "2:47 PM",
        tags: ["Concerned", "Direct"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Probably last month... maybe",
        time: "2:48 PM",
        tags: ["Uncertain", "Brief"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "See? That's exactly what I mean! Come to Dave's this weekend. It'll be fun, I promise!",
        time: "2:50 PM",
        tags: ["Persuasive", "Friendly"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "I don't know, I have a lot of work to catch up on",
        time: "2:52 PM",
        tags: ["Hesitant", "Work-focused"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Work will always be there! But this game won't. Plus, Sarah is coming too - you remember her from college?",
        time: "2:54 PM",
        tags: ["Persuasive", "Social"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Sarah? Oh yeah, I think so",
        time: "2:55 PM",
        tags: ["Vague", "Uncertain"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Yeah! She's been asking about you. Said you guys used to study together",
        time: "2:57 PM",
        tags: ["Informative", "Social"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Hmm, maybe I can make it work",
        time: "2:59 PM",
        tags: ["Considering", "Tentative"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Great! It's Saturday at 7. Dave's address is 123 Oak Street. Just bring yourself and maybe some snacks!",
        time: "3:01 PM",
        tags: ["Excited", "Helpful"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Okay, I'll try to be there",
        time: "3:03 PM",
        tags: ["Non-committal", "Brief"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Awesome! You won't regret it. And hey, maybe we can grab lunch sometime this week too?",
        time: "3:05 PM",
        tags: ["Enthusiastic", "Inviting"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Sure, that sounds good",
        time: "3:07 PM",
        tags: ["Agreeable", "Brief"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Perfect! How about Thursday? I know this great new place downtown",
        time: "3:09 PM",
        tags: ["Specific", "Enthusiastic"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Thursday works for me",
        time: "3:11 PM",
        tags: ["Agreeable", "Brief"],
        highlighted: false
    },
    {
        sender: 'Alex',
        avatar: 'AT',
        message: "Great! I'll make a reservation for 1 PM. Looking forward to catching up!",
        time: "3:13 PM",
        tags: ["Organized", "Friendly"],
        highlighted: false
    },
    {
        sender: 'You',
        avatar: 'Y',
        message: "Sounds good, see you then",
        time: "3:15 PM",
        tags: ["Confirming", "Brief"],
        highlighted: true
    }
];

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.highlighted ? 'selected' : ''}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.avatar;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    
    const sender = document.createElement('span');
    sender.className = 'message-sender';
    sender.textContent = message.sender;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = message.time;
    
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.message;
    
    if (message.isDeletedMessage) {
        text.style.color = '#dc3545';
        text.style.fontStyle = 'italic';
    }
    
    const indicators = document.createElement('div');
    indicators.className = 'message-indicators';
    
    if (message.isDeletedMessage) {
        const deletedBadge = document.createElement('span');
        deletedBadge.className = 'tone-badge negative';
        deletedBadge.textContent = 'Deleted';
        deletedBadge.style.backgroundColor = 'rgba(220, 53, 69, 0.2)';
        deletedBadge.style.color = '#dc3545';
        indicators.appendChild(deletedBadge);
    }
    
    message.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tone-badge';
        
        if (['Excited', 'Friendly', 'Inviting', 'Enthusiastic'].includes(tag)) {
            tagElement.classList.add('positive');
        } else if (['Concerned', 'Direct', 'Persuasive'].includes(tag)) {
            tagElement.classList.add('negative');
        } else {
            tagElement.classList.add('neutral');
        }
        
        tagElement.textContent = tag;
        indicators.appendChild(tagElement);
    });
    
    header.appendChild(sender);
    header.appendChild(time);
    content.appendChild(header);
    content.appendChild(text);
    content.appendChild(indicators);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    return messageDiv;
}

function populateChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;
    
    if (chatMessagesContainer.children.length === 0) {
        chatMessagesContainer.innerHTML = '';
        
        const messagesToDisplay = window.tonaExtractedMessages || sampleMessages;
        
        messagesToDisplay.forEach(message => {
            const deletedMessagePatterns = [
                /recalledYou deleted this message\d{2}:\d{2}\d{2}:\d{2}/,
                /recalledThis message was deleted\d{2}:\d{2}\d{2}:\d{2}/,
                /recalledYou deleted this message/,
                /recalledThis message was deleted/,
                /You deleted this message\d{2}:\d{2}\d{2}:\d{2}/,
                /This message was deleted\d{2}:\d{2}\d{2}:\d{2}/,
                /You deleted this message/,
                /This message was deleted/
            ];
            
            let isDeletedMessage = false;
            let cleanedMessageText = message.text;
            
            for (const pattern of deletedMessagePatterns) {
                if (pattern.test(cleanedMessageText)) {
                    isDeletedMessage = true;
                    // Clean up the deleted message text by removing the tags
                    cleanedMessageText = cleanedMessageText.replace(pattern, '').trim();
                    break;
                }
            }
            
            const modalMessage = {
                sender: message.sender,
                avatar: message.sender === 'You' ? 'Y' : 'O',
                message: cleanedMessageText,
                time: message.timestamp,
                tags: [],
                highlighted: false,
                isDeletedMessage: isDeletedMessage
            };
            
            const messageElement = createMessageElement(modalMessage);
            chatMessagesContainer.appendChild(messageElement);
        });
        
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        
        console.log('Tona: Populated modal with', messagesToDisplay.length, 'messages');
    }
}

function addTonaButton() {
    const existingButton = document.getElementById('tona-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    const tonaButton = document.createElement('div');
    tonaButton.id = 'tona-button';
    tonaButton.innerHTML = '<span style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">Tona</span>';
    tonaButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1a1a;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        user-select: none;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    tonaButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
    });
    
    tonaButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    });
    
    tonaButton.addEventListener('click', function() {
        console.log('Tona: Button clicked');
        
        const existingModal = document.getElementById('tona-modal-overlay');
        if (existingModal && existingModal.style.display === 'flex') {
            existingModal.style.zIndex = '10001';
            return;
        }
        
        injectModal();
        openModal();
    });
    
    document.body.appendChild(tonaButton);
    console.log('Tona: Button added to page');
    
    startChatChangeMonitoring();
}

function startChatChangeMonitoring() {
    let currentChatId = null;
    
    function getCurrentChatId() {
        const chatHeader = document.querySelector('[data-testid="conversation-title"]') || 
                          document.querySelector('[data-testid="chat-subtitle"]') ||
                          document.querySelector('.chat-title');
        
        if (chatHeader) {
            return chatHeader.textContent || chatHeader.innerText;
        }
        
        return window.location.pathname;
    }
    
    setInterval(() => {
        const newChatId = getCurrentChatId();
        
        if (currentChatId && newChatId && currentChatId !== newChatId) {
            console.log('Tona: Chat changed from', currentChatId, 'to', newChatId);
            
            window.tonaExtractedMessages = null;
            
            const modalOverlay = document.getElementById('tona-modal-overlay');
            if (modalOverlay && modalOverlay.style.display === 'flex') {
                resetModalForNewChat();
            }
        }
        
        currentChatId = newChatId;
    }, 2000);
} 