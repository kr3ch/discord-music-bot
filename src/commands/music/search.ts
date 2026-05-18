import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { randomBytes } from 'node:crypto';
import type { Command } from '../../types/command';
import { Colors, Emojis } from '../../config/constants';
import { errorEmbed } from '../../utils/embeds';
import { smartSearch } from '../../music/sources';
import { searchSelectMenu } from '../../utils/components';
import { cacheSearchResults } from '../../handlers/selectMenuHandler';
import { formatDuration } from '../../utils/time';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search and pick a track to play.')
    .addStringOption((o) =>
      o.setName('query').setDescription('What to search for').setRequired(true),
    ),
  inVoice: true,
  cooldown: 2500,
  async execute(interaction) {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply({ ephemeral: true });

    const results = await smartSearch(query, interaction.user.id, interaction.user.tag, 10);
    if (results.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('No results found.')] });
      return;
    }

    const customId = `search:${randomBytes(6).toString('hex')}`;
    cacheSearchResults(customId, results);

    const lines = results
      .slice(0, 10)
      .map(
        (r, i) =>
          `**${i + 1}.** [${r.title.slice(0, 60)}](${r.url}) · \`${r.isLive ? 'LIVE' : formatDuration(r.duration)}\` · ${r.author.slice(0, 30)}`,
      )
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle(`${Emojis.Search} Search results`)
      .setDescription(lines);

    const menu = searchSelectMenu(
      customId,
      results.slice(0, 10).map((r) => ({
        title: r.title,
        url: r.url,
        author: r.author,
        duration: r.isLive ? 'LIVE' : formatDuration(r.duration),
      })),
    );

    await interaction.editReply({ embeds: [embed], components: [menu] });
  },
};

export default command;
