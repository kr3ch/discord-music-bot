import { GuildMember, PermissionsBitField } from 'discord.js';
import { prisma } from '../database/prisma';

export async function isDJ(member: GuildMember): Promise<boolean> {
  if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  const settings = await prisma.guildSettings.findUnique({
    where: { guildId: member.guild.id },
  });

  if (!settings?.djRoleId) return true; // no DJ role set = everyone is DJ
  return member.roles.cache.has(settings.djRoleId);
}

export async function isRestricted(guildId: string, channelId: string): Promise<boolean> {
  const settings = await prisma.guildSettings.findUnique({
    where: { guildId },
  });

  if (!settings?.restrictChannel) return false;
  return settings.restrictChannel !== channelId;
}

export async function getGuildSettings(guildId: string) {
  return prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
}
