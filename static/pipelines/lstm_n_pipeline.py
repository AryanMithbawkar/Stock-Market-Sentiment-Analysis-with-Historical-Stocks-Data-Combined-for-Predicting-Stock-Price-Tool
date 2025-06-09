import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, BatchNormalization
from flask import jsonify
from tensorflow.keras import regularizers
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import pymongo
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.abspath(os.path.join(BASE_DIR, "..", "models", "finbert_sentiment089"))

def get_sentiment_model(model_path=model_path):
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    sentiment_model = AutoModelForSequenceClassification.from_pretrained(model_path)
    return tokenizer, sentiment_model

def get_sentiment(text, tokenizer, sentiment_model):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = sentiment_model(**inputs)
        scores = torch.softmax(outputs.logits, dim=1).cpu().numpy()[0]
        sentiment = int(scores.argmax())
    return sentiment  # 0=negative, 1=neutral, 2=positive

def fetch_and_merge_sentiment(df, ticker, start_date, end_date, tokenizer, sentiment_model):
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join([str(i) for i in col if i]) for col in df.columns.values]
    load_dotenv()
    mongo_uri = os.getenv("MONGO_URI")
    client = pymongo.MongoClient(mongo_uri)
    db = client["stock_news"]
    collection = db["moneyworks_company_news"]
    tickers_to_fetch = [ticker, "^NSEI", "^BSESN"]
    news_sentiment_daily_dict = {}
    for tkr in tickers_to_fetch:
        news_cursor = collection.find({"yahoo_ticker": tkr})
        for doc in news_cursor:
            if "sentiment" not in doc or doc["sentiment"] in ("", None):
                title = doc.get("title", "")
                if title:
                    sentiment = get_sentiment(title, tokenizer, sentiment_model)
                    collection.update_one({"_id": doc["_id"]}, {"$set": {"sentiment": sentiment}})
        news_cursor = collection.find({"yahoo_ticker": tkr, "sentiment": {"$exists": True}})
        news_df = pd.DataFrame(list(news_cursor))
        if not news_df.empty:
            news_df["date"] = pd.to_datetime(news_df["date"]).dt.date
            news_sentiment_daily = news_df.groupby("date")["sentiment"].mean()
        else:
            news_sentiment_daily = pd.Series(dtype=float)
        news_sentiment_daily_dict[tkr] = news_sentiment_daily
    df["date"] = df.index.date
    df = df.merge(news_sentiment_daily_dict.get(ticker, pd.Series(dtype=float)).rename("news_sentiment_company"), left_on="date", right_index=True, how="left")
    df = df.merge(news_sentiment_daily_dict.get("^NSEI", pd.Series(dtype=float)).rename("news_sentiment_nifty"), left_on="date", right_index=True, how="left")
    df = df.merge(news_sentiment_daily_dict.get("^BSESN", pd.Series(dtype=float)).rename("news_sentiment_sensex"), left_on="date", right_index=True, how="left")
    df["news_sentiment_company"] = df["news_sentiment_company"].fillna(0)
    df["news_sentiment_nifty"] = df["news_sentiment_nifty"].fillna(0)
    df["news_sentiment_sensex"] = df["news_sentiment_sensex"].fillna(0)
    # After merging sentiment columns, check if news_df is empty for each ticker
    for tkr in tickers_to_fetch:
        news_cursor = collection.find({"yahoo_ticker": tkr, "sentiment": {"$exists": True}})
        news_df = pd.DataFrame(list(news_cursor))
        if news_df.empty:
            print(f"Warning: No sentiment data found for {tkr}. All sentiment values will be zero.")
        else:
            print(f"Sentiment data found for {tkr}: {news_df.shape[0]} records.")

    # Rename columns and drop 'date' column
    df = df.rename(columns={
        f'Close_{ticker}': 'Close',
        f'Open_{ticker}': 'Open',
        f'High_{ticker}': 'High',
        f'Low_{ticker}': 'Low',
        f'Volume_{ticker}': 'Volume',
        'NIFTY_Close_^NSEI': 'NIFTY_Close',
        'SENSEX_Close_^BSESN': 'SENSEX_Close'
    })
    if 'date' in df.columns:
        df = df.drop(columns=['date'])
    return df

