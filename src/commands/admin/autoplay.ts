import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay similar tracks when the queue ends.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Turn autoplay on or off')
        .setRequired(true)
        .addChoices({ name: 'On', value: 'on' }, { name: 'Off', value: 'off' }),
    ),
  djOnly: true,
  async execute(interaction, client) {
    const mode = interaction.options.getString('mode', true) === 'on';
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guildId! },
      create: { guildId: interaction.guildId!, autoplay: mode },
      update: { autoplay: mode },
    });
    const player = client.music.get(interaction.guildId!);
    if (player) player.autoplay = mode;
    await interaction.reply({
      embeds: [successEmbed(`Autoplay is now **${mode ? 'ON' : 'OFF'}**.`)],
    });
  },
};

export default command;
