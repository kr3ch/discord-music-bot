import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, nowPlayingEmbed } from '../../utils/embeds';
import { playerControlsRow, playerSecondaryRow } from '../../utils/components';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track.'),
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || !player.queue.current) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    const embed = nowPlayingEmbed(player.queue.current, player.getPosition(), player.volume);
    await interaction.reply({
      embeds: [embed],
      components: [playerControlsRow(player.isPaused()), playerSecondaryRow()],
    });
  },
};

export default command;
