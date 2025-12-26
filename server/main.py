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

app = FastAPI(title="Tona LLM Assistant", version="1.0.0")

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
        db=0,
        decode_responses=True
    )
    redis_client.ping()
    logger.info("Redis connection established")
except Exception as e:
    logger.warning(f"Redis connection failed: {e}. Using in-memory storage.")

class ChatMessage(BaseModel):
    text: str
    timestamp: str
    isOutgoing: bool
    sender: str

class AnalysisRequest(BaseModel):
    chat_history: List[ChatMessage]
    user_query: str
    user_id: Optional[str] = "default"

class AnalysisResponse(BaseModel):
    response: str
    suggestions: List[str]
    conversation_summary: str
    user_tone_analysis: Dict[str, Any]

memory_storage = {}

def get_user_memory(user_id: str) -> List[Dict[str, Any]]:
    if redis_client:
        try:
            memory_data = redis_client.get(f"tona_user_{user_id}")
            if memory_data:
                return json.loads(memory_data)
        except Exception as e:
            logger.error(f"Error reading from Redis: {e}")
    
    return memory_storage.get(user_id, [])

def save_user_memory(user_id: str, memory: List[Dict[str, Any]]):
    if redis_client:
        try:
            redis_client.setex(
                f"tona_user_{user_id}",
                86400 * 30,  # 30 days expiration
                json.dumps(memory)
            )
        except Exception as e:
            logger.error(f"Error writing to Redis: {e}")
    
    memory_storage[user_id] = memory

