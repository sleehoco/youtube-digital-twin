# Quick Start Guide - Document to LLM Pipeline

## 🚀 Fast Track: Convert Documents to Training Data

### 1. Convert Your Documents (5 minutes)

```bash
# Activate Python environment
venv\Scripts\activate

# Convert all documents in a folder
python scripts/batch_convert.py "C:\path\to\your\documents" data/converted
```

### 2. Prepare Training Dataset (2 minutes)

```bash
# Create clean, chunked JSONL dataset
python scripts/prepare_training_data.py data/converted \
  --output data/training.jsonl \
  --chunk \
  --split \
  --analyze
```

### 3. You're Ready!

Your data is now ready for LLM training at:
- `data/training.jsonl` - Full dataset
- `data/splits/train.jsonl` - Training set
- `data/splits/val.jsonl` - Validation set

---

## 📝 Common Use Cases

### Use Case 1: Single Document Conversion

```bash
python scripts/convert_document.py document.pdf markdown output.md
```

### Use Case 2: Batch Convert PDFs

```bash
python scripts/batch_convert.py pdf_folder/ output_folder/ --parallel
```

### Use Case 3: Web Interface

```bash
npm run dev
# Visit http://localhost:3000/convert
```

### Use Case 4: API Endpoint

```bash
curl -X POST http://localhost:3000/api/convert \
  -F "file=@document.pdf" \
  -F "format=markdown"
```

---

## 🎯 What You Can Do

### Build Custom LLMs
- Convert domain-specific documents (legal, medical, technical)
- Create training datasets
- Fine-tune models on your data

### RAG Pipelines
- Convert documents to markdown
- Index for semantic search
- Retrieve relevant context for LLMs

### Document Analysis
- Extract structured data from PDFs
- Parse tables and figures
- Convert legacy documents

---

## 📊 Example Workflows

### Workflow A: Legal Document Assistant

```bash
# 1. Convert legal documents
python scripts/batch_convert.py legal_docs/ converted/ --parallel

# 2. Prepare for fine-tuning
python scripts/prepare_training_data.py converted/ \
  --output legal_data.jsonl --chunk --split

# 3. Fine-tune a model
# (Use with Hugging Face Transformers)
```

### Workflow B: Research Paper Analyzer

```bash
# 1. Convert academic PDFs
python scripts/batch_convert.py papers/ converted_papers/

# 2. Create knowledge base
python scripts/prepare_training_data.py converted_papers/ \
  --output knowledge_base.jsonl --chunk-size 2048

# 3. Use with RAG system
```

### Workflow C: Company Knowledge Base

```bash
# 1. Convert internal docs (PDFs, DOCX, PPTX)
python scripts/batch_convert.py company_docs/ knowledge/

# 2. Prepare searchable dataset
python scripts/prepare_training_data.py knowledge/ \
  --output company_kb.jsonl --chunk

# 3. Deploy as internal AI assistant
```

---

## ⚡ Performance Tips

### Speed Up Conversion
```bash
# Use parallel processing
python scripts/batch_convert.py input/ output/ --parallel --workers 4
```

### Optimize Chunk Size
- **Small (512):** Q&A, facts
- **Medium (1024):** General use
- **Large (2048):** Context-heavy tasks

### Handle Large Batches
```bash
# Process subdirectories separately
for dir in documents/*/; do
  python scripts/batch_convert.py "$dir" "converted/$(basename $dir)"
done
```

---

## 🔧 Troubleshooting

### Issue: Module not found
```bash
venv\Scripts\activate
pip install docling
```

### Issue: Slow conversion
- First run downloads models (normal)
- Use `--parallel` for multiple files
- Check CPU usage

### Issue: API timeout
- Increase timeout in `app/api/convert/route.ts`
- Process large files via CLI instead

---

## 📚 Documentation

- [Complete LLM Training Pipeline](docs/llm-training-pipeline.md)
- [Docling Setup Guide](DOCLING_SETUP.md)
- [API Documentation](docs/api.md)

---

## 🎓 Learning Path

1. **Start Here:** Convert a single PDF
2. **Next:** Batch convert a folder
3. **Then:** Prepare training data
4. **Advanced:** Fine-tune a model
5. **Expert:** Train from scratch

---

## 💡 Tips for Success

✅ **DO:**
- Test with 5-10 documents first
- Review sample conversions for quality
- Use descriptive filenames
- Keep source documents organized

❌ **DON'T:**
- Process encrypted/password-protected PDFs
- Expect perfect conversion of scanned images (use OCR)
- Convert extremely large files (>100MB) via web UI
- Skip the validation set when training

---

## 🆘 Quick Help

```bash
# Get help on any script
python scripts/batch_convert.py --help
python scripts/prepare_training_data.py --help

# Test Docling installation
python scripts/test_docling.py

# Check versions
python --version
pip list | grep docling
```

---

## 🎉 You're All Set!

You now have a complete pipeline from documents to LLM-ready data. Happy training!
