import Client from '../structures/Client';
import CommandContext from '../structures/CommandContext';
import { Interaction, CommandInteraction } from 'eris';

import { existsSync, appendFileSync, mkdirSync } from 'fs';

export default class InteractionCreate {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async run(interaction: Interaction) {
    if (!(interaction instanceof CommandInteraction)) return;

    const cmd = this.client.commands.find(c => c.name === interaction.data.name);
    if (!cmd) throw new Error('Command not found!');

    if (this.client.blacklist.includes(interaction.member!.id)) {
      interaction.createMessage({
        content: ':x: Estás na minha blacklist, por isso não podes usar nenhum comando meu!\nSe achas que foi injusto contacta o meu dono no meu servidor de suporte: <https://discord.gg/dBQnxVCTEw>',
        flags: 1 << 6,
      });
      return;
    }

    if (this.client.lockedCmds.includes(interaction.member!.id) && interaction.member!.id !== '334054158879686657') {
      interaction.createMessage({
        content: ':x: Esse comando está em manutenção!',
        flags: 1 << 6,
      })
      return;
    }
    const ctx = new CommandContext(this.client, interaction);

    if (!this.client.cooldowns.has(cmd.name))
      this.client.cooldowns.set(cmd.name, new Map<string, number>());

    const now = Date.now();
    const timestamps = this.client.cooldowns.get(cmd.name);
    const cooldownAmount = (cmd.cooldown || 3) * 1000;

    if (timestamps && timestamps.has(interaction.member!.id) && interaction.member!.id !== '334054158879686657') {
      const expirationTime = timestamps.get(interaction.member!.id) as number + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.createMessage({
          content: `:clock1: Espera mais \`${timeLeft.toFixed(1)}\` segundos para voltares a usar o comando \`${cmd.name}\``,
          flags: 1 << 6
        });
      }
    }

    if (timestamps) {
      timestamps.set(interaction.member!.id, now);
      setTimeout(() => timestamps.delete(interaction.member!.id), cooldownAmount);
    }

    try {
      cmd.execute(ctx);

      //Logs
      if (!existsSync('./logs'))
        mkdirSync('./logs');

      appendFileSync('./logs/log.txt', `**Slash Command:** \`${cmd.name}\` executado no servidor \`${interaction.guildID}\`\n**Args:** \`[${ctx.args?.join(' ')}]\`\n**User:** ${interaction.member?.username}#${interaction.member?.discriminator}(${interaction.member?.id})\n\n`);

      this.client.commandsUsed++;
    } catch (err: any) {
      interaction.createMessage({
        content: `:x: Ocorreu um erro ao executar o comando \`${cmd.name}\``,
        flags: 1 << 6
      });

      console.error(err.message);

      const embed = new this.client.embed()
        .setTitle(':x: Ocorreu um erro!')
        .setColor('8B0000')
        .setDescription(`Ocorreu um erro ao executar o comando \`${cmd.name}\` no servidor \`${interaction.guildID}\`\n**Args:** \`[${ctx.args?.join(' ')}]\`\n**Erro:** \`${err.message}\``)
        .setFooter(`${interaction.member?.username}#${interaction.member?.discriminator}`, interaction.member?.user.dynamicAvatarURL())
        .setTimestamp();

      this.client.createMessage('334054158879686657', { embeds: [embed] });
    }
  }
}