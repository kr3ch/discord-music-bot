import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { Colors, Emojis } from '../../config/constants';
import { getGuildSettings } from '../../utils/permissions';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Show current guild settings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const s = await getGuildSettings(interaction.guildId!);
    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle(`${Emojis.Music} Guild settings`)
      .addFields(
        { name: 'Default volume', value: `${s.volume}%`, inline: true },
        { name: '24/7 mode', value: s.twentyFourSeven ? 'On' : 'Off', inline: true },
        { name: 'Autoplay', value: s.autoplay ? 'On' : 'Off', inline: true },
        { name: 'DJ role', value: s.djRoleId ? `<@&${s.djRoleId}>` : 'Not set', inline: true },
        {
          name: 'Restricted channel',
          value: s.restrictChannel ? `<#${s.restrictChannel}>` : 'Not set',
          inline: true,
        },
        { name: 'Leave timeout', value: `${s.leaveTimeout}s`, inline: true },
        { name: 'Max queue size', value: `${s.maxQueueSize}`, inline: true },
        { name: 'Announce now playing', value: s.announceNowPlay ? 'On' : 'Off', inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
