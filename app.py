from flask import Flask, render_template, jsonify, request, redirect, url_for, session, send_from_directory
import requests
import os
from functools import wraps
import firebase_admin
from firebase_admin import credentials, auth
from flask import Flask, jsonify, render_template
from pymongo import MongoClient
import json
from static.pipelines.lstm_pipeline import run_lstm_prediction 
from static.pipelines.lstm_n_pipeline import run_lstm_sentiment_prediction
import tensorflow as tf
import yfinance as yf
import requests
from flask import Response
import numpy as np
import pandas as pd
import traceback
from dotenv import load_dotenv

app = Flask(__name__)
app.secret_key = os.urandom(24)
load_dotenv()

# Firebase configuration
firebase_api_key = os.getenv("FIREBASE_API_KEY")
firebase_auth_domain = os.getenv("FIREBASE_AUTH_DOMAIN")
firebase_project = os.getenv("FIREBASE_PROJECT")
firebase_storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
firebase_messaging_sender_id = os.getenv("FIREBASE_MESSAGING_SENDER_ID")
firebase_app_id = os.getenv("FIREBASE_APP_ID")
firebase_measurement_id = os.getenv("FIREBASE_MEASUREMENT_ID")

# Example usage
# Use the MongoDB URI from the .env file
mongo_uri = os.getenv("MONGO_URI")
client = MongoClient(mongo_uri)
db = client["stock_news"]
companies_collection = db["nse50_companies"]
news_collection = db["moneyworks_company_news"]

# Firebase credentials
firebase_credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
if firebase_credentials_json:
    firebase_credentials = json.loads(firebase_credentials_json)
    cred = credentials.Certificate(firebase_credentials)
    if not firebase_admin._apps:  # Check if no app is already initialized
        firebase_admin.initialize_app(cred)


def verify_firebase_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        return None


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user is logged in (client-side auth check)
        # For server-side verification, you would validate the Firebase token here
        if 'user_logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    modelpath = url_for('static', filename='models/coins.glb')
    return render_template("home.html", modelpath=modelpath)
    

@app.route('/login')
def login():
    return render_template("login.html")

@app.route('/fundamentals')
def fundamentals():
    return render_template("fundamentals.html")

@app.route('/movers')
def movers():
    return render_template("movers.html")

@app.route('/news')
def news():
    return render_template("news.html")

@app.route('/firebase-config')
def firebase_config():
    return jsonify({
        "apiKey": firebase_api_key,
        "authDomain": firebase_auth_domain,
        "projectId": firebase_project,
        "storageBucket": firebase_storage_bucket,
        "messagingSenderId": firebase_messaging_sender_id,
        "appId": firebase_app_id,
        "measurementId": firebase_measurement_id
    })


@app.route("/get-companies")
def get_companies():
    filtered = list(companies_collection.find({}, {"_id": 0, "Company Name": 1, "Yahoo Finance Ticker": 1}))
    # Remove companies with duplicate tickers or ticker in ["NIFTY", "SENSEX"]
    seen = set()
    companies = []
    for c in filtered:
        ticker = c.get("Yahoo Finance Ticker", "").upper()
        if not ticker or ticker in seen or ticker in {"^NSEI", "^BSESN"}:
            continue
        seen.add(ticker)
        companies.append(c)
    return jsonify(companies)