def analyze_user_tone(messages: List[ChatMessage]) -> Dict[str, Any]:
    user_messages = [msg for msg in messages if msg.isOutgoing]
    
    if not user_messages:
        return {
            "formality_level": "medium",
            "response_length": "short",
            "emoji_usage": "low",
            "engagement_style": "reserved",
            "avg_message_length": 0,
            "question_rate": 0,
            "exclamation_rate": 0,
            "common_phrases": [],
            "writing_style": "neutral",
            "greeting_style": "standard",
            "response_patterns": [],
            "emotional_expression": "neutral",
            "conversation_initiative": "reactive",
            "punctuality_style": "standard",
            "abbreviation_usage": "low",
            "capitalization_style": "standard",
            "sentence_structure": "simple",
            "vocabulary_complexity": "medium",
            "cultural_references": "none",
            "humor_style": "none",
            "empathy_level": "medium",
            "assertiveness_level": "medium",
            "social_distance": "medium",
            "urgency_expression": "low",
            "agreement_style": "neutral",
            "disagreement_style": "neutral",
            "apology_style": "standard",
            "gratitude_style": "standard",
            "compliment_style": "standard",
            "boundary_setting": "medium"
        }
    
    user_text_samples = [msg.text for msg in user_messages[-20:]]
    conversation_context = "\n".join([f"Message {i+1}: {text}" for i, text in enumerate(user_text_samples)])
    
    tone_analysis_prompt = f"""You are an expert in communication analysis and psychology. Analyze the following WhatsApp messages from a user and provide a detailed assessment of their communication style, tone, and personality traits.

MESSAGES TO ANALYZE:
{conversation_context}

Please analyze the user's communication patterns and provide a JSON response with the following fields:

1. **Basic Communication Metrics:**
   - formality_level: "formal", "semi-formal", "casual", or "very casual"
   - response_length: "very short", "short", "medium", "long", or "very long"
   - emoji_usage: "none", "low", "medium", or "high"
   - avg_message_length: average words per message (number)
   - question_rate: percentage of messages with questions (0.0 to 1.0)
   - exclamation_rate: percentage of messages with exclamations (0.0 to 1.0)

2. **Communication Style:**
   - writing_style: "concise", "detailed", "conversational", "formal", "casual", "enthusiastic", "reserved", "inquisitive", "assertive", "empathetic", "humorous", or "professional"
   - greeting_style: "formal", "casual", "friendly", "professional", "enthusiastic", or "reserved"
   - engagement_style: "highly engaged", "engaged", "moderately engaged", "reserved", or "passive"
   - emotional_expression: "expressive", "moderate", "reserved", "neutral", or "minimal"
   - conversation_initiative: "proactive", "balanced", "reactive", or "passive"

3. **Language Patterns:**
   - abbreviation_usage: "none", "low", "medium", or "high"
   - capitalization_style: "standard", "all caps", "minimal caps", or "mixed"
   - sentence_structure: "simple", "complex", "mixed", or "fragmented"
   - vocabulary_complexity: "simple", "medium", "advanced", or "technical"
   - punctuality_style: "immediate", "quick", "standard", "slow", or "delayed"

4. **Social and Cultural Elements:**
   - cultural_references: "none", "few", "moderate", or "frequent"
   - humor_style: "none", "dry", "playful", "sarcastic", "self-deprecating", or "observational"
   - empathy_level: "high", "medium", "low", or "minimal"
   - assertiveness_level: "high", "medium", "low", or "passive"
   - social_distance: "close", "medium", "formal", or "distant"

5. **Communication Behaviors:**
   - urgency_expression: "high", "medium", "low", or "none"
   - agreement_style: "enthusiastic", "polite", "neutral", "reluctant", or "avoidant"
   - disagreement_style: "direct", "polite", "avoidant", "passive-aggressive", or "diplomatic"
   - apology_style: "immediate", "polite", "reluctant", "detailed", or "minimal"
   - gratitude_style: "enthusiastic", "polite", "minimal", "detailed", or "none"
   - compliment_style: "enthusiastic", "polite", "minimal", "detailed", or "none"
   - boundary_setting: "clear", "moderate", "unclear", or "none"

6. **Patterns and Phrases:**
   - common_phrases: array of 3-5 most frequently used phrases or expressions
   - response_patterns: array of communication patterns like "asks_questions", "uses_emojis", "gives_detailed_responses", "uses_abbreviations", "shows_empathy", "expresses_enthusiasm", "uses_humor", "shows_gratitude", "sets_boundaries", "expresses_urgency", "uses_formal_language", "shows_assertiveness", "uses_cultural_references", "expresses_agreement", "expresses_disagreement", "gives_compliments", "apologizes", "uses_casual_language", "shows_interest", "maintains_professionalism"

IMPORTANT GUIDELINES:
- Be objective and analytical, not judgmental
- Consider context and cultural factors
- Look for patterns across multiple messages
- Consider both explicit and implicit communication cues
- Account for WhatsApp-specific communication norms
- Focus on consistent patterns rather than isolated instances
- Consider the user's age, relationship context, and communication goals

Provide your analysis as a valid JSON object with ONLY the structured categories listed above. Do NOT include flat fields at the root level. Be precise and accurate in your assessments."""

    try:
        if not os.getenv("OPENAI_API_KEY"):
            return _fallback_tone_analysis(user_messages)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert communication analyst. Provide accurate, objective analysis of communication patterns in JSON format."},
                {"role": "user", "content": tone_analysis_prompt}
            ],
            max_tokens=1000,
            temperature=0.3  # lower temperature for more consistent analysis
        )
        
        llm_response = response.choices[0].message.content.strip()
        
        logger.info(f"Raw LLM tone analysis response: {llm_response[:500]}...")
        
        json_start = llm_response.find('{')
        json_end = llm_response.rfind('}') + 1
        
        if json_start != -1 and json_end > json_start:
            json_str = llm_response[json_start:json_end]
            raw_analysis = json.loads(json_str)
            
            logger.info(f"Parsed tone analysis structure: {list(raw_analysis.keys())}")
            logger.info(f"Has structured analysis: {any(key in raw_analysis for key in ['Basic Communication Metrics', 'Communication Style', 'Language Patterns', 'Social and Cultural Elements', 'Communication Behaviors', 'Patterns and Phrases'])}")
            
            tone_analysis = {}
            
            if "Basic Communication Metrics" in raw_analysis:
                metrics = raw_analysis["Basic Communication Metrics"]
                tone_analysis.update({
                    "formality_level": metrics.get("formality_level", "medium"),
                    "response_length": metrics.get("response_length", "short"),
                    "emoji_usage": metrics.get("emoji_usage", "low"),
                    "avg_message_length": metrics.get("avg_message_length", 0),
                    "question_rate": metrics.get("question_rate", 0),
                    "exclamation_rate": metrics.get("exclamation_rate", 0)
                })
            
            if "Communication Style" in raw_analysis:
                style = raw_analysis["Communication Style"]
                tone_analysis.update({
                    "writing_style": style.get("writing_style", "neutral"),
                    "greeting_style": style.get("greeting_style", "standard"),
                    "engagement_style": style.get("engagement_style", "reserved"),
                    "emotional_expression": style.get("emotional_expression", "neutral"),
                    "conversation_initiative": style.get("conversation_initiative", "reactive")
                })
            
            if "Language Patterns" in raw_analysis:
                patterns = raw_analysis["Language Patterns"]
                tone_analysis.update({
                    "abbreviation_usage": patterns.get("abbreviation_usage", "low"),
                    "capitalization_style": patterns.get("capitalization_style", "standard"),
                    "sentence_structure": patterns.get("sentence_structure", "simple"),
                    "vocabulary_complexity": patterns.get("vocabulary_complexity", "medium"),
                    "punctuality_style": patterns.get("punctuality_style", "standard")
                })
            
            if "Social and Cultural Elements" in raw_analysis:
                social = raw_analysis["Social and Cultural Elements"]
                tone_analysis.update({
                    "cultural_references": social.get("cultural_references", "none"),
                    "humor_style": social.get("humor_style", "none"),
                    "empathy_level": social.get("empathy_level", "medium"),
                    "assertiveness_level": social.get("assertiveness_level", "medium"),
                    "social_distance": social.get("social_distance", "medium")
                })
            
            if "Communication Behaviors" in raw_analysis:
                behaviors = raw_analysis["Communication Behaviors"]
                tone_analysis.update({
                    "urgency_expression": behaviors.get("urgency_expression", "low"),
                    "agreement_style": behaviors.get("agreement_style", "neutral"),
                    "disagreement_style": behaviors.get("disagreement_style", "neutral"),
                    "apology_style": behaviors.get("apology_style", "standard"),
                    "gratitude_style": behaviors.get("gratitude_style", "standard"),
                    "compliment_style": behaviors.get("compliment_style", "standard"),
                    "boundary_setting": behaviors.get("boundary_setting", "medium")
                })
            
            if "Patterns and Phrases" in raw_analysis:
                patterns = raw_analysis["Patterns and Phrases"]
                tone_analysis.update({
                    "common_phrases": patterns.get("common_phrases", []),
                    "response_patterns": patterns.get("response_patterns", [])
                })
            
            has_structured_analysis = any(key in raw_analysis for key in [
                "Basic Communication Metrics", "Communication Style", "Language Patterns",
                "Social and Cultural Elements", "Communication Behaviors", "Patterns and Phrases"
            ])
            
            if not has_structured_analysis:
                flat_fields = [
                    "formality_level", "response_length", "emoji_usage", "engagement_style",
                    "avg_message_length", "question_rate", "exclamation_rate", "common_phrases",
                    "writing_style", "greeting_style", "response_patterns", "emotional_expression",
                    "conversation_initiative", "punctuality_style", "abbreviation_usage",
                    "capitalization_style", "sentence_structure", "vocabulary_complexity",
                    "cultural_references", "humor_style", "empathy_level", "assertiveness_level",
                    "social_distance", "urgency_expression", "agreement_style", "disagreement_style",
                    "apology_style", "gratitude_style", "compliment_style", "boundary_setting"
                ]
                
                for field in flat_fields:
                    if field in raw_analysis:
                        tone_analysis[field] = raw_analysis[field]
            
            required_fields = {
                "formality_level": "medium",
                "response_length": "short",
                "emoji_usage": "low",
                "engagement_style": "reserved",
                "avg_message_length": 0,
                "question_rate": 0,
                "exclamation_rate": 0,
                "common_phrases": [],
                "writing_style": "neutral",
                "greeting_style": "standard",
                "response_patterns": [],
                "emotional_expression": "neutral",
                "conversation_initiative": "reactive",
                "punctuality_style": "standard",
                "abbreviation_usage": "low",
                "capitalization_style": "standard",
                "sentence_structure": "simple",
                "vocabulary_complexity": "medium",
                "cultural_references": "none",
                "humor_style": "none",
                "empathy_level": "medium",
                "assertiveness_level": "medium",
                "social_distance": "medium",
                "urgency_expression": "low",
                "agreement_style": "neutral",
                "disagreement_style": "neutral",
                "apology_style": "standard",
                "gratitude_style": "standard",
                "compliment_style": "standard",
                "boundary_setting": "medium"
            }
            
            for field, default_value in required_fields.items():
                if field not in tone_analysis:
                    tone_analysis[field] = default_value
            
            logger.info(f"Final tone analysis keys: {list(tone_analysis.keys())}")
            logger.info(f"Formality level: {tone_analysis.get('formality_level', 'N/A')}")
            logger.info(f"Emoji usage: {tone_analysis.get('emoji_usage', 'N/A')}")
            
            return tone_analysis
            
        else:
            logger.warning("Could not parse JSON from LLM response, using fallback")
            return _fallback_tone_analysis(user_messages)
            
    except Exception as e:
        logger.error(f"Error in LLM tone analysis: {e}")
        return _fallback_tone_analysis(user_messages)

