# Languages

Vietnamese (`vi`) is the default interface language; English (`en`) is available
from the VI / EN control in the header and login screen. The `va-locale` cookie
persists the choice for one year. Unsupported or missing cookie values use
Vietnamese. URLs, authentication redirects, and database identifiers stay the same.

The root layout reads the cookie and passes the locale into `LanguageProvider`,
so server rendering and the initial client render use the same language. Switching
updates the client context and refreshes server components without resetting forms.
The HTML language, page metadata, and display dates also follow the preference.
Attendance calculations always use the Vietnam time zone.

## Adding interface text

English source messages are translation keys. Add the corresponding Vietnamese
message to `lib/i18n/vi.json`. In client components, use:

```tsx
const t = useTranslations();
return <button>{t("Save changes")}</button>;
```

In server components, use `const t = await getTranslations()` from
`@/lib/i18n/server` instead. Keep full sentences together and use placeholders:

```tsx
t("{0} of {1} lessons", { 0: completed, 1: total })
```

Keep source messages in error/success state and translate them when rendering.
Known interpolated source messages are matched against catalog templates, so
messages already displayed can change languages without clearing the form.
Unknown messages fall back to their original text.

Translate interface labels only. Course names, lesson instructions, reading
passages, flashcard terms, definitions, student names, and user input remain as
authored. English speech synthesis remains English. Never translate IDs, option
values, status codes sent to the server, or database field names.

## Verification

Run `npm run typecheck`, `npm run build`, and
`npm test -- --pool=threads --no-isolate`. The test command uses threads to avoid
temporary module-cache failures in the Windows sandbox's process pool.
