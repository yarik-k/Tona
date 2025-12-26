document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const autoAnalyzerToggle = document.getElementById('auto-analyzer');
    const contextSelect = document.getElementById('context-select');
    const appSelect = document.getElementById('app-select');
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');

    analyzeBtn.addEventListener('click', handleAnalyzeClick);
    autoAnalyzerToggle.addEventListener('change', handleAutoAnalyzerToggle);
    contextSelect.addEventListener('change', handleContextChange);
    appSelect.addEventListener('change', handleAppChange);

    function handleAnalyzeClick() {
        const context = contextSelect.value;
        const app = appSelect.value;
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `
            <span class="button-text">Analyzing...</span>
            <div class="button-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
        `;

        updateStatus('Analyzing chat...', 'analyzing');

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0].url && tabs[0].url.includes('web.whatsapp.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'analyzeChat',
                    context: context
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.log('Error:', chrome.runtime.lastError);
                        updateStatus('Error: Could not analyze chat', 'error');
                        resetButton();
                    } else {
                        updateStatus('Analysis complete!', 'success');
                        resetButton();
                        window.close();
                    }
                });
            } else {
                updateStatus('Error: Not on WhatsApp Web', 'error');
                resetButton();
            }
        });

        setTimeout(() => {
            if (analyzeBtn.disabled) {
                resetButton();
                updateStatus('Ready to analyze', 'ready');
            }
        }, 3000);
    }

    function handleAutoAnalyzerToggle() {
        const isEnabled = autoAnalyzerToggle.checked;
        
        if (isEnabled) {
            updateStatus('Auto analyzer enabled', 'success');
        } else {
            updateStatus('Auto analyzer disabled', 'ready');
        }
    }

    function handleContextChange() {
        updateStatus('Context updated', 'ready');
    }

    function handleAppChange() {
        updateStatus('Application updated', 'ready');
    }

    function updateStatus(message, type) {
        statusText.textContent = message;
        
        statusDot.className = 'status-dot';
        switch(type) {
            case 'analyzing':
                statusDot.style.background = '#fbbf24';
                break;
            case 'success':
                statusDot.style.background = '#4ade80';
                break;
            case 'error':
                statusDot.style.background = '#f87171';
                break;
            default:
                statusDot.style.background = '#4ade80';
        }
    }

    function resetButton() {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
            <span class="button-text">Analyze Current Chat</span>
            <div class="button-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
        `;
    }
});

const style = document.createElement('style');
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style); 