import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

import translate from '@iamtraction/google-translate';
import { dynamicAvatar } from '../../utils/dynamicAvatar';

export default class Translate extends Command {
  constructor(client: Client) {
    super(client, {
      name: 'translate',
      description: 'Traduz uma frase ou palavra.',
      args: 2,
      usage: '<para> <texto>',
      category: 'Others',
      aliases: ['traduzir'],
      cooldown: 3
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.channel.type === 0 && !ctx.channel.permissionsOf(this.client.user.id).has('EMBED_LINKS')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    const text = ctx.args.slice(1).join(' ');

    if (text.length > 1e3) {
      ctx.sendMessage({ content: ':x: O texto a traduzir só pode ter no máximo 1000 caracteres.', flags: 1 << 6 })
      return;
    }

    try {
      const res = await translate(text, {
        to: ctx.args[0]
      });

      const embed = new this.client.embed()
        .setColor('RANDOM')
        .setTitle('Tradutor')
        .addField(`:bookmark: Texto de origem: (${res.from.language.iso})`, `\`\`\`${text}\`\`\``)
        .addField(`:book: Texto traduzido: (${ctx.args[0]})`, `\`\`\`${res.text ? res.text : ''}\`\`\``)
        .setTimestamp()
        .setFooter(`${ctx.author.username}#${ctx.author.discriminator}`, dynamicAvatar(ctx.author));

      ctx.sendMessage({ embeds: [embed] });
    } catch (err: any) {
      if (err.message.startsWith('The language') && err.message.endsWith('is not supported.')) {
        ctx.sendMessage({ content: ':x: Linguagem não suportada! Tente `en, pt, fr, ...`', flags: 1 << 6 });
        return;
      }
      ctx.sendMessage({ content: ':x: Ocorreu um erro!', flags: 1 << 6 });
    }
  }
}