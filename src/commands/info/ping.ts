import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { Colors } from '../../config/constants';

const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Show the bot latency.'),
  async execute(interaction, client) {
    const sent = await interaction.reply({ content: '🏓 Pinging…', fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const heartbeat = Math.round(client.ws.ping);
    const embed = new EmbedBuilder()
      .setColor(Colors.Primary)
      .setTitle('Pong! 🏓')
      .addFields(
        { name: 'Round trip', value: `\`${roundTrip} ms\``, inline: true },
        { name: 'Websocket', value: `\`${heartbeat} ms\``, inline: true },
      );
    await interaction.editReply({ content: '', embeds: [embed] });
  },
};

export default command;
