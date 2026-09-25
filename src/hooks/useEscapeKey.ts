import { useEffect, useRef } from 'react';

// กองหน้าต่างที่เปิดอยู่ — Esc ปิดเฉพาะอันบนสุด (เช่น กล่องยืนยันที่ซ้อนบนหน้าต่างแก้ไข)
const stack: Array<{ current: () => void }> = [];

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || stack.length === 0) return;
  event.preventDefault();
  stack[stack.length - 1].current();
}

/** ปิดหน้าต่าง (modal) ด้วยปุ่ม Esc ขณะที่ active เป็น true */
export function useEscapeKey(onEscape: () => void, active = true): void {
  const handler = useRef(onEscape);

  useEffect(() => {
    handler.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const entry = handler;
    if (stack.length === 0) window.addEventListener('keydown', onKeyDown);
    stack.push(entry);
    return () => {
      const index = stack.lastIndexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      if (stack.length === 0) window.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);
}
