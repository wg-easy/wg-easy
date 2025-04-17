---
title: Issues and Pull Requests
---

This project is Open Source. That means that you can contribute on enhancements, bug fixing or improving the documentation.

## Opening an Issue

/// note | Attention

**Before opening an issue**, read the [`README`][github-file-readme] carefully, study the docs for your version (maybe [latest][docs-latest]) and your search engine you trust. The issue tracker is not meant to be used for unrelated questions!
///

When opening an issue, please provide details use case to let the community reproduce your problem.

/// note | Attention

**Use the issue templates** to provide the necessary information. Issues which do not use these templates are not worked on and closed.
///

By raising issues, I agree to these terms and I understand, that the rules set for the issue tracker will help both maintainers as well as everyone to find a solution.

Maintainers take the time to improve on this project and help by solving issues together. It is therefore expected from others to make an effort and **comply with the rules**.

### Filing a Bug Report

Thank you for participating in this project and reporting a bug. `wg-easy` is a community-driven project, and each contribution counts!

Maintainers and moderators are volunteers. We greatly appreciate reports that take the time to provide detailed information via the template, enabling us to help you in the best and quickest way. Ignoring the template provided may seem easier, but discourages receiving any support.

Markdown formatting can be used in almost all text fields (_unless stated otherwise in the description_).

Be as precise as possible, and if in doubt, it's best to add more information that too few.

When an option is marked with "not officially supported" / "unsupported", then support is dependent on availability from specific maintainers.

## Pull Requests

/// question | Motivation

You want to add a feature? Feel free to start creating an issue explaining what you want to do and how you're thinking doing it. Other users may have the same need and collaboration may lead to better results.
///

### Submit a Pull-Request

The development workflow is the following:

1. Fork the project
2. Write the code that is needed :D
3. Document your improvements if necessary
4. [Commit][commit] (and [sign your commit][gpg]), push and create a pull-request to merge into `master`. Please **use the pull-request template** to provide a minimum of contextual information and make sure to meet the requirements of the checklist.

Pull requests are automatically tested against the CI and will be reviewed when tests pass. When your changes are validated, your branch is merged. CI builds the new `:edge` image on every push to the `master` branch and your changes will be included in the next version release.

[docs-latest]: https://wg-easy.github.io/wg-easy/latest
[github-file-readme]: https://github.com/wg-easy/wg-easy/blob/master/README.md
[commit]: https://help.github.com/articles/closing-issues-via-commit-messages/
[gpg]: https://docs.github.com/en/github/authenticating-to-github/generating-a-new-gpg-key
