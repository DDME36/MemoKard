import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { adminStore } from '../store/adminStore';

export default function AdminPasswordReset() {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; username: string } | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const panel = isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800';
  const input = `w-full px-4 py-2.5 rounded-xl border-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`;

  const search = async () => {
    if (query.trim().length < 2) return;
    try {
      setUsers(await adminStore.findUsers(query));
    } catch {
      showToast('ค้นหาผู้ใช้ไม่สำเร็จ', 'error');
    }
  };

  const reset = async () => {
    if (!selected || password.length < 8) return;
    setBusy(true);
    try {
      await adminStore.resetPassword(selected.id, password);
      showToast(`ตั้งรหัสผ่านใหม่ให้ ${selected.username} แล้ว`, 'success');
      setPassword('');
      setSelected(null);
    } catch {
      showToast('รีเซ็ตรหัสผ่านไม่สำเร็จ', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`mt-8 p-6 rounded-3xl ${panel}`}>
      <h2 className="text-lg font-bold">รีเซ็ตรหัสผ่านผู้ใช้</h2>
      <p className="text-sm opacity-70 mt-1">ใช้เมื่อผู้ใช้ลืมรหัสผ่าน ตั้งรหัสชั่วคราวแล้วแจ้งให้เขาเปลี่ยนเอง</p>
      <div className="flex gap-2 mt-4">
        <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ชื่อผู้ใช้" onKeyDown={(e) => e.key === 'Enter' && void search()} />
        <button className="px-4 rounded-xl bg-violet-500 text-white font-bold" onClick={() => void search()}>ค้นหา</button>
      </div>
      <ul className="mt-3 space-y-1">
        {users.map((u) => (
          <li key={u.id}>
            <button className={`w-full text-left px-3 py-2 rounded-lg ${selected?.id === u.id ? 'bg-violet-500 text-white' : ''}`} onClick={() => setSelected(u)}>
              {u.username}
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="flex gap-2 mt-4">
          <input className={input} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" />
          <button disabled={busy || password.length < 8} className="px-4 rounded-xl bg-rose-500 text-white font-bold disabled:opacity-50" onClick={() => void reset()}>
            ตั้งรหัสใหม่
          </button>
        </div>
      )}
    </section>
  );
}
