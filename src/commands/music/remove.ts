import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from the queue.')
    .addIntegerOption((o) =>
      o
        .setName('position')
        .setDescription('Position in queue (1-based)')
        .setRequired(true)
        .setMinValue(1),
    ),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || player.queue.length === 0) {
      await interaction.reply({ embeds: [errorEmbed('Queue is empty.')], ephemeral: true });
      return;
    }
    const position = interaction.options.getInteger('position', true);
    const removed = player.queue.removeAt(position - 1);
    if (!removed) {
      await interaction.reply({ embeds: [errorEmbed('Invalid position.')], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [successEmbed(`Removed **${removed.title}**.`)] });
  },
};

export default command;
