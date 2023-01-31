import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';
import { ComponentCollector } from '../../structures/Collector';

import { ComponentInteraction, Message, MessageActionRow, User } from 'oceanic.js';
import { TrackQueue } from '../../structures/TrackQueue';
import { dynamicAvatar } from '../../utils/dynamicAvatar';

export default class Queue extends Command {
  static disabled = true;

  constructor(client: Client) {
    super(client, {
      name: 'queue',
      description: 'Vê as músicas que estão na queue.',
      category: 'Music',
      aliases: ['q'],
      cooldown: 6
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.channel.type !== 0) return;
    if (!ctx.channel.permissionsOf(this.client.user.id).has('EMBED_LINKS')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    const player = this.client.music.players.get(ctx.guild.id);

    if (!player || !player.current) {
      ctx.sendMessage({ content: ':x: Não estou a tocar nada de momento!', flags: 1 << 6 });
      return;
    }

    if (player.radio) {
      ctx.sendMessage(`:radio: A tocar a rádio ${player.radio}`);
      return;
    }

    const queue = player.queue as TrackQueue;

    let page = 1;
    const pages = Math.max(Math.ceil(queue.size / 10), 1);

    const req = player.current?.requester as User;

    const desc = [
      `<a:disco:803678643661832233> **A tocar:** \`${player.current?.title}\` (Requisitado por \`${req.username}#${req.discriminator}\`)\n`,
      `:alarm_clock: Tempo total da queue (${this.client.utils.msToHour(player.queueDuration)}) ----- Total de músicas na queue: ${queue.size}`,
      `${queue.getSongDetails(0, 10)}`
    ];

    const embed = new this.client.embed()
      .setColor('RANDOM')
      .setTitle(':bookmark_tabs: Lista de músicas')
      .setDescription(desc.join('\n'))
      .setTimestamp()
      .setFooter(`Página ${page} de ${pages}`, dynamicAvatar(ctx.author));


    if (queue.size <= 10) {
      await ctx.sendMessage({ embeds: [embed] });
      return;
    }

    const row: MessageActionRow = {
      type: 1,
      components: [
        {
          customID: 'left',
          style: 2,
          type: 2,
          emoji: {
            id: null,
            name: '⬅️'
          },
          disabled: true
        },
        {
          customID: 'right',
          style: 2,
          type: 2,
          emoji: {
            id: null,
            name: '➡️'
          }
        }
      ]
    };

    const msg = await ctx.sendMessage({ embeds: [embed], components: [row], fetchReply: true }) as Message;

    const filter = (i: ComponentInteraction) => i.member!.id === ctx.author.id;

    const collector = new ComponentCollector(this.client, msg, filter, { time: 10 * 60 * 1000 });

    collector.on('collect', i => {
      const newDesc = [
        `<a:disco:803678643661832233> **A tocar:** \`${player.current?.title}\` (Requisitado por \`${req.username}#${req.discriminator}\`)`,
        `:alarm_clock: Tempo total da queue (${this.client.utils.msToHour(player.queueDuration)}) ----- Total de músicas na queue: ${queue.size}`,
        `${queue.getSongDetails(0, 10)}`
      ];

      switch (i.data.customID) {
        case 'left':
          if (page === 1) return;
          if (--page === 1) {
            row.components[0].disabled = true;
          }
          row.components[1].disabled = false;

          if (page === 1) {
            embed.setDescription(newDesc.join('\n'))
              .setFooter(`Página ${page} de ${pages}`, dynamicAvatar(ctx.author));
          } else {
            embed.setDescription(queue.getSongDetails((page - 1) * 10, page * 10))
              .setFooter(`Página ${page} de ${pages}`, dynamicAvatar(ctx.author));
          }

          i.editParent({ embeds: [embed], components: [row] });
          break;
        case 'right':
          if (page === pages) return;
          if (++page === pages) {
            row.components[1].disabled = true;
          }
          row.components[0].disabled = false;

          embed.setDescription(queue.getSongDetails((page - 1) * 10, page * 10))
            .setFooter(`Página ${page} de ${pages}`, dynamicAvatar(ctx.author));

          i.editParent({ embeds: [embed], components: [row] });
          break;
      }
    })
  }
}