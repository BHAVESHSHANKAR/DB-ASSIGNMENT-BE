const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://db-assignment-fe.vercel.app', // Replace with your actual frontend URL
        /\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Clerk authentication middleware
const requireAuth = ClerkExpressRequireAuth({
    secretKey: process.env.CLERK_SECRET_KEY
});

// Error handling middleware for Clerk
const handleClerkError = (err, req, res, next) => {
    if (err.name === 'ClerkAPIError' || err.message.includes('Unauthenticated')) {
        return res.status(401).json({
            error: 'Authentication required',
            details: 'Please sign in to access this resource'
        });
    }
    next(err);
};

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/github-search';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Repository Schema - Only for starred repositories
const repositorySchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Clerk user ID
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    description: String,
    htmlUrl: { type: String, required: true },
    stargazersCount: { type: Number, default: 0 },
    language: String,
    owner: { type: String, required: true },
    starredAt: { type: Date, default: Date.now }
});

// Ensure unique starred repos per user
repositorySchema.index({ userId: 1, htmlUrl: 1 }, { unique: true });

const Repository = mongoose.model('Repository', repositorySchema);

// Routes
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 RepoStar API Server is running!',
        status: 'active',
        endpoints: {
            search: 'POST /api/search',
            star: 'POST /api/repositories/star',
            starred: 'GET /api/repositories',
            check: 'GET /api/repositories/check/:url'
        },
        authentication: 'Clerk JWT required for all API endpoints'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Search repositories (no longer stores results automatically)
app.post('/api/search', requireAuth, async (req, res) => {
    try {
        const { keyword, page = 1, perPage = 10 } = req.body;
        const userId = req.auth.userId;

        console.log('Search request - User ID:', userId, 'Keyword:', keyword);

        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        // Fetch from GitHub API with better error handling
        const githubResponse = await axios.get('https://api.github.com/search/repositories', {
            params: {
                q: keyword,
                sort: 'stars',
                order: 'desc',
                page: page,
                per_page: perPage
            },
            timeout: 10000,
            headers: {
                'User-Agent': 'RepoStar-App'
            }
        });

        const repositories = githubResponse.data.items;

        // Check which repositories are already starred by this user
        const starredUrls = await Repository.find({
            userId,
            htmlUrl: { $in: repositories.map(repo => repo.html_url) }
        }).distinct('htmlUrl');

        // Add starred status to each repository
        const repositoriesWithStarStatus = repositories.map(repo => ({
            ...repo,
            isStarred: starredUrls.includes(repo.html_url)
        }));

        res.json({
            keyword,
            totalCount: githubResponse.data.total_count,
            repositories: repositoriesWithStarStatus,
            page,
            perPage
        });

    } catch (error) {
        console.error('Search error details:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            config: error.config
        });
        
        if (error.response?.status === 403) {
            return res.status(403).json({
                error: 'GitHub API rate limit exceeded',
                details: 'Please try again later'
            });
        }
        
        res.status(500).json({
            error: 'Failed to search repositories',
            details: error.response?.data?.message || error.message
        });
    }
});

// Star/Unstar repository
app.post('/api/repositories/star', requireAuth, async (req, res) => {
    try {
        const { name, full_name, description, html_url, stargazers_count, language, owner } = req.body;
        const userId = req.auth.userId;

        // Check if repository is already starred
        const existingRepo = await Repository.findOne({
            userId,
            htmlUrl: html_url
        });

        if (existingRepo) {
            // Unstar - remove from database
            await Repository.deleteOne({ _id: existingRepo._id });
            return res.json({ message: 'Repository unstarred', starred: false });
        } else {
            // Star - add to database
            const repository = new Repository({
                userId,
                name,
                fullName: full_name,
                description,
                htmlUrl: html_url,
                stargazersCount: stargazers_count,
                language,
                owner: owner.login
            });

            await repository.save();
            return res.status(201).json({ message: 'Repository starred', starred: true, repository });
        }
    } catch (error) {
        console.error('Error starring repository:', error);
        res.status(500).json({ message: 'Error starring repository' });
    }
});

// Get all starred repositories
app.get('/api/repositories', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.auth.userId;
        const skip = (page - 1) * limit;

        const repositories = await Repository.find({ userId })
            .sort({ starredAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Repository.countDocuments({ userId });

        res.json({
            repositories,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get starred repositories error:', error);
        res.status(500).json({ error: 'Failed to fetch starred repositories' });
    }
});

// Check if repository is starred
app.get('/api/repositories/check/:url', requireAuth, async (req, res) => {
    try {
        const decodedUrl = decodeURIComponent(req.params.url);
        const userId = req.auth.userId;

        const repository = await Repository.findOne({
            userId,
            htmlUrl: decodedUrl
        });

        res.json({ starred: !!repository });
    } catch (error) {
        console.error('Error checking repository:', error);
        res.status(500).json({ message: 'Error checking repository' });
    }
});

// Use error handling middleware
app.use(handleClerkError);

// General error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Clerk Secret Key configured:', !!process.env.CLERK_SECRET_KEY);
});