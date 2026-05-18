import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the queue (keeps current track).'),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    const count = player.queue.length;
    player.queue.clear();
    await interaction.reply({
      embeds: [successEmbed(`Cleared **${count}** tracks from the queue.`)],
    });
  },
};

export default command;
