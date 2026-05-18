import { GuildMember, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command';
import { errorEmbed, successEmbed } from '../../utils/embeds';
import { isDJ } from '../../utils/permissions';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track (DJ can force, others trigger a vote).'),
  sameVoice: true,
  async execute(interaction, client) {
    const player = client.music.get(interaction.guildId!);
    if (!player || !player.queue.current) {
      await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    const requester = player.queue.current.requestedBy;
    const isOwnTrack = requester === interaction.user.id;
    const dj = await isDJ(member);

    if (dj || isOwnTrack) {
      const skipped = player.skip();
      await interaction.reply({
        embeds: [successEmbed(`Skipped **${skipped?.title ?? 'track'}**.`)],
      });
      return;
    }

    // Vote skip
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({
        embeds: [errorEmbed('Join the voice channel to vote.')],
        ephemeral: true,
      });
      return;
    }
    const humans = voiceChannel.members.filter((m) => !m.user.bot).size;
    const required = Math.ceil(humans / 2);
    const vote = player.voteSkipRequest(interaction.user.id, required);
    if (vote.passed) {
      await interaction.reply({ embeds: [successEmbed(`Vote passed — skipped.`)] });
    } else {
      await interaction.reply({
        embeds: [successEmbed(`Vote: **${vote.count}/${vote.required}** needed to skip.`)],
      });
    }
  },
};

export default command;
