# Contributing

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

The Community Health Toolkit is powered by people like you. Your contributions help us create open source technology for a new model of healthcare that reaches everyone.

## Submitting code

> We recommend you raise an issue on Github or start a conversation on our [Community Forum](https://forum.communityhealthtoolkit.org) about the change you want to make before you start on code.

- Read our [Development Workflow](https://docs.communityhealthtoolkit.org/contribute/code/workflow/) to understand how we work, and review our [Code Style Guide](https://docs.communityhealthtoolkit.org/contribute/code/style-guide/) before you begin.
  - Note that the "Project States" section does not apply to changes made to `cht-conf-test-harness` 
- Make the code change.
  - Include tests for any new/updated logic.
    - Include the issue/PR number in the test title. This provides context for future debugging if the test ever regresses.
  - Update the project's version number in the [package.json](./package.json) by running `npm version <major|minor|patch>`
- Before you submit a pull request, please make sure your contribution passes all tests. Test failures need to be addressed before we can merge your contribution.
  - You can run `npm run travis` to build the project, lint the source code, and execute the tests.
- Provide detail about the issue you are solving in the pull request description. Note: If your pull request addresses a specific issue, please reference it using medic/<repo>#<issue number>
- Our CI will automatically schedule a build; monitor the build to ensure it passes.
- Your PR will be reviewed by one of the repository's maintainers. Most PRs have at least one change requested before they're merged so don't be offended if your change doesn't get accepted on the first try!

### Code of Conduct

All maintainers and contributors are required to act according to our [Code of Conduct](https://github.com/medic/cht-core/blob/master/CODE_OF_CONDUCT.md). Thank you for your help building a positive community and a safe environment for everyone.

#### License
The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