@app.route('/api/news-sentiment')
def api_news_sentiment():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({'error': 'No ticker provided'}), 400
    try:
        # Fetch the latest sentiment from your database or sentiment analysis pipeline
        news = news_collection.find_one({"yahoo_ticker": ticker}, sort=[("date", -1)])
        if news and "sentiment" in news:
            return jsonify({'sentiment': news["sentiment"], 'score': news.get("score", "N/A")})
        else:
            return jsonify({'sentiment': 'Neutral', 'score': 'N/A'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict')
def predict():
    return render_template("predict.html")

@app.route('/privacy')
def privacy():
    return render_template("privacy.html")

@app.route('/terms')
def terms():
    return render_template("terms.html")

@app.route('/disclaimer')
def disclaimer():
    return render_template("disclaimer.html")

@app.route('/predict-result', methods=['POST'])
def predict_result():
    import tensorflow as tf
    data = request.get_json()
    prediction_type = data.get('type')
    prediction_date = data.get('prediction_date')
    epochs = int(data.get('epochs', 100))

    try:
        if prediction_type == 'historical-only' and prediction_date:
            data['epochs'] = epochs
            response = run_lstm_prediction(data)
        elif prediction_type == 'news-sentiment' and prediction_date:
            data['epochs'] = epochs
            response = run_lstm_sentiment_prediction(data)
        elif prediction_type == 'both' and prediction_date:
            data['epochs'] = epochs
            hist_result = run_lstm_prediction(data)
            tf.keras.backend.clear_session()
            sent_result = run_lstm_sentiment_prediction(data)
            tf.keras.backend.clear_session()
            if hasattr(hist_result, 'get_json'):
                hist_result = hist_result.get_json()
            if hasattr(sent_result, 'get_json'):
                sent_result = sent_result.get_json()
            return jsonify({
                'historical': hist_result,
                'sentiment': sent_result
            })
        else:
            return jsonify({'error': 'Invalid prediction type'}), 400
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    finally:
        tf.keras.backend.clear_session()
    return response
@app.route('/api/lookup-symbol')
def lookup_symbol():
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    # Search by company name, symbol, company searched, or ticker (case-insensitive)
    company = companies_collection.find_one({
        "$or": [
            {"Company Name": {"$regex": f"^{query}$", "$options": "i"}},
            {"Yahoo Finance Ticker": {"$regex": f"^{query}$", "$options": "i"}},
            {"Symbol": {"$regex": f"^{query}$", "$options": "i"}},
            {"Company Searched": {"$regex": f"^{query}$", "$options": "i"}}
        ]
    }, {"_id": 0, "Yahoo Finance Ticker": 1})
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    return jsonify({'symbol': company["Yahoo Finance Ticker"]})

@app.route('/api/historical')
def api_historical():
    symbol = request.args.get('symbol')
    start = request.args.get('start')
    end = request.args.get('end')
    if not symbol:
        return jsonify({'error': 'No symbol provided'}), 400
    try:
        ticker = yf.Ticker(symbol)
        if start and end:
            history = ticker.history(start=start, end=end)
        else:
            history = ticker.history(period="1y")
        if history.empty:
            return jsonify({'error': f'No data found for symbol: {symbol}'}), 404
        data = {
            'history': history.reset_index().to_dict(orient='records')
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/fundamentals')
def api_fundamentals():
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': 'No symbol provided'}), 400
    try:
        ticker = yf.Ticker(symbol)
        # Always fetch 1y for risk metrics
        risk_history = ticker.history(period="1y")
        # Always fetch max for chart/history
        full_history = ticker.history(period="max")
        info = ticker.info

        # Risk metrics from 1y history
        if not risk_history.empty:
            risk_history['Return'] = risk_history['Close'].pct_change()
            volatility = float(risk_history['Return'].std() * np.sqrt(252))
            var_95 = float(np.percentile(risk_history['Return'].dropna(), 5))
        else:
            volatility = None
            var_95 = None

        beta = info.get('beta')

        def pct(val):
            return round(val * 100, 2) if val is not None else None

        data = {
            'pe': info.get('trailingPE'),
            'pb': info.get('priceToBook'),
            'ps': info.get('priceToSalesTrailing12Months'),
            'divYield': pct(info.get('dividendYield')),
            'roe': pct(info.get('returnOnEquity')),
            'roa': pct(info.get('returnOnAssets')),
            'grossMargin': pct(info.get('grossMargins')),
            'opMargin': pct(info.get('operatingMargins')),
            'currentRatio': info.get('currentRatio'),
            'quickRatio': info.get('quickRatio'),
            'debtEquity': info.get('debtToEquity'),
            'ebitdaMargin': info.get('ebitdaMargins'),
            'volatility': volatility,
            'beta': beta,
            'var95': var_95,
        }
        # Always include full history for charting
        if not full_history.empty:
            data['history'] = full_history.reset_index().to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/api/news')
def api_news():
    query = request.args.get('query', 'Indian stock market OR NSE OR Sensex OR Nifty')
    rss_url = f"https://news.google.com/rss/search?q=Indian+finance+OR+economy+OR+RBI+OR+inflation+when:7d&hl=en-IN&gl=IN&ceid=IN:en"
    r = requests.get(rss_url)
    return Response(r.content, mimetype='application/xml')

@app.route('/api/market-movers')
def api_market_movers():
    try:
        # Get unique tickers from MongoDB
        mongo_docs = list(companies_collection.find(
            {"Yahoo Finance Ticker": {"$ne": None}},
            {"Yahoo Finance Ticker": 1, "_id": 0}
        ))
        tickers = list({doc["Yahoo Finance Ticker"] for doc in mongo_docs if "Yahoo Finance Ticker" in doc})
        if not tickers:
            return jsonify({"gainers": [], "losers": [], "error": "No tickers found in DB"}), 200

        # Download last 3 days to buffer for non-trading days
        data = yf.download(tickers, period="3d", interval="1d", group_by='ticker', progress=False, threads=True)

        results = []
        for ticker in tickers:
            try:
                df = data[ticker].dropna()
                if df.shape[0] < 2:
                    continue
                prev_close = df['Close'].iloc[-2]
                last_close = df['Close'].iloc[-1]
                pct_change = ((last_close - prev_close) / prev_close) * 100

                # Only append if all values are valid numbers
                if all(x is not None for x in [prev_close, last_close, pct_change]):
                    results.append({
                        'symbol': ticker,
                        'prev_close': round(prev_close, 2),
                        'last_close': round(last_close, 2),
                        'pct_change': round(pct_change, 2)
                    })
            except Exception as e:
                print(f"⚠️ Error processing {ticker}: {e}")

        if not results:
            return jsonify({"gainers": [], "losers": [], "error": "No price data available"}), 200

        results_df = pd.DataFrame(results)
        top_gainers = results_df.sort_values(by='pct_change', ascending=False).head(10).to_dict(orient='records')
        top_losers = results_df.sort_values(by='pct_change', ascending=True).head(10).to_dict(orient='records')

        return jsonify({"gainers": top_gainers, "losers": top_losers})
    except Exception as e:
        print("Market Movers API ERROR:", e)
        return jsonify({"error": str(e)}), 500

        results_df = pd.DataFrame(results)
        top_gainers = results_df.sort_values(by='pct_change', ascending=False).head(5).to_dict(orient='records')
        top_losers = results_df.sort_values(by='pct_change', ascending=True).head(5).to_dict(orient='records')

        return jsonify({"gainers": top_gainers, "losers": top_losers})
    except Exception as e:
        print("Market Movers API ERROR:", e)
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/price')
def get_price():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({'error': 'No ticker provided'}), 400
    try:
        stock = yf.Ticker(ticker)
        price = stock.history(period="1d")['Close'][-1]
        return jsonify({'price': round(float(price), 2)})
    except Exception as e:
        return jsonify({'error': f'Could not fetch price for {ticker}'}), 500
    
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json()
    
    # In a real app, you'd verify the Firebase token here
    # token = data.get('token')
    # user_data = verify_firebase_token(token)
    # if not user_data:
    #     return jsonify({'success': False, 'message': 'Invalid token'}), 401
    
    # Set session variable to mark user as logged in
    session['user_logged_in'] = True
    # You can store additional user info in session if needed
    # session['user_id'] = data.get('uid')
    # session['email'] = data.get('email')
    
    return jsonify({'success': True})

# API route for logout
@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    # Clear session
    session.pop('user_id', None)
    session.clear()
    redirect(url_for('home'))
    return jsonify({'success': True})



# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500


if __name__ == '__main__':
    app.run(debug=True)