import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { Colors, Emojis } from '../../config/constants';
import { env } from '../../config/env';
import { errorEmbed } from '../../utils/embeds';
import { formatDuration, humanizeDuration } from '../../utils/time';
import { queuePagingRow } from '../../utils/components';
import { LoopMode } from '../../types/track';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the queue.')
    .addIntegerOption((o) => o.setName('page').setDescription('Page number').setMinValue(1)),
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || (!player.queue.current && player.queue.length === 0)) {
      await interaction.reply({ embeds: [errorEmbed('Queue is empty.')], ephemeral: true });
      return;
    }

    const pageSize = env.QUEUE_PAGE_SIZE;
    const list = player.queue.list;
    const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    const requestedPage = (interaction.options.getInteger('page') ?? 1) - 1;
    const page = Math.min(Math.max(0, requestedPage), pageCount - 1);

    const slice = list.slice(page * pageSize, (page + 1) * pageSize);
    const lines = slice.map((t, i) => {
      const idx = page * pageSize + i + 1;
      return `**${idx}.** [${t.title.slice(0, 60)}](${t.url}) · \`${t.isLive ? 'LIVE' : formatDuration(t.duration)}\` · <@${t.requestedBy}>`;
    });

    const current = player.queue.current;
    const loopLabel =
      player.queue.loopMode === LoopMode.Off
        ? 'Off'
        : player.queue.loopMode === LoopMode.Track
          ? 'Track'
          : 'Queue';

    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle(`${Emojis.Queue} Queue`)
      .setDescription(
        current
          ? `▶️ **Now:** [${current.title}](${current.url}) · \`${current.isLive ? 'LIVE' : formatDuration(current.duration)}\`\n\n${lines.join('\n') || '*No upcoming tracks*'}`
          : lines.join('\n') || '*No upcoming tracks*',
      )
      .setFooter({
        text: `Page ${page + 1}/${pageCount} · ${list.length} tracks · Total ${humanizeDuration(player.queue.totalDuration)} · Loop: ${loopLabel}`,
      });

    await interaction.reply({
      embeds: [embed],
      components: pageCount > 1 ? [queuePagingRow(page, pageCount)] : [],
    });
  },
};

export default command;
