import os
import json
import argparse
import scrapetube  # still imported but no longer used for listing; kept in case of future use
import requests
import time
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm
from pathlib import Path

# Load .env from the project root (one level up from scripts/)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Configuration
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
TOGETHER_BASE_URL = "https://api.together.xyz/v1"
EMBEDDING_MODEL = "togethercomputer/m2-bert-80M-8k-retrieval"
OUTPUT_FILE = "data/knowledge_base.json"

if not TOGETHER_API_KEY:
    print("Error: TOGETHER_API_KEY not found in environment variables.")
    exit(1)

if not YOUTUBE_API_KEY:
    print("Error: YOUTUBE_API_KEY not found in environment variables.")
    print("Please create a YouTube Data API v3 key and set YOUTUBE_API_KEY in .env and .env.local.")
    exit(1)

client = OpenAI(
    api_key=TOGETHER_API_KEY,
    base_url=TOGETHER_BASE_URL
)

def _extract_handle_or_id(channel_url: str):
    # Returns (handle, channel_id) where one may be None.
    if "youtube.com/channel/" in channel_url:
        # URL like https://www.youtube.com/channel/UCxxxx
        part = channel_url.split("/channel/", 1)[1]
        channel_id = part.split("/", 1)[0]
        return None, channel_id
    if "youtube.com/@" in channel_url:
        handle_part = channel_url.split("youtube.com/@", 1)[1]
        handle = handle_part.split("/", 1)[0]
        return handle, None
    # Fallback: treat last path segment as handle/query.
    last = channel_url.rstrip("/").split("/")[-1]
    if last.startswith("@"):
        return last[1:], None
    return last, None

def _resolve_channel_id(channel_url: str) -> str:
    handle, channel_id = _extract_handle_or_id(channel_url)
    if channel_id:
        return channel_id

    # Use YouTube Data API search to find channel ID from handle or name.
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

def get_channel_videos(channel_url):
    print(f"Fetching videos from {channel_url} using YouTube Data API...")
    try:
        channel_id = _resolve_channel_id(channel_url)
        print(f"Resolved channel ID: {channel_id}")

        url = "https://www.googleapis.com/youtube/v3/search"
        video_ids = []
        next_page_token = None
        while True:
            if len(video_ids) >= 200:
                break
            params = {
                "part": "id",
                "channelId": channel_id,
                "maxResults": 50,
                "order": "date",
                "type": "video",
                "pageToken": next_page_token,
                "key": YOUTUBE_API_KEY,
            }
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            for item in data.get("items", []):
                vid_id = item["id"].get("videoId")
                if vid_id:
                    video_ids.append(vid_id)
            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

        print(f"Found {len(video_ids)} videos via API.")
        return video_ids
    except Exception as e:
        print(f"Error fetching videos: {e}")
        return []

def get_transcript(video_id):
    try:
        api = YouTubeTranscriptApi()
        transcript_result = api.fetch(video_id)
        # Combine text from snippets
        full_text = " ".join([snippet.text for snippet in transcript_result.snippets])
        return full_text
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception as e:
        print(f"Error fetching transcript for {video_id}: {e}")
        return None

def chunk_text(text, chunk_size=1000, overlap=200):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def generate_embeddings(chunks):
    embeddings = []
    print("Generating embeddings...")
    # Batching could be added here, but for simplicity doing one by one or small batches
    # Together AI rate limits might apply.
    
    for chunk in tqdm(chunks):
        try:
            response = client.embeddings.create(
                input=chunk,
                model=EMBEDDING_MODEL
            )
            embedding = response.data[0].embedding
            embeddings.append({
                "text": chunk,
                "embedding": embedding
            })
        except Exception as e:
            print(f"Error embedding chunk: {e}")
    return embeddings

def main():
    parser = argparse.ArgumentParser(description="Ingest YouTube channel content.")
    parser.add_argument("--channel", type=str, help="YouTube Channel URL")
    parser.add_argument("--limit", type=int, help="Limit number of videos to process")
    args = parser.parse_args()

    channel_url = args.channel
    limit = args.limit

    # If no CLI args provided, fall back to data/config.json if present
    if not channel_url or limit is None:
        try:
            with open("data/config.json", "r", encoding="utf-8") as cf:
                cfg = json.load(cf)
                channel_url = channel_url or cfg.get("channelUrl")
                if limit is None:
                    limit = cfg.get("limit", 10)
        except FileNotFoundError:
            pass

    if not channel_url:
        channel_url = input("Enter YouTube Channel URL: ")

    if limit is None:
        limit = 10

    video_ids = get_channel_videos(channel_url)
    
    if limit:
        video_ids = video_ids[:limit]

    all_chunks = []
    
    print(f"Processing {len(video_ids)} videos...")
    for video_id in tqdm(video_ids):
        transcript_text = get_transcript(video_id)
        if transcript_text:
            # Add video ID to text for reference? Or store metadata.
            # Simple approach: just text. Better: Store metadata.
            chunks = chunk_text(transcript_text)
            # Add metadata to chunks
            for chunk in chunks:
                all_chunks.append({
                    "text": chunk,
                    "metadata": {"video_id": video_id}
                })

    print(f"Total chunks: {len(all_chunks)}")
    if not all_chunks:
        print("No content found.")
        return

    # Generate embeddings
    # We need to separate text for embedding
    texts = [c["text"] for c in all_chunks]
    
    # Create the knowledge base structure
    knowledge_base = []
    
    print("Generating embeddings...")
    # Batch process if possible to save time, but let's be safe with loop
    for item in tqdm(all_chunks):
        max_retries = 5
        retry_delay = 2
        for attempt in range(max_retries):
            try:
                response = client.embeddings.create(
                    input=item["text"],
                    model=EMBEDDING_MODEL
                )
                item["embedding"] = response.data[0].embedding
                knowledge_base.append(item)
                break  # Success, exit retry loop
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"\nRetry {attempt + 1}/{max_retries} after error: {str(e)[:100]}")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print(f"\nFailed after {max_retries} attempts: {str(e)[:100]}")

    # Save to file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f)
    
    print(f"Saved knowledge base to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
