"""
Fetch YouTube Channel Metadata
Gets channel name, avatar, description, and other metadata
"""
import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

if not YOUTUBE_API_KEY:
    print("Error: YOUTUBE_API_KEY not found in environment variables.")
    exit(1)


def extract_handle_or_id(channel_url):
    """Extract handle or channel ID from URL"""
    if "youtube.com/channel/" in channel_url:
        part = channel_url.split("/channel/", 1)[1]
        channel_id = part.split("/", 1)[0]
        return None, channel_id
    if "youtube.com/@" in channel_url:
        handle_part = channel_url.split("youtube.com/@", 1)[1]
        handle = handle_part.split("/", 1)[0]
        return handle, None
    last = channel_url.rstrip("/").split("/")[-1]
    if last.startswith("@"):
        return last[1:], None
    return last, None


def resolve_channel_id(channel_url):
    """Resolve channel ID from URL or handle"""
    handle, channel_id = extract_handle_or_id(channel_url)
    if channel_id:
        return channel_id

    # Use YouTube Data API to find channel ID
    query = handle or channel_url
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "type": "channel",
        "q": query,
        "key": YOUTUBE_API_KEY,
        "maxResults": 1,
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise RuntimeError(f"No channel found for query '{query}'")
    return items[0]["snippet"]["channelId"]


def get_channel_metadata(channel_id):
    """Fetch channel metadata from YouTube API"""
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "snippet,statistics,brandingSettings",
        "id": channel_id,
        "key": YOUTUBE_API_KEY,
    }

    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("items"):
        raise RuntimeError(f"No channel data found for ID: {channel_id}")

    channel = data["items"][0]
    snippet = channel.get("snippet", {})
    statistics = channel.get("statistics", {})
    branding = channel.get("brandingSettings", {}).get("channel", {})

    metadata = {
        "channelId": channel_id,
        "title": snippet.get("title"),
        "description": snippet.get("description"),
        "customUrl": snippet.get("customUrl"),
        "publishedAt": snippet.get("publishedAt"),
        "thumbnails": snippet.get("thumbnails", {}),
        "avatar": snippet.get("thumbnails", {}).get("high", {}).get("url"),  # High quality avatar
        "statistics": {
            "viewCount": statistics.get("viewCount"),
            "subscriberCount": statistics.get("subscriberCount"),
            "videoCount": statistics.get("videoCount"),
        },
        "keywords": branding.get("keywords"),
        "country": snippet.get("country"),
    }

    return metadata


def save_channel_metadata(metadata, output_file="data/channel_metadata.json"):
    """Save channel metadata to JSON file"""
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"✓ Channel metadata saved to: {output_file}")
    return metadata


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fetch YouTube channel metadata")
    parser.add_argument("--channel", type=str, help="YouTube Channel URL")
    parser.add_argument("--output", type=str, default="data/channel_metadata.json", help="Output JSON file")
    args = parser.parse_args()

    channel_url = args.channel

    # Fallback to config.json if no channel provided
    if not channel_url:
        try:
            with open("data/config.json", "r", encoding="utf-8") as f:
                cfg = json.load(f)
                channel_url = cfg.get("channelUrl")
        except FileNotFoundError:
            pass

    if not channel_url:
        channel_url = input("Enter YouTube Channel URL: ")

    print(f"Fetching metadata for: {channel_url}")

    try:
        channel_id = resolve_channel_id(channel_url)
        print(f"Channel ID: {channel_id}")

        metadata = get_channel_metadata(channel_id)

        print("\n" + "="*60)
        print("📺 Channel Metadata")
        print("="*60)
        print(f"Title: {metadata['title']}")
        print(f"Custom URL: {metadata.get('customUrl', 'N/A')}")
        print(f"Subscribers: {metadata['statistics'].get('subscriberCount', 'Hidden')}")
        print(f"Total Videos: {metadata['statistics']['videoCount']}")
        print(f"Total Views: {metadata['statistics']['viewCount']}")
        print(f"Avatar URL: {metadata['avatar']}")
        print(f"Country: {metadata.get('country', 'N/A')}")
        print("="*60)

        save_channel_metadata(metadata, args.output)

        print(f"\n✅ Done! Metadata saved to {args.output}")

    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)
