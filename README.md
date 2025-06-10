# Stock-Market-Sentiment-Analysis-with-Historical-Stocks-Data-Combined-for-Predicting-Stock-Price-Tool
# MarketMind: Stock Market Sentiment Analysis & Price Prediction Platform

[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)
[![Firebase](https://img.shields.io/badge/Firebase-9.0+-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MarketMind is a comprehensive web application that combines stock market sentiment analysis with historical data to predict stock prices for the Indian market. It leverages machine learning models including LSTM for price prediction and a fine-tuned FinBERT model for news sentiment analysis, providing users with data-driven insights for investment decisions.

---

## 🎥 Demo Video

[![MarketMind Demo](static/video/thumb.png)](https://youtu.be/kXl9987fJuk)

_Click the image above to watch the full demo or [view it directly here](https://youtu.be/kXl9987fJuk)._

### Quick Demo Features:

- User authentication and dashboard navigation
- Real-time market movers tracking
- Comprehensive fundamental analysis
- News sentiment analysis with FinBERT
- Stock price prediction using LSTM
- Interactive charts and visualizations

---

## 🚀 Features

### 🔐 Authentication & User Management

- **Firebase Authentication**: Secure login/registration system
- **User Profiles**: Personalized dashboards and preferences
- **Session Management**: Secure session handling with Firebase

### 📈 Market Analysis Tools

- **Market Movers**: Track top gainers, losers, and most active stocks
- **Stock Bookmarking**: Save and manage favorite stocks
- **Real-time Data**: Live stock prices and market updates
- **Historical Analysis**: Comprehensive historical data visualization

### 📊 Fundamental Analysis

- **Financial Ratios**: P/E, P/B, ROE, ROA, and more
- **Peer Comparison**: Compare stocks within the same sector
- **Trend Analysis**: Historical performance and growth metrics
- **Interactive Charts**: Plotly-powered visualizations

### 📰 News Sentiment Analysis

- **FinBERT Integration**: Fine-tuned model for Indian financial news
- **Sentiment Scoring**: Positive, negative, and neutral sentiment classification
- **News Aggregation**: Latest market news from multiple sources
- **Impact Analysis**: Correlation between news sentiment and stock movements

### 🤖 Stock Price Prediction

- **LSTM Models**: Deep learning for time series forecasting
- **Multi-factor Analysis**: Combines technical indicators with sentiment
- **Prediction Confidence**: Model accuracy and confidence intervals
- **Backtesting**: Historical prediction performance evaluation

### 🎨 Modern UI/UX

- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Mobile-first approach
- **Interactive Elements**: Smooth animations and transitions
- **Three.js Integration**: 3D visualizations and effects

---

## 🏗️ Project Architecture

```
📦 MarketMind/
├── 📄 app.py                    # Main Flask application
├── 📄 requirements.txt          # Python dependencies
├── 📄 Dockerfile              # Docker configuration
├── 📄 README.md               # Project documentation
├── 📁 static/
│   ├── 📁 css/
│   │   ├── 📄 style.css       # Main stylesheet
│   │   ├── 📄 fundamentals.css
│   │   ├── 📄 movers.css
│   │   ├── 📄 news.css
│   │   └── 📄 predict.css
│   ├── 📁 js/
│   │   ├── 📄 firebase-config.js    # Firebase configuration
│   │   ├── 📄 auth.js              # Authentication logic
│   │   ├── 📄 fundamentals.js      # Fundamental analysis
│   │   ├── 📄 movers.js           # Market movers functionality
│   │   ├── 📄 news.js             # News and sentiment
│   │   ├── 📄 predict.js          # Price prediction
│   │   └── 📄 main.js             # Core functionality
│   ├── 📁 models/
│   │   └── 📁 finbert_sentiment089/ # FinBERT model files
│   ├── 📁 pipelines/           # ML pipeline scripts
│   └── 📁 video/              # Demo videos
├── 📁 templates/
│   ├── 📄 base.html           # Base template
│   ├── 📄 home.html           # Homepage
│   ├── 📄 login.html          # Authentication
│   ├── 📄 movers.html         # Market movers
│   ├── 📄 fundamentals.html   # Fundamental analysis
│   ├── 📄 news.html           # News sentiment
│   ├── 📄 predict.html        # Price prediction
│   ├── 📄 privacy.html        # Privacy policy
│   ├── 📄 terms.html          # Terms of service
│   ├── 📄 disclaimer.html     # Legal disclaimer
│   └── 📄 404.html           # Error page
```

---

## 🛠️ Technology Stack

### Backend

- **Flask**: Web framework
- **Python 3.12+**: Core language
- **Firebase Admin SDK**: Backend authentication
- **Pandas & NumPy**: Data manipulation
- **Scikit-learn**: Machine learning utilities
- **TensorFlow/Keras**: Deep learning models
- **MongoDB**: NoSQL database for news and sentiment data
- **Plotly**: Data visualization
- **Docker**: Containerization for deployment
- **Gunicorn**: WSGI server for production

### Frontend

- **HTML5/CSS3**: Modern web standards
- **JavaScript ES6+**: Interactive functionality
- **Firebase SDK**: Client-side authentication
- **Plotly.js**: Interactive charts
- **Three.js**: 3D visualizations
- **Bootstrap**: Responsive design

### Machine Learning

- **LSTM Networks**: Stock price prediction
- **FinBERT**: Financial sentiment analysis
- **Technical Indicators**: RSI, MACD, Bollinger Bands
- **Feature Engineering**: Combined sentiment-price features

### Database & Storage

- **Firebase Firestore**: NoSQL database
- **Firebase Storage**: File storage
- **Local Storage**: Browser caching

---

## 📋 Prerequisites

- **Python 3.12 or higher**
- **Flask 2.0+** for web framework
- **Firebase Project** with Authentication and Firestore enabled
- **Git** for version control
- **16GB+ RAM** recommended for ML models

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AryanMithbawkar/Stock-Market-Sentiment-Analysis-with-Historical-Stocks-Data-Combined-for-Predicting-Stock-Price-Tool.git
cd Stock-Market-Sentiment-Analysis-with-Historical-Stocks-Data-Combined-for-Predicting-Stock-Price-Tool
```

### 2. Create Virtual Environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Get your Firebase config and update firebase-config.js:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

### 5. Download FinBERT Model

1. Visit [Kaggle FinBERT Model](https://www.kaggle.com/models/aryanmithbawkar/fin-bert-for-indian-financial-news-sentiment)
2. Download the model files
3. Extract to finbert_sentiment089

### 6. Run the Application

```bash
python app.py
```

Visit [`https://huggingface.co/spaces/AronWolverine/MarketMindP`](https://huggingface.co/spaces/AronWolverine/MarketMindP)to access the application.

---

## 🐳 Docker Deployment

### Build and Run with Docker

```bash
# Build the image
docker build -t marketmind .

# Run the container
docker run -p 5000:5000 marketmind
```

### Docker Compose (Optional)

```yaml
version: "3.8"
services:
  marketmind:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
```

---

## 📖 Usage Guide

### 1. Authentication

- Register a new account or login with existing credentials
- Email verification may be required

### 2. Market Movers

- View top gainers, losers, and most active stocks
- Bookmark stocks for quick access
- Click on any stock for detailed analysis

### 3. Fundamental Analysis

- Search for any Indian stock by symbol
- View comprehensive financial ratios
- Compare with industry peers
- Analyze historical trends

### 4. News Sentiment

- Read latest market news
- View sentiment scores for each article
- Understand market mood and its impact

### 5. Price Prediction

- Select a stock and prediction timeframe
- View LSTM model predictions
- Analyze prediction confidence
- Download prediction reports

### 6. Newsletter Subscription

- Subscribe to weekly market insights
- Receive personalized stock recommendations
- Get notified of major market events

---

## 🤖 Machine Learning Models

### LSTM Price Prediction Model

- **Architecture**: 3-layer LSTM with dropout
- **Features**: OHLCV data, technical indicators, sentiment scores
- **Training**: 80/20 train-test split
- **Evaluation**: MAE, RMSE, MAPE metrics

### FinBERT Sentiment Analysis

- **Base Model**: BERT-base-uncased
- **Fine-tuning**: Indian financial news dataset
- **Classes**: Positive, Negative, Neutral
- **Accuracy**: 89% on test set

---

## 🔧 API Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Data APIs

- `GET /api/movers` - Market movers data
- `GET /api/fundamentals/<symbol>` - Stock fundamentals
- `GET /api/news` - Latest news with sentiment
- `POST /api/predict` - Stock price prediction

### User APIs

- `GET /api/bookmarks` - User bookmarks
- `POST /api/bookmark` - Add bookmark
- `DELETE /api/bookmark/<symbol>` - Remove bookmark

---

## 🧪 Testing

### Run Unit Tests

```bash
python -m pytest tests/
```

### Test Coverage

```bash
python -m pytest --cov=app tests/
```

### Integration Tests

```bash
python -m pytest tests/integration/
```

---

## 🚀 Performance Optimization

### Model Optimization

- Model quantization for faster inference
- Batch processing for multiple predictions
- Caching for frequently accessed data

### Frontend Optimization

- Lazy loading for charts and images
- Code splitting for JavaScript modules
- Service worker for offline functionality

### Backend Optimization

- Redis caching for API responses
- Database indexing for faster queries
- Connection pooling for database

---

## 🔒 Security Considerations

- **Authentication**: Firebase security rules
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting to prevent abuse
- **HTTPS**: SSL/TLS encryption in production
- **CORS**: Proper CORS configuration

---

## 📊 Monitoring & Analytics

### Application Monitoring

- Firebase Analytics for user behavior
- Error tracking with Sentry
- Performance monitoring with Firebase Performance

### Model Monitoring

- Prediction accuracy tracking
- Model drift detection
- A/B testing for model improvements

---

### Development Guidelines

- Follow PEP 8 style guide
- Write unit tests for new features
- Update documentation for API changes
- Use meaningful commit messages

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## ⚠️ Disclaimer

This application is for educational and informational purposes only. It does not constitute financial advice, and users should conduct their own research before making investment decisions. The predictions and analysis provided should not be the sole basis for investment choices.

---

## 📞 Support & Contact

- **Authors**: [Aryan Mithbawkar](https://github.com/AryanMithbawkar) & [Ritesh Salunkhe](https://github.com/ritesh95-code)
- **Email**: aryanmithbawkar@gmail.com & riteshsalunkhe95@outlook.com
- **Issues**: [GitHub Issues](https://github.com/AryanMithbawkar/Stock-Market-Sentiment-Analysis-with-Historical-Stocks-Data-Combined-for-Predicting-Stock-Price-Tool/issues)
- **Documentation**: [Wiki](https://github.com/AryanMithbawkar/Stock-Market-Sentiment-Analysis-with-Historical-Stocks-Data-Combined-for-Predicting-Stock-Price-Tool/wiki)

---

## 🙏 Acknowledgments

- **FinBERT Model**: Hugging Face Transformers
- **Stock Data**: Yahoo Finance API
- **News Data**: Various financial news APIs
- **UI Components**: Bootstrap, Plotly, Three.js
- **Hosting**: Firebase Hosting

---

## 📈 Roadmap

### Version 2.0 (Q2 2025)

- [ ] Portfolio management features
- [ ] Real-time alerts and notifications
- [ ] Advanced charting tools
- [ ] Social trading features

### Version 2.1 (Q3 2025)

- [ ] Mobile app (React Native)
- [ ] Advanced ML models (Transformer-based)
- [ ] Options and derivatives analysis
- [ ] Backtesting engine

### Version 3.0 (Q4 2025)

- [ ] Multi-market support (US, UK markets)
- [ ] Cryptocurrency analysis
- [ ] AI-powered investment advisor
- [ ] Enterprise features

---

_Built with ❤️ by [Aryan Mithbawkar](https://github.com/AryanMithbawkar) & [Ritesh Salunkhe](https://github.com/ritesh95-code)_

_© 2025 MarketMind. All rights reserved._
