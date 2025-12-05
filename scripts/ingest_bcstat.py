import os
import json
import argparse
import requests
import time
from pathlib import Path
from sentence_transformers import SentenceTransformer
import torch
from tqdm import tqdm
from bs4 import BeautifulSoup
import re

# Initialize sentence-transformers model
print("Loading sentence-transformers model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)
print(f"Model loaded on device: {device}")

# Baltimore County BCstat configuration
BCSTAT_BASE = "https://www.baltimorecountymd.gov"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

# Key BCstat data pages and reports
BCSTAT_URLS = {
    'data_bytes': f"{BCSTAT_BASE}/departments/bcstat/data-bytes",
    'bcstat_main': f"{BCSTAT_BASE}/departments/bcstat",
    'crime_dashboard_info': f"{BCSTAT_BASE}/departments/communications/news/baltimore-county-sees-continued-decreases-crime-launches-2021",
    'policing_dashboard_info': f"{BCSTAT_BASE}/departments/communications/news/baltimore-county-launches-interactive-policing-data-dashboard",
    'code_enforcement_info': f"{BCSTAT_BASE}/departments/communications/news/baltimore-county-releases-public-code-enforcement-data-dashboard",
    'health_tool_info': f"{BCSTAT_BASE}/departments/county-executive/news/baltimore-county-launches-social-determinants-health-web-tool",
}

def fetch_page_content(url):
    """Fetch and extract text content from a web page."""
    print(f"Fetching content from {url}...")

    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove script, style, and nav elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer']):
            element.decompose()

        # Get main content - look for common content containers
        main_content = soup.find('main') or soup.find('div', class_=re.compile('content|main|article'))

        if main_content:
            text = main_content.get_text()
        else:
            text = soup.get_text()

        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks_text = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks_text if chunk)

        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()

        time.sleep(1.0)  # Be respectful with rate limiting
        return text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def scrape_bcstat_data():
    """Scrape Baltimore County BCstat pages for content."""
    all_content = []

    for source_name, url in BCSTAT_URLS.items():
        print(f"\n{'='*60}")
        print(f"Scraping: {source_name}")
        print(f"{'='*60}")

        content = fetch_page_content(url)

        if content:
            all_content.append({
                'source': source_name,
                'url': url,
                'text': content
            })
            print(f"Extracted {len(content)} characters from {source_name}")
        else:
            print(f"Failed to extract content from {source_name}")

    return all_content

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():  # Only add non-empty chunks
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks

def generate_embeddings_local(chunks):
    """Generate embeddings using local sentence-transformers model."""
    print(f"Generating embeddings for {len(chunks)} chunks...")

    texts = [c["text"] for c in chunks]

    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        convert_to_numpy=True,
        device=device
    )

    knowledge_base = []
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i].tolist()
        knowledge_base.append(chunk)

    return knowledge_base

def main():
    parser = argparse.ArgumentParser(description="Ingest Baltimore County BCstat data.")
    parser.add_argument("--twin-id", type=str, default="bcstat", help="Twin ID for output directory")
    args = parser.parse_args()

    twin_id = args.twin_id

    # Create twin directory
    twin_dir = Path("data/twins") / twin_id
    twin_dir.mkdir(parents=True, exist_ok=True)

    # Create metadata
    metadata = {
        "channelId": "baltimore-county-bcstat",
        "title": "Baltimore County Data Analyst",
        "description": "AI assistant with deep knowledge of Baltimore County government data, including crime statistics, code enforcement, traffic stops, public health metrics, and data-driven governance initiatives from BCstat.",
        "customUrl": "@BCstat",
        "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=BC&backgroundColor=1e3a8a",
        "statistics": {
            "subscriberCount": "0",
            "videoCount": "0"
        }
    }

    # Save metadata
    metadata_path = twin_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")

    # Scrape BCstat data
    content_items = scrape_bcstat_data()

    if not content_items:
        print("No content found.")
        return

    # Process each content item into chunks
    all_chunks = []

    for item in content_items:
        # Chunk the text
        chunks = chunk_text(item['text'])
        print(f"Created {len(chunks)} chunks from {item['source']}")

        # Add metadata to chunks
        for chunk in chunks:
            all_chunks.append({
                "text": chunk,
                "metadata": {
                    "source": item['source'],
                    "url": item['url'],
                    "type": "bcstat_web_content"
                }
            })

    print(f"\n{'='*60}")
    print(f"Total chunks collected: {len(all_chunks)}")
    print(f"{'='*60}\n")

    if not all_chunks:
        print("No chunks created.")
        return

    # Generate embeddings
    knowledge_base = generate_embeddings_local(all_chunks)

    # Save knowledge base
    kb_path = twin_dir / "knowledge_base.json"
    with open(kb_path, "w", encoding="utf-8") as f:
        json.dump(knowledge_base, f)

    print(f"\nSaved knowledge base with {len(knowledge_base)} chunks to {kb_path}")
    print(f"Knowledge base size: {kb_path.stat().st_size / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
