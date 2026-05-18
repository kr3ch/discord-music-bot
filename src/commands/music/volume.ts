import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';
import { prisma } from '../../database/prisma';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set playback volume (0-200).')
    .addIntegerOption((o) =>
      o
        .setName('value')
        .setDescription('Volume 0–200')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200),
    ),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    const value = interaction.options.getInteger('value', true);
    player.setVolume(value);
    await prisma.guildSettings.upsert({
      where: { guildId: interaction.guildId! },
      create: { guildId: interaction.guildId!, volume: value },
      update: { volume: value },
    });
    await interaction.reply({ embeds: [successEmbed(`Volume set to **${player.volume}%**.`)] });
  },
};

export default command;
