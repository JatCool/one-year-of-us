// Усі стартові тексти сайту. Після підключення Supabase ними заповнюється CMS.
export const couple = { husband: 'Андрій', wife: 'Анастасія', date: '2025-09-25', anniversary: '2026-09-25' }
export const milestones = [
  { icon: '✦', title: 'ПОЧАТОК', date: '25 ВЕРЕСНЯ 2025', text: 'Того дня ми сказали «так» назавжди.', image: '' },
  { icon: '⌂', title: 'НАШ ДІМ', date: 'ОСІНЬ 2025', text: 'Будуємо життя з тисячі маленьких речей.', image: '' },
  { icon: '↗', title: 'НОВІ РОЗДІЛИ', date: 'ЗИМА 2026', text: 'Нові місця. Нові враження. Та сама команда.', image: '' },
  { icon: '☻', title: 'ТРОХИ ХАОСУ', date: 'ВЕСНА 2026', text: 'І якось ми впоралися одне з одним. Навіть красиво.', image: '' },
  { icon: '∞', title: 'ОДИН РІК', date: '25 ВЕРЕСНЯ 2026', text: '365 днів потому — я знову обрав би тебе.', image: '' }
]
export const places = [
  { place: 'Україна', date: 'ДЕ ПОЧАЛАСЯ НАША ІСТОРІЯ', note: 'Початок усього найважливішого.', image: '' },
  { place: 'Греція', date: 'МАЛЕНЬКА ВТЕЧА', note: 'Сонце, море і ми.', image: '' },
  { place: 'Польща', date: 'НАША ЩОДЕННА ПРИГОДА', note: 'Робимо дім домом, день за днем.', image: '' },
  { place: 'Краків', date: 'МІСТО, ЯКЕ МИ ВІДКРИВАЄМО', note: 'Наші улюблені куточки ще чекають.', image: '' }
]
const monthNames = ['СІЧЕНЬ','ЛЮТИЙ','БЕРЕЗЕНЬ','КВІТЕНЬ','ТРАВЕНЬ','ЧЕРВЕНЬ','ЛИПЕНЬ','СЕРПЕНЬ','ВЕРЕСЕНЬ','ЖОВТЕНЬ','ЛИСТОПАД','ГРУДЕНЬ']
const captions = ['Тихий початок.','Місяць про нас.','Ще трохи весни.','Звичайний, але наш.','Дні, що світилися.','Довга дорога додому.','Літо на повторі.','Розділ, який хочеться зберегти.','Уже один рік.','Маленькі пригоди.','Тепле світло, довгі розмови.','І все ще обираю тебе.']
export const months = monthNames.map((month, i) => ({ month, image: '', caption: captions[i] }))
export const achievements = [['01','ПЕРШИЙ РІК','Пройдено 365 днів шлюбу.'],['02','СПІЛЬНИЙ ДІМ','Збудовано життя разом.'],['03','ЗАБАГАТО НАШИХ ЖАРТІВ','Більше ніхто не зрозуміє.'],['04','ПЕРЕЖИЛИ ХАОС','Якимось чином — успішно.'],['05','ВСЕ ЩЕ ОБИРАЮ ТЕБЕ','Кожного дня.']]
export const reasons = ['Бо поруч із тобою навіть звичайний день стає особливим.','Бо ти вмієш зробити будь-яке місце домом.','Бо твій сміх може перезапустити важкий день.','Бо нам найкраще, коли ми просто собою.','Бо майбутнє поруч із тобою трохи менше лякає.','Бо ти бачиш красу в деталях, які я б пропустив.','Бо ти — моя улюблена пригода і мій найспокійніший дім.','Бо я досі хочу розповідати тобі кожну дрібницю.']
export const commits = [['2026-09-25','completed_year_01'],['2026-07-14','survived_another_adventure'],['2026-05-03','added_more_memories'],['2026-02-14','still_in_love'],['2025-09-25','marriage_initialized']]
export const letter = `Анастасіє,\n\n[ТУТ БУДЕ МІЙ ОСОБИСТИЙ ЛИСТ]\n\nЗ нашою першою річницею.\n\nЯ люблю тебе.\n\n— Андрій`

export type BlockKey = 'milestones' | 'places' | 'months' | 'achievements' | 'reasons' | 'terminal' | 'commits' | 'letter'
export const defaultVisibleBlocks: Record<BlockKey, boolean> = {
  milestones: true,
  places: true,
  months: true,
  achievements: true,
  reasons: true,
  terminal: true,
  commits: true,
  letter: true
}

export type MusicConfig = {
  url: string
  startSeconds: number
  endSeconds: number
  loop: boolean
  enabled?: boolean
  title?: string
}
export const defaultMusic: MusicConfig = { url: '', startSeconds: 0, endSeconds: 0, loop: true, enabled: true, title: 'Наша особлива мелодія' }

