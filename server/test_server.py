#!/usr/bin/env python3

import requests
import json
import sys

def test_server():
    base_url = "http://localhost:8000"
    
    print("Testing Tona LLM Server...")
    
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("Health check passed")
        else:
            print(f"Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("Could not connect to server. Make sure it's running on http://localhost:8000")
        return False
    
    test_data = {
        "chat_history": [
            {
                "text": "Hey! How are you doing?",
                "timestamp": "2:30 PM",
                "isOutgoing": False,
                "sender": "Alex"
            },
            {
                "text": "I'm good, thanks! How about you?",
                "timestamp": "2:32 PM",
                "isOutgoing": True,
                "sender": "You"
            },
            {
                "text": "Great! I was thinking we should grab lunch sometime this week",
                "timestamp": "2:34 PM",
                "isOutgoing": False,
                "sender": "Alex"
            }
        ],
        "user_query": "What's the best way to respond to their lunch invitation?",
        "user_id": "test_user"
    }
    
    try:
        response = requests.post(
            f"{base_url}/analyze_chat",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("Chat analysis endpoint working")
            print(f"Response: {result.get('response', 'No response')}")
            print(f"Suggestions: {len(result.get('suggestions', []))} suggestions provided")
            print(f"User tone analysis: {result.get('user_tone_analysis', {}).get('engagement_style', 'Unknown')}")
            return True
        else:
            print(f"Chat analysis failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def test_memory():
    base_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{base_url}/user_memory/test_user")
        if response.status_code == 200:
            result = response.json()
            print(f"Memory endpoint working - {result.get('memory_entries', 0)} entries")
            return True
        else:
            print(f"Memory endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Memory request failed: {e}")
        return False

if __name__ == "__main__":
    print("Tona LLM Server Test Suite")
    print("=" * 40)
    
    if test_server():
        print("\nAll basic tests passed")
        test_memory()
        print("\nServer is working correctly")
    else:
        print("\nTests failed")
        sys.exit(1) 