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

# SEC Edgar API configuration
SEC_API_BASE = "https://data.sec.gov"
# SEC requires a proper User-Agent with company/email
HEADERS = {
    'User-Agent': 'Research Project research@example.com',
    'Accept-Encoding': 'gzip, deflate',
    'Host': 'data.sec.gov'
}

# Major retail companies
RETAIL_COMPANIES = {
    'WMT': {'name': 'Walmart Inc.', 'cik': '0000104169'},
    'TGT': {'name': 'Target Corporation', 'cik': '0000027419'},
    'COST': {'name': 'Costco Wholesale Corporation', 'cik': '0000909832'},
    'HD': {'name': 'The Home Depot Inc.', 'cik': '0000354950'},
    'AMZN': {'name': 'Amazon.com Inc.', 'cik': '0001018724'}
}

def get_company_filings(cik, filing_type='10-K', count=3):
    """Fetch recent filings for a company from SEC Edgar."""
    print(f"Fetching {filing_type} filings for CIK {cik}...")

    # Pad CIK to 10 digits
    cik_padded = cik.replace('000000', '').zfill(10)

    url = f"{SEC_API_BASE}/submissions/CIK{cik_padded}.json"

    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        data = response.json()

        filings = data.get('filings', {}).get('recent', {})
        forms = filings.get('form', [])
        accession_numbers = filings.get('accessionNumber', [])
        filing_dates = filings.get('filingDate', [])
        primary_docs = filings.get('primaryDocument', [])

        # Filter for the requested filing type from past (not future dates)
        from datetime import datetime
        today = datetime.now().date()

        matching_filings = []
        for i, form in enumerate(forms):
            if form == filing_type and len(matching_filings) < count:
                filing_date = datetime.strptime(filing_dates[i], '%Y-%m-%d').date()
                # Only include filings from the past, not future
                if filing_date <= today:
                    matching_filings.append({
                        'form': form,
                        'accession': accession_numbers[i].replace('-', ''),
                        'accession_with_dashes': accession_numbers[i],
                        'date': filing_dates[i],
                        'document': primary_docs[i],
                        'cik': cik_padded
                    })

        return matching_filings
    except Exception as e:
        print(f"Error fetching filings for CIK {cik}: {e}")
        return []

def download_filing_text(filing_info):
    """Download and extract text from a SEC filing."""
    cik = filing_info['cik']
    accession = filing_info['accession']
    accession_with_dashes = filing_info['accession_with_dashes']
    document = filing_info['document']

    # Construct URL - Use www.sec.gov for document downloads, not data.sec.gov
    # CIK doesn't need leading zeros in URL path
    cik_no_leading_zeros = str(int(cik))
    url = f"https://www.sec.gov/Archives/edgar/data/{cik_no_leading_zeros}/{accession}/{document}"

    try:
        print(f"Downloading {filing_info['form']} from {filing_info['date']}...")
        # Use appropriate headers for www.sec.gov
        download_headers = {
            'User-Agent': 'Research Project research@example.com'
        }
        response = requests.get(url, headers=download_headers)
        response.raise_for_status()

        # Parse HTML and extract text
        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text
        text = soup.get_text()

        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks_text = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks_text if chunk)

        # Limit text length (filings can be very long)
        max_chars = 500000  # ~500KB of text
        if len(text) > max_chars:
            text = text[:max_chars]

        time.sleep(1.0)  # SEC requires 10 requests per second max, so wait 1 second
        return text
    except Exception as e:
        print(f"Error downloading filing: {e}")
        return None

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
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
    parser = argparse.ArgumentParser(description="Ingest SEC Edgar filings for retail industry.")
    parser.add_argument("--twin-id", type=str, default="retail", help="Twin ID for output directory")
    parser.add_argument("--filing-type", type=str, default="10-K", help="Filing type (10-K, 10-Q, 8-K)")
    parser.add_argument("--filings-per-company", type=int, default=2, help="Number of filings per company")
    args = parser.parse_args()

    twin_id = args.twin_id
    filing_type = args.filing_type
    filings_per_company = args.filings_per_company

    # Create twin directory
    twin_dir = Path("data/twins") / twin_id
    twin_dir.mkdir(parents=True, exist_ok=True)

    # Create metadata
    metadata = {
        "channelId": "retail-industry",
        "title": "Retail Industry Analyst",
        "description": "AI assistant with deep knowledge of retail industry trends, financial performance, and competitive dynamics based on SEC filings from Walmart, Target, Costco, Home Depot, and Amazon.",
        "customUrl": "@RetailAnalyst",
        "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=RA&backgroundColor=4f46e5",
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

    all_chunks = []

    # Process each retail company
    for ticker, company_info in RETAIL_COMPANIES.items():
        print(f"\n{'='*60}")
        print(f"Processing {company_info['name']} ({ticker})")
        print(f"{'='*60}")

        # Get filings
        filings = get_company_filings(
            company_info['cik'],
            filing_type=filing_type,
            count=filings_per_company
        )

        for filing in filings:
            # Download filing text
            text = download_filing_text(filing)

            if text:
                # Chunk the text
                chunks = chunk_text(text)
                print(f"Created {len(chunks)} chunks from {filing['form']} filing")

                # Add metadata to chunks
                for chunk in chunks:
                    all_chunks.append({
                        "text": chunk,
                        "metadata": {
                            "company": company_info['name'],
                            "ticker": ticker,
                            "filing_type": filing['form'],
                            "filing_date": filing['date']
                        }
                    })

    print(f"\n{'='*60}")
    print(f"Total chunks collected: {len(all_chunks)}")
    print(f"{'='*60}\n")

    if not all_chunks:
        print("No content found.")
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
