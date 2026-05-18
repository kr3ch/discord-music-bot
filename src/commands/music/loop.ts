import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';
import { LoopMode } from '../../types/track';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode.')
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' },
        ),
    ),
  sameVoice: true,
  djOnly: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }
    const mode = interaction.options.getString('mode', true);
    const map: Record<string, LoopMode> = {
      off: LoopMode.Off,
      track: LoopMode.Track,
      queue: LoopMode.Queue,
    };
    player.queue.setLoop(map[mode]);
    await interaction.reply({ embeds: [successEmbed(`Loop mode set to **${mode}**.`)] });
  },
};

export default command;
