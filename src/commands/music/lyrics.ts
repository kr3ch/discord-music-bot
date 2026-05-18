import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { env } from '../../config/env';
import { Colors } from '../../config/constants';
import { errorEmbed } from '../../utils/embeds';
import { createChildLogger } from '../../utils/logger';

const log = createChildLogger('cmd:lyrics');

async function fetchGenius(
  query: string,
): Promise<{ title: string; url: string; snippet: string } | null> {
  if (!env.GENIUS_TOKEN) return null;
  const res = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${env.GENIUS_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    response: { hits: { result: { full_title: string; url: string } }[] };
  };
  const hit = data.response?.hits?.[0]?.result;
  if (!hit) return null;
  return {
    title: hit.full_title,
    url: hit.url,
    snippet: 'Open the link above to view full lyrics on Genius.',
  };
}

async function fetchLyricsOvh(
  query: string,
): Promise<{ title: string; url: string; snippet: string } | null> {
  const parts = query.split(/\s*[-–]\s*/);
  let artist = parts[0]?.trim();
  let title = parts[1]?.trim();
  if (!title) {
    title = parts[0]?.trim();
    artist = '';
  }
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { lyrics?: string; error?: string };
  if (!data.lyrics) return null;
  return {
    title: `${artist ? artist + ' — ' : ''}${title}`,
    url: 'https://lyrics.ovh',
    snippet: data.lyrics.slice(0, 3500),
  };
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get lyrics for a song.')
    .addStringOption((o) =>
      o.setName('song').setDescription('Song name (defaults to current track)'),
    ),
  cooldown: 3000,
  async execute(interaction, client) {
    let query = interaction.options.getString('song') ?? '';
    if (!query) {
      const player = client.music.get(interaction.guildId!);
      if (!player?.queue.current) {
        await interaction.reply({
          embeds: [errorEmbed('Provide a song name or play something first.')],
          ephemeral: true,
        });
        return;
      }
      query = `${player.queue.current.author} - ${player.queue.current.title}`;
    }

    await interaction.deferReply();
    try {
      const result = (await fetchGenius(query)) ?? (await fetchLyricsOvh(query));
      if (!result) {
        await interaction.editReply({ embeds: [errorEmbed(`No lyrics found for **${query}**.`)] });
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(Colors.Primary)
        .setTitle(result.title)
        .setURL(result.url)
        .setDescription(result.snippet.slice(0, 4000));
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      log.warn({ err }, 'lyrics failed');
      await interaction.editReply({ embeds: [errorEmbed('Could not fetch lyrics.')] });
    }
  },
};

export default command;
