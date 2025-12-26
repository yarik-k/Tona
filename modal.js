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
        highlighted: true
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
        highlighted: false
    }
];

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.avatar;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${message.highlighted ? 'highlighted' : ''}`;
    bubble.textContent = message.message;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = message.time;
    
    const tags = document.createElement('div');
    tags.className = 'message-tags';
    
    message.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'message-tag';
        
        if (['Excited', 'Friendly', 'Inviting', 'Enthusiastic'].includes(tag)) {
            tagElement.classList.add('green');
        } else if (['Concerned', 'Direct', 'Persuasive'].includes(tag)) {
            tagElement.classList.add('orange');
        } else {
            tagElement.classList.add('gray');
        }
        
        tagElement.textContent = tag;
        tags.appendChild(tagElement);
    });
    
    content.appendChild(bubble);
    content.appendChild(tags);
    content.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    return messageDiv;
}

function populateChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    chatMessagesContainer.innerHTML = '';
    
    sampleMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        chatMessagesContainer.appendChild(messageElement);
    });
}

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

function initializeOptionButtons() {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Option clicked:', button.textContent);
        });
    });
}

function initializeSendButton() {
    const sendBtn = document.querySelector('.send-btn');
    const aiInput = document.querySelector('.ai-input');
    
    sendBtn.addEventListener('click', () => {
        const message = aiInput.value.trim();
        if (message) {
            console.log('Sending message:', message);
            aiInput.value = '';
        }
    });
    
    aiInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
}

function closeModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
    }
}

function openModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateChatMessages();
    initializeTabs();
    initializeOptionButtons();
    initializeSendButton();
    
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
});

window.TonaModal = {
    open: openModal,
    close: closeModal
}; 