def _fallback_tone_analysis(user_messages: List[ChatMessage]) -> Dict[str, Any]:
    avg_length = sum(len(msg.text.split()) for msg in user_messages) / len(user_messages)
    emoji_count = sum(1 for msg in user_messages if any(char in msg.text for char in "😀😃😄😁😆😅😂🤣😊😇"))
    question_count = sum(1 for msg in user_messages if "?" in msg.text)
    exclamation_count = sum(1 for msg in user_messages if "!" in msg.text)
    
    all_user_text = " ".join([msg.text.lower() for msg in user_messages])
    formal_words = ["indeed", "furthermore", "consequently", "therefore", "thus", "hence", "moreover"]
    casual_words = ["yeah", "cool", "awesome", "gonna", "wanna", "gotta", "hey", "hi", "yo"]
    
    formal_word_count = sum(1 for word in formal_words if word in all_user_text)
    casual_word_count = sum(1 for word in casual_words if word in all_user_text)
    
    formality_level = "formal" if formal_word_count > casual_word_count else "casual" if casual_word_count > formal_word_count else "medium"
    response_length = "long" if avg_length > 12 else "short" if avg_length < 5 else "medium"
    emoji_usage = "high" if emoji_count > len(user_messages) * 0.3 else "low" if emoji_count < len(user_messages) * 0.1 else "medium"
    engagement_style = "reserved" if question_count < len(user_messages) * 0.2 else "engaged"
    
    return {
        "formality_level": formality_level,
        "response_length": response_length,
        "emoji_usage": emoji_usage,
        "engagement_style": engagement_style,
        "avg_message_length": round(avg_length, 1),
        "question_rate": round(question_count / len(user_messages), 2),
        "exclamation_rate": round(exclamation_count / len(user_messages), 2),
        "common_phrases": [],
        "writing_style": "neutral",
        "greeting_style": "standard",
        "response_patterns": [],
        "emotional_expression": "neutral",
        "conversation_initiative": "reactive",
        "punctuality_style": "standard",
        "abbreviation_usage": "low",
        "capitalization_style": "standard",
        "sentence_structure": "simple",
        "vocabulary_complexity": "medium",
        "cultural_references": "none",
        "humor_style": "none",
        "empathy_level": "medium",
        "assertiveness_level": "medium",
        "social_distance": "medium",
        "urgency_expression": "low",
        "agreement_style": "neutral",
        "disagreement_style": "neutral",
        "apology_style": "standard",
        "gratitude_style": "standard",
        "compliment_style": "standard",
        "boundary_setting": "medium"
    }

