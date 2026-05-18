import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';
import { parseDuration } from '../../utils/time';
import { BotError } from '../../utils/errors';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a position in the current track.')
    .addStringOption((o) =>
      o.setName('position').setDescription('Position (e.g. 1:23 or 90)').setRequired(true),
    ),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || !player.queue.current) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    const raw = interaction.options.getString('position', true);
    const seconds = parseDuration(raw);
    if (seconds < 0) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid time format. Try `1:23` or `90`.')],
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply();
    try {
      await player.seek(seconds);
      await interaction.editReply({ embeds: [successEmbed(`Seeked to \`${raw}\`.`)] });
    } catch (err) {
      const message = err instanceof BotError ? err.userMessage : 'Could not seek.';
      await interaction.editReply({ embeds: [errorEmbed(message)] });
    }
  },
};

export default command;
