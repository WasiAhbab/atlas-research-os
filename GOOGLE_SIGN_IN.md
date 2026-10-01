# Atlas Google sign-in setup

Google sign-in replaces signup and password-reset emails for the Google login flow. Supabase still manages sessions and stores research. Each verified Supabase user ID receives its own workspace through the existing database ownership policies. Brevo is not needed for this flow.

## Google Auth Platform

1. Open https://console.cloud.google.com/auth/overview and select a dedicated **Atlas Research OS** project.
2. Configure the consent screen: app name **Atlas Research OS**, your support/contact email, and **External** audience. In Testing mode, add the Google accounts you will use for testing.
3. Use only the basic identity scopes: `openid`, `email`, and `profile`. Atlas does not need Gmail, Drive, calendar, or offline access.
4. Create an OAuth client with type **Web application** and name **Atlas Web**. Use `http://localhost:3211` as the development JavaScript origin.
5. Add the **Supabase** callback URI from Authentication → Sign In / Providers → Google. For the connected project it is:

   `https://gzrcfpugherxugrvqtid.supabase.co/auth/v1/callback`

6. Save the client ID and client secret privately. Put them in Supabase's Google provider settings, not in frontend source or the downloadable ZIP. Keep nonce checking enabled and do not allow users without email addresses.

## Supabase and Atlas

1. Enable Google in Supabase Authentication → Sign In / Providers using the client ID and secret.
2. Keep email confirmation enabled for any email/password accounts. No confirmation bypass is required for Google login.
3. Set Supabase Site URL to `http://localhost:3211` while testing. Allow these exact callback paths:
   - `http://localhost:3211/auth/callback`
   - `http://localhost:3211/auth/callback?**`
4. Set `ATLAS_AUTH_METHOD=google` and `ATLAS_GOOGLE_AUTH_ENABLED=true` in Atlas's private environment, then restart the app. The Google button remains disabled until the readiness flag is true.
5. Open http://localhost:3211/auth and choose **Continue with Google**. The first sign-in creates a workspace; subsequent sign-ins use that same account. Use the same localhost spelling throughout the flow so PKCE cookies match.
6. Verify saving and reloading, sign-out/sign-in, and separation between two test accounts. The existing automated PostgreSQL tests cover ownership policies, but do not replace this live test.

## Public launch on Vercel

- Add the deployed HTTPS origin to the Google web client. The Google redirect URI remains the Supabase callback above.
- Set Supabase Site URL and `NEXT_PUBLIC_APP_URL` to the deployment's HTTPS origin. Add `/auth/callback` and `/auth/callback?**` for that exact origin to Supabase's redirect list. Avoid wildcard hosts.
- Set the same auth mode and readiness variables in Vercel. Keep the existing database URL and vault master key unchanged.
- Change the Google audience from Testing to **In production** for public Google-account access. Complete any branding/domain/policy requirements shown by Google. Do not claim public signup works while the app is restricted to test users.
- For now, public users need a Google account. To add email/password later, configure a working SMTP sender, test confirmation and recovery, and set `ATLAS_AUTH_METHOD=both`. Email functionality remains in the source.
- Google-only access does not send Atlas password-reset emails. Account recovery is handled by Google. Other future notification emails would still need an email sender.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/auth-smtp
