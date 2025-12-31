const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

class DiscordService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.guild = null;
    this.sessionCategory = null;
    this.announcementChannel = null;
  }

  // Initialize the Discord bot
  async initialize() {
    if (this.client) {
      console.log('Discord bot already initialized');
      return;
    }

    // Check if Discord is configured
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.warn('⚠️ Discord bot token not configured. Session Discord features will be disabled.');
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ]
    });

    // Event handlers
    this.client.once('ready', () => {
      console.log(`✅ Discord bot logged in as ${this.client.user.tag}`);
      this.isReady = true;
      this.setupGuild();
    });

    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState);
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to login Discord bot:', error);
      this.client = null;
    }
  }

  // Setup guild references
  async setupGuild() {
    try {
      this.guild = await this.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      
      if (process.env.DISCORD_SESSION_CATEGORY_ID) {
        this.sessionCategory = await this.guild.channels.fetch(process.env.DISCORD_SESSION_CATEGORY_ID);
      }
      
      if (process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID) {
        this.announcementChannel = await this.guild.channels.fetch(process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID);
      }
      
      console.log(`✅ Discord guild setup complete: ${this.guild.name}`);
    } catch (error) {
      console.error('Failed to setup Discord guild:', error);
    }
  }

  // Check if bot is ready
  ensureReady() {
    if (!this.isReady || !this.client || !this.guild) {
      throw new Error('Discord bot is not ready');
    }
  }

  // Create a voice channel for a session
  async createSessionChannel(session) {
    this.ensureReady();

    try {
      const channelName = `📚 ${session.title}`.substring(0, 100);
      
      const channel = await this.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: this.sessionCategory?.id,
        userLimit: session.maxParticipants,
        reason: `Study session created by ${session.host.username || 'user'}`,
      });

      // Create an invite link
      const invite = await channel.createInvite({
        maxAge: session.duration * 60 + 3600, // Session duration + 1 hour buffer
        maxUses: session.maxParticipants * 2, // Allow some re-joins
        unique: true,
        reason: 'Session invite link'
      });

      // Send announcement
      let messageId = null;
      if (this.announcementChannel) {
        const embed = this.createSessionEmbed(session, invite.url);
        const message = await this.announcementChannel.send({ embeds: [embed] });
        messageId = message.id;
      }

      return {
        channelId: channel.id,
        channelName: channel.name,
        inviteLink: invite.url,
        inviteCode: invite.code,
        guildId: this.guild.id,
        messageId
      };
    } catch (error) {
      console.error('Failed to create session channel:', error);
      throw error;
    }
  }

  // Create an embed for session announcement
  createSessionEmbed(session, inviteUrl) {
    const startTime = new Date(session.scheduledAt);
    const embed = new EmbedBuilder()
      .setColor(0x0073a0)
      .setTitle(`📚 ${session.title}`)
      .setDescription(session.description || 'Join this study session!')
      .addFields(
        { name: '📖 Subject', value: session.subject, inline: true },
        { name: '👤 Host', value: session.host.username || 'Unknown', inline: true },
        { name: '⏱️ Duration', value: `${session.duration} minutes`, inline: true },
        { name: '👥 Max Participants', value: `${session.maxParticipants}`, inline: true },
        { name: '🕐 Starts', value: session.isImmediate ? 'Now!' : `<t:${Math.floor(startTime.getTime() / 1000)}:R>`, inline: true },
      )
      .setURL(inviteUrl)
      .setTimestamp()
      .setFooter({ text: 'Mindora Study Sessions' });

    if (session.tags && session.tags.length > 0) {
      embed.addFields({ name: '🏷️ Tags', value: session.tags.join(', '), inline: false });
    }

    return embed;
  }

  // Delete a session channel
  async deleteSessionChannel(channelId) {
    if (!this.isReady || !this.client) {
      console.warn('Discord bot not ready, skipping channel deletion');
      return;
    }

    try {
      const channel = await this.guild.channels.fetch(channelId);
      if (channel) {
        await channel.delete('Session ended');
        console.log(`Deleted Discord channel: ${channelId}`);
      }
    } catch (error) {
      console.error('Failed to delete session channel:', error);
    }
  }

  // Update announcement message
  async updateAnnouncementMessage(messageId, session, status) {
    if (!this.announcementChannel || !messageId) return;

    try {
      const message = await this.announcementChannel.messages.fetch(messageId);
      
      const embed = new EmbedBuilder()
        .setColor(status === 'ended' ? 0x808080 : status === 'live' ? 0x00ff00 : 0x0073a0)
        .setTitle(`${status === 'live' ? '🔴 LIVE: ' : status === 'ended' ? '✅ Ended: ' : '📚 '}${session.title}`)
        .setDescription(session.description || '')
        .addFields(
          { name: 'Status', value: status.toUpperCase(), inline: true },
          { name: 'Participants', value: `${session.currentParticipantCount}/${session.maxParticipants}`, inline: true }
        )
        .setTimestamp();

      await message.edit({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to update announcement:', error);
    }
  }

  // Handle voice state updates (user joins/leaves voice channel)
  async handleVoiceStateUpdate(oldState, newState) {
    // This will be called by Discord.js when users join/leave voice channels
    // We'll emit events that can be handled by the session controller
    
    const userId = newState.member?.id || oldState.member?.id;
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    if (oldChannelId !== newChannelId) {
      if (newChannelId && !oldChannelId) {
        // User joined a voice channel
        this.emit('voiceJoin', { channelId: newChannelId, discordUserId: userId });
      } else if (oldChannelId && !newChannelId) {
        // User left a voice channel
        this.emit('voiceLeave', { channelId: oldChannelId, discordUserId: userId });
      } else {
        // User moved between channels
        this.emit('voiceLeave', { channelId: oldChannelId, discordUserId: userId });
        this.emit('voiceJoin', { channelId: newChannelId, discordUserId: userId });
      }
    }
  }

  // Simple event emitter functionality
  _events = {};
  
  on(event, callback) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
  }

  emit(event, data) {
    if (this._events[event]) {
      this._events[event].forEach(callback => callback(data));
    }
  }

  // Get voice channel participant count
  async getChannelParticipantCount(channelId) {
    if (!this.isReady) return 0;

    try {
      const channel = await this.guild.channels.fetch(channelId);
      if (channel && channel.type === ChannelType.GuildVoice) {
        return channel.members.size;
      }
    } catch (error) {
      console.error('Failed to get participant count:', error);
    }
    return 0;
  }

  // Get the Discord invite URL for the server
  getServerInvite() {
    return process.env.DISCORD_SERVER_INVITE || null;
  }

  // Check if Discord is configured and ready
  isConfigured() {
    return this.isReady && this.client && this.guild;
  }

  // Shutdown the bot
  async shutdown() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      console.log('Discord bot shut down');
    }
  }
}

// Export singleton instance
const discordService = new DiscordService();
module.exports = discordService;
