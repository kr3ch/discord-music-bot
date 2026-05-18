import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('djrole')
    .setDescription('Set or clear the DJ role required for control commands.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((o) =>
      o.setName('role').setDescription('Role to use as DJ (leave empty to clear)'),
    ),
  async execute(interaction) {
    const role = interaction.options.getRole('role');
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guildId! },
      create: { guildId: interaction.guildId!, djRoleId: role?.id ?? null },
      update: { djRoleId: role?.id ?? null },
    });
    await interaction.reply({
      embeds: [
        successEmbed(
          role ? `DJ role set to <@&${role.id}>.` : 'DJ role cleared. Everyone is DJ now.',
        ),
      ],
    });
  },
};

export default command;
