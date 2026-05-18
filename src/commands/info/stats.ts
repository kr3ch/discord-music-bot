import { EmbedBuilder, SlashCommandBuilder, version as djsVersion } from 'discord.js';
import type { Command } from '../../types/command';
import { Colors } from '../../config/constants';
import { humanizeDuration, msToSeconds } from '../../utils/time';

function bytesToMB(b: number): string {
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const command: Command = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Bot statistics.'),
  async execute(interaction, client) {
    const uptime = msToSeconds(Date.now() - client.startedAt);
    const mem = process.memoryUsage();
    const guilds = client.guilds.cache.size;
    const players = client.music.size();
    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle('📊 Bot Statistics')
      .addFields(
        { name: 'Servers', value: `${guilds}`, inline: true },
        { name: 'Active players', value: `${players}`, inline: true },
        { name: 'Uptime', value: humanizeDuration(uptime), inline: true },
        { name: 'Memory (RSS)', value: bytesToMB(mem.rss), inline: true },
        { name: 'Heap used', value: bytesToMB(mem.heapUsed), inline: true },
        { name: 'Discord.js', value: `v${djsVersion}`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Platform', value: process.platform, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
