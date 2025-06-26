---
title: Translation
---

This project supports multiple languages. If you would like to contribute a translation, please follow these steps:

## Add new Translation

Create a new file in `src/i18n/locales`. Name it `<locale_code>.json` (e.g. `fr.json` for French).

Import and add the newly created file in `src/i18n/i18n.config.ts`.

Add your language in the `src/nuxt.config.ts` file. You have to specify code, language and name.

`code` is the name of the translation file without the extension (e.g. `fr` for `fr.json`).

`language` is the BCP 47 language tag with region (e.g. `fr-FR` for French). See [www.lingoes.net](http://www.lingoes.net/en/translator/langcode.htm) for a list of language codes.

`name` is the display name of the language (e.g. `Français` for French).

## Update existing Translation

If you need to update an existing translation, simply edit the corresponding `<locale_code>.json` file in `src/i18n/locales`.

## Contribute changes

See [Pull Requests](./issues-and-pull-requests.md#pull-requests) on how to contribute your translation.
