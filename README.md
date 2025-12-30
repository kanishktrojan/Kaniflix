# 🎬 KANIFLIX

A Netflix-quality streaming platform built with modern web technologies. This production-ready application features a premium UI/UX, secure backend architecture, and seamless video playback experience.

![KANIFLIX Banner](https://via.placeholder.com/1200x400/141414/E50914?text=KANIFLIX)

## ✨ Features

### 🎯 Core Features
- **Premium Netflix-style UI** - Dark theme, smooth animations, responsive design
- **Content Discovery** - Browse movies, TV shows, trending content
- **Search** - Real-time search with category filters (movies, TV, people)
- **Video Streaming** - Secure video playback with progress tracking
- **User Authentication** - JWT-based auth with access & refresh tokens
- **Watchlist** - Save favorite content for later
- **Continue Watching** - Resume playback from where you left off
- **TV Series Support** - Season/episode navigation

### 🔒 Security Features
- **Secure Stream URLs** - Video sources never exposed to client
- **Token-based Auth** - HTTP-only cookies for refresh tokens
- **Rate Limiting** - Protection against abuse
- **Input Validation** - All inputs validated and sanitized
- **Account Lockout** - Protection against brute force attacks

### 🎨 UI/UX Features
- **Skeleton Loading** - Content placeholders during loading
- **Lazy Loading** - Images load as you scroll
- **Smooth Animations** - Framer Motion transitions
- **Responsive Design** - Works on all screen sizes
- **Keyboard Navigation** - Full keyboard support in video player

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library with concurrent features
- **TypeScript** - Type safety throughout
- **Vite** - Fast build tool & dev server
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Animations & transitions
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state & caching
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiter** - Request throttling

### External APIs
- **TMDB API** - Movie & TV show metadata
- **Vidrock** - Video streaming (embedded)

## 📁 Project Structure

```
kaniflix/
├── client/                     # Frontend React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── ui/            # Base UI components
│   │   │   ├── media/         # Media-specific components
│   │   │   ├── layout/        # Layout components
│   │   │   └── player/        # Video player components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layer
│   │   ├── store/             # Zustand stores
│   │   ├── types/             # TypeScript definitions
│   │   ├── utils/             # Utility functions
│   │   └── router/            # Route configuration
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                     # Backend Express application
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Route handlers
│   │   ├── middlewares/       # Express middlewares
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utility classes
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- TMDB API Key (free at themoviedb.org)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/kaniflix.git
cd kaniflix
```

2. **Setup Backend**
```bash
cd server
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values:
# - MONGODB_URI: Your MongoDB connection string
# - TMDB_API_KEY: Your TMDB API key
# - JWT_SECRET: A secure random string
# - JWT_REFRESH_SECRET: Another secure random string
```

3. **Setup Frontend**
```bash
cd ../client
npm install
```

### Running the Application

1. **Start MongoDB** (if running locally)
```bash
mongod
```

2. **Start the backend server**
```bash
cd server
npm run dev
```
Server runs at `http://localhost:5000`

3. **Start the frontend**
```bash
cd client
npm run dev
```
Application runs at `http://localhost:5173`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### Content Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movies/trending` | Get trending movies |
| GET | `/api/movies/popular` | Get popular movies |
| GET | `/api/movies/:id` | Get movie details |
| GET | `/api/tv/trending` | Get trending TV shows |
| GET | `/api/tv/popular` | Get popular TV shows |
| GET | `/api/tv/:id` | Get TV show details |
| GET | `/api/tv/:id/season/:seasonNumber` | Get season details |
| GET | `/api/search?query=` | Search content |

### User Content Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/watchlist` | Get user's watchlist |
| POST | `/api/user/watchlist` | Add to watchlist |
| DELETE | `/api/user/watchlist/:id` | Remove from watchlist |
| GET | `/api/user/history` | Get watch history |
| POST | `/api/user/history` | Update watch progress |

### Stream Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stream/movie/:id` | Get movie stream config |
| GET | `/api/stream/tv/:id` | Get TV stream config |

## 🔐 Security Considerations

### Stream URL Protection
Video streaming URLs are never exposed to the client. The backend acts as a secure proxy:

1. Client requests stream for a specific content ID
2. Backend validates the user's session
3. Backend generates a signed, time-limited URL
4. Client receives only the embed configuration
5. Embed URL expires after a short period

### Authentication Flow
1. User logs in → receives access token (15min) + refresh token (7d)
2. Access token sent in Authorization header
3. Refresh token stored in HTTP-only cookie
4. On access token expiry, automatic refresh
5. Refresh token rotation on each refresh

## 🎨 Design System

### Colors
```css
--primary: #E50914      /* Netflix Red */
--background: #141414   /* Dark Background */
--surface: #1F1F1F      /* Card Background */
--text: #FFFFFF         /* Primary Text */
--text-muted: #808080   /* Secondary Text */
```

### Typography
- **Headings**: Inter/System UI, Bold
- **Body**: Inter/System UI, Regular
- **UI Elements**: Inter/System UI, Medium

### Spacing Scale
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

## 🧪 Testing

```bash
# Run frontend tests
cd client
npm test

# Run backend tests
cd server
npm test
```

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/DigitalOcean)
```bash
cd server
npm run build
npm start
```

### Environment Variables for Production
- Set all `.env` variables in your hosting platform
- Use strong, unique secrets for JWT
- Enable HTTPS in production
- Set appropriate CORS origins

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the content API
- [Netflix](https://netflix.com) for UI/UX inspiration
- All the amazing open-source libraries used in this project

---

**⭐ If you found this project useful, please consider giving it a star!**

Made with ❤️ by Your Name
