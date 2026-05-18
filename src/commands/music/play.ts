import { GuildMember, SlashCommandBuilder, TextChannel } from 'discord.js';
import type { Command } from '../../types/command';
import { resolveQuery } from '../../music/sources';
import { errorEmbed, playlistAddedEmbed, trackAddedEmbed } from '../../utils/embeds';
import { BotError } from '../../utils/errors';
import { env } from '../../config/env';
import { createChildLogger } from '../../utils/logger';

const log = createChildLogger('cmd:play');

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription(
      'Play a track from YouTube, Spotify, SoundCloud, a direct URL or a search query.',
    )
    .addStringOption((o) =>
      o.setName('query').setDescription('Song name or URL').setRequired(true),
    ),
  inVoice: true,
  cooldown: 1500,
  async execute(interaction, client) {
    const query = interaction.options.getString('query', true);
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({
        embeds: [errorEmbed('Join a voice channel first.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const result = await resolveQuery(query, interaction.user.id, interaction.user.tag);
      if (result.tracks.length === 0) {
        await interaction.editReply({ embeds: [errorEmbed('No results found.')] });
        return;
      }

      const player = await client.music.getOrCreate(
        interaction.guildId!,
        voiceChannel,
        interaction.channel as TextChannel,
      );

      const maxQueue = env.MAX_QUEUE_SIZE;
      const available = Math.max(0, maxQueue - player.queue.length);
      const toQueue = result.tracks.slice(0, available);
      if (toQueue.length === 0) {
        await interaction.editReply({
          embeds: [errorEmbed(`Queue is full (max ${maxQueue}).`)],
        });
        return;
      }

      if (result.playlist) {
        player.enqueue(...toQueue);
        await interaction.editReply({
          embeds: [playlistAddedEmbed(result.playlist.title, toQueue.length, result.playlist.url)],
        });
      } else {
        const track = toQueue[0];
        const wasIdle = player.queue.length === 0 && !player.queue.current;
        player.enqueue(track);
        await interaction.editReply({
          embeds: [trackAddedEmbed(track, wasIdle ? 0 : player.queue.length)],
        });
      }
    } catch (err) {
      log.warn({ err, query }, 'play failed');
      const message = err instanceof BotError ? err.userMessage : 'Could not load track.';
      await interaction.editReply({ embeds: [errorEmbed(message)] });
    }
  },
};

export default command;
