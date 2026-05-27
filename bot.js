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
  const W = 1400, H = 850;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const pct = target > 0 ? Math.min(saved / target, 1) : 0;
  const pctN = Math.round(pct * 100);
  const left = Math.max(target - saved, 0);
  const done = pct >= 1 && target > 0;

  // Background
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);
  const phone = await loadImage('./assets/pixel10a.png');
  
  // Glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 1000);
  glow.addColorStop(0, 'rgba(255,95,109,0.14)');
  glow.addColorStop(1, 'rgba(255,95,109,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.14;

ctx.drawImage(
  phone,
  W - 520,
  120,
  420,
  420
);

ctx.globalAlpha = 1;

  // Card
  const cx = 40;
  const cy = 40;
  const cw = W - 80;
  const ch = H - 80;
  const cr = 28;

  roundRect(ctx, cx, cy, cw, ch, cr);
  ctx.fillStyle = 'rgba(10,10,12,0.92)';
  ctx.fill();

  roundRect(ctx, cx, cy, cw, ch, cr);
  ctx.strokeStyle = 'rgba(255,95,109,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  roundRect(ctx, cx, cy, cw, 160, cr);

  const hgrad = ctx.createLinearGradient(cx, cy, cx + cw, cy);
  hgrad.addColorStop(0, 'rgba(255,95,109,0.12)');
  hgrad.addColorStop(1, 'rgba(255,95,109,0.02)');

  ctx.fillStyle = hgrad;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px DejaVuSans';
  ctx.fillText('📱 Google Pixel 10a Savings Goal', cx + 45, cy + 78);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '28px DejaVuSans';
  ctx.fillText('Track every rupee you save', cx + 45, cy + 120);

  // Percentage
  const percentY = cy + 280;

  ctx.fillStyle = '#ff6478';
  ctx.font = 'bold 105px DejaVuSans';
  ctx.fillText(`${pctN}%`, cx + 45, percentY);

  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = '30px DejaVuSans';

  const subMsg = done
    ? '🎉 Goal reached! Time to buy the phone!'
    : 'saved so far — keep going!';

  ctx.fillText(subMsg, cx + 50, percentY + 50);

  // Progress bar
  const barX = cx + 45;
  const barY = percentY + 90;
  const barW = cw - 90;
  const barH = 42;
  const barR = 21;

  roundRect(ctx, barX, barY, barW, barH, barR);
  ctx.fillStyle = '#111';
  ctx.fill();

  roundRect(ctx, barX, barY, barW, barH, barR);
  ctx.strokeStyle = 'rgba(255,95,109,0.20)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (pct > 0) {
    const fillW = Math.max(barR * 2, barW * pct);

    const fgrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fgrad.addColorStop(0, '#ff5f6d');
    fgrad.addColorStop(1, '#ff7f92');

    roundRect(ctx, barX, barY, fillW, barH, barR);
    ctx.fillStyle = fgrad;
    ctx.fill();
  }

  // Stats
  const stats = [
    { label: 'SAVED', value: fmt(saved), color: '#8DFF8A' },
    { label: 'LEFT', value: fmt(left), color: '#FFC05C' },
    { label: 'GOAL', value: fmt(target), color: '#D47DFF' }
  ];

  const boxY = barY + 80;
  const gap = 25;
  const boxW = (barW - gap * 2) / 3;
  const boxH = 155;

  stats.forEach((s, i) => {
    const bx = barX + i * (boxW + gap);

    roundRect(ctx, bx, boxY, boxW, boxH, 22);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.shadowColor = 'rgba(255,95,109,0.25)';
    ctx.shadowBlur = 35;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.fillRect(bx + 2, boxY + 2, boxW - 4, boxH / 2);

    ctx.shadowBlur = 0;

    roundRect(ctx, bx, boxY, boxW, boxH, 22);
    ctx.strokeStyle = 'rgba(255,95,109,0.20)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowColor = 'rgba(255,95,109,0.18)';
    ctx.shadowBlur = 20;

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 22px DejaVuSans';
    ctx.fillText(s.label, bx + 24, boxY + 40);

    ctx.fillStyle = s.color;
    ctx.font = 'bold 48px DejaVuSans';
    ctx.fillText(s.value, bx + 24, boxY + 98);
  });

  // Recent additions
  const histX = barX;
  const histY = boxY + 210;

  ctx.fillStyle = '#ff6478';
  ctx.font = 'bold 24px DejaVuSans';
  ctx.fillText('RECENT ADDITIONS', histX, histY);

  const recent = log.slice(0, 4);

  if (recent.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '28px DejaVuSans';
    ctx.fillText('No additions yet', histX, histY + 50);
  } else {
    recent.forEach((e, i) => {
      const iy = histY + 50 + i * 48;

      roundRect(ctx, histX, iy - 28, barW, 38, 12);

      ctx.fillStyle = i % 2 === 0
        ? 'rgba(255,95,109,0.06)'
        : 'rgba(255,255,255,0.02)';

      ctx.fill();

      ctx.fillStyle = '#ff6478';
      ctx.font = 'bold 24px DejaVuSans';
      ctx.fillText(`+${fmt(e.amt)}`, histX + 18, iy);

      ctx.fillStyle = 'rgba(255,255,255,0.48)';
      ctx.font = '20px DejaVuSans';
      ctx.fillText(e.time, histX + 220, iy);
    });
  }

  // Footer
  ctx.strokeStyle = 'rgba(255,95,109,0.16)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cx + 45, H - 85);
  ctx.lineTo(cx + cw - 45, H - 85);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font = '18px DejaVuSans';

  ctx.fillText(
    'Use /add to log a deposit  •  /set to adjust values  •  /progress to display',
    cx + 45,
    H - 50
  );

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
