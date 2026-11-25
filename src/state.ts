// Estado de "mi carta": lo que el visitante ha ido agregando.

export interface LetterItem {
  id: string;
  label: string;
  kind: 'wish' | 'gift';
}

type Listener = (items: LetterItem[], changed: LetterItem | null, added: boolean) => void;

const items = new Map<string, LetterItem>();
const listeners = new Set<Listener>();

export const letter = {
  has: (id: string) => items.has(id),
  all: () => [...items.values()],
  count: () => items.size,
  toggle(item: LetterItem): boolean {
    const added = !items.has(item.id);
    if (added) items.set(item.id, item);
    else items.delete(item.id);
    listeners.forEach((fn) => fn(letter.all(), item, added));
    return added;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(letter.all(), null, false);
  },
};