def create_sequences(data, seq_length=20):
    sequences = []
    for i in range(len(data) - seq_length):
        sequences.append(data[i: i + seq_length])
    return np.array(sequences)

def split_data(sequence):
    train_data, test_data = train_test_split(sequence, test_size=0.3, shuffle=False)
    val_data, test_data = train_test_split(test_data, test_size=0.5, shuffle=False)
    return train_data, val_data, test_data

def predict_future(model, last_sequence, scaler, n_steps=1, n_features=10):
    last_sequence_reshaped = last_sequence.reshape((1, last_sequence.shape[0], last_sequence.shape[1]))
    future_predictions = []
    current_input = last_sequence_reshaped
    for _ in range(n_steps):
        predicted_price = model.predict(current_input)[0, 0]
        future_predictions.append(predicted_price)
        current_input = np.roll(current_input, -1, axis=1)
        current_input[0, -1, 0] = predicted_price
        if current_input.shape[2] > 1:
            current_input[0, -1, 1:] = current_input[0, -2, 1:]
    future_predictions = scaler.inverse_transform(
        np.hstack((np.array(future_predictions).reshape(-1, 1), np.zeros((len(future_predictions), n_features - 1))))
    )[:, 0]
    return future_predictions

def find_optimal_buy_points(prices, window=3, threshold=0.01):
    buy_indices = []
    buy_signals = {"points": [], "reasons": []}
    if len(prices) < 2 * window + 1:
        return buy_indices, buy_signals
    for i in range(window, len(prices) - window):
        window_slice = prices[i - window:i + window + 1]
        if prices[i] == min(window_slice):
            before_diff = prices[i] - min(prices[i - window:i])
            after_diff = prices[i] - min(prices[i + 1:i + window + 1])
            if before_diff > threshold and after_diff > threshold:
                buy_indices.append(i)
                buy_signals["points"].append(prices[i])
                buy_signals["reasons"].append("Local minimum with significant change before and after")
    if not buy_indices and len(prices) > 0:
        min_idx = np.argmin(prices)
        buy_indices.append(min_idx)
        buy_signals["points"].append(prices[min_idx])
        buy_signals["reasons"].append("Lowest price point")
    return buy_indices, buy_signals

