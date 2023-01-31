import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext, { Type } from '../../structures/CommandContext';
import { ComponentCollector, } from '../../structures/Collector';

import { inflateSync } from 'zlib';

import { Message, ComponentInteraction, MessageActionRow } from 'oceanic.js';
import { dynamicAvatar } from '../../utils/dynamicAvatar';

export default class Render extends Command {
  constructor(client: Client) {
    super(client, {
      name: 'render',
      description: 'Renderiza uma página web.',
      args: 1,
      usage: '<URL>',
      category: 'Others',
      aliases: ['webrender', 'renderizar'],
      cooldown: 10
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.channel.type !== 0) return;

    if (!ctx.channel.nsfw && ctx.author.id !== '334054158879686657') {
      ctx.sendMessage({ content: ':x: Só podes usar este comando em um canal NSFW.', flags: 1 << 6 });
      return;
    }

    if (!ctx.channel.permissionsOf(this.client.user.id).has('ATTACH_FILES')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Arquivos` para executar este comando', flags: 1 << 6 });
      return;
    }

    if (!ctx.channel.permissionsOf(this.client.user.id).has('EMBED_LINKS')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    let waitMsg: Message | undefined;

    if (ctx.type === Type.INTERACTION) {
      ctx.defer();
    } else {
      waitMsg = await ctx.sendMessage({ content: '<a:loading2:805088089319407667> A verificar se o URL é válido...', fetchReply: true }) as Message;
    }

    let url = ctx.args[0];

    if (!ctx.args[0].startsWith('http'))
      url = 'http://' + ctx.args[0];

    const exists = async (): Promise<string | null> => {
      return new Promise(async (resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 5e3);

        try {
          const res = await this.client.request(url).then(async r => {
            r.body.destroy();
            return r.statusCode;
          });

          if (res)
            resolve(url);
          else
            resolve(null)
        } catch (err) {
          resolve(null);
        }
      })
    }

    const finalURL = await exists();

    if (!finalURL) {
      if (ctx.type === Type.INTERACTION) {
        ctx.sendMessage(`:x: ${ctx.member?.mention}, esse site não existe ou não respondeu dentro de 5 segundos.`);
      } else {
        waitMsg?.edit({ content: `:x: ${ctx.member?.mention}, esse site não existe ou não respondeu dentro de 5 segundos.` });
      }
      return;
    }

    if (ctx.type === Type.MESSAGE) waitMsg?.edit({ content: '<a:loading2:805088089319407667> A renderizar a página...' });

    const embed = new this.client.embed()
      .setColor('RANDOM')
      .setTitle('Render')
      .setURL(finalURL)
      .setImage('attachment://render.png')
      .setTimestamp()
      .setFooter(`${ctx.author.username}#${ctx.author.discriminator}`, dynamicAvatar(ctx.author));

    const res = await this.client.request(`${process.env.RENDERAPIURL}?url=${encodeURIComponent(finalURL)}`, {
      headers: {
        Authorization: process.env.RENDERAPITOKEN,
      },
    }).then(r => {
      if (r.statusCode !== 200) return null;
      return r.body.arrayBuffer();
    });

    if (!res) {
      if (ctx.type === Type.INTERACTION) {
        ctx.sendMessage(':x: Site inválido');
      } else {
        waitMsg?.edit({ content: ':x: Site inválido' });
      }
      return;
    }

    const inflate = inflateSync(res);

    if (!inflate) {
      if (ctx.type === Type.INTERACTION) {
        ctx.sendMessage(':x: Site inválido');
      } else {
        waitMsg?.edit({ content: ':x: Site inválido' });
      }
      return;
    }

    waitMsg?.delete();

    const row: MessageActionRow = {
      type: 1,
      components: [
        {
          customID: 'delete',
          style: 4,
          type: 2,
          emoji: {
            id: null,
            name: '🗑️'
          }
        },
      ]
    }
    const msg = await ctx.sendMessage({
      embeds: [embed],
      files: [
        {
          name: 'render.png',
          contents: inflate
        }
      ],
      components: [row],
      fetchReply: true
    }) as Message;


    const filter = (i: ComponentInteraction) => i.member!.id === ctx.author.id;
    const collector = new ComponentCollector(this.client, msg, filter, { max: 1, time: 5 * 60 * 1000 });

    collector.on('collect', () => {
      msg.delete();
    });
  }
}