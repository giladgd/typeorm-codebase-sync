# TypeORM Codebase Sync
Automatically update your codebase to add migrations, entities and subscribers to your `data-source.ts` file

[![codecov](https://badgen.net/codecov/c/github/giladgd/typeorm-codebase-sync)](https://codecov.io/gh/giladgd/typeorm-codebase-sync)
[![Test](https://github.com/giladgd/typeorm-codebase-sync/actions/workflows/test.yml/badge.svg)](https://github.com/giladgd/typeorm-codebase-sync/actions/workflows/test.yml)
[![Downloads](https://badgen.net/npm/dt/typeorm-codebase-sync)](https://www.npmjs.com/package/typeorm-codebase-sync)
[![License](https://badgen.net/npm/license/typeorm-codebase-sync)](https://www.npmjs.com/package/typeorm-codebase-sync)
[![Version](https://badgen.net/npm/v/typeorm-codebase-sync)](https://www.npmjs.com/package/typeorm-codebase-sync)


## Installation
1. Install dependencies
```bash
npm install --save typeorm typescript
```

2. Install `typeorm-codebase-sync`
```bash
npm install --save typeorm-codebase-sync
```

3. Add `typeorm-sync` script to `package.json`
```bash
npm set-script "typeorm-sync" "typeorm-codebase-sync addReferences --dataSource ./src/db/data-source.ts --migrations ./src/db/migrations --entities ./src/db/entities --subscribers ./src/db/subscribers"
```

4. To automatically run `typeorm-sync` after using the typeorm CLI, edit `package.json`:
```bash
npm set-script "posttypeorm" "npm run typeorm-sync"
``` 

> Given that your `package.json` contains a script called `typeorm`,
> after each time you run `npm run typeorm -- <params>`, the `typeorm-sync` script will automatically run

## Documentation
### `addReferences` command
```txt
Usage: typeorm-codebase-sync addReferences --dataSource <path> [options]

Required:
  -d, --dataSource  Path to a data-source.ts file                                [string] [required]

Files:
  -m, --migrations   Glob of migration files or folders containing migration files           [array]
  -e, --entities     Glob of entity files or folders containing entity files                 [array]
  -s, --subscribers  Glob of subscriber files or folders containing subscriber files         [array]

Options:
  -h, --help     Show help                                                                 [boolean]
  -v, --version  Show version number                                                       [boolean]
```
