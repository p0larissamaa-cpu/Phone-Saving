const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
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
  const W = 860, H = 480;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const pct  = target > 0 ? Math.min(saved / target, 1) : 0;
  const pctN = Math.round(pct * 100);
  const left = Math.max(target - saved, 0);
  const done = pct >= 1 && target > 0;

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#1a1f1a';
  ctx.fillRect(0, 0, W, H);

  // Subtle green glow top-left
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
  glow.addColorStop(0, 'rgba(46,125,50,0.22)');
  glow.addColorStop(1, 'rgba(46,125,50,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Card ───────────────────────────────────────────────────────────────────
  const cx = 28, cy = 28, cw = W - 56, ch = H - 56, cr = 22;
  roundRect(ctx, cx, cy, cw, ch, cr);
  ctx.fillStyle = '#222822';
  ctx.fill();
  roundRect(ctx, cx, cy, cw, ch, cr);
  ctx.strokeStyle = 'rgba(76,175,80,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Header band ────────────────────────────────────────────────────────────
  roundRect(ctx, cx, cy, cw, 88, cr);
  const hgrad = ctx.createLinearGradient(cx, cy, cx + cw, cy);
  hgrad.addColorStop(0, '#1B5E20');
  hgrad.addColorStop(1, '#2E7D32');
  ctx.fillStyle = hgrad;
  ctx.fill();
  ctx.fillRect(cx, cy + 68, cw, 20);

  // Header text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px DejaVu Sans';
  ctx.fillText('📱  Phone Savings Goal', cx + 28, cy + 42);
  ctx.fillStyle = 'rgba(255,255,255,0.60)';
  ctx.font = '15px DejaVu Sans';
  ctx.fillText('Track every rupee you save', cx + 28, cy + 66);

  // ── Percentage headline ────────────────────────────────────────────────────
  const headY = cy + 120;
  ctx.fillStyle = done ? '#66BB6A' : '#e8f5e9';
  ctx.font = 'bold 54px DejaVu Sans';
  ctx.fillText(`${pctN}%`, cx + 28, headY);

  const subMsg = done ? '🎉  Goal reached! Time to get that phone!' : 'saved so far — keep going!';
  ctx.fillStyle = done ? '#81C784' : 'rgba(255,255,255,0.45)';
  ctx.font = '16px DejaVu Sans';
  ctx.fillText(subMsg, cx + 28, headY + 28);

  // ── Progress bar ──────────────────────────────────────────────────────────
  const barX = cx + 28, barY = headY + 52, barW = cw - 56, barH = 26, barR = 13;

  roundRect(ctx, barX, barY, barW, barH, barR);
  ctx.fillStyle = '#1a2a1a';
  ctx.fill();
  roundRect(ctx, barX, barY, barW, barH, barR);
  ctx.strokeStyle = 'rgba(76,175,80,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (pct > 0) {
    const fillW = Math.max(barR * 2, barW * pct);
    const fgrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fgrad.addColorStop(0, '#2E7D32');
    fgrad.addColorStop(1, '#66BB6A');
    roundRect(ctx, barX, barY, fillW, barH, barR);
    ctx.fillStyle = fgrad;
    ctx.fill();
    roundRect(ctx, barX, barY, fillW, barH / 2, barR);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
  }

  // ── Stat boxes ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'SAVED', value: fmt(saved),  color: '#66BB6A' },
    { label: 'LEFT',  value: fmt(left),   color: '#EF9A9A' },
    { label: 'GOAL',  value: fmt(target), color: 'rgba(255,255,255,0.75)' },
  ];
  const boxY = barY + barH + 22;
  const boxW = (barW - 20) / 3;
  stats.forEach((s, i) => {
    const bx = barX + i * (boxW + 10);
    roundRect(ctx, bx, boxY, boxW, 68, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    roundRect(ctx, bx, boxY, boxW, 68, 12);
    ctx.strokeStyle = 'rgba(76,175,80,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = 'bold 10px DejaVu Sans';
    ctx.fillText(s.label, bx + 14, boxY + 20);
    ctx.fillStyle = s.color;
    ctx.font = 'bold 18px DejaVu Sans';
    ctx.fillText(s.value, bx + 14, boxY + 48);
  });

  // ── Recent additions ──────────────────────────────────────────────────────
  const histX = barX, histY = boxY + 88;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = 'bold 11px DejaVu Sans';
  ctx.fillText('RECENT ADDITIONS', histX, histY);

  const recent = log.slice(0, 4);
  if (recent.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '14px DejaVu Sans';
    ctx.fillText('No additions yet', histX, histY + 24);
  } else {
    recent.forEach((e, i) => {
      const iy = histY + 22 + i * 26;
      roundRect(ctx, histX, iy - 14, barW, 22, 8);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(46,125,50,0.10)' : 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.fillStyle = '#66BB6A';
      ctx.font = 'bold 13px DejaVu Sans';
      ctx.fillText(`+${fmt(e.amt)}`, histX + 12, iy + 4);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px DejaVu Sans';
      ctx.fillText(e.time, histX + 120, iy + 4);
    });
  }

  // ── Footer line ───────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(76,175,80,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 28, H - 56);
  ctx.lineTo(cx + cw - 28, H - 56);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.font = '11px DejaVu Sans';
  ctx.fillText('Use /add to log a deposit  •  /set to adjust values  •  /progress to display', cx + 28, H - 42);

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
    .setColor(done ? 0x66BB6A : 0x2E7D32)
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
