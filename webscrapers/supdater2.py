import os
import feedparser
from datetime import datetime, timedelta
from pymongo import MongoClient

# MongoDB Setup
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["stock_news"]
companies_collection = db["nse50_companies"]
news_collection = db["moneyworks_company_news"]
logs_collection = db["scraping_logs"]

def log_event(company_name, event_type, message):
    log_entry = {
        "company_name": company_name,
        "event_type": event_type,
        "message": message,
        "timestamp": datetime.utcnow()
    }
    logs_collection.insert_one(log_entry)
    print(message)

def get_latest_date(company_name):
    latest_entry = news_collection.find_one({"company_searched": company_name}, sort=[("date", -1)])
    if latest_entry:
        latest_date = latest_entry["date"].date() - timedelta(days=1)
        log_event(company_name, "latest_stored_date", f"Latest stored date for {company_name}: {latest_date.strftime('%Y-%m-%d')}")
        return latest_date
    return None

def is_link_saved(link):
    return news_collection.count_documents({"link": link}) > 0

def fetch_google_news_rss(query, start_date, end_date):
    """Fetch news from Google News RSS"""
    url = f"https://news.google.com/rss/search?q={query}+stock"
    feed = feedparser.parse(url)
    
    news_articles = []
    for entry in feed.entries:
        try:
            published_date = datetime.strptime(entry.published, "%a, %d %b %Y %H:%M:%S %Z").date()
            if start_date and published_date < start_date:
                continue
            if published_date > end_date:
                continue

            news_articles.append({
                "title": entry.title,  # Using entry.title directly instead of fetching again
                "link": entry.link,
                "published": published_date
            })
        except Exception as e:
            print(f"Error parsing date: {e}")
    
    return news_articles

def delete_incorrect_mm_articles():
    """Delete M&M.NS articles where title does NOT mention 'Mahindra' or 'Mahindra & Mahindra'."""
    query = {
        "$and": [
            {"yahoo_ticker": "M&M.NS"},
            {
                "title": {
                    "$not": {
                        "$regex": r"\bMahindra(?:\s*&\s*Mahindra)?\b",
                        "$options": "i"
                    }
                }
            }
        ]
    }
    result = news_collection.delete_many(query)
    log_event("M&M.NS", "deletion", f"Deleted {result.deleted_count} incorrect M&M.NS articles without proper title match.")

def process_company_news():
    """Process news for all companies in the database"""
    companies = companies_collection.find()
    end_date = datetime.utcnow().date()
    
    for company in companies:
        company_name = company["Company Name"]
        symbol = company["Symbol"]
        yahoo_ticker = company["Yahoo Finance Ticker"]
        company_searched = company["Company Searched"]
        
        latest_date = get_latest_date(company_searched) or (end_date - timedelta(days=365))
        
        print(f"Fetching news for {company_name} ({yahoo_ticker}) from {latest_date} to {end_date}")
        
        news_data = fetch_google_news_rss(yahoo_ticker, latest_date, end_date)
        
        for news in news_data:
            if is_link_saved(news["link"]):
                log_event(company_name, "skipped", f"Skipping already saved link: {news['link']}")
                continue
            data = {
                "company_searched": company_searched,
                "company_name": company_name,
                "symbol": symbol,
                "yahoo_ticker": yahoo_ticker,
                "title": news["title"],
                "date": datetime.combine(news["published"], datetime.min.time()),
                "link": news["link"]
            }
            news_collection.insert_one(data)
            log_event(company_name, "inserted", f"Inserted: {data}")
        # After all insertions, clean up incorrect ones for M&M.NS
        if yahoo_ticker == "M&M.NS":
            delete_incorrect_mm_articles()

# Run the script
process_company_news()
