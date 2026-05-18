import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue.'),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || player.queue.length < 2) {
      await interaction.reply({
        embeds: [errorEmbed('Not enough tracks to shuffle.')],
        ephemeral: true,
      });
      return;
    }
    player.queue.shuffle();
    await interaction.reply({ embeds: [successEmbed(`Shuffled ${player.queue.length} tracks.`)] });
  },
};

export default command;
