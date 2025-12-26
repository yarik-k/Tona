from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import openai
import os
import json
import redis
import re
from datetime import datetime
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Tona Statistics & Insights Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OPENAI_API_KEY not found in environment variables")

redis_client = None
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        db=1,
        decode_responses=True
    )
    redis_client.ping()
    logger.info("Redis connection established for stats server")
except Exception as e:
    logger.warning(f"Redis connection failed: {e}. Using in-memory storage.")
class ChatMessage(BaseModel):
    text: str
    timestamp: str
    isOutgoing: bool
    sender: str

class StatsRequest(BaseModel):
    chat_history: List[ChatMessage]
    user_id: Optional[str] = "default"

class ConversationDynamics(BaseModel):
    energy_balance: str  # "Low", "Medium", "High"
    engagement_level: str  # "Low", "Medium", "High"

class ResponsePatterns(BaseModel):
    avg_response_time: str  # "2m", "5m", "10m", etc.
    words_per_message: int
    question_rate: str  # "15%", "20%", etc.
    emoji_usage: str  # "Low", "Medium", "High"

class ConversationTopics(BaseModel):
    topics: List[Dict[str, str]]  # [{"topic": "Sports", "percentage": "45%"}, ...]

class CommunicationStyle(BaseModel):
    style_points: List[str]

class ConversationTips(BaseModel):
    tips: List[str]

class StatsResponse(BaseModel):
    conversation_dynamics: ConversationDynamics
    response_patterns: ResponsePatterns
    conversation_topics: ConversationTopics
    communication_style: CommunicationStyle
    conversation_tips: ConversationTips

stats_memory_storage = {}

def get_user_stats_memory(user_id: str) -> List[Dict[str, Any]]:
    if redis_client:
        try:
            memory_data = redis_client.get(f"tona_stats_{user_id}")
            if memory_data:
                return json.loads(memory_data)
        except Exception as e:
            logger.error(f"Error reading from Redis: {e}")
    
    return stats_memory_storage.get(user_id, [])

def save_user_stats_memory(user_id: str, memory: List[Dict[str, Any]]):
    if redis_client:
        try:
            redis_client.setex(
                f"tona_stats_{user_id}",
                86400 * 30,  # 30 days expiration
                json.dumps(memory)
            )
        except Exception as e:
            logger.error(f"Error writing to Redis: {e}")
    
    stats_memory_storage[user_id] = memory

def analyze_conversation_metrics(messages: List[ChatMessage]) -> Dict[str, Any]:
    if not messages:
        return {
            "total_messages": 0,
            "user_messages": 0,
            "other_messages": 0,
            "conversation_text": ""
        }
    
    user_messages = [msg for msg in messages if msg.isOutgoing]
    other_messages = [msg for msg in messages if not msg.isOutgoing]
    
    conversation_text = ""
    for msg in messages[-50:]:
        sender = "You" if msg.isOutgoing else "Them"
        conversation_text += f"{sender}: {msg.text}\n"
    
    return {
        "total_messages": len(messages),
        "user_messages": len(user_messages),
        "other_messages": len(other_messages),
        "conversation_text": conversation_text
    }

