# ExcelDex

ExcelDex is a search-first quick reference for Excel functions and tips. It runs in the browser with no backend.

> Live demo: https://asorajx.github.io/exceldex/

## Overview

Search for a function by name or by what you're trying to do, and get a plain-English explanation, sample data and a formula you can edit and copy into Excel. Tips cover keyboard shortcuts and how-tos.

## Goals

- Answer "how do I do this in Excel?" with one search
- Explain functions in plain language, with sample data so things like `A2:A5` actually mean something
- Be upfront about sources, and flag shortcuts that aren't in Microsoft's documentation
- Stay small, static, accessible and well tested

## Features

- Search by name, task, typo, word form, or text inside steps and notes
- A formula builder with required and optional arguments, plus add, remove, reset and copy
- An explanation that rewrites itself as you change the formula
- Sample data and the result for every example

## Technology Stack

| Technology | Purpose |
| --- | --- |
| React | The interface |
| TypeScript | Logic and type safety |
| CSS | Styling, design tokens, responsive layout |
| Vite | Dev server and production build |
| JSON | The content (functions and tips) |
| Vitest, Testing Library | Automated tests |
| axe-core | Accessibility checks |
| oxlint | Linting |

## Getting started

To run ExcelDex locally, clone or download the repository and follow the steps below. If you're using the hosted site, there's nothing to install.

You'll need Node.js 22.22+ or 24.15+ (see `.nvmrc`) and npm. Open a terminal in the project folder.

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address shown in the terminal.

Other useful commands:

```bash
npm test        # unit, component, accessibility and privacy tests
npm run build   # type-check and production build
npm run preview # serve the production build locally
npm run lint    # lint
npm run eval    # search evaluation report
```

If PowerShell blocks npm, use `npm.cmd` instead of `npm`.

## Not affiliated with Microsoft

ExcelDex is an independent project. It isn't affiliated with, endorsed by or sponsored by Microsoft. Microsoft and Excel are trademarks of the Microsoft group of companies. Each entry links to the Microsoft page it was checked against.

## Documentation

How search works, the search evaluation and its limits, accessibility and privacy checks, and where the content comes from are covered in the project report.

Full project report: _add the link here if you write one._
