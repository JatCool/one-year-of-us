# Один рік нас

Статичний React/Vite-сайт для GitHub Pages із приватною CMS за адресою `/admin`.

## Один раз: підключити CMS

1. Створіть безкоштовний проєкт у [Supabase](https://supabase.com/dashboard).
2. У **SQL Editor** вставте та виконайте весь файл [`supabase/schema.sql`](./supabase/schema.sql). Він створить захищену таблицю, bucket для фото та RLS-політики.
3. У **Authentication → Providers** залиште Email увімкненим. У **Authentication → Users** створіть користувача з вашою поштою й надійним паролем. Не вмикайте public sign-up, якщо не хочете створення чужих акаунтів.
4. У **Project Settings → API** скопіюйте **Project URL** і лише **anon public key** (ніколи не service_role key).
5. Скопіюйте `.env.example` у `.env` та внесіть значення. Файл `.env` не комітьте.
6. Запустіть `npm install`, далі `npm run dev`. Відкрийте `http://localhost:5173/admin`, увійдіть і натисніть «Зберегти зміни» хоча б раз — так стартовий вміст з’явиться в базі.

Фото в адмінці завантажуються прямо у Supabase Storage, а публічний сайт читає збережений JSON під час відкриття сторінки. Анонімний ключ у фронтенді безпечний тут: політики RLS дозволяють читання всім, але запис та upload — лише авторизованому користувачеві.

## GitHub Pages

1. Створіть GitHub repository і запуште код.
2. У repository **Settings → Secrets and variables → Actions** додайте два secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. У **Settings → Pages** виберіть **GitHub Actions** як джерело деплою.
4. У `.github/workflows/deploy.yml` змініть `VITE_BASE_PATH` на `/<назва-репозиторію>/` (для `username.github.io` залиште `/`).
5. Після пушу в `main` сайт буде доступний за GitHub Pages URL. Адмінка: `https://username.github.io/repository/admin`.

## Локальна перевірка

```bash
npm install
npm run build
npm run dev
```

Перевірте публічну сторінку й `/admin` у mobile device emulation. Vite’s history fallback дозволяє `/admin` локально; GitHub Pages для SPA потребує додаткового 404 fallback, тому у workflow копіюється `index.html` у `404.html`.
