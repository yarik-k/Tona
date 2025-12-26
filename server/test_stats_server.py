import requests
import json
from datetime import datetime

test_chat_history = [
    {
        "text": "Hey! How's your day going? 😊",
        "timestamp": "2024-01-15T10:00:00Z",
        "isOutgoing": False,
        "sender": "them"
    },
    {
        "text": "Pretty good! Just finished a workout. How about you?",
        "timestamp": "2024-01-15T10:05:00Z",
        "isOutgoing": True,
        "sender": "you"
    },
    {
        "text": "That's awesome! I love working out too! 💪 What kind of workout did you do?",
        "timestamp": "2024-01-15T10:07:00Z",
        "isOutgoing": False,
        "sender": "them"
    },
    {
        "text": "Just some cardio and weights. Trying to stay in shape!",
        "timestamp": "2024-01-15T10:10:00Z",
        "isOutgoing": True,
        "sender": "you"
    },
    {
        "text": "That's great! We should go for a run together sometime! 🏃‍♀️",
        "timestamp": "2024-01-15T10:12:00Z",
        "isOutgoing": False,
        "sender": "them"
    },
    {
        "text": "Sounds fun! When are you free?",
        "timestamp": "2024-01-15T10:15:00Z",
        "isOutgoing": True,
        "sender": "you"
    },
    {
        "text": "How about this weekend? Maybe Saturday morning?",
        "timestamp": "2024-01-15T10:17:00Z",
        "isOutgoing": False,
        "sender": "them"
    },
    {
        "text": "Perfect! What time?",
        "timestamp": "2024-01-15T10:20:00Z",
        "isOutgoing": True,
        "sender": "you"
    },
    {
        "text": "9 AM? We can grab coffee after! ☕",
        "timestamp": "2024-01-15T10:22:00Z",
        "isOutgoing": False,
        "sender": "them"
    },
    {
        "text": "That works for me! Looking forward to it!",
        "timestamp": "2024-01-15T10:25:00Z",
        "isOutgoing": True,
        "sender": "you"
    }
]

def test_stats_server():
    base_url = "http://localhost:8001"
    
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Server not running. Please start the stats server first:")
        print("python server/stats_server.py")
        return
    
    print("\nTesting stats generation...")
    try:
        payload = {
            "chat_history": test_chat_history,
            "user_id": "test_user"
        }
        
        response = requests.post(f"{base_url}/generate_stats", json=payload)
        
        if response.status_code == 200:
            stats_data = response.json()
            print("Stats generated successfully!")
            print("\nSTATISTICS RESULTS:")
            print("=" * 50)
            
            print("\nCONVERSATION DYNAMICS:")
            dynamics = stats_data["conversation_dynamics"]
            print(f"Energy Balance: {dynamics['energy_balance']}")
            print(f"Engagement Level: {dynamics['engagement_level']}")
            
            print("\nRESPONSE PATTERNS:")
            patterns = stats_data["response_patterns"]
            print(f"Average Response Time: {patterns['avg_response_time']}")
            print(f"Words per Message: {patterns['words_per_message']}")
            print(f"Question Rate: {patterns['question_rate']}")
            print(f"Emoji Usage: {patterns['emoji_usage']}")
            
            print("\nCONVERSATION TOPICS:")
            topics = stats_data["conversation_topics"]["topics"]
            for topic in topics:
                print(f"• {topic['topic']}: {topic['percentage']}")
            
            print("\nTHEIR COMMUNICATION STYLE:")
            style = stats_data["communication_style"]["style_points"]
            for point in style:
                print(f"• {point}")
            
            print("\nGENERAL CONVERSATION TIPS:")
            tips = stats_data["conversation_tips"]["tips"]
            for tip in tips:
                print(f"• {tip}")
                
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error testing stats generation: {e}")
    
    print("\nTesting memory endpoint...")
    try:
        response = requests.get(f"{base_url}/user_stats_memory/test_user")
        if response.status_code == 200:
            memory_data = response.json()
            print(f"Memory retrieved: {memory_data['memory_entries']} entries")
        else:
            print(f"Memory error: {response.status_code}")
    except Exception as e:
        print(f"Error testing memory: {e}")

if __name__ == "__main__":
    print("Testing Tona Statistics & Insights Server")
    print("=" * 50)
    test_stats_server() 