import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.losses import Huber
from flask import jsonify
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


# Function to predict future stock prices
def predict_future(model, last_sequence, scaler, n_steps=1):
    last_sequence_reshaped = last_sequence.reshape((1, last_sequence.shape[0], last_sequence.shape[1]))
    future_predictions = []
    current_input = last_sequence_reshaped

    for _ in range(n_steps):
        predicted_price = model.predict(current_input)[0, 0]
        future_predictions.append(predicted_price)
        current_input = np.roll(current_input, -1, axis=1)
        current_input[0, -1, 0] = predicted_price

    future_predictions = scaler.inverse_transform(
        np.hstack((np.array(future_predictions).reshape(-1, 1), np.zeros((len(future_predictions), 6))))
    )[:, 0]

    return future_predictions

# Function to find optimal buy points
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

# 6. Create Sequences for Time Series Forecasting
def create_sequences(data, seq_length=20):
    sequences = []
    for i in range(len(data) - seq_length):
        sequences.append(data[i: i + seq_length])
    return np.array(sequences)

# Main pipeline function to train LSTM model and return predictions
def run_lstm_prediction(data):
    ticker = data['ticker']
    prediction_date = data['prediction_date']
    epochs = int(data.get('epochs', 100))  # default to 100 if not provided

    # Download stock data
    df = yf.download(ticker, start='2019-01-01', end=datetime.today().strftime('%Y-%m-%d'))
    if df.empty:
        return jsonify({'error': 'Failed to fetch stock data.'}), 400

    # Download market indices
    nifty = yf.download("^NSEI", start='2019-01-01', end=datetime.today().strftime('%Y-%m-%d'))[['Close']].rename(columns={'Close': 'NIFTY_Close'})
    sensex = yf.download("^BSESN", start='2019-01-01', end=datetime.today().strftime('%Y-%m-%d'))[['Close']].rename(columns={'Close': 'SENSEX_Close'})

    # Merge indices with stock data
    df = df.merge(nifty, left_index=True, right_index=True)
    df = df.merge(sensex, left_index=True, right_index=True)

    df = df[['Close', 'Open', 'High', 'Low', 'Volume', 'NIFTY_Close', 'SENSEX_Close']]

    # Scaling
    scaler = MinMaxScaler(feature_range=(-1, 1))
    df_scaled = scaler.fit_transform(df)
    # 5. Convert to NumPy Array
    df_array = df_scaled.astype(np.float32)

    seq_length = 20  # Use past 20 days to predict next day
    sequences = create_sequences(df_array, seq_length+1)

    # 7. Split Data into Train (80%), Validation (10%), Test (10%)
    def split_data(sequence):
        train_data, test_data = train_test_split(sequence, test_size=0.2, shuffle=False)
        val_data, test_data = train_test_split(test_data, test_size=0.5, shuffle=False)
        return train_data, val_data, test_data

    train_data, val_data, test_data = split_data(sequences)

    # 8. Separate Features (X) and Target (y)
    X_train, y_train = train_data[:, :-1, :], train_data[:, -1, 0]
    X_valid, y_valid = val_data[:, :-1, :], val_data[:, -1, 0]
    X_test, y_test = test_data[:, :-1, :], test_data[:, -1, 0]

    print(f"x_train shape: {X_train.shape}, y_train shape: {y_train.shape}")
    print(f"x_valid shape: {X_valid.shape}, y_valid shape: {y_valid.shape}")
    print(f"x_test shape: {X_test.shape}, y_test shape: {y_test.shape}")

    # Build LSTM model
    model = Sequential()
    model.add(LSTM(128, return_sequences=True, activation='relu', input_shape=(X_test.shape[1], X_test.shape[2])))
    model.add(LSTM(64, return_sequences=False,activation='relu'))
    model.add(Dense(39, activation='relu'))
    model.add(BatchNormalization())
    model.add(Dense(1))
    model.compile(optimizer='adam', loss='mse',metrics=['mean_squared_error'])
    model.fit(X_train, y_train, epochs=epochs, batch_size=32, verbose=1,shuffle=False,validation_data=(X_valid,y_valid))

    # Predict and Reshape Results
    predictions = model.predict(X_test)
    predictions = predictions.reshape(-1, 1)

    # Inverse Transform Predictions (Only Close Price)
    predictions = scaler.inverse_transform(np.hstack((predictions, np.zeros((len(predictions), 6)))))[:, 0]

    # Inverse Transform y_test (Only Close Price)
    y_test_unscaled = scaler.inverse_transform(np.hstack((y_test.reshape(-1, 1), np.zeros((len(y_test), 6)))))[:, 0]

    # Align predictions and actuals
    predictions = predictions[-len(y_test_unscaled):]
    rmse= np.sqrt(np.mean((predictions-y_test_unscaled)**2))
    mae = mean_absolute_error(y_test_unscaled, predictions)
    mse= mean_squared_error(y_test_unscaled, predictions)
    r2= r2_score(y_test_unscaled, predictions)
    print(f"Test RMSE: {rmse}")
    print(f"Test MAE: {mae}")
    print(f"Test MSE: {mse}")
    print(f"Test R2: {r2}")

    # Split into Train and Validation/Test Data
    train_size = int(len(df) * 0.9)
    train = df.iloc[:train_size].copy()
    valid = df.iloc[train_size:].copy()

    # Ensure valid has the same length as predictions
    valid = valid.iloc[-len(predictions):].copy()
    valid['Predictions'] = predictions
    valid.index = df.index[train_size:][-len(valid):]  # Align timestamps

    # Optional: Fill missing data (if any)
    valid['Predictions'] = valid['Predictions'].interpolate()

    # Fix Training Data Index (if needed)
    train.index = df.index[:train_size]

    # Historical data for response
    #test_indices = df.index[-len(X_test):]

# Historical data for response (use test_indices)
    historical_data = [
    {
        'date': str(train.index[i].date()) if hasattr(train.index[i], 'date') else str(train.index[i]),
        'price': float(train['Close'].iloc[i])
    }
    for i in range(len(train))
]

    # Future prediction logic
    last_sequence = X_test[-1]
    last_date = df.index[-1]
    future_start_date = datetime.strptime(prediction_date, '%Y-%m-%d')
    future_days = (future_start_date - last_date).days

    if future_days <= 0:
        return jsonify({'error': 'Prediction date must be in the future.'}), 400

    # Predict future prices
    future_prices = predict_future(model, last_sequence, scaler, n_steps=future_days)
    future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=future_days, freq='B')

    # Find buy points
    buy_indices, buy_signals = find_optimal_buy_points(future_prices)

    # # Validation DataFrame for actual vs predicted
    # valid = pd.DataFrame({
    #     'Close': y_test_unscaled,
    #     'Predictions': predictions
    # }, index=test_indices)

    # Prepare actual vs predicted for validation/test period
    actual_vs_predicted = [
        {
            'date': str(valid.index[i].date()),
            'actual': float(valid['Close'].iloc[i]),
            'predicted': float(valid['Predictions'].iloc[i])
        }
        for i in range(len(valid))
    ]

    # Final result JSON
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
