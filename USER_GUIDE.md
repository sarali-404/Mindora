# Mindora User Guide

## Overview

Mindora is a comprehensive learning platform that combines goal tracking, AI-powered content generation, gamification, and community study sessions. The platform helps users achieve their learning objectives through personalized goals, intelligent content creation, and social accountability.

## System Requirements

### Minimum Hardware Requirements
- **Processor**: Intel Core i3 or equivalent (2 GHz or higher)
- **Memory**: 4 GB RAM
- **Storage**: 500 MB free disk space
- **Network**: Stable internet connection (minimum 5 Mbps)

### Software Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 16.0 or higher
- **MongoDB**: Version 5.0 or higher (or MongoDB Atlas cloud instance)
- **Web Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Optional Requirements (for full functionality)
- **Discord Account**: For study session voice channels
- **Google Account**: For OAuth authentication
- **Email Account**: For notifications and password reset

## Installation and Setup

### Prerequisites Installation

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose LTS version (recommended: 18.x or 20.x)
   - Verify installation: `node --version` and `npm --version`

2. **Set up MongoDB**
   - Option A: Local MongoDB
     - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
     - Install and start MongoDB service
   - Option B: MongoDB Atlas (recommended for demo)
     - Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
     - Create a free cluster
     - Get connection string from "Connect" > "Connect your application"

### Project Setup

1. **Clone or Download the Project**
   ```bash
   git clone <repository-url>
   cd mindora
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies (client and server)
   npm run install-all
   ```

3. **Configure Environment Variables**

   Create `.env` file in the `server/` directory:

   ```env
   # Server Configuration
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/mindora
   JWT_SECRET=your_secure_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=your_google_client_id

   # Email Service (optional)
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   # Discord Configuration (optional)
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_GUILD_ID=your_discord_server_id
   DISCORD_SESSION_CATEGORY_ID=your_category_id
   DISCORD_ANNOUNCEMENT_CHANNEL_ID=your_channel_id

   # AI Service (required for AI features)
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Start the Application**
   ```bash
   # Start both client and server
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Discord Integration Setup (Optional)

The Mindora platform uses Discord voice channels to host study sessions. When users create sessions, the application automatically creates dedicated Discord voice channels, generates invite links for participants, manages channel lifecycle, and tracks participant activity.

### Step 1: Create a Discord Server

