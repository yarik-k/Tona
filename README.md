# Tona

Tona is a browser extension that provides AI-powered conversation analysis and personalized response suggestions. The extension extracts messages from active chats and sends them to two backend servers: an AI Assistant Server for real-time response suggestions and conversation advice, and a Statistics & Insights Server for metrics like energy balance, engagement levels, response patterns, conversation topics, and communication style insights. The extension displays a modal with three tabs—AI Assistant for interactive conversation help, Statistics for quantitative metrics, and Insights for personalized communication tips.

The system uses advanced prompt engineering to analyze communication patterns. It provides context-aware responses that match the user's natural communication in real-time.
This is a demo version and is currently being expanded into a sales communication tool for businesses.

---

## Screenshots



---

## Architecture

The project consists of three main components:

1. **Browser Extension** (`content.js`, `popup.js`, etc.)
   - Extracts chat messages from WhatsApp Web
   - Provides the user interface with Statistics and Insights tabs
   - Communicates with both AI Assistant and Statistics servers

2. **AI Assistant Server** (`server/main.py` - Port 8000)
   - FastAPI-based backend for conversation analysis
   - Memory management with Redis
   - Provides response suggestions and basic analysis

3. **Statistics & Insights Server** (`server/stats_server.py` - Port 8001)
   - Dedicated server for comprehensive statistics generation
   - LLM-powered analysis of conversation dynamics, patterns, and topics
   - Generates communication style insights and conversation tips
   - Provides detailed metrics for the Statistics and Insights dashboard tabs

## Setup Instructions

### 1. Browser Extension Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Tona
   ```

2. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the Tona directory

3. **Navigate to WhatsApp Web**:
   - Go to [web.whatsapp.com](https://web.whatsapp.com)
   - Log in to your WhatsApp account

### 2. Server Setup

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Start both servers** (Recommended):
   ```bash
   python3 start_servers.py
   ```
   
   Or start servers individually:
   ```bash
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Set up environment
   cp env.example .env
   # Edit .env and add your OpenAI API key
   
   # Start AI Assistant Server (Port 8000)
   python3 main.py
   
   # Start Statistics & Insights Server (Port 8001) - in another terminal
   python3 stats_server.py
   ```

3. **Configure OpenAI API**:
   - Get an API key from [OpenAI](https://platform.openai.com/api-keys)
   - Add it to the `.env` file:
     ```
     OPENAI_API_KEY=your_api_key_here
     ```

### 3. Optional Redis Setup (for persistent memory)

For better performance and persistent memory:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally (Ubuntu/Debian)
sudo apt-get install redis-server
```

## Usage

1. **Open WhatsApp Web** and navigate to any conversation
2. **Click the Tona button** in the top-right corner
3. **Ask questions** like:
   - "What's the best way to respond?"
   - "How can I be more engaging?"
   - "What topics should I bring up?"
4. **Get personalized suggestions** that match your communication style
5. **Copy suggestions** with one click and paste them into WhatsApp

## API Endpoints

### POST `/analyze_chat`
Main endpoint for chat analysis and suggestions.

**Request**:
```json
{
  "chat_history": [
    {
      "text": "Hello!",
      "timestamp": "2:30 PM",
      "isOutgoing": false,
      "sender": "Alex"
    }
  ],
  "user_query": "What's the best way to respond?",
  "user_id": "user123"
}
```

**Response**:
```json
{
  "response": "Based on the conversation...",
  "suggestions": [
    "That sounds great!",
    "I'd love to join you",
    "What time were you thinking?"
  ],
  "conversation_summary": "Recent conversation with...",
  "user_tone_analysis": {
    "formality_level": "casual",
    "response_length": "short",
    "emoji_usage": "medium",
    "engagement_style": "engaged"
  }
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `REDIS_HOST`: Redis host (optional, defaults to localhost)
- `REDIS_PORT`: Redis port (optional, defaults to 6379)

### Server Configuration

The server runs on `http://localhost:8000` by default. You can change this in the `start.sh` script or by modifying the uvicorn command.

## Development

### Project Structure
```
Tona/
├── content.js          # Main extension logic
├── popup.js           # Extension popup
├── modal.js           # Modal interface
├── manifest.json      # Extension manifest
├── server/            # LLM server
│   ├── main.py        # FastAPI server
│   ├── requirements.txt
│   ├── start.sh       # Startup script
│   └── README.md      # Server documentation
└── README.md          # This file
```

### Adding New Features

1. **Extension Features**: Modify `content.js` for new UI elements
2. **Server Features**: Add new endpoints in `server/main.py`
3. **AI Analysis**: Enhance the prompt engineering in the server

## Troubleshooting

### Common Issues

1. **Extension not loading**:
   - Check that Developer mode is enabled in Chrome
   - Ensure all files are in the correct directory

2. **Server connection errors**:
   - Verify the server is running on port 8000
   - Check that CORS is properly configured
   - Ensure your OpenAI API key is valid

3. **No chat messages detected**:
   - Make sure you're on WhatsApp Web
   - Try refreshing the page
   - Check the browser console for errors

### Debug Mode

Enable debug logging by opening the browser console and looking for "Tona:" prefixed messages.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the server logs for errors
- Ensure all dependencies are properly installed 