export const heroQuotes = [
  '留出剛好的空間，讓思考慢慢展開。',
  '給想法一點餘裕，讓創意自然發生。',
  '對話之外，也為思考保留位置。',
  '在交流之間，看見更多可能。',
  '讓觀點有機會相遇，也有時間沉澱。',
  '留白片刻，成就更好的答案。',
  '每一次討論，都值得被好好思考。',
  '讓靈感在從容中誕生。',
  '為深度交流創造剛好的距離。',
  '讓想法有時間長成共識。',
  '好的空間，容得下不同觀點。',
  '把時間留給更有價值的討論。',
  '讓每個聲音都有被聽見的機會。',
  '思考需要空間，創新也是。',
  '為重要的決定留下餘裕。',
  '對話可以很有效率，也可以很有深度。',
  '把留白留給洞見。',
  '讓交流不只是交換意見。',
  '在討論中發現新的方向。',
  '讓共識從理解開始。',
  '每一次相聚，都值得更多思考。',
  '好的對話，總在從容之間發生。',
  '為靈感留一扇窗。',
  '讓思緒自在流動。',
  '讓觀點碰撞出新的火花。',
  '把空間還給思考。',
  '給討論多一點深度。',
  '給決策多一點時間。',
  '為創意留下更多可能。',
  '沉澱之後，想法更有力量。',
  '真正有價值的對話，不急著得出答案。',
  '留下空間，讓答案自己浮現。',
  '給思考一個舒服的節奏。',
  '讓每次交流都更靠近價值。',
  '共識來自充分的理解。',
  '深度來自適當的留白。',
  '讓好想法有機會被發現。',
  '思考越充分，決定越篤定。',
  '讓對話成為改變的開始。',
  '每個觀點，都值得被認真對待。',
  '在交流中激發靈感。',
  '在討論裡創造未來。',
  '留下時間，聽見更多聲音。',
  '讓思考走在結論之前。',
  '讓想法先發酵，再定案。',
  '好決定，來自好討論。',
  '讓交流更有溫度與深度。',
  '給創新的種子一點時間。',
  '讓每個觀點綻放價值。',
  '留白，是為了走得更遠。',
  '為重要時刻預留思考空間。',
  '好的交流，從充分理解開始。',
  '在對話中累積智慧。',
  '給每個想法被探索的機會。',
  '思考不該被時間追趕。',
  '讓討論更專注、更深入。',
  '為洞見創造發生的條件。',
  '交流愈充分，共識愈清晰。',
  '讓觀點匯聚成力量。',
  '在留白之中孕育創新。',
  '好想法值得等待。',
  '每一次討論都是成長的契機。',
  '為深度工作保留空間。',
  '保留餘裕，看見全新的觀點。',
  '讓溝通成為價值的起點。',
  '讓靈感找到停留的地方。',
  '用空間成就更好的交流。',
  '用思考豐富每一次對話。',
  '讓討論更有方向感。',
  '在節奏之中保有從容。',
  '每個答案，都從提問開始。',
  '每個洞見，都源於傾聽。',
  '給未說出口的想法一點機會。',
  '為思考留白，為創新續航。',
  '好的成果來自好的過程。',
  '把寶貴時間留給真正重要的事。',
  '讓每分鐘都更有意義。',
  '用對話開啟更多可能。',
  '讓觀點在交流中成長。',
  '讓創意在互動中發芽。',
  '留出空間，讓價值被看見。',
  '讓深度成為習慣。',
  '為共創鋪墊更多可能。',
  '把討論變成前進的力量。',
  '好的交流，讓每個人都有收穫。',
  '用思考拉近彼此距離。',
  '用理解凝聚共識。',
  '為合作創造更好的起點。',
  '讓每次相遇都有價值。',
  '在交流中發現更好的答案。',
  '讓思考有餘裕，讓創意有出口。',
  '讓每段對話都值得回味。',
  '用留白成就深度。',
  '為想法創造生長空間。',
  '讓討論超越結論本身。',
  '在傾聽中發現新可能。',
  '在共創中激發新價值。',
  '給好點子一個誕生的機會。',
  '讓交流成為創新的養分。',
  '留出剛好的空間，讓每一次相聚都有意義。',
] as const;

const storageKey = 'meetbooker.hero-quotes.v1';
type Progress = { remaining: number[]; last: number };
type QuoteStorage = Pick<Storage, 'getItem' | 'setItem'>;
let memoryProgress: Progress = { remaining: [], last: -1 };

export function nextHeroQuote(storage?: QuoteStorage): string {
  let progress = memoryProgress;
  try {
    const stored = JSON.parse(storage?.getItem(storageKey) || 'null');
    if (stored && Array.isArray(stored.remaining) &&
      stored.remaining.every((id: unknown) => Number.isInteger(id) && Number(id) >= 0 && Number(id) < heroQuotes.length) &&
      new Set(stored.remaining).size === stored.remaining.length &&
      Number.isInteger(stored.last) && stored.last >= 0 && stored.last < heroQuotes.length && !stored.remaining.includes(stored.last)) {
      progress = stored;
    }
  } catch { /* Continue in memory when browser storage is unavailable or corrupt. */ }
  const remaining = [...progress.remaining];
  if (!remaining.length) {
    remaining.push(...heroQuotes.map((_, index) => index));
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    // Avoid repeating the last quote at the boundary between shuffled rounds.
    if (remaining[remaining.length - 1] === progress.last) {
      [remaining[0], remaining[remaining.length - 1]] = [remaining[remaining.length - 1], remaining[0]];
    }
  }
  const last = remaining.pop()!;
  memoryProgress = { remaining, last };
  try { storage?.setItem(storageKey, JSON.stringify(memoryProgress)); } catch { /* Keep the page usable without storage. */ }
  return heroQuotes[last];
}

let pageQuote: string | undefined;
export function getPageHeroQuote(): string {
  if (pageQuote === undefined) {
    let storage: QuoteStorage | undefined;
    try { storage = window.localStorage; } catch { /* Private browser settings may block storage. */ }
    pageQuote = nextHeroQuote(storage);
  }
  return pageQuote;
}