1. Go to [Discord.com](https://discord.com)
2. Log in to your account (create one if needed)
3. Click the "+" icon on the left sidebar
4. Select "Create My Own"
5. Enter a server name (e.g., "Mindora Study Sessions")
6. Choose a region closest to your users
7. Click "Create"

### Step 2: Create Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter your app name: "Mindora Bot"
4. Accept the terms and click "Create"
5. Navigate to the "Bot" tab on the left
6. Click "Add Bot"
7. Under the TOKEN section, click "Copy" to copy your bot token
   - **Save this token securely** - you'll need it for the `.env` file

### Step 3: Configure Bot Permissions

1. In the Developer Portal, go to "OAuth2" > "URL Generator"
2. Under "SCOPES", select:
   - `bot`
3. Under "PERMISSIONS", select:
   - `Manage Channels`
   - `Manage Guild Expressions`
   - `View Channels`
   - `Connect`
   - `Speak`
   - `Use Voice Activity`
   - `Send Messages`
   - `Read Message History`
   - `Embed Links`

4. Copy the generated URL and open it in a new tab
5. Select your Mindora server from the dropdown
6. Click "Authorize"

### Step 4: Set Up Server Channels and Categories

#### Create Session Category

1. Go to your Discord server
2. Right-click in the left sidebar (in the channels area)
3. Select "Create Category"
4. Name it: **Study Sessions**
5. Right-click the category and select "Edit Category"
6. Go to "Permissions" tab
7. Make sure `@everyone` role has:
   - ✅ View Channel
   - ❌ Connect (only bot should auto-connect)
8. Save changes

#### Create Announcement Channel

1. Right-click in the left sidebar
2. Select "Create Channel" (Text Channel)
3. Name it: **session-announcements**
4. Select "Study Sessions" as the category
5. Right-click the channel, go to "Permissions"
6. Ensure the bot can send messages here
7. This channel will display session announcements

#### (Optional) Create Welcome/Info Channel

1. Create another text channel: **session-info**
2. Add information about how to use study sessions
3. Example message:
   ```
   📚 **Study Session Guidelines**
   - Join sessions created by verified users
   - Be respectful and professional
   - Sessions are recorded for learning purposes
   - Report any inappropriate behavior
   ```

### Step 5: Get Server Configuration IDs

#### Find Your Guild ID (Server ID)

1. Enable Developer Mode in Discord:
   - Go to User Settings > Advanced > Developer Mode (toggle ON)
2. Right-click your server name
3. Click "Copy Server ID"
4. Save this as your `DISCORD_GUILD_ID`

#### Find Session Category ID

1. Right-click the "Study Sessions" category
2. Click "Copy Channel ID"
3. Save this as your `DISCORD_SESSION_CATEGORY_ID`

#### Find Announcement Channel ID

1. Right-click the "session-announcements" channel
2. Click "Copy Channel ID"
3. Save this as your `DISCORD_ANNOUNCEMENT_CHANNEL_ID`

### Step 6: Configure Environment Variables

Update your `.env` file in the `server/` directory with the Discord configuration:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_SESSION_CATEGORY_ID=your_session_category_id_here
DISCORD_ANNOUNCEMENT_CHANNEL_ID=your_announcement_channel_id_here
```

### Step 7: Test the Setup

1. Restart your Mindora server
2. Check the console for:
   ```
   ✅ Discord bot logged in as Mindora Bot#0000
   ```

3. In the client, navigate to `/app/sessions`
4. Create a test study session as a verified user
5. The Discord bot should create a new voice channel in "Study Sessions" category
6. An announcement should appear in session-announcements channel

### Discord Integration Troubleshooting

#### Bot Not Logging In
- Check that `DISCORD_BOT_TOKEN` is correct
- Verify the bot is in your server (check member list)
- Ensure bot has proper permissions

#### Bot Can't Create Channels
- Verify `DISCORD_SESSION_CATEGORY_ID` is correct
- Check that bot role has "Manage Channels" permission
- Ensure bot role is positioned above other roles in server settings

#### No Announcement Messages
- Verify `DISCORD_ANNOUNCEMENT_CHANNEL_ID` is correct
- Check that bot can post in that channel
- Ensure channel permissions allow bot to send messages

#### Guest Users Can't Join Sessions
- Verify the Discord invite link is correct
- Check that guest account has access to the server
- Ensure guest can access voice channels

### Hosting the Discord Bot

The Discord bot runs as part of the Mindora server process. For production deployment, consider platforms like Railway, Replit, or cloud providers (AWS, Azure, Google Cloud) that support persistent Node.js applications.

**Security Note**: Never commit Discord tokens to version control. Always use `.env` files and add `.env` to your `.gitignore`.

## Using Mindora

### Getting Started

1. **Registration/Login**
   - Visit http://localhost:5173
   - Click "Sign Up" to create an account
   - Alternatively, use Google OAuth if configured
   - Verify your email if email service is set up

2. **Dashboard Overview**
   - View your learning progress and statistics
   - See active goals, upcoming sessions, and achievements
   - Access quick actions for creating goals and joining sessions

### Goal Management

1. **Creating Goals**
   - Navigate to "Goals" > "Create Goal"
   - Enter goal title, description, and deadline
   - Select subject category and difficulty level
   - Set privacy settings (public/private)

2. **AI Content Generation**
   - For each goal, generate:
     - Study notes
     - Practice quizzes
     - Essay prompts
     - Topic summaries
   - Content adapts based on your learning progress

3. **Progress Tracking**
   - Mark content as read/completed
   - View progress charts and analytics
   - Receive recommendations for weak areas

### Study Sessions

1. **Creating Sessions**
   - Go to "Sessions" > "Create Session"
   - Set session topic, date/time, and duration
   - Choose privacy settings
   - If Discord is configured, a dedicated voice channel will be automatically created

2. **Joining Sessions**
   - Browse available sessions on the Sessions page
   - Join public sessions or accept invitations
   - Use integrated Discord voice channels for audio communication (if configured)
   - Click the Discord invite link to join the voice channel automatically

3. **Session Management**
   - Host controls: start/end session, manage participants
   - Real-time participant tracking in both the app and Discord
   - Session recordings and summaries
   - Automatic channel cleanup when sessions end
   - Announcements posted in Discord announcement channel

4. **Discord Integration Features**
   - Automatic voice channel creation per session
   - Live participant count synchronization
   - Session announcements and updates
   - Voice activity tracking for attendance
   - Secure invite links for participants

### Gamification Features

1. **XP and Levels**
   - Earn XP for completing goals, attending sessions, and uploading materials
   - Progress through Bronze → Silver → Gold levels
   - View level progression on dashboard

2. **Achievements**
   - Unlock achievements for various accomplishments
   - View achievement gallery in profile
   - Share achievements with community

3. **Leaderboards**
   - Compete with other learners
   - View global and subject-specific rankings
   - Track your position and progress

### Community Features

1. **Friends and Networking**
   - Send friend requests to other users
   - View friends' public goals and achievements
   - Collaborate on study sessions

2. **Library Sharing**
   - Browse AI-generated content from other users
   - Access public study materials
   - Save and organize favorite resources

### Profile and Settings

1. **Profile Management**
   - Update personal information and avatar
   - View detailed statistics and progress
   - Manage uploaded materials

2. **Notification Preferences**
   - Configure email and in-app notifications
   - Set reminder preferences
   - Choose theme and privacy settings

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   - Check Node.js and npm versions
   - Ensure MongoDB is running
   - Verify environment variables in `.env` file
   - Check console for error messages

2. **Database Connection Issues**
   - Verify MongoDB URI in `.env`
   - Check network connectivity for MongoDB Atlas
   - Ensure MongoDB service is running (local installation)

3. **AI Features Not Working**
   - Verify GROQ_API_KEY in `.env`
   - Check API rate limits (free tier: 30 requests/minute)
   - Ensure stable internet connection

4. **Discord Integration Issues**
   - Verify bot token and server IDs
   - Ensure bot has proper permissions
   - Check Discord server configuration

### Performance Optimization

- Close unused browser tabs
- Clear browser cache periodically
- Restart server if experiencing slowdowns
- Monitor MongoDB connection pool

## API Documentation

The Mindora API is available at `http://localhost:5000/api` with the following main endpoints:

- `/auth/*` - Authentication and user management
- `/goals/*` - Goal creation and management
- `/gamification/*` - XP, achievements, and leaderboards
- `/sessions/*` - Study session management
- `/materials/*` - File upload and management
- `/notifications/*` - Notification system
- `/friends/*` - Social features

## Support and Resources

- **Documentation**: Check project README and setup guides
- **Logs**: Server logs available in terminal/console
- **Database**: Access MongoDB directly for data inspection
- **Community**: Join Discord server for user discussions

## Security Notes

- Keep environment variables secure and never commit to version control
- Use strong passwords for all accounts
- Regularly update dependencies for security patches
- Monitor server logs for suspicious activity

---

*This guide is for demonstration and development purposes. For production deployment, additional security measures and performance optimizations are required.*</content>
<parameter name="filePath">d:\3Y 1SEM\FYP\mindora\USER_GUIDE.md