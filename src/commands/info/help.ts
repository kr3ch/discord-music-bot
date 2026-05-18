import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { Colors, Emojis } from '../../config/constants';

const sections: { title: string; commands: { name: string; desc: string }[] }[] = [
  {
    title: `${Emojis.Music} Music`,
    commands: [
      { name: '/play <query>', desc: 'Play YouTube/Spotify/SoundCloud/direct URL or search.' },
      { name: '/skip', desc: 'Skip current track (DJ force / vote skip).' },
      { name: '/stop', desc: 'Stop and clear the queue.' },
      { name: '/pause · /resume', desc: 'Pause / resume playback.' },
      { name: '/queue [page]', desc: 'Show the queue with pagination.' },
      { name: '/nowplaying', desc: 'Show what is currently playing.' },
      { name: '/shuffle · /loop · /remove · /clear', desc: 'Queue management.' },
      { name: '/volume · /seek · /lyrics', desc: 'Playback controls and lyrics.' },
    ],
  },
  {
    title: `${Emojis.Playlist} Playlists`,
    commands: [
      { name: '/playlist create <name>', desc: 'Create a new playlist.' },
      { name: '/playlist add <name> <query>', desc: 'Add a track/playlist.' },
      { name: '/playlist remove <name> <position>', desc: 'Remove a track.' },
      { name: '/playlist list [name]', desc: 'List your playlists or one playlist.' },
      { name: '/playlist play <name>', desc: 'Play one of your playlists.' },
      { name: '/playlist delete <name>', desc: 'Delete a playlist.' },
    ],
  },
  {
    title: '⚙️ Admin',
    commands: [
      { name: '/settings', desc: 'Show guild settings.' },
      { name: '/247 mode', desc: 'Toggle 24/7 mode.' },
      { name: '/autoplay mode', desc: 'Toggle autoplay similar tracks.' },
      { name: '/djrole role', desc: 'Set DJ role.' },
      { name: '/restrict channel', desc: 'Restrict music commands to one channel.' },
    ],
  },
  {
    title: 'ℹ️ Info',
    commands: [
      { name: '/ping', desc: 'Latency.' },
      { name: '/help', desc: 'This menu.' },
      { name: '/stats', desc: 'Bot statistics.' },
    ],
  },
];

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show all commands.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle(`${Emojis.Music} Music Bot — Commands`)
      .setDescription('A production-ready music bot. Use the slash commands listed below.');
    for (const s of sections) {
      embed.addFields({
        name: s.title,
        value: s.commands.map((c) => `**${c.name}** — ${c.desc}`).join('\n'),
      });
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
