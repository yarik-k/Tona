# Tona

Tona is a browser extension that provides AI-powered conversation analysis and personalized response suggestions. The extension extracts messages from active chats and sends them to two backend servers: an AI Assistant Server for real-time response suggestions and conversation advice, and a Statistics & Insights Server for metrics like energy balance, engagement levels, response patterns, conversation topics, and communication style insights. The extension displays a modal with three tabs: AI Assistant for interactive conversation help, Statistics for quantitative metrics, and Insights for personalized communication tips.

The system uses advanced prompt engineering to analyze communication patterns. It provides context-aware responses that match the user's natural communication in real-time.
This is a demo version showcased to work soley for Whatsapp Web. The system is currently being expanded into a sales communication tool for businesses which is functional for any web app.

---

## Screenshots

<img width="1920" height="1440" alt="details2_1" src="https://github.com/user-attachments/assets/5faf6a42-9302-49b6-b7eb-abda09bff10d" />
<img width="1920" height="1440" alt="details2_2" src="https://github.com/user-attachments/assets/08fb2f4f-8f90-4682-aa91-8f4f7268fa2a" />
<img width="1920" height="1440" alt="details2_3" src="https://github.com/user-attachments/assets/98a20a95-b98b-4506-9f89-5f75a5e03e9b" />
<img width="1920" height="1440" alt="details2_4" src="https://github.com/user-attachments/assets/46f02dee-4578-4369-b24a-85d60fe597ff" />
<img width="1920" height="1440" alt="details2_5" src="https://github.com/user-attachments/assets/45b1e66f-641d-44c0-84f6-32313e819f13" />

---

## Architecture

The project consists of three main components:

**Browser Extension** (`content.js`, `popup.js`, etc.)
   - Extracts chat messages from a web app
   - Provides the user interface with Statistics and Insights tabs
   - Communicates with both AI Assistant and Statistics servers

**AI Assistant Server** (`server/main.py`)
   - FastAPI-based backend for conversation analysis
   - Memory management with Redis
   - Provides response suggestions and basic analysis

**Statistics & Insights Server** (`server/stats_server.py`)
   - Dedicated server for statistics generation
   - LLM-powered analysis of conversation dynamics, patterns, and topics
   - Generates communication style insights and conversation tips
   - Provides detailed metrics for the Statistics and Insights dashboard tabs

## License

This project is licensed under the MIT License - see the LICENSE file for details.
