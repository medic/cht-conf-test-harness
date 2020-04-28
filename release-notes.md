# Medic-conf-test-harness Release Notes

This is an experimental project which remains in alpha testing. There may be breaking changes released as patches until version 1.0 is published.

## 0.1.30

* Removes the `pushMockedReport` interface and replaces it with a new `pushMockedDoc` which can accept either report or contact documents.
* Deprecates the `loadForm` interface, users should use the `fillForm`.