def create_stats_prompt(messages: List[ChatMessage], metrics: Dict[str, Any]) -> str:
    
    conversation_text = metrics.get('conversation_text', '')
    total_messages = metrics.get('total_messages', 0)
    user_messages = metrics.get('user_messages', 0)
    other_messages = metrics.get('other_messages', 0)
    
    prompt = f"""You are Tona, an expert AI assistant that analyzes WhatsApp conversations and provides comprehensive insights. Your task is to analyze the conversation below and generate detailed statistics and insights.

CONVERSATION DATA:
- Total Messages: {total_messages}
- Your Messages: {user_messages}
- Their Messages: {other_messages}

CONVERSATION HISTORY:
{conversation_text}

ANALYSIS INSTRUCTIONS:

1. CONVERSATION DYNAMICS:
   Analyze the overall energy and engagement level of the conversation:
   - energy_balance: Determine "Low", "Medium", or "High" based on:
     * Exclamation marks and enthusiasm indicators
     * Emoji usage frequency and variety
     * Overall tone and excitement level
     * Use of positive language and expressions
   
   - engagement_level: Determine "Low", "Medium", or "High" based on:
     * Response frequency and timing
     * Question asking patterns
     * Active participation vs passive responses
     * Interest shown in the other person's messages

2. RESPONSE PATTERNS:
   Analyze the communication patterns in detail:
   - avg_response_time: Estimate based on conversation flow, message timing, and response patterns (e.g., "2m", "5m", "10m", "15m")
   - words_per_message: Calculate average words per message from the user's messages
   - question_rate: Calculate percentage of user messages that contain questions
   - emoji_usage: Determine "Low", "Medium", or "High" based on emoji frequency in user messages

3. CONVERSATION TOPICS:
   Identify the main topics discussed and their relative importance:
   - Analyze all messages for topic keywords and themes
   - Calculate percentage distribution of topics
   - Include 3-4 most prominent topics
   - Topics can include: Sports, Work/Life Balance, Social Plans, Personal Life, Technology, Travel, Entertainment, Food, Family, etc.

4. THEIR COMMUNICATION STYLE:
   Analyze the other person's communication patterns and provide 5-6 specific insights:
   - Look for patterns in their messaging style
   - Identify their tone, formality level, and engagement style
   - Note how they initiate conversations and respond
   - Consider their use of emojis, questions, and expressions
   - Examples: "Uses enthusiasm to engage (exclamation marks)", "Shows genuine concern for your wellbeing", "Initiates social activities"

5. GENERAL CONVERSATION TIPS:
   Provide 5-6 actionable, specific tips based on the conversation analysis:
   - Tips should be personalized to this specific conversation
   - Focus on improving engagement and connection
   - Consider the other person's communication style
   - Make tips practical and implementable
   - Examples: "Match their energy - they're enthusiastic!", "Ask follow-up questions to show interest"

IMPORTANT ANALYSIS GUIDELINES:
- Be thorough and analytical in your assessment
- Consider context, tone, and relationship dynamics
- Look for patterns across the entire conversation
- Provide specific, actionable insights
- Ensure all percentages and metrics are realistic and well-calculated
- Make the analysis feel personalized and relevant

Return ONLY valid JSON with this exact structure:
{{
  "conversation_dynamics": {{
    "energy_balance": "Low/Medium/High",
    "engagement_level": "Low/Medium/High"
  }},
  "response_patterns": {{
    "avg_response_time": "Xm",
    "words_per_message": X,
    "question_rate": "X%",
    "emoji_usage": "Low/Medium/High"
  }},
  "conversation_topics": {{
    "topics": [
      {{"topic": "Topic Name", "percentage": "X%"}}
    ]
  }},
  "communication_style": {{
    "style_points": [
      "Point 1",
      "Point 2",
      "Point 3",
      "Point 4",
      "Point 5"
    ]
  }},
  "conversation_tips": {{
    "tips": [
      "Tip 1",
      "Tip 2",
      "Tip 3",
      "Tip 4",
      "Tip 5"
    ]
  }}
}}"""
    
    return prompt

