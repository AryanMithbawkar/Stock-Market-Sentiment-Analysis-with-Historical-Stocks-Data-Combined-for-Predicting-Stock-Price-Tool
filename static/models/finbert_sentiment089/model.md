# FinBERT Model for Indian Financial News Sentiment

This directory is intended for the **FinBERT** model fine-tuned for sentiment analysis on Indian financial news headlines and articles.

> **Note:**  
> The actual model files are **not included** in this repository due to size constraints.  
> You can download the model files from my Kaggle dataset and place them in this directory.

---

## Download the Model

**Kaggle Dataset:**  
[FinBERT for Indian Financial News Sentiment](https://www.kaggle.com/models/aryanmithbawkar/fin-bert-for-indian-financial-news-sentiment)

- Download the contents of the `transformers/default` folder from the Kaggle dataset.
- Place the following files in this directory:
  - `config.json`
  - `model.safetensors`
  - `special_tokens_map.json`
  - `tokenizer_config.json`
  - `vocab.txt`

---

## Usage Example (Hugging Face Transformers)

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model_path = "path/to/finbert_sentiment089"  # Update with your path

tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSequenceClassification.from_pretrained(model_path)

text = "RBI hikes repo rate to control inflation"
inputs = tokenizer(text, return_tensors="pt")
outputs = model(**inputs)
pred = outputs.logits.argmax(dim=1).item()
print("Predicted sentiment:", pred)
