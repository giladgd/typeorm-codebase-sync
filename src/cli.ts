#!/usr/bin/env node

import yargs from "yargs";
// eslint-disable-next-line node/file-extension-in-import
import {hideBin} from "yargs/helpers";
import {AddReferencesCommand} from "./commands/AddReferencesCommand.js";


const yarg = yargs(hideBin(process.argv));

yarg
    .usage("Usage: $0 <command> [options]")
    .command(new AddReferencesCommand())
    .recommendCommands()
    .demandCommand(1)
    .strict()
    .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .wrap(Math.min(100, yarg.terminalWidth()))
    .argv;
