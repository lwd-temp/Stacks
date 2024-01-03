# Automatic Library Release

**Date:** 2023-12-04

**Related PR:** [#1576](https://github.com/StackExchange/Stacks/pull/1576)

## Issue

At the time of writing, many Stacks libraries are released manually. This is a time-consuming process that is prone to human error. We should automate this process to save time and reduce errors. The lack of an automated release process requires use to permit developer-specific accounts to publish, which is a liability and violates the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege).

## Decision

We will use [changesets](https://github.com/changesets/changesets) to manage versioning and automate the release process of our libraries in conjunction with GitHub Actions.

***Note**: Despite using changesets to handle automatic library releases and changelogs, we still follow [conventional commits standards](https://www.conventionalcommits.org/en/v1.0.0/) for keeping our git history easily parseable by the human eye.*

### Reasoning

#### Ease of use

The primary implentation of changesets is its [CLI package](https://www.npmjs.com/package/@changesets/cli) which will help us manage the versioning and changelog entries for our packages. We can apply the [changesets bot](https://github.com/apps/changeset-bot) to any repository to verify that a given PR has a changeset associated with it and remind the author to create one if it does not.

#### Level of automation

With changesets, it's [trivial to setup a GitHub Action](https://github.com/changesets/action/) that will create a release PR whenever a given branch includes pending changesets. This automates much of the effort required to release a new version of a library while still allowing us to review the changesets before they are released.

#### Encourages good practices

By using changesets, we can encourage contributors to write detailed descriptions of their changes and group them together in a single changeset. This removes the reliance on Git messages to describe changes that may require more detail than one would generally include in a Git message.

#### Monorepo support

From changesets' [documentation](https://github.com/changesets/changesets/blob/main/docs/problems-publishing-in-monorepos.md):

> Monorepos have a heap of complexity around how publishing to npm works. Changesets helps most repository users avoid ever having to think about these problems, however repository maintainers, especially those who want to customise how their releases work (for example those not using our github action), may want to understand what it is solving for you.

#### Changelog generation support

The automated release PRs created by changesets include a changelog entry for each changeset included in the release, which we can adjust if necessary before merging the PR.

#### npm publish support

Release PRs generated by changesets can be used in conjunction with GitHub Actions to automatically publish a package to npm when the PR is merged. See the [GitHub Action currently in use in the axe-apca repository](https://github.com/StackExchange/apca-check/blob/main/.github/workflows/release.yml) for a real-world example.

### Other tools considered

#### [standard-version](https://github.com/conventional-changelog/standard-version)

`standard-version` was deprecated in May 2022. They recommend `release-please` as an alternative.

#### [release-please](https://github.com/googleapis/release-please)

`release-please` is a very similar tool to changesets, but we opted for changesets because of `release-please`'s [*requirement* of using conventional commits](https://github.com/googleapis/release-please/tree/main#how-should-i-write-my-commits). We want to encourage conventional commits, but not require them or tightly couple to the format.

#### [semantic-release](https://github.com/semantic-release/semantic-release)

`semantic-release` does not include first-class monorepo support. The extra setup and overhead required to use it in a monorepo environment made `semantic-release` less appealing when compared to other options.

## Additional info

- [Changesets repository](https://github.com/changesets/changesets)