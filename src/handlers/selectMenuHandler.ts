import { GuildMember, StringSelectMenuInteraction, TextChannel } from 'discord.js';
import type { BotClient } from '../client';
import { errorEmbed, trackAddedEmbed } from '../utils/embeds';
import { createChildLogger } from '../utils/logger';
import type { TrackInfo } from '../types/track';

const log = createChildLogger('select-handler');

// Cache for active search results: customId → tracks
const searchCache = new Map<string, TrackInfo[]>();

export function cacheSearchResults(customId: string, tracks: TrackInfo[]): void {
  searchCache.set(customId, tracks);
  setTimeout(() => searchCache.delete(customId), 60_000);
}

export async function handleSelectMenu(
  interaction: StringSelectMenuInteraction,
  client: BotClient,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guildId) return;
  if (!interaction.customId.startsWith('search:')) return;

  const cached = searchCache.get(interaction.customId);
  if (!cached) {
    await interaction.update({
      embeds: [errorEmbed('Search results expired. Try again.')],
      components: [],
    });
    return;
  }

  const idx = Number(interaction.values[0]);
  const track = cached[idx];
  if (!track) {
    await interaction.update({
      embeds: [errorEmbed('Invalid selection.')],
      components: [],
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.update({
      embeds: [errorEmbed('Join a voice channel first.')],
      components: [],
    });
    return;
  }

  try {
    const player = await client.music.getOrCreate(
      interaction.guildId,
      voiceChannel,
      interaction.channel as TextChannel,
    );
    track.requestedBy = interaction.user.id;
    track.requestedByTag = interaction.user.tag;
    player.enqueue(track);
    const position = player.queue.length;
    await interaction.update({
      embeds: [trackAddedEmbed(track, position)],
      components: [],
    });
    searchCache.delete(interaction.customId);
  } catch (err) {
    log.error({ err }, 'Select-menu play error');
    await interaction.update({
      embeds: [errorEmbed('Could not start playback.')],
      components: [],
    });
  }
}
