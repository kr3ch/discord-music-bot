import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode (bot stays in voice forever).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Turn 24/7 mode on or off')
        .setRequired(true)
        .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' }),
    ),
  djOnly: true,
  async execute(interaction, client) {
    const mode = interaction.options.getString('mode', true) === 'on';
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guildId! },
      create: { guildId: interaction.guildId!, twentyFourSeven: mode },
      update: { twentyFourSeven: mode },
    });
    const player = client.music.get(interaction.guildId!);
    if (player) {
      player.twentyFourSeven = mode;
      if (mode) player.clearLeaveTimer();
      else if (player.queue.length === 0 && player.isIdle()) player.scheduleLeave();
    }
    if (mode) {
      await interaction.reply({ embeds: [successEmbed('24/7 mode is now **ON**.')] });
    } else {
      await interaction.reply({ embeds: [errorEmbed('24/7 mode is now **OFF**.')] });
    }
  },
};

export default command;
