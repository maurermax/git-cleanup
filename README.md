git-cleanup
===========

A node-based command line utility to cleanup git repositories in a safe fashion. Time- and Merge-based.

This utility will help you to delete your git branches (local and remote ones) that are already merged into a target branch and that have not been touched for at least two weeks.

## Careful!
This is ALPHA software. This utility issues `git branch -d` and even `git branch -r -d` commands and can delete remote as well as local branches. It has not been tested to the fullest. So make sure you would be able to restore your work! We are not responsible for any loss of data in your repos.

## How to use?
1. `npm install -g git-cleanup`
1. Go to the repo where you want to cleanup.
1. issue a `git-cleanup`
1. everything local is gone

### Options
`git-cleanup --help` will give you

````
 Usage: git-cleanup [options]

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -p, --path [path]     path to where to execute git (default: __dirname)
    -r, --remote [name]   use remote named (default: use local branches)
    -o, --origin          use origin (same as --remote="origin")
    -b, --both            use both origin and local at the same time (default: use local branches)
    -t, --target [name]   the name of the target branch that is checked (default: master)
    -e, --emulate         do all checks but don't really delete the branches (will only output messages)
    -b, --prefix [regex]  only delete branches matching this regex
````
