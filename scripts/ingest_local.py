import os
import json
import argparse
import requests
import time
import yt_dlp
from dotenv import load_dotenv
from tqdm import tqdm
from pathlib import Path
from sentence_transformers import SentenceTransformer
import torch

# Load .env from the project root (one level up from scripts/)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
# Determine twin_id and output path from command-line arguments
OUTPUT_FILE = None  # Will be set based on twin_id

if not YOUTUBE_API_KEY:
    print("Error: YOUTUBE_API_KEY not found in environment variables.")
    print("Please create a YouTube Data API v3 key and set YOUTUBE_API_KEY in .env and .env.local.")
    exit(1)

# Initialize sentence-transformers model
print("Loading sentence-transformers model...")
# Using all-MiniLM-L6-v2: Fast, efficient, and produces 384-dimensional embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')

# Move model to GPU if available
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)
print(f"Model loaded on device: {device}")

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

def get_channel_metadata(channel_id: str) -> dict:
    """Fetch channel metadata from YouTube Data API."""
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {
        "part": "snippet,statistics",
        "id": channel_id,
        "key": YOUTUBE_API_KEY,
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    items = data.get("items", [])
    if not items:
        raise RuntimeError(f"No channel found for ID '{channel_id}'")

    channel = items[0]
    snippet = channel["snippet"]
    statistics = channel["statistics"]

    return {
        "channelId": channel_id,
        "title": snippet["title"],
        "description": snippet["description"],
        "customUrl": snippet.get("customUrl", ""),
        "avatar": snippet["thumbnails"]["high"]["url"],
        "statistics": {
            "subscriberCount": statistics.get("subscriberCount", "0"),
            "videoCount": statistics.get("videoCount", "0"),
        }
    }

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
        return channel_id, video_ids
    except Exception as e:
        print(f"Error fetching videos: {e}")
        return None, []

def get_transcript(video_id, cookies_file=None):
    """Fetch transcript using yt-dlp"""
    try:
        import urllib.request

        ydl_opts = {
            'skip_download': True,
            'writesubtitles': False,  # Don't write files, just get URLs
            'writeautomaticsub': False,
            'quiet': True,
            'no_warnings': True,
            'ignore_no_formats_error': True,  # Ignore error when no video formats (we only need subtitles)
        }

        # Add cookies if provided (for YouTube Premium / auth)
        if cookies_file and os.path.exists(cookies_file):
            ydl_opts['cookiefile'] = cookies_file

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)

            # Try to get subtitles (prefer manual, fall back to auto-generated)
            subtitles = None
            if 'subtitles' in info and info['subtitles'] and 'en' in info['subtitles']:
                subtitles = info['subtitles']['en']
            elif 'automatic_captions' in info and info['automatic_captions'] and 'en' in info['automatic_captions']:
                subtitles = info['automatic_captions']['en']

            if not subtitles:
                return None

            # Find vtt format URL
            vtt_url = None
            for sub in subtitles:
                if sub.get('ext') == 'vtt':
                    vtt_url = sub.get('url')
                    break

            if not vtt_url:
                return None

            # Download and parse the VTT file
            with urllib.request.urlopen(vtt_url) as response:
                vtt_content = response.read().decode('utf-8')

            # Extract text from VTT (skip timestamps and metadata)
            texts = []
            for line in vtt_content.split('\n'):
                line = line.strip()
                # Skip empty lines, WEBVTT header, timestamps, and metadata
                if (line and
                    not line.startswith('WEBVTT') and
                    not '-->' in line and
                    not line.isdigit() and
                    not line.startswith('NOTE') and
                    not line.startswith('Kind:') and
                    not line.startswith('Language:')):
                    texts.append(line)

            full_text = " ".join(texts).strip()
            return full_text if full_text else None

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

def generate_embeddings_local(chunks):
    """Generate embeddings using local sentence-transformers model with GPU acceleration."""
    print(f"Generating embeddings for {len(chunks)} chunks using local model...")

    # Extract just the text from chunks
    texts = [c["text"] for c in chunks]

    # Generate embeddings in batches for better GPU utilization
    # batch_size=32 is good for most GPUs, adjust if needed
    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True,
        device=device
    )

    # Add embeddings back to chunks
    knowledge_base = []
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i].tolist()  # Convert numpy array to list for JSON
        knowledge_base.append(chunk)

    return knowledge_base

def main():
    parser = argparse.ArgumentParser(description="Ingest YouTube channel content with local embeddings.")
    parser.add_argument("--channel", type=str, help="YouTube Channel URL")
    parser.add_argument("--limit", type=int, help="Limit number of videos to process")
    parser.add_argument("--twin-id", type=str, help="Twin ID for output directory")
    parser.add_argument("--cookies", type=str, help="Path to cookies.txt file (Netscape format) for YouTube auth")
    args = parser.parse_args()

    channel_url = args.channel
    limit = args.limit
    twin_id = args.twin_id
    cookies_file = args.cookies

    if not channel_url:
        channel_url = input("Enter YouTube Channel URL: ")

    if limit is None:
        limit = 10

    if not twin_id:
        # Try to derive twin_id from channel URL
        handle, _ = _extract_handle_or_id(channel_url)
        if handle:
            twin_id = handle.lower().replace("@", "")
        else:
            twin_id = input("Enter Twin ID (e.g., 'fireship'): ")

    # Get channel info
    channel_id, video_ids = get_channel_videos(channel_url)

    if not channel_id:
        print("Failed to resolve channel.")
        return

    # Fetch and save channel metadata
    print("Fetching channel metadata...")
    metadata = get_channel_metadata(channel_id)

    # Create twin directory
    twin_dir = Path("data/twins") / twin_id
    twin_dir.mkdir(parents=True, exist_ok=True)

    # Save metadata
    metadata_path = twin_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")

    if limit:
        video_ids = video_ids[:limit]

    all_chunks = []

    print(f"Processing {len(video_ids)} videos...")
    for video_id in tqdm(video_ids):
        transcript_text = get_transcript(video_id, cookies_file)
        if transcript_text:
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

    # Generate embeddings using local model
    knowledge_base = generate_embeddings_local(all_chunks)

    # Save to twin-specific file
    kb_path = twin_dir / "knowledge_base.json"
    with open(kb_path, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f)

    print(f"Saved knowledge base with {len(knowledge_base)} chunks to {kb_path}")

if __name__ == "__main__":
    main()
