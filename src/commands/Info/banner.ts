import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

import Canvas from 'canvas';
import { getColorFromURL } from 'color-thief-node';
import { Routes, User } from 'oceanic.js';
import { dynamicAvatar } from '../../utils/dynamicAvatar';

export default class Banner extends Command {
  constructor(client: Client) {
    super(client, {
      name: 'banner',
      description: 'Mostra a imagem do banner de alguém.',
      category: 'Info',
      aliases: ['userbanner'],
      cooldown: 3,
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.channel.type !== 0) return;
    if (!ctx.channel.permissionsOf(this.client.user.id).has('EMBED_LINKS')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    if (!ctx.channel.permissionsOf(this.client.user.id).has('ATTACH_FILES')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Arquivos` para executar este comando', flags: 1 << 6 });
      return;
    }

    let user = ctx.targetUsers?.[0] ?? (!ctx.args.length ? ctx.author : await this.client.utils.findUser(ctx.args.join(' '), ctx.guild));

    if (!user) {
      ctx.sendMessage({ content: ':x: Utilizador não encontrado!', flags: 1 << 6 });
      return;
    }

    let dominant = false;

    if (user.banner === undefined || user.accentColor === undefined) {
      user = await this.client.rest.users.get(user.id)
      this.client.users.update(user);
    }

    if (!user.banner && !user.accentColor) {
      const [r, g, b] = await getColorFromURL(user.avatarURL());
      user.accentColor = r << 16 | g << 8 | b;
      dominant = true;
    }

    const url = user.banner
      ? Banner.dynamicBanner(this.client, user)
      : 'attachment://banner.png';

    const embed = new this.client.embed()
      .setTitle(`:frame_photo: Banner de ${user.username}#${user.discriminator}`)
      .setColor(user.accentColor ?? 'RANDOM')
      .setImage(url)
      .setTimestamp()
      .setFooter(`${ctx.author.username}#${ctx.author.discriminator}`, dynamicAvatar(user));

    dominant && embed.setDescription("OBS: A cor deste banner poderá não corresponder à cor original.")

    if (user.banner) {
      embed.setDescription(`:diamond_shape_with_a_dot_inside: Clique [aqui](${url}) para baixar a imagem!`);
      ctx.sendMessage({ embeds: [embed] });
    } else {
      const canvas = Canvas.createCanvas(600, 240);
      const canvasCtx = canvas.getContext('2d');

      canvasCtx.fillStyle = `#${(user.accentColor! >>> 0).toString(16).padStart(6, '0')}`;
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.sendMessage({
        embeds: [embed],
        files: [
          {
            name: 'banner.png',
            contents: canvas.toBuffer()
          }
        ]
      })
    }
  }

  static dynamicBanner(client: Client, user: User) {
    if (user.banner) {
      if (user.banner.startsWith('a_')) {
        return client.util.formatImage(Routes.BANNER(user.id, user.banner), 'gif', 4096);
      }
      return client.util.formatImage(Routes.BANNER(user.id, user.banner), 'png', 4096);
    }
    throw new Error("Unreachable");
  }
}