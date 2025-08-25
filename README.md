# RepoStar Backend API

A Node.js/Express backend API for the RepoStar GitHub repository explorer application.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Clerk (JWT-based)
- **HTTP Client**: Axios
- **Environment**: dotenv
- **CORS**: cors middleware
- **Deployment**: Vercel

## 🚀 Features

- **GitHub API Integration**: Search repositories with pagination
- **User Authentication**: Secure JWT-based auth with Clerk
- **Repository Management**: Star/unstar repositories
- **User-specific Data**: Each user has their own starred repositories
- **MongoDB Storage**: Persistent data storage
- **RESTful API**: Clean API endpoints
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or MongoDB Atlas)
- Clerk account for authentication

## ⚙️ Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=
NODE_ENV=development
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

## 🔧 Installation & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Fill in your MongoDB URI and Clerk secret key

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Start production server**:
   ```bash
   npm start
   ```

## 📚 API Endpoints

### Public Endpoints
- `GET /` - Server status and API information
- `GET /api/health` - Health check

### Protected Endpoints (Require Authentication)
- `POST /api/search` - Search GitHub repositories
- `POST /api/repositories/star` - Star/unstar a repository
- `GET /api/repositories` - Get user's starred repositories
- `GET /api/repositories/check/:url` - Check if repository is starred

## 🔐 Authentication

All API endpoints (except root and health) require a valid Clerk JWT token in the Authorization header:

```
Authorization: Bearer <clerk_jwt_token>
```

## 📊 Database Schema

### Repository Model
```javascript
{
  userId: String,        // Clerk user ID
  name: String,          // Repository name
  fullName: String,      // Full repository name (owner/repo)
  description: String,   // Repository description
  htmlUrl: String,       // GitHub URL
  stargazersCount: Number, // Star count
  language: String,      // Primary language
  owner: String,         // Repository owner
  starredAt: Date        // When user starred it
}
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard:
   - `MONGODB_URI`
   - `CLERK_SECRET_KEY`
   - `NODE_ENV=production`

### Environment Configuration
- Development: Uses `.env` file
- Production: Uses Vercel environment variables

## 🔍 API Usage Examples

### Search Repositories
```bash
curl -X POST https://your-api.vercel.app/api/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "react", "page": 1, "perPage": 10}'
```

### Star Repository
```bash
curl -X POST https://your-api.vercel.app/api/repositories/star \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "react", "full_name": "facebook/react", ...}'
```

## 🛡️ Security Features

- JWT token validation on all protected routes
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Error handling without exposing sensitive data
- Rate limiting considerations for GitHub API

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (if configured)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.