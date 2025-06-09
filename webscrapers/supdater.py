import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os
from pymongo import MongoClient
import time
from datetime import datetime, timedelta, UTC
from fuzzywuzzy import process

# MongoDB Setup
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["stock_news"]
companies_collection = db["nse50_companies"]
news_collection = db["moneyworks_company_news"]
logs_collection = db["scraping_logs"]  # New collection for logs

# Set up Selenium WebDriver
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920x1080")
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)

def log_event(company_searched, event_type, details):
    """Logs events in the scraping_logs collection."""
    log_entry = {
        "company_searched": company_searched,
        "event_type": event_type,
        "details": details,
        "timestamp": datetime.now(UTC)
    }
    logs_collection.insert_one(log_entry)

def get_latest_date(company_name):
    latest_entry = news_collection.find_one({"company_searched": company_name}, sort=[("date", -1)])
    if latest_entry:
        latest_date = latest_entry["date"] - timedelta(days=1)
        print(f"Latest stored date for {company_name}: {latest_date.strftime('%Y-%m-%d')}")
        log_event(company_name, "latest_stored_date", f"Latest stored date for {company_name}: {latest_date.strftime('%Y-%m-%d')}")
        return latest_date
    return None  # If no data, return None

def is_link_saved(link):
    return news_collection.count_documents({"link": link}) > 0

def delete_incorrect_itc_articles():
    """Deletes incorrect ITC articles from the database."""
    query = {
        "$and": [
            {"yahoo_ticker": "ITC.NS"},
            {"title": {"$regex": r"(?!\bITC\b)(?!\bITC's\b)\b\w*itc\w*\b", "$options": "i"}}
        ]
    }
    deleted_count = news_collection.delete_many(query).deleted_count
    if deleted_count > 0:
        print(f"Deleted {deleted_count} incorrect ITC articles.")
        log_event("ITC", "deleted_incorrect_articles", f"Deleted {deleted_count} articles.")

def scrape_company_news(company_name, symbol, yahoo_ticker, company_searched):
    latest_date = get_latest_date(company_searched)
    
    if not latest_date:
        print(f"No existing data for {company_searched}, scraping from start.")
        log_event(company_searched, "no_existing_data", "Scraping from start.")

    page = 1
    base_url = f"https://www.moneyworks4me.com/indianstocks/sectors-news?searchtext={company_searched}&page="
    stop_scraping = False
    
    while not stop_scraping:
        url = base_url + str(page)
        print(f"Scraping: {url}")
        log_event(company_searched, "scraping_page", f"Scraping: {url}")

        driver.get(url)
        time.sleep(5)

        try:
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "font-13rem.fw-700")))
        except:
            print(f"No more articles found for {company_searched}.")
            log_event(company_searched, "no_articles_found", "No more articles available.")
            break
        
        articles = driver.find_elements(By.CLASS_NAME, "font-13rem.fw-700")
        dates = driver.find_elements(By.CLASS_NAME, "font-12rem.text-darkgray")
        
        if not articles:
            break
        
        for i in range(len(articles)):
            title = articles[i].text.strip()
            date = dates[i].text.strip()
            link = articles[i].get_attribute("href")
            
            try:
                article_date = datetime.strptime(date, "%d-%m-%Y")
            except ValueError:
                print(f"Skipping invalid date format: {date}")
                log_event(company_searched, "invalid_date", f"Skipped article with invalid date: {date}")
                continue
            
            if latest_date and article_date <= latest_date:
                print(f"Article from {date} is already stored, stopping scraping for {company_searched}.")
                log_event(company_searched, "stopping_scraping", f"Article from {date} is already stored, stopping scraping.")
                stop_scraping = True
                break
            
            if is_link_saved(link):
                print(f"Skipping already saved link: {link}")
                log_event(company_searched, "skipping_saved_link", f"Link already exists: {link}")
                continue
            
            data = {
                "company_searched": company_searched,
                "company_name": company_name,
                "symbol": symbol,
                "yahoo_ticker": yahoo_ticker,
                "title": title,
                "date": article_date,
                "link": link
            }
            news_collection.insert_one(data)
            print(f"Inserted: {data}")
            log_event(company_searched, "inserted_article", f"Inserted article: {title}")
        
        # ✅ If stop_scraping is True, stop pagination
        if stop_scraping:
            break
        # Delete incorrect ITC articles if the company is ITC
        if yahoo_ticker == "ITC.NS":
            delete_incorrect_itc_articles()

        # Handle pagination with retry if page not found
        try:
            next_button = driver.find_element(By.XPATH, "//a[contains(text(), 'Next')]")
            if "disabled" in next_button.get_attribute("class"):
                log_event(company_searched, "pagination_end", "No more pages to scrape.")
                break
            next_button.click()
            page += 1
            time.sleep(5)
        except:
            log_event(company_searched, "pagination_error", "Error in pagination.")
            break

    

# Fetch all companies from MongoDB
companies = companies_collection.find()
for company in companies:
    scrape_company_news(company["Company Name"], company["Symbol"], company["Yahoo Finance Ticker"], company["Company Searched"])

driver.quit()