def run_lstm_sentiment_prediction(data):
    ticker = data['ticker']
    prediction_date = data['prediction_date']
    epochs = int(data.get('epochs', 100))
    start_date = '2019-01-01'
    end_date = datetime.today().strftime('%Y-%m-%d')
    df = yf.download(ticker, start=start_date, end=end_date)
    if df.empty:
        return jsonify({'error': 'Failed to fetch stock data.'}), 400
    nifty = yf.download("^NSEI", start=start_date, end=end_date)[['Close']].rename(columns={'Close': 'NIFTY_Close'})
    sensex = yf.download("^BSESN", start=start_date, end=end_date)[['Close']].rename(columns={'Close': 'SENSEX_Close'})
    df = df.merge(nifty, left_index=True, right_index=True, how='inner')
    df = df.merge(sensex, left_index=True, right_index=True, how='inner')
    # Sentiment
    tokenizer, sentiment_model = get_sentiment_model()
    df = fetch_and_merge_sentiment(df, ticker, start_date, end_date, tokenizer, sentiment_model)
    df = df[['Close', 'Open', 'High', 'Low', 'Volume', 'NIFTY_Close', 'SENSEX_Close',
             'news_sentiment_company', 'news_sentiment_nifty', 'news_sentiment_sensex']]
    scaler = MinMaxScaler(feature_range=(-1, 1))
    df_scaled = scaler.fit_transform(df)
    df_array = df_scaled.astype(np.float32)
    seq_length = 30
    sequences = create_sequences(df_array, seq_length + 1)
    train_data, val_data, test_data = split_data(sequences)
    X_train, y_train = train_data[:, :-1, :], train_data[:, -1, 0]
    X_valid, y_valid = val_data[:, :-1, :], val_data[:, -1, 0]
    X_test, y_test = test_data[:, :-1, :], test_data[:, -1, 0]
    model = Sequential()
    model.add(LSTM(130, return_sequences=True, activation='relu', input_shape=(X_train.shape[1], X_train.shape[2])))
    model.add(LSTM(69, return_sequences=False, activation='relu',kernel_regularizer=regularizers.l1(0.000001)))
    model.add(Dense(63, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mse', metrics=['mean_squared_error'])
    model.fit(X_train, y_train, epochs=epochs, batch_size=32, verbose=1, shuffle=False, validation_data=(X_valid, y_valid))
    predictions = model.predict(X_test)
    predictions = predictions.reshape(-1, 1)
    predictions = scaler.inverse_transform(np.hstack((predictions, np.zeros((len(predictions), df.shape[1] - 1)))))[:, 0]
    y_test_unscaled = scaler.inverse_transform(np.hstack((y_test.reshape(-1, 1), np.zeros((len(y_test), df.shape[1] - 1)))))[:, 0]
    predictions = predictions[-len(y_test_unscaled):]
    rmse = np.sqrt(np.mean((predictions - y_test_unscaled) ** 2))
    mae = mean_absolute_error(y_test_unscaled, predictions)
    mse = mean_squared_error(y_test_unscaled, predictions)
    r2 = r2_score(y_test_unscaled, predictions)
    print(f"Test RMSE: {rmse}")
    print(f"Test MAE: {mae}")
    print(f"Test MSE: {mse}")
    print(f"Test R2: {r2}")
    # Prepare train and valid DataFrames for plotting
    train_size = int(len(df) * 0.9)
    train = df.iloc[:train_size].copy()
    valid = df.iloc[train_size:].copy()

    # Ensure predictions and valid have the same length
    if len(predictions) > len(valid):
        predictions = predictions[-len(valid):]
    elif len(predictions) < len(valid):
        valid = valid.iloc[-len(predictions):].copy()

    valid['Predictions'] = predictions
    valid.index = df.index[train_size:][-len(valid):]
    train.index = df.index[:train_size]
    valid['Predictions'] = valid['Predictions'].interpolate()  # Smooth transition
    train.index = df.index[:train_size]
    historical_data = [
        {
            'date': str(train.index[i].date()) if hasattr(train.index[i], 'date') else str(train.index[i]),
            'price': float(train['Close'].iloc[i])
        }
        for i in range(len(train))
    ]
    last_sequence = X_test[-1]
    last_date = df.index[-1]
    future_start_date = datetime.strptime(prediction_date, '%Y-%m-%d')
    future_days = (future_start_date - last_date).days
    if future_days <= 0:
        return jsonify({'error': 'Prediction date must be in the future.'}), 400
    future_prices = predict_future(model, last_sequence, scaler, n_steps=future_days, n_features=df.shape[1])
    future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=future_days, freq='B')
    buy_indices, buy_signals = find_optimal_buy_points(future_prices)
    actual_vs_predicted = [
        {
            'date': str(valid.index[i].date()),
            'actual': float(valid['Close'].iloc[i]),
            'predicted': float(valid['Predictions'].iloc[i])
        }
        for i in range(len(valid))
    ]
    result = {
        'stock': str(ticker),
        'predictedPrice': float(round(predictions[-1], 2)),
        'historicalData': historical_data,
        'futurePrices': [float(x) for x in future_prices.tolist()],
        'futureDates': [str(x) for x in future_dates.strftime('%Y-%m-%d').tolist()],
        'buySignals': {
            "points": [float(x) for x in buy_signals["points"]],
            "reasons": [str(r) for r in buy_signals["reasons"]]
        },
        'buyIndices': [int(x) for x in buy_indices],
        'actualVsPredicted': actual_vs_predicted
    }
    return jsonify(result)