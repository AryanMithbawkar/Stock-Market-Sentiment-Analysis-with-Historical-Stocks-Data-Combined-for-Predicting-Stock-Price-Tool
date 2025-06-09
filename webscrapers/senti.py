from pymongo import MongoClient
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from tqdm import tqdm

# Load the saved model
model_path = r"static\models\finbert_sentiment089"  # or provide the full path
tokenizer = AutoTokenizer.from_pretrained(model_path)
sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_path)
sentiment_model.eval()

def get_sentiment(text, tokenizer, sentiment_model):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = sentiment_model(**inputs)
        scores = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        sentiment = int(scores.argmax())
    return sentiment  # 0=negative, 1=neutral, 2=positive

# MongoDB connection
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["stock_news"]
collection = db["moneyworks_company_news"]

# Update all documents missing sentiment field (any ticker) and skip not empty sentiment fields
query = {"$or": [{"sentiment": {"$exists": False}}, {"sentiment": None}, {"sentiment": ""}]}
news_list = list(collection.find(query))
print(f"Processing {len(news_list)} news articles missing sentiment...")

for doc in tqdm(news_list, desc="Sentiment update"):
    title = doc.get("title", "")
    if title:
        sentiment = get_sentiment(title, tokenizer, sentiment_model)
        collection.update_one({"_id": doc["_id"]}, {"$set": {"sentiment": sentiment}})