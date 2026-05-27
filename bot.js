const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

GlobalFonts.registerFromPath(
  './assets/DejaVuSans.ttf',
  'DejaVuSans'
);
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── ENV ───────────────────────────────────────────────────────────────────────
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID     = process.env.CLIENT_ID;
const OWNER_ID      = process.env.OWNER_ID;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_KEY;

// ── CLIENTS ───────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const client   = new Client({ intents: [GatewayIntentBits.Guilds], presence: { status: 'online' } });

// ── SLASH COMMANDS ─────────────────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Show current phone savings progress'),
  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add money to savings (owner only)')
    .addIntegerOption(o => o.setName('amount').setDescription('Amount in ₹').setRequired(true)),
  new SlashCommandBuilder()
    .setName('set')
    .setDescription('Set saved or target amount (owner only)')
    .addStringOption(o =>
      o.setName('field').setDescription('What to set').setRequired(true)
        .addChoices({ name: 'saved', value: 'saved' }, { name: 'target', value: 'target' })
    )
    .addIntegerOption(o => o.setName('amount').setDescription('Amount in ₹').setRequired(true)),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset everything (owner only)'),
].map(c => c.toJSON());

// ── FORMAT ────────────────────────────────────────────────────────────────────
function fmt(n) {
  return '₹' + Math.max(0, Math.round(n)).toLocaleString('en-IN');
}

// ── DRAW CARD ─────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function buildCard(saved, target, log) {
  const W = 1400;
  const H = 850;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const pct = target > 0 ? Math.min(saved / target, 1) : 0;
  const pctN = Math.round(pct * 100);
  const left = Math.max(target - saved, 0);

  const phone = await loadImage('./assets/pixel10a.png');

  // ── BACKGROUND ─────────────────────────────

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#040404');
  bg.addColorStop(1, '#09090b');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient glow
  const glow = ctx.createRadialGradient(
    W * 0.82,
    H * 0.2,
    0,
    W * 0.82,
    H * 0.2,
    850
  );

  glow.addColorStop(0, 'rgba(255,95,109,0.16)');
  glow.addColorStop(1, 'rgba(255,95,109,0)');

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── MAIN PANEL ─────────────────────────────

  const panelX = 24;
  const panelY = 24;
  const panelW = W - 48;
  const panelH = H - 48;

  roundRect(ctx, panelX, panelY, panelW, panelH, 28);

  ctx.fillStyle = 'rgba(8,8,10,0.84)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,120,140,0.52)';
  ctx.lineWidth = 2;

  ctx.shadowColor = 'rgba(255,95,109,0.35)';
  ctx.shadowBlur = 35;

  ctx.stroke();

  ctx.shadowBlur = 0;

  // ── TOP HEADER ─────────────────────────────

  roundRect(ctx, 50, 50, W - 100, 125, 22);

  const topGrad = ctx.createLinearGradient(0, 0, W, 0);

  topGrad.addColorStop(0, 'rgba(255,95,109,0.10)');
  topGrad.addColorStop(1, 'rgba(255,95,109,0.02)');

  ctx.fillStyle = topGrad;
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
ctx.font = 'bold 60px DejaVuSans';

ctx.fillText(
  'Google Pixel 10a',
  70,
  120
);

  // ── PHONE ──────────────────────────────────

  ctx.save();

  ctx.globalAlpha = 0.88;

  ctx.shadowColor = 'rgba(255,95,109,0.42)';
  ctx.shadowBlur = 50;

 ctx.drawImage(
  phone,
  980,
  18,
  320,
  320
);

  ctx.restore();


  // ── PERCENT ────────────────────────────────

  ctx.fillStyle = '#ff6478';
  ctx.font = 'bold 145px DejaVuSans';

  ctx.shadowColor = 'rgba(255,95,109,0.35)';
  ctx.shadowBlur = 35;

  ctx.fillText(`${pctN}%`, 70, 335);

  ctx.shadowBlur = 0;


  // ── PROGRESS BAR ───────────────────────────

  const barX = 70;
  const barY = 440;
  const barW = W - 140;
  const barH = 48;

  roundRect(ctx, barX, barY, barW, barH, 24);

  ctx.fillStyle = 'rgba(18,18,22,0.96)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,120,140,0.22)';
  ctx.stroke();

const fillW = Math.max(barH, barW * pct);

const knobX = Math.min(
  barX + fillW,
  barX + barW - 22
);

const knobY = barY + (barH / 2);

  const prog = ctx.createLinearGradient(
    barX,
    0,
    barX + fillW,
    0
  );

  prog.addColorStop(0, '#ff5b6e');
  prog.addColorStop(0.5, '#ff7082');
  prog.addColorStop(1, '#ff8d9d');

  roundRect(ctx, barX, barY, fillW, barH, 24);

ctx.shadowColor = '#ff6478';
ctx.shadowBlur = 35;

ctx.fillStyle = prog;
ctx.fill();

ctx.shadowBlur = 0;

// ── LIVE PROGRESS EFFECT ─────────────────

// markers

ctx.fillStyle = 'rgba(255,255,255,0.42)';
ctx.font = '24px DejaVuSans';

const markers = ['0%', '25%', '50%', '75%', '100%'];

markers.forEach((m, i) => {
  const mx = barX + ((barW / 4) * i);

  ctx.beginPath();

  ctx.arc(
    mx,
    barY + 78,
    3,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillText(
    m,
    mx - 18,
    barY + 105
  );
});

// glowing knob

ctx.beginPath();

ctx.shadowColor = '#ff6478';
ctx.shadowBlur = 35;

ctx.fillStyle = '#ff8d9d';

ctx.arc(
  knobX,
  knobY,
  22,
  0,
  Math.PI * 2
);

ctx.fill();

ctx.shadowBlur = 0;

// inner knob

ctx.beginPath();

ctx.fillStyle = '#ffd4da';

ctx.arc(
  knobX,
  knobY,
  11,
  0,
  Math.PI * 2
);

ctx.fill();

// floating percentage bubble

roundRect(
  ctx,
  Math.max(barX, knobX - 48),
  knobY - 105,
  96,
  58,
  16
);

ctx.fillStyle = 'rgba(18,18,22,0.96)';
ctx.fill();

ctx.strokeStyle = 'rgba(255,120,140,0.26)';
ctx.stroke();

ctx.fillStyle = '#ff6478';
ctx.font = 'bold 30px DejaVuSans';

ctx.fillText(
  `${pctN}%`,
  knobX - 28,
  knobY - 66
);

// bubble pointer

ctx.beginPath();

ctx.moveTo(knobX - 10, knobY - 47);
ctx.lineTo(knobX + 10, knobY - 47);
ctx.lineTo(knobX, knobY - 30);

ctx.closePath();

ctx.fillStyle = 'rgba(18,18,22,0.96)';
ctx.fill();


  // ── STAT BOXES ─────────────────────────────

  const stats = [
    {
      title: 'SAVED',
      value: fmt(saved),
      color: '#9BFF7A',
      glow: 'rgba(155,255,122,0.35)'
    },
    {
      title: 'LEFT',
      value: fmt(left),
      color: '#FFBC4D',
      glow: 'rgba(255,188,77,0.35)'
    },
    {
      title: 'GOAL',
      value: fmt(target),
      color: '#D96BFF',
      glow: 'rgba(217,107,255,0.35)'
    }
  ];

  const statY = 520;
  const statW = 390;
  const statH = 165;
  const statGap = 30;

  stats.forEach((s, i) => {
    const x = 70 + i * (statW + statGap);

    roundRect(ctx, x, statY, statW, statH, 24);

    ctx.fillStyle = 'rgba(14,14,18,0.92)';
    ctx.fill();
    roundRect(ctx, x + 2, statY + 2, statW - 4, 58, 22);

    const gloss = ctx.createLinearGradient(
      0,
      statY,
      0,
      statY + 60
);

     gloss.addColorStop(0, 'rgba(255,255,255,0.08)');
     gloss.addColorStop(1, 'rgba(255,255,255,0.01)');

     ctx.fillStyle = gloss;
     ctx.fill();
    

    roundRect(ctx, x, statY, statW, statH, 24);

ctx.strokeStyle = 'rgba(255,255,255,0.22)';
ctx.lineWidth = 2;

ctx.shadowColor = s.glow;
ctx.shadowBlur = 35;

ctx.stroke();

    ctx.shadowBlur = 0;
    
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = 'bold 24px DejaVuSans';

    ctx.fillText(
      s.title,
      x + 125,
      statY + 52
    );

    ctx.fillStyle = s.color;
    ctx.font = 'bold 50px DejaVuSans';

    ctx.fillText(
      s.value,
      x + 95,
      statY + 104
    );
  });

  // ── RECENT ADDITIONS ───────────────────────

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px DejaVuSans';

  ctx.fillText(
    'RECENT ADDITIONS',
    95,
    735
  );

  roundRect(ctx, 70, 755, W - 140, 145, 24);

  ctx.fillStyle = 'rgba(12,12,16,0.88)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,120,140,0.14)';
  ctx.stroke();

  const recent = log.slice(0, 4);

  if (recent.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.font = '30px DejaVuSans';

    ctx.fillText(
      'No additions yet',
      100,
      825
    );
  } else {
    recent.forEach((e, i) => {
      const y = 805 + i * 42;

      ctx.fillStyle = '#ff6478';
      ctx.font = 'bold 28px DejaVuSans';

      ctx.fillText(
        `+${fmt(e.amt)}`,
        100,
        y
      );

      ctx.fillStyle = 'rgba(255,255,255,0.58)';
      ctx.font = '24px DejaVuSans';

      ctx.fillText(
        e.time,
        320,
        y
      );
    });
  }

  // ── FOOTER ─────────────────────────────────

  roundRect(ctx, 40, H - 72, W - 80, 50, 18);

  ctx.fillStyle = 'rgba(18,18,22,0.92)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,120,140,0.12)';
  ctx.stroke();



  return canvas.toBuffer('image/png');
}
// ── DATA HELPERS ──────────────────────────────────────────────────────────────
async function getData() {
  const { data, error } = await supabase.from('savings').select('*').eq('id', 1).single();
  if (error || !data) {
    await supabase.from('savings').upsert({ id: 1, saved: 0, target: 0, log: [] });
    return { saved: 0, target: 0, log: [] };
  }
  return { saved: data.saved || 0, target: data.target || 0, log: data.log || [] };
}

async function saveData(saved, target, log) {
  await supabase.from('savings').upsert({ id: 1, saved, target, log });
}

async function respond(interaction, saved, target, log) {
  const buf  = await buildCard(saved, target, log);
  const file = new AttachmentBuilder(buf, { name: 'savings.png' });
  const pct  = target > 0 ? Math.round(Math.min(saved / target, 1) * 100) : 0;
  const done = pct >= 100 && target > 0;

  const embed = new EmbedBuilder()
    .setColor(0xff6478)
    .setImage('attachment://savings.png')
    .setFooter({ text: `Updated just now` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], files: [file] });
}

// ── REGISTER COMMANDS ─────────────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('✅ Slash commands registered');
}

// ── BOT EVENTS ────────────────────────────────────────────────────────────────
client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user } = interaction;
  const isOwner = user.id === OWNER_ID;

  if (commandName === 'progress') {
    await interaction.deferReply();
    const { saved, target, log } = await getData();
    await respond(interaction, saved, target, log);
    return;
  }

  if (!isOwner) {
    await interaction.reply({ content: '🔒 Only the savings owner can use this command.', ephemeral: true });
    return;
  }

  if (commandName === 'add') {
    await interaction.deferReply();
    const amount = interaction.options.getInteger('amount');
    if (amount <= 0) { await interaction.editReply({ content: '❌ Amount must be positive.' }); return; }
    const { saved, target, log } = await getData();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
                    ' · ' + now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const newLog = [{ amt: amount, time: timeStr }, ...log].slice(0, 20);
    const newSaved = saved + amount;
    await saveData(newSaved, target, newLog);
    await respond(interaction, newSaved, target, newLog);
    return;
  }

  if (commandName === 'set') {
    await interaction.deferReply();
    const field  = interaction.options.getString('field');
    const amount = interaction.options.getInteger('amount');
    if (amount < 0) { await interaction.editReply({ content: '❌ Amount cannot be negative.' }); return; }
    const { saved, target, log } = await getData();
    const newSaved  = field === 'saved'  ? amount : saved;
    const newTarget = field === 'target' ? amount : target;
    await saveData(newSaved, newTarget, log);
    await respond(interaction, newSaved, newTarget, log);
    return;
  }

  if (commandName === 'reset') {
    await saveData(0, 0, []);
    await interaction.reply({ content: '🗑️ Everything has been reset.', ephemeral: true });
    return;
  }
});

client.login(DISCORD_TOKEN);
