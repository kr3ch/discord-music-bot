import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('restrict')
    .setDescription('Restrict music commands to a specific text channel (DJs bypass).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Channel to restrict to (leave empty to disable)')
        .addChannelTypes(ChannelType.GuildText),
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guildId! },
      create: { guildId: interaction.guildId!, restrictChannel: channel?.id ?? null },
      update: { restrictChannel: channel?.id ?? null },
    });
    await interaction.reply({
      embeds: [
        successEmbed(
          channel
            ? `Music commands restricted to <#${channel.id}>.`
            : 'Channel restriction removed.',
        ),
      ],
    });
  },
};

export default command;
