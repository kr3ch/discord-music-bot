import { EmbedBuilder } from 'discord.js';
import { Colors, Emojis } from '../config/constants';
import type { TrackInfo } from '../types/track';
import { formatDuration } from './time';
import { createProgressBar } from './progressBar';

export function successEmbed(message: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Success)
    .setDescription(`${Emojis.Success} ${message}`);
  if (title) embed.setTitle(title);
  return embed;
}

export function errorEmbed(message: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Error)
    .setDescription(`${Emojis.Error} ${message}`);
  if (title) embed.setTitle(title);
  return embed;
}

export function warnEmbed(message: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Warning)
    .setDescription(`${Emojis.Warning} ${message}`);
  if (title) embed.setTitle(title);
  return embed;
}

export function infoEmbed(message: string, title?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(Colors.Info).setDescription(message);
  if (title) embed.setTitle(title);
  return embed;
}

export function nowPlayingEmbed(track: TrackInfo, position: number, volume: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.NowPlaying)
    .setAuthor({ name: 'Now Playing' })
    .setTitle(track.title.slice(0, 256))
    .setURL(track.url)
    .addFields(
      {
        name: 'Duration',
        value: track.isLive ? '🔴 LIVE' : formatDuration(track.duration),
        inline: true,
      },
      { name: 'Author', value: track.author || 'Unknown', inline: true },
      { name: 'Source', value: track.source, inline: true },
    )
    .setFooter({ text: `Requested by ${track.requestedByTag} • Volume ${volume}%` });

  if (track.thumbnail) embed.setThumbnail(track.thumbnail);

  if (!track.isLive && track.duration > 0) {
    embed.addFields({
      name: 'Progress',
      value: `${formatDuration(position)} ${createProgressBar(position, track.duration)} ${formatDuration(track.duration)}`,
    });
  }

  return embed;
}

export function trackAddedEmbed(track: TrackInfo, queuePosition: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(Colors.Primary)
    .setAuthor({ name: 'Added to queue' })
    .setTitle(track.title.slice(0, 256))
    .setURL(track.url)
    .addFields(
      {
        name: 'Duration',
        value: track.isLive ? '🔴 LIVE' : formatDuration(track.duration),
        inline: true,
      },
      { name: 'Position', value: queuePosition === 0 ? 'Now' : `#${queuePosition}`, inline: true },
      { name: 'Source', value: track.source, inline: true },
    )
    .setFooter({ text: `Requested by ${track.requestedByTag}` });
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

export function playlistAddedEmbed(name: string, count: number, url: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Primary)
    .setAuthor({ name: 'Playlist added' })
    .setTitle(name.slice(0, 256))
    .setURL(url)
    .setDescription(`Added **${count}** tracks to the queue.`);
}
