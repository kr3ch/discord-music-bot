import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the paused track.'),
  sameVoice: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || !player.queue.current) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    if (!player.isPaused()) {
      await interaction.reply({ embeds: [errorEmbed('Already playing.')], ephemeral: true });
      return;
    }
    player.resume();
    await interaction.reply({ embeds: [successEmbed('Resumed.')] });
  },
};

export default command;
