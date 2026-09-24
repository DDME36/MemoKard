import { pb } from '../lib/pocketbase';

export interface Report {
  id: string;
  reporter_username: string;
  reason: string;
  details: string | null;
  created_at: string;
}

export interface ReportedDeck {
  id: string;
  name: string;
  creator_username: string;
  creator_id: string;
  category: string;
  import_count: number;
  is_active: boolean;
  is_hidden: boolean;
  report_count: number;
  created_at: string;
  reports: Report[];
}

const OPEN = 'status = "" || status = "open"';

export const adminStore = {
  async loadReportedDecks(): Promise<ReportedDeck[]> {
    const reports = await pb.collection('deck_reports').getFullList({
      filter: OPEN,
      sort: '-created',
      expand: 'user,public_deck',
    });
    const byDeck = new Map<string, ReportedDeck>();
    for (const r of reports) {
      const deck = r.expand?.public_deck;
      if (!deck) continue;
      const entry: ReportedDeck = byDeck.get(deck.id) ?? {
        id: deck.id,
        name: deck.name,
        creator_username: deck.owner_name || 'ไม่ทราบชื่อ',
        creator_id: deck.owner,
        category: deck.category || 'ทั่วไป',
        import_count: deck.import_count || 0,
        is_active: !deck.hidden,
        is_hidden: Boolean(deck.hidden),
        report_count: 0,
        created_at: deck.created,
        reports: [],
      };
      entry.reports.push({
        id: r.id,
        reporter_username: r.expand?.user?.username || 'ไม่ทราบชื่อ',
        reason: r.reason,
        details: r.detail || null,
        created_at: r.created,
      });
      entry.report_count = entry.reports.length;
      byDeck.set(deck.id, entry);
    }
    return [...byDeck.values()].sort((a, b) => b.report_count - a.report_count);
  },

  async setHidden(deckId: string, hidden: boolean): Promise<void> {
    await pb.collection('public_decks').update(deckId, { hidden });
  },

  async deletePublicDeck(deckId: string): Promise<void> {
    await pb.collection('public_decks').delete(deckId);
  },

  async dismissReports(deckId: string): Promise<void> {
    const open = await pb.collection('deck_reports').getFullList({
      filter: pb.filter(`public_deck = {:id} && (${OPEN})`, { id: deckId }),
    });
    for (let i = 0; i < open.length; i += 50) {
      const batch = pb.createBatch();
      open.slice(i, i + 50).forEach((r) => batch.collection('deck_reports').update(r.id, { status: 'dismissed' }));
      await batch.send();
    }
  },

  async countOpenReports(): Promise<number> {
    const result = await pb.collection('deck_reports').getList(1, 1, { filter: OPEN });
    return result.totalItems;
  },

  async findUsers(query: string): Promise<{ id: string; username: string }[]> {
    const result = await pb.collection('users').getList(1, 20, {
      filter: pb.filter('username ~ {:q}', { q: query.trim() }),
      sort: 'username',
    });
    return result.items.map((u) => ({ id: u.id, username: u.username }));
  },

  async resetPassword(userId: string, password: string): Promise<void> {
    await pb.send('/api/memokard/admin/reset-password', { method: 'POST', body: { userId, password } });
  },
};
