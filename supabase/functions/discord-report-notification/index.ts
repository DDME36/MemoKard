// Supabase Edge Function: Discord Report Notification
// Sends Discord webhook when a deck is reported or auto-hidden

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1456187506960633856/FH1QsdGVNMgQaUQyqVlicvjhbcwPNoFRPdUOxbh-sUI4KrjgcOaCutbHbO6N-aia7fOA';

interface ReportPayload {
  type: 'insert';
  table: 'deck_reports';
  record: {
    id: string;
    public_deck_id: string;
    reporter_user_id: string;
    reason: string;
    details: string;
    created_at: string;
  };
}

serve(async (req) => {
  try {
    const payload: ReportPayload = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get deck details
    const { data: deck } = await supabase
      .from('public_decks')
      .select('id, name, creator_username, is_hidden')
      .eq('id', payload.record.public_deck_id)
      .single();

    if (!deck) {
      return new Response('Deck not found', { status: 404 });
    }

    // Get reporter username
    const { data: reporter } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', payload.record.reporter_user_id)
      .single();

    // Count total reports for this deck
    const { count: reportCount } = await supabase
      .from('deck_reports')
      .select('*', { count: 'exact', head: true })
      .eq('public_deck_id', payload.record.public_deck_id);

    // Prepare Discord message
    const reasonMap: Record<string, string> = {
      spam: '🚫 สแปม',
      inappropriate: '⚠️ เนื้อหาไม่เหมาะสม',
      copyright: '©️ ละเมิดลิขสิทธิ์',
      other: '❓ อื่นๆ',
    };

    const isAutoHidden = deck.is_hidden && reportCount && reportCount >= 5;
    const statusEmoji = isAutoHidden ? '🔒' : reportCount && reportCount >= 3 ? '⚠️' : '📝';

    const embed = {
      title: `${statusEmoji} รายงานชุดการ์ด${isAutoHidden ? ' (ถูกซ่อนอัตโนมัติ)' : ''}`,
      color: isAutoHidden ? 0xff0000 : reportCount && reportCount >= 3 ? 0xffa500 : 0x5865f2,
      fields: [
        {
          name: '📚 ชุดการ์ด',
          value: `**${deck.name}**`,
          inline: false,
        },
        {
          name: '👤 เจ้าของชุด',
          value: deck.creator_username,
          inline: true,
        },
        {
          name: '🚨 ผู้รายงาน',
          value: reporter?.username || 'Unknown',
          inline: true,
        },
        {
          name: '📊 จำนวนรายงาน',
          value: `**${reportCount || 0}** ครั้ง`,
          inline: true,
        },
        {
          name: '⚠️ เหตุผล',
          value: reasonMap[payload.record.reason] || payload.record.reason,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MemoKard - Daily Memory',
      },
    };

    // Add details if provided
    if (payload.record.details && payload.record.details.trim()) {
      embed.fields.push({
        name: '📝 รายละเอียด',
        value: payload.record.details.substring(0, 1024), // Discord limit
        inline: false,
      });
    }

    // Add deck link
    const deckUrl = `https://memokard.app/deck/${deck.id}`;
    embed.fields.push({
      name: '🔗 ลิงก์',
      value: deckUrl,
      inline: false,
    });

    // Add status message
    if (isAutoHidden) {
      embed.fields.push({
        name: '🔒 สถานะ',
        value: '**ชุดการ์ดถูกซ่อนอัตโนมัติ** (รายงาน ≥ 5 ครั้ง)',
        inline: false,
      });
    } else if (reportCount && reportCount >= 3) {
      embed.fields.push({
        name: '⚠️ คำเตือน',
        value: `อีก **${5 - reportCount}** รายงานจะถูกซ่อนอัตโนมัติ`,
        inline: false,
      });
    }

    // Send to Discord
    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'MemoKard Reports',
        avatar_url: 'https://memokard.app/pwa-512x512.png',
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      throw new Error(`Discord API error: ${discordResponse.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
