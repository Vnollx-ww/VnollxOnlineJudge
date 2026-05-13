/**
 * 嵌套 Modal / Drawer 时，各自对 document.body 设 overflow 会互相覆盖。
 * 用引用计数：只有第一层加锁、最后一层解锁时才读写 body 样式。
 */
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

export function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount += 1;
}

export function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }
}
