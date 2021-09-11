import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

export default class Serverinfo extends Command {
  constructor(client: Client) {
    super(client, {
      name: 'serverinfo',
      description: 'Informações sobre o servidor.',
      aliases: ['si', 'svinfo'],
      category: 'Info',
      cooldown: 5,
    });
  }

  execute(ctx: CommandContext): void {
    if (ctx.channel.type !== 0 || !ctx.guild) return;

    if (!ctx.channel.permissionsOf(this.client.user.id).has('embedLinks')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    const guild = ctx.guild;

    const status = {
      online: 0,
      dnd: 0,
      idle: 0,
      offline: 0
    };

    const channels = {
      text: 0,
      voice: 0,
      category: 0,
      news: 0,
      store: 0,
      stage: 0
    }

    guild.members.forEach(member => {
      member.status ? ++status[member.status] : ++status.offline;
    });

    const bots = guild.members.filter(m => m.bot).length;

    guild.channels.forEach(ch => {
      if (ch.type === 0) ++channels.text;
      else if (ch.type === 2) ++channels.voice;
      else if (ch.type === 4) ++channels.category;
      else if (ch.type === 5) ++channels.news;
      else if (ch.type === 6) ++channels.store;
      else if (ch.type === 13) ++channels.stage;
    })

    const boostAmount = guild.premiumSubscriptionCount;
    const boostLevel = guild.premiumTier;

    const emojis = guild.emojis.length;
    const animatedEmojis = guild.emojis.filter(e => e.animated).length;
    const staticEmojis = emojis - animatedEmojis;

    const verificationLevels: any = {
      0: 'Nenhum',
      1: 'Baixo',
      2: 'Médio',
      3: 'Alta',
      4: 'Mais alta'
    }

    const embed = new this.client.embed()
      .setTitle(`:bookmark_tabs: Informações do servidor **${guild.name}**`)
      .setColor('RANDOM')
      .addField(':id: ID', guild.id, true)
      .addField(':crown: Dono do servidor', `${this.client.users.get(guild.ownerID)?.mention || guild.ownerID}`, true)
      .addField(':underage: NSFW', guild.nsfw ? 'Sim' : 'Não', true)
      .addField(':police_officer: Nível de verificação', verificationLevels[guild.verificationLevel], true)
      .addField(`<:followers:784795303156908032> Cargos:`, `${guild.roles.size}`, true)
      .addField(':calendar: Criado em', `<t:${Math.floor(guild.createdAt / 1e3)}:d> (<t:${Math.floor(guild.createdAt / 1e3)}:R>)`, true)
      .addField(':calendar: Entrada em', `<t:${Math.floor(ctx.member!.joinedAt as number / 1e3)}:d> (<t:${Math.floor(ctx.member!.joinedAt as number / 1e3)}:R>)`, true)
      .addField('<:badgebooster:803666384373809233> Boost', `Nível: ${boostLevel}\nQuantidade: ${boostAmount}`, true)
      .addField(`:man: Membros [${guild.members.size}]`, `<:online:804049640437448714> Online: ${status.online}\n<:idle:804049737383673899> Ausente: ${status.idle}\n<:dnd:804049759328403486> Ocupado: ${status.dnd}\n<:offline:804049815713480715> Offline: ${status.offline}\n<:bot:804028762307821578> Bots: ${bots}`, true)
      .addField(`:white_small_square: Canais [${guild.channels.size}]`, `<:chat:804050576647913522> Texto: ${channels.text}\n:microphone2: Voz: ${channels.voice}\n<:stage:828651062184378389> Palco: ${channels.stage}\n:loudspeaker: Anúncios: ${channels.news}\n:shopping_bags: Loja: ${channels.store}\n:diamond_shape_with_a_dot_inside: Categorias: ${channels.category}`, true)
      .addField(`:grinning: Emojis [${emojis}]`, `Estáticos: ${staticEmojis}\nAnimados: ${animatedEmojis}`, true)
      .setThumbnail(guild.dynamicIconURL() ?? '')
      .setImage(guild.dynamicBannerURL() ?? '')
      .setTimestamp()
      .setFooter(`${ctx.author.username}#${ctx.author.discriminator}`, ctx.author.dynamicAvatarURL());

    ctx.sendMessage({ embeds: [embed] });
  }
}