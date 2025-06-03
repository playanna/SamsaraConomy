# SamsaraConomy
SamsaraConomy bot maintained by oliviajeong

## Environment Setup

This Discord bot requires several environment variables to function properly. Follow these steps to set up your environment:

### 1. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values in your `.env` file:

#### Required Variables:
- `TOKEN` - Your Discord bot token from the Discord Developer Portal
- `CLIENT_ID` - Your Discord application's client ID
- `GUILD_ID` - The Discord server ID where the bot will operate
- `MONGODB_URI` - Your MongoDB connection string

#### Optional Variables:
- `GITHUB_USERNAME` - GitHub username for image fetching feature
- `GITHUB_REPO_NAME` - GitHub repository name for images
- `GITHUB_BRANCH` - GitHub branch (default: main)
- `GITHUB_PAT` - GitHub Personal Access Token for private repos
- `GAMBLING_GOD_CHANNEL_ID` - Channel ID for gambling god announcements
- `NODE_ENV` - Environment mode (development/production)

### 2. Installation

```bash
npm install
```

### 3. Running the Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Security Notes

- **Never commit your `.env` file** - it contains sensitive information
- The `.env.example` file shows the required format without actual values
- Your `.env` file is already listed in `.gitignore` for protection
- Keep your Discord bot token and MongoDB credentials secure