def generate_chat_summary(messages: List[ChatMessage]) -> str:
    if not messages:
        return "No conversation history available."
    
    recent_messages = messages[-15:]

    user_messages = [msg for msg in recent_messages if msg.isOutgoing]
    other_messages = [msg for msg in recent_messages if not msg.isOutgoing]
    
    all_text = " ".join([msg.text.lower() for msg in recent_messages])
    topics = []
    
    if any(word in all_text for word in ["work", "job", "project", "deadline"]):
        topics.append("work")
    if any(word in all_text for word in ["weekend", "plan", "meet", "dinner", "lunch"]):
        topics.append("social plans")
    if any(word in all_text for word in ["game", "sport", "match", "team"]):
        topics.append("sports")
    if any(word in all_text for word in ["family", "home", "house"]):
        topics.append("personal life")
    
    summary = f"Recent conversation with {len(other_messages)} messages from them and {len(user_messages)} from you. "
    if topics:
        summary += f"Topics discussed: {', '.join(topics)}. "
    
    if len(user_messages) > len(other_messages) * 0.8:
        summary += "You've been quite engaged in the conversation."
    elif len(user_messages) < len(other_messages) * 0.3:
        summary += "You've been relatively quiet in this conversation."
    else:
        summary += "You've maintained a balanced conversation flow."
    
    return summary

