---
title: Account
---

Open the user menu in the top-right corner and select **Account** to manage your profile and sign-in methods. The same menu links to **Clients**, **Admin Panel** for administrators, and **Logout**.

## Profile

Update your **Name** and optional **Email**, then select **Save**. The name is your display name; this form does not change your login username.

## Password

Enter your current password, a new password of at least 12 characters, and the matching confirmation, then select **Update Password**.

If your account was created through an external provider and has no password, use **Add Password** to set one. No current password is required in that case. Adding a password does not override a server setting that disables password authentication.

## Two-Factor Authentication

Use **Enable Two Factor Authentication** to set up an authenticator app. See the [2FA guide](./2fa.md) for enrollment and removal instructions.

## External Authentication

When the server has external providers configured, the **External Authentication** section lets you link your account to a provider or view the current link. Select a provider and complete its sign-in flow to link it.

**Unlink** removes the current provider link. You must have a password before unlinking; **Add Password** is available if you do not have one. If the server disables password authentication, arrange another working sign-in method before removing your provider link.

Administrators can configure providers using the [External Authentication guide](../advanced/config/external-authentication.md).

## Display Preferences

The header includes controls for language, light/dark/system theme, and client traffic charts. These controls are separate from your account's profile settings.
