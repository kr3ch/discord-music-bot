import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import type { Command } from '../../types/command';
import { Colors, Emojis } from '../../config/constants';
import { errorEmbed, playlistAddedEmbed, successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';
import { resolveQuery } from '../../music/sources';
import type { BotClient } from '../../client';
import { env } from '../../config/env';

async function createSub(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  try {
    await prisma.playlist.create({
      data: {
        name,
        userId: interaction.user.id,
        guildId: interaction.guildId!,
      },
    });
    await interaction.reply({ embeds: [successEmbed(`Created playlist **${name}**.`)] });
  } catch {
    await interaction.reply({
      embeds: [errorEmbed('A playlist with this name already exists.')],
      ephemeral: true,
    });
  }
}

async function addSub(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const query = interaction.options.getString('query', true);
  const playlist = await prisma.playlist.findUnique({
    where: { userId_name: { userId: interaction.user.id, name } },
    include: { tracks: { orderBy: { position: 'desc' }, take: 1 } },
  });
  if (!playlist) {
    await interaction.reply({ embeds: [errorEmbed('Playlist not found.')], ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const result = await resolveQuery(query, interaction.user.id, interaction.user.tag);
  if (result.tracks.length === 0) {
    await interaction.editReply({ embeds: [errorEmbed('No tracks resolved.')] });
    return;
  }
  let position = playlist.tracks[0]?.position ?? 0;
  await prisma.playlistTrack.createMany({
    data: result.tracks.map((t) => ({
      playlistId: playlist.id,
      title: t.title,
      url: t.url,
      duration: t.duration,
      thumbnail: t.thumbnail,
      author: t.author,
      position: ++position,
    })),
  });
  await interaction.editReply({
    embeds: [successEmbed(`Added **${result.tracks.length}** tracks to **${name}**.`)],
  });
}

async function removeSub(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const index = interaction.options.getInteger('position', true);
  const playlist = await prisma.playlist.findUnique({
    where: { userId_name: { userId: interaction.user.id, name } },
    include: { tracks: { orderBy: { position: 'asc' } } },
  });
  if (!playlist) {
    await interaction.reply({ embeds: [errorEmbed('Playlist not found.')], ephemeral: true });
    return;
  }
  const track = playlist.tracks[index - 1];
  if (!track) {
    await interaction.reply({ embeds: [errorEmbed('Invalid position.')], ephemeral: true });
    return;
  }
  await prisma.playlistTrack.delete({ where: { id: track.id } });
  await interaction.reply({
    embeds: [successEmbed(`Removed **${track.title}** from **${name}**.`)],
  });
}

async function listSub(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name');
  if (name) {
    const playlist = await prisma.playlist.findUnique({
      where: { userId_name: { userId: interaction.user.id, name } },
      include: { tracks: { orderBy: { position: 'asc' } } },
    });
    if (!playlist) {
      await interaction.reply({ embeds: [errorEmbed('Playlist not found.')], ephemeral: true });
      return;
    }
    const lines = playlist.tracks
      .slice(0, 20)
      .map((t, i) => `**${i + 1}.** [${t.title}](${t.url})`);
    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle(`${Emojis.Playlist} ${name}`)
      .setDescription(lines.join('\n') || '*Empty*')
      .setFooter({ text: `${playlist.tracks.length} tracks total` });
    await interaction.reply({ embeds: [embed] });
    return;
  }
  const playlists = await prisma.playlist.findMany({
    where: { userId: interaction.user.id },
    include: { _count: { select: { tracks: true } } },
  });
  if (playlists.length === 0) {
    await interaction.reply({ embeds: [errorEmbed('You have no playlists.')], ephemeral: true });
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(Colors.Primary)
    .setTitle(`${Emojis.Playlist} Your playlists`)
    .setDescription(playlists.map((p) => `• **${p.name}** — ${p._count.tracks} tracks`).join('\n'));
  await interaction.reply({ embeds: [embed] });
}

async function deleteSub(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString('name', true);
  const playlist = await prisma.playlist.findUnique({
    where: { userId_name: { userId: interaction.user.id, name } },
  });
  if (!playlist) {
    await interaction.reply({ embeds: [errorEmbed('Playlist not found.')], ephemeral: true });
    return;
  }
  await prisma.playlist.delete({ where: { id: playlist.id } });
  await interaction.reply({ embeds: [successEmbed(`Deleted playlist **${name}**.`)] });
}

async function playSub(interaction: ChatInputCommandInteraction, client: BotClient) {
  const name = interaction.options.getString('name', true);
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      embeds: [errorEmbed('Join a voice channel first.')],
      ephemeral: true,
    });
    return;
  }
  const playlist = await prisma.playlist.findUnique({
    where: { userId_name: { userId: interaction.user.id, name } },
    include: { tracks: { orderBy: { position: 'asc' } } },
  });
  if (!playlist) {
    await interaction.reply({ embeds: [errorEmbed('Playlist not found.')], ephemeral: true });
    return;
  }
  if (playlist.tracks.length === 0) {
    await interaction.reply({ embeds: [errorEmbed('Playlist is empty.')], ephemeral: true });
    return;
  }

  await interaction.deferReply();
  const player = await client.music.getOrCreate(
    interaction.guildId!,
    voiceChannel,
    interaction.channel as TextChannel,
  );
  const available = Math.max(0, env.MAX_QUEUE_SIZE - player.queue.length);
  const slice = playlist.tracks.slice(0, available);
  player.enqueue(
    ...slice.map((t) => ({
      title: t.title,
      url: t.url,
      duration: t.duration,
      thumbnail: t.thumbnail,
      author: t.author,
      source: 'youtube' as const,
      isLive: t.duration === 0,
      requestedBy: interaction.user.id,
      requestedByTag: interaction.user.tag,
    })),
  );
  await interaction.editReply({
    embeds: [playlistAddedEmbed(playlist.name, slice.length, '')],
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Manage your saved playlists.')
    .addSubcommand((s) =>
      s
        .setName('create')
        .setDescription('Create a new playlist.')
        .addStringOption((o) =>
          o.setName('name').setDescription('Playlist name').setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Add a track or playlist to a saved playlist.')
        .addStringOption((o) => o.setName('name').setDescription('Playlist name').setRequired(true))
        .addStringOption((o) => o.setName('query').setDescription('Song or URL').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a track from a saved playlist by position.')
        .addStringOption((o) => o.setName('name').setDescription('Playlist name').setRequired(true))
        .addIntegerOption((o) =>
          o
            .setName('position')
            .setDescription('Position (1-based)')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('list')
        .setDescription('List your playlists or the contents of one.')
        .addStringOption((o) => o.setName('name').setDescription('Playlist name (optional)')),
    )
    .addSubcommand((s) =>
      s
        .setName('delete')
        .setDescription('Delete one of your playlists.')
        .addStringOption((o) =>
          o.setName('name').setDescription('Playlist name').setRequired(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('play')
        .setDescription('Play one of your playlists.')
        .addStringOption((o) =>
          o.setName('name').setDescription('Playlist name').setRequired(true),
        ),
    ),
  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand(true);
    switch (sub) {
      case 'create':
        return createSub(interaction);
      case 'add':
        return addSub(interaction);
      case 'remove':
        return removeSub(interaction);
      case 'list':
        return listSub(interaction);
      case 'delete':
        return deleteSub(interaction);
      case 'play':
        return playSub(interaction, client);
    }
  },
};

export default command;