def create_llm_prompt(messages: List[ChatMessage], user_query: str, user_tone: Dict[str, Any], conversation_summary: str) -> str:
    conversation_text = ""
    for msg in messages[-20:]:
        sender = "You" if msg.isOutgoing else "Them"
        conversation_text += f"{sender}: {msg.text}\n"
    
    tone_change_keywords = [
        'cool', 'casual', 'formal', 'professional', 'friendly', 'enthusiastic',
        'serious', 'funny', 'playful', 'romantic', 'flirty', 'business',
        'tone', 'style', 'sound', 'make it', 'change', 'different'
    ]
    
    is_tone_request = any(keyword in user_query.lower() for keyword in tone_change_keywords)
    
    if is_tone_request:
        tone_instructions = f"""
IMPORTANT: The user is requesting a specific tone/style change. Adapt your suggestions to match their request.

User's request: "{user_query}"

Base communication style analysis:
- Formality level: {user_tone.get('formality_level', 'medium')}
- Response length: {user_tone.get('response_length', 'short')}
- Emoji usage: {user_tone.get('emoji_usage', 'low')}
- Writing style: {user_tone.get('writing_style', 'balanced')}
- Emotional expression: {user_tone.get('emotional_expression', 'neutral')}
- Empathy level: {user_tone.get('empathy_level', 'medium')}
- Assertiveness level: {user_tone.get('assertiveness_level', 'medium')}
- Humor style: {user_tone.get('humor_style', 'none')}
- Social distance: {user_tone.get('social_distance', 'medium')}

ADAPTIVE INSTRUCTIONS:
- Prioritize the user's tone/style request over their historical patterns
- Generate suggestions that match the requested tone/style
- Keep suggestions authentic and natural
- If they want to sound "cool", make suggestions more casual and confident
- If they want to sound "formal", make suggestions more professional
- If they want to sound "friendly", make suggestions warm and approachable
- If they want to sound "enthusiastic", add more energy and exclamations
- If they want to sound "playful", add humor and lightheartedness
- If they want to sound "empathetic", show more understanding and care
- If they want to sound "assertive", be more direct and confident
- Overall, adapt the suggestions to the user's requests as much as possible.
"""
    else:
        tone_instructions = f"""
Based on the user's comprehensive communication style analysis:

COMMUNICATION METRICS:
- Formality level: {user_tone.get('formality_level', 'medium')}
- Response length: {user_tone.get('response_length', 'short')}
- Emoji usage: {user_tone.get('emoji_usage', 'low')}
- Average message length: {user_tone.get('avg_message_length', 0)} words
- Question rate: {user_tone.get('question_rate', 0)}
- Exclamation rate: {user_tone.get('exclamation_rate', 0)}

COMMUNICATION STYLE:
- Writing style: {user_tone.get('writing_style', 'balanced')}
- Greeting style: {user_tone.get('greeting_style', 'standard')}
- Engagement style: {user_tone.get('engagement_style', 'reserved')}
- Emotional expression: {user_tone.get('emotional_expression', 'neutral')}
- Conversation initiative: {user_tone.get('conversation_initiative', 'reactive')}

LANGUAGE PATTERNS:
- Abbreviation usage: {user_tone.get('abbreviation_usage', 'low')}
- Capitalization style: {user_tone.get('capitalization_style', 'standard')}
- Sentence structure: {user_tone.get('sentence_structure', 'simple')}
- Vocabulary complexity: {user_tone.get('vocabulary_complexity', 'medium')}
- Punctuality style: {user_tone.get('punctuality_style', 'standard')}

SOCIAL AND BEHAVIORAL TRAITS:
- Empathy level: {user_tone.get('empathy_level', 'medium')}
- Assertiveness level: {user_tone.get('assertiveness_level', 'medium')}
- Social distance: {user_tone.get('social_distance', 'medium')}
- Humor style: {user_tone.get('humor_style', 'none')}
- Cultural references: {user_tone.get('cultural_references', 'none')}

COMMUNICATION BEHAVIORS:
- Urgency expression: {user_tone.get('urgency_expression', 'low')}
- Agreement style: {user_tone.get('agreement_style', 'neutral')}
- Disagreement style: {user_tone.get('disagreement_style', 'neutral')}
- Apology style: {user_tone.get('apology_style', 'standard')}
- Gratitude style: {user_tone.get('gratitude_style', 'standard')}
- Compliment style: {user_tone.get('compliment_style', 'standard')}
- Boundary setting: {user_tone.get('boundary_setting', 'medium')}

PATTERNS AND PHRASES:
- Common phrases: {', '.join(user_tone.get('common_phrases', []))}
- Response patterns: {', '.join(user_tone.get('response_patterns', []))}

GENERATE SUGGESTIONS THAT MATCH THE USER'S STYLE:
- Use their preferred greeting style ({user_tone.get('greeting_style', 'standard')})
- Match their response length ({user_tone.get('response_length', 'short')})
- Include emojis if they use them frequently ({user_tone.get('emoji_usage', 'low')})
- Use their formality level ({user_tone.get('formality_level', 'medium')})
- Match their emotional expression ({user_tone.get('emotional_expression', 'neutral')})
- Use their empathy level ({user_tone.get('empathy_level', 'medium')})
- Match their assertiveness level ({user_tone.get('assertiveness_level', 'medium')})
- Incorporate their humor style ({user_tone.get('humor_style', 'none')})
- Use their vocabulary complexity ({user_tone.get('vocabulary_complexity', 'medium')})
- Match their sentence structure ({user_tone.get('sentence_structure', 'simple')})
- Use their abbreviation style ({user_tone.get('abbreviation_usage', 'low')})
- Incorporate their common phrases and patterns
- Match their question/exclamation frequency
- Use their writing style ({user_tone.get('writing_style', 'balanced')})
- Consider their social distance preferences ({user_tone.get('social_distance', 'medium')})
- Match their urgency expression ({user_tone.get('urgency_expression', 'low')})
- Use their agreement/disagreement styles
- Incorporate their cultural references if any ({user_tone.get('cultural_references', 'none')})

The suggestions should sound like they were written by the user themselves, matching their unique communication fingerprint.
"""
    
    prompt = f"""You are Tona, an AI assistant that helps users improve their WhatsApp conversations. You have access to a chat history and should provide helpful, personalized advice.

CONVERSATION SUMMARY:
{conversation_summary}

USER'S COMMUNICATION STYLE:
{tone_instructions}

RECENT CONVERSATION:
{conversation_text}

USER'S QUESTION: {user_query}

Please provide a helpful response to their question about the conversation. Focus on giving actionable advice and specific suggestions for how they could respond to the other person in their WhatsApp chat.

Your response should be conversational and helpful, not in JSON format. 

IMPORTANT: 
- Provide analysis and advice in the main response text (not numbered suggestions)
- Include 3-4 specific response suggestions that can be copied and pasted directly into WhatsApp
- Format suggestions as clear, actionable responses without quotes or numbering
- Avoid analysis text like "This shows..." or "This indicates..." in the suggestions
- Don't repeat the same text in both the response and suggestions
- The main response should be analysis/advice, not numbered suggestions
- ADAPT TO USER REQUESTS: If the user asks for a specific tone or style, prioritize their request over historical patterns

Remember: The suggestions you provide are meant to be copied and pasted into their WhatsApp conversation with the other person. They should sound like the user wrote them themselves."""
    
    return prompt

