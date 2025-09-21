# Migrate to v7.x.x

Baileys 7.0.0 has multiple breaking changes that need to be addressed.

Share the link: https://whiskey.so/migrate-latest

## LIDs

:::warning
This system requires the auth state to support the `lid-mapping` key. Make sure you have updated your authentication state. Also, PLEASE cache it using [`makeCacheableSignalKeyStore()`](../api/functions/makeCacheableSignalKeyStore), as done in the Example, as the cache can be accessed & updated rather quickly.
:::

WhatsApp finalized its LID (Local Identifier) update (which it started in 2023). This LID system assures the anonymity of users on large groups, allowing the WhatsApp client to show a simple (`+43.......21`) to hide the phone number. This is done to ensure the privacy of users.

WhatsApp is also adding a username system (`@username`) later on, so relying on a phone number to identify the user has become cumbersome and sometimes unreliable and impossible. Thus WhatsApp now assigns a LID to each user on its platform.

This LID is unique to each user, like how a JID is. It is NOT unique per group like others have said. You can message anyone using either their LID or their PN.

PN stands for phone number, and is the old JID format you are used to (`user@s.whatsapp.net`).

By default now, all new Signal sessions are in the LID format. Old sessions will be migrated. On new device sync, the main (mobile) device will include a mapping of `PN<->LID`.

WhatsApp allows us to get the LID from a PN using the protocol (`onWhatsApp()` / USyncProtocol), but not the opposite.

For the sake of businesses and Meta Ads, WhatsApp has used the LIDs for 2 years ([#408](https://github.com/WhiskeySockets/Baileys/pull/408)), and in those cases, you (business) can request the user to share the number (send a message with `{ requestPhoneNumber: true }`), OR you (the user), can share your number with a business (`{ sharePhoneNumber: true }`).

6.8.0 Introduces the following fields to the MessageKey:
- `remoteJidAlt` -> this is for DMs
- `participantAlt` -> this is for Groups and other contexts (broadcast, channels?, so on)

This is the Alternate JID for the user, thus, if participant is a LID, the Alt will be a PN.

Also, in the [GroupMetadata](../api/interfaces/GroupMetadata) type, each ID type is now a LID and associated with it is a pn type (`owner` and `ownerPn`, `descOwner` and `descOwnerPn`, so on..)

In the [Contact](../api/interfaces/Contact) type, there are no longer any `jid`/`lid` fields. Instead, there is an `id` field (the preferred one by WhatsApp), and there is a `phoneNumber` and `lid` field. One or the other is present depending on the `id` field. If the `id` is an LID, then the `phoneNumber` is present, and vice versa.

NOTE: The changes applied in the [Contact](../api/interfaces/Contact) type affect the [`participants`](../api/interfaces/GroupMetadata#participants) property of groups as well.

There is also a new enum called `WAMessageAddressingMode`, this represents the preferred type of ID in a chat or group.

In the events, there is now a `lid-mapping.update` event that returns a new LID/PN mapping if found (not reported always, this is a WIP).

It also removes the "`isJidUser`" function and replaces it with "`isPnUser`". The reason is that both PNs and LIDs are JIDs, so this isn't logical at all.

There is an internal store PNs and LIDs, and it can be accessed via:
```ts
const store = sock.signalRepository.lidMapping
// available methods:
// storeLIDPNMapping, storeLIDPNMappings, getLIDForPN, getPNForLID
```

## ESM

Baileys 6.8.0 ditches CommonJS for the sake of ESM. We use multiple ESM packages, and have had to resort to extreme solutions to get them to work with CommmonJS. Not to mention that our linting system was outdated because we relied on CJS (Eslint was multiple major versions behind).

This also limited our expansion into Web, Deno, Bun and other runtimes and limited us severely to Node. It also introduced quirks like `makeWASocket.default`.

One of the only solutions are:

1. Convert your project to ESM (recommended):
This involves changing your type in `package.json` to `module` and replacing `require()` calls with `import` calls.
If you have any remaining CommonJS modules that you still need to use from ESM, you can use [`createRequire()`](https://nodejs.org/api/module.html#modulecreaterequirefilename).


2. Import Baileys from within CommonJS:
This isn't recommended, but you can do this by using a `await import()` call.
Example:
```ts
// cjs_module.js

// Use require normally
const fs = require('fs');

async function loadESMModule() {
  try {
    const { default: makeWASocket } = await import('baileys'); // Dynamic import of an ESM module
    const socket = makeWASocket(...)
  } catch (error) {
    console.error('Error loading ESM module:', error);
  }
}

loadESMModule();
```

With this change, the project has also moved to the new version of Yarn (Yarn v4.x) rather than Yarn Classic. This means that the project now requires corepack.

## Protobufs

To drastically reduce the bundle size of Baileys, we have removed some methods in the `proto` package. The only ones that remain are: `.create()` (to be used in the place of `.fromObject()`), and `.encode()` / `.decode()`


For the full patch notes of 7.0.0, check the latest GitHub release: https://github.com/WhiskeySockets/Baileys/releases/

