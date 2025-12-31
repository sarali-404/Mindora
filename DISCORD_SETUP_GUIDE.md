# Mindora Discord Integration Setup Guide

This guide walks you through setting up Discord bot integration for study sessions in Mindora.

## Overview

The Mindora platform uses Discord voice channels to host study sessions. When users create sessions, the application automatically:
- Creates a dedicated Discord voice channel
- Generates an invite link for participants
- Manages channel lifecycle (creation/deletion)
- Tracks participant joining/leaving
- Displays live status in the app

## Step 1: Create a Discord Server

1. Go to [Discord.com](https://discord.com)
2. Log in to your account (create one if needed)
3. Click the "+" icon on the left sidebar
4. Select "Create My Own"
5. Enter a server name (e.g., "Mindora Study Sessions")
6. Choose a region closest to your users
7. Click "Create"

## Step 2: Create Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Enter your app name: "Mindora Bot"
4. Accept the terms and click "Create"
5. Navigate to the "Bot" tab on the left
6. Click "Add Bot"
7. Under the TOKEN section, click "Copy" to copy your bot token
   - **Save this token securely** - you'll need it for the `.env` file

## Step 3: Configure Bot Permissions

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

## Step 4: Set Up Server Channels and Categories

### Create Session Category

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

### Create Announcement Channel

1. Right-click in the left sidebar
2. Select "Create Channel" (Text Channel)
3. Name it: **session-announcements**
4. Select "Study Sessions" as the category
5. Right-click the channel, go to "Permissions"
6. Ensure the bot can send messages here
7. This channel will display session announcements

### (Optional) Create Welcome/Info Channel

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

## Step 5: Get Server Configuration IDs

### Find Your Guild ID (Server ID)

1. Enable Developer Mode in Discord:
   - Go to User Settings > Advanced > Developer Mode (toggle ON)
2. Right-click your server name
3. Click "Copy Server ID"
4. Save this as your `DISCORD_GUILD_ID`

### Find Session Category ID

1. Right-click the "Study Sessions" category
2. Click "Copy Channel ID"
3. Save this as your `DISCORD_SESSION_CATEGORY_ID`

### Find Announcement Channel ID

1. Right-click the "session-announcements" channel
2. Click "Copy Channel ID"
3. Save this as your `DISCORD_ANNOUNCEMENT_CHANNEL_ID`

## Step 6: Configure Environment Variables

Create or update your `.env` file in the `server/` directory with:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_SESSION_CATEGORY_ID=your_session_category_id_here
DISCORD_ANNOUNCEMENT_CHANNEL_ID=your_announcement_channel_id_here
```

### Example (DO NOT USE - for reference only):
```env
DISCORD_BOT_TOKEN=MTk4NjIyNDgzNTgxODI4MzA1.Cjl2cA.ZnCjm1XY-PFHyHXY
DISCORD_GUILD_ID=123456789012345678
DISCORD_SESSION_CATEGORY_ID=234567890123456789
DISCORD_ANNOUNCEMENT_CHANNEL_ID=345678901234567890
```

## Step 7: Test the Setup

1. Start your Mindora server:
   ```bash
   cd server
   npm start
   ```

2. Check the console for:
   ```
   ✅ Discord bot logged in as Mindora Bot#0000
   ```

3. In the client, navigate to `/app/sessions`
4. Create a test study session as a verified user
5. The Discord bot should create a new voice channel in "Study Sessions" category
6. An announcement should appear in session-announcements channel

## Troubleshooting

### Bot Not Logging In
- Check that `DISCORD_BOT_TOKEN` is correct
- Verify the bot is in your server (check member list)
- Ensure bot has proper permissions

### Bot Can't Create Channels
- Verify `DISCORD_SESSION_CATEGORY_ID` is correct
- Check that bot role has "Manage Channels" permission
- Ensure bot role is positioned above other roles in server settings

### No Announcement Messages
- Verify `DISCORD_ANNOUNCEMENT_CHANNEL_ID` is correct
- Check that bot can post in that channel
- Ensure channel permissions allow bot to send messages

### Guest Users Can't Join Sessions
- Verify the Discord invite link is correct
- Check that guest account has access to the server
- Ensure guest can access voice channels

## Hosting the Discord Bot

The Discord bot runs as part of the Mindora server process. You have two options:

### Option 1: Local Development
- Run the bot locally while developing
- The bot will be online only when your server is running
- Good for testing

### Option 2: Production Hosting
For production, deploy your server to a hosting platform:

#### Using Heroku (Free tier no longer available)
#### Using Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project
4. Connect your GitHub repository
5. Add environment variables (Discord tokens, DB config, etc.)
6. Deploy

#### Using Replit
1. Go to [replit.com](https://replit.com)
2. Import your repository
3. Set up environment variables
4. Create a repl that runs `npm start` in the server directory

#### Using AWS, Azure, or Google Cloud
- Deploy as a Node.js application
- Set up environment variables in your hosting platform
- Configure auto-scaling if needed

## Important Security Notes

⚠️ **Never commit these values to version control:**
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_SESSION_CATEGORY_ID`
- `DISCORD_ANNOUNCEMENT_CHANNEL_ID`

Always use `.env` files and add `.env` to your `.gitignore`.

## Advanced Configuration

### Customizing Bot Behavior

Edit `server/src/services/discordService.js` to customize:
- Channel naming convention (currently: `session-{title}-{id}`)
- Announcement message format
- Voice state tracking
- Permission settings for auto-created channels

### Channel Auto-Cleanup

Sessions are automatically ended after the scheduled duration. Channels are deleted when:
- Session ends (automatically)
- Session is cancelled by host
- Session expires after 24 hours

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure bot has proper Discord server permissions
4. Review Discord Developer Portal documentation

---

**Last Updated:** December 31, 2025