@app.post("/analyze_chat", response_model=AnalysisResponse)
async def analyze_chat(request: AnalysisRequest):
    
    try:
        user_memory = get_user_memory(request.user_id)
        
        user_tone = analyze_user_tone(request.chat_history)
        
        conversation_summary = generate_chat_summary(request.chat_history)

        prompt = create_llm_prompt(
            request.chat_history,
            request.user_query,
            user_tone,
            conversation_summary
        )
        
        if not os.getenv("OPENAI_API_KEY"):
            return AnalysisResponse(
                response="I can see you're having a WhatsApp conversation! To get personalized advice, please set up the OpenAI API key in the server configuration.\n\nBased on what I can see, here are some general tips for your conversation:\n\n• Ask follow-up questions to show interest\n• Share your own experiences when relevant\n• Use emojis to match their energy level\n• Be genuine and authentic in your responses",
                suggestions=[
                    "That sounds great! What time were you thinking?",
                    "I'd love to join you! Who else is coming?",
                    "Thanks for thinking of me! I'll try to make it work.",
                    "That's really interesting! Tell me more about that."
                ],
                conversation_summary=conversation_summary,
                user_tone_analysis=user_tone
            )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are Tona, a helpful AI assistant that provides conversation advice for WhatsApp chats. Respond conversationally and naturally, not in JSON format."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,
            temperature=0.7
        )
        
        llm_text = response.choices[0].message.content
        
        suggestions = []
        lines = llm_text.split('\n')
        in_suggestions_section = False
        
        for line in lines:
            line = line.strip()
            
            if any(keyword in line.lower() for keyword in ['suggestions:', 'responses:', 'options:', 'you could say:', 'try saying:']):
                in_suggestions_section = True
                continue
                
            if (in_suggestions_section or line.startswith('•') or line.startswith('-') or line.startswith('*') or 
                line.startswith('"') or line.startswith("'") or
                (len(line) > 10 and len(line) < 200 and not line.startswith('You') and not line.startswith('Them'))):
                
                clean_suggestion = line.lstrip('•-*"\' ')
                clean_suggestion = re.sub(r'^\d+\.\s*', '', clean_suggestion)
                clean_suggestion = clean_suggestion.strip('"\'')
                
                if (clean_suggestion and len(clean_suggestion) > 5 and 
                    not any(analysis_word in clean_suggestion.lower() for analysis_word in 
                    ['analysis', 'insight', 'observation', 'assessment', 'evaluation', 'conclusion', 'summary', 
                     'here are', 'here is', 'some good', 'good responses', 'you could send', 'feel free', 'choose one',
                     'pick one', 'mix and match', 'options', 'suggestions', 'responses', 'fits your style', 'that fits',
                     'based on', 'consider', 'might want', 'could try', 'you can', 'this shows', 'this indicates'])):
                    suggestions.append(clean_suggestion)
        
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion not in seen:
                seen.add(suggestion)
                unique_suggestions.append(suggestion)
        
        suggestions = unique_suggestions
        
        if not suggestions:
            suggestions = [
                "That sounds great!",
                "I'd love to join you",
                "What time were you thinking?",
                "Thanks for thinking of me!"
            ]
        
        suggestions = [s for s in suggestions[:4] if s and len(s) > 5 and len(s) < 200]
        
        while len(suggestions) < 3:
            suggestions.append("That sounds interesting! Tell me more.")
        
        cleaned_response = llm_text
        
        endings_to_remove = [
            "Feel free to choose one that fits your style!",
            "Feel free to pick one or mix and match!",
            "Choose one that feels right for you!",
            "Pick one that feels right for you!",
            "Feel free to choose one!",
            "Choose one that fits your style!",
            "Feel free to choose any of these or adjust them slightly to match your tone!",
            "Feel free to choose any of these!",
            "Choose any of these or adjust them slightly to match your tone!",
            "Choose one that feels right for the conversation!",
            "Choose one that feels right!",
            "These keep the vibe casual and enthusiastic, just like your style!",
            "These suggestions match your style perfectly!",
            "These options fit your communication style!",
            "These suggestions align with your tone!"
        ]
        
        for ending in endings_to_remove:
            cleaned_response = cleaned_response.replace(ending, "")
        
        lines = cleaned_response.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if not any(skip_phrase in line.lower() for skip_phrase in [
                'suggestions:', 'responses:', 'options:', 'you could say:', 'try saying:',
                'here are a few', 'here are some', 'feel free to', 'choose one', 'pick one'
            ]) and not any(suggestion.strip() in line for suggestion in suggestions):
                cleaned_lines.append(line)
        
        cleaned_response = '\n'.join(cleaned_lines)
        cleaned_response = re.sub(r'\n\s*\n', '\n', cleaned_response)
        cleaned_response = cleaned_response.strip()
        
        if not cleaned_response.strip():
            cleaned_response = "Based on your conversation style, here are some good response options."
        
        cleaned_response = cleaned_response.strip()
        
        llm_response = {
            "response": cleaned_response,
            "suggestions": suggestions
        }
        
        memory_entry = {
            "timestamp": datetime.now().isoformat(),
            "query": request.user_query,
            "response": llm_response,
            "user_tone": user_tone,
            "conversation_summary": conversation_summary
        }
        
        user_memory.append(memory_entry)
        if len(user_memory) > 50:
            user_memory = user_memory[-50:]
        
        save_user_memory(request.user_id, user_memory)
        
        return AnalysisResponse(
            response=llm_response.get("response", "I'm here to help with your WhatsApp conversation! Ask me anything about how to respond or improve your communication."),
            suggestions=llm_response.get("suggestions", ["That sounds great!", "I'd love to join you!", "Thanks for thinking of me!", "Tell me more about that!"]),
            conversation_summary=conversation_summary,
            user_tone_analysis=user_tone
        )
        
    except Exception as e:
        logger.error(f"Error in analyze_chat: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/user_memory/{user_id}")
async def get_memory(user_id: str):
    memory = get_user_memory(user_id)
    return {"user_id": user_id, "memory_entries": len(memory), "memory": memory}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 