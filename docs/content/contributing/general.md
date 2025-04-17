---
title: General Information
---

## Coding Style

When refactoring, writing or altering files, adhere to these rules:

1. **Adjust your style of coding to the style that is already present**! Even if you do not like it, this is due to consistency. There was a lot of work involved in making all files consistent.
2. **Use `pnpm lint` to check your scripts**! Your contributions are checked by GitHub Actions too, so you will need to do this.
3. **Use the provided `.vscode/settings.json`** file.

## Documentation

Make sure to select `edge` in the dropdown menu at the top. Navigate to the page you would like to edit and click the edit button in the top right. This allows you to make changes and create a pull-request.

Alternatively you can make the changes locally. For that you'll need to have Docker installed. Run

```sh
pnpm docs:serve
```

This serves the documentation on your local machine on port `8080`. Each change will be hot-reloaded onto the page you view, just edit, save and look at the result.
