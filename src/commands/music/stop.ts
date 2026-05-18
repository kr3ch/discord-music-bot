import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue.'),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    player.stop();
    await interaction.reply({ embeds: [successEmbed('Stopped and cleared the queue.')] });
  },
};

export default command;