@app.post("/generate_stats", response_model=StatsResponse)
async def generate_stats(request: StatsRequest):
    try:
        user_memory = get_user_stats_memory(request.user_id)
        metrics = analyze_conversation_metrics(request.chat_history)
        prompt = create_stats_prompt(request.chat_history, metrics)
        
        if not os.getenv("OPENAI_API_KEY"):
            return StatsResponse(
                conversation_dynamics=ConversationDynamics(
                    energy_balance="Medium",
                    engagement_level="Medium"
                ),
                response_patterns=ResponsePatterns(
                    avg_response_time="5m",
                    words_per_message=8,
                    question_rate="20%",
                    emoji_usage="Medium"
                ),
                conversation_topics=ConversationTopics(
                    topics=[{"topic": "General Conversation", "percentage": "100%"}]
                ),
                communication_style=CommunicationStyle(
                    style_points=[
                        "Shows interest in conversation",
                        "Responds to messages",
                        "Maintains conversation flow",
                        "Uses appropriate tone",
                        "Engages in dialogue"
                    ]
                ),
                conversation_tips=ConversationTips(
                    tips=[
                        "Ask follow-up questions to show interest",
                        "Share your own experiences when relevant",
                        "Use emojis to match their energy level",
                        "Be genuine and authentic in your responses",
                        "Show appreciation for their messages"
                    ]
                )
            )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are Tona, an AI assistant that analyzes WhatsApp conversations and provides insights. Return only valid JSON in the exact format requested."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        try:
            llm_response = json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON response from LLM")
            return StatsResponse(
                conversation_dynamics=ConversationDynamics(
                    energy_balance="Medium",
                    engagement_level="Medium"
                ),
                response_patterns=ResponsePatterns(
                    avg_response_time="5m",
                    words_per_message=8,
                    question_rate="20%",
                    emoji_usage="Medium"
                ),
                conversation_topics=ConversationTopics(
                    topics=[{"topic": "General Conversation", "percentage": "100%"}]
                ),
                communication_style=CommunicationStyle(
                    style_points=[
                        "Shows interest in conversation",
                        "Responds to messages",
                        "Maintains conversation flow",
                        "Uses appropriate tone",
                        "Engages in dialogue"
                    ]
                ),
                conversation_tips=ConversationTips(
                    tips=[
                        "Ask follow-up questions to show interest",
                        "Share your own experiences when relevant",
                        "Use emojis to match their energy level",
                        "Be genuine and authentic in your responses",
                        "Show appreciation for their messages"
                    ]
                )
            )
        
        stats_response = StatsResponse(
            conversation_dynamics=ConversationDynamics(
                energy_balance=llm_response.get("conversation_dynamics", {}).get("energy_balance", "Medium"),
                engagement_level=llm_response.get("conversation_dynamics", {}).get("engagement_level", "Medium")
            ),
            response_patterns=ResponsePatterns(
                avg_response_time=llm_response.get("response_patterns", {}).get("avg_response_time", "5m"),
                words_per_message=llm_response.get("response_patterns", {}).get("words_per_message", 8),
                question_rate=llm_response.get("response_patterns", {}).get("question_rate", "20%"),
                emoji_usage=llm_response.get("response_patterns", {}).get("emoji_usage", "Medium")
            ),
            conversation_topics=ConversationTopics(
                topics=llm_response.get("conversation_topics", {}).get("topics", [{"topic": "General Conversation", "percentage": "100%"}])
            ),
            communication_style=CommunicationStyle(
                style_points=llm_response.get("communication_style", {}).get("style_points", [
                    "Shows interest in conversation",
                    "Responds to messages",
                    "Maintains conversation flow",
                    "Uses appropriate tone",
                    "Engages in dialogue"
                ])
            ),
            conversation_tips=ConversationTips(
                tips=llm_response.get("conversation_tips", {}).get("tips", [
                    "Ask follow-up questions to show interest",
                    "Share your own experiences when relevant",
                    "Use emojis to match their energy level",
                    "Be genuine and authentic in your responses",
                    "Show appreciation for their messages"
                ])
            )
        )
        
        memory_entry = {
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics,
            "response": llm_response,
            "chat_history_length": len(request.chat_history)
        }
        
        user_memory.append(memory_entry)
        if len(user_memory) > 20:
            user_memory = user_memory[-20:]
        
        save_user_stats_memory(request.user_id, user_memory)
        
        return stats_response
        
    except Exception as e:
        logger.error(f"Error in generate_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Statistics generation failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/user_stats_memory/{user_id}")
async def get_stats_memory(user_id: str):
    memory = get_user_stats_memory(user_id)
    return {"user_id": user_id, "memory_entries": len(memory), "memory": memory}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 