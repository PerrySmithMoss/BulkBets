# Tasks

## Production email configuration

- [ ] Configure and verify Resend password-recovery emails in production.

  Local delivery is verified. The production deployment still needs its SMTP
  credentials and public application URL configured.

  - Configure the VPS deployment’s exported settings and Swarm secrets (see `deploy/README.md`):
    - `SMTP_ADDR=smtp.resend.com:587`
    - `SMTP_FROM=noreply@bulkbets.perrysmithmoss.com`
    - `SMTP_USERNAME=resend`
    - `bulkbets_smtp_password`: a Swarm secret containing a Resend API key with sending-only access.
  - Include `deploy/docker-stack.smtp.yml` when deploying the API stack.
  - Set `APP_HOST` to the deployed web hostname. The production Swarm stack
    derives `APP_CLIENT_URL=https://${APP_HOST}`; confirm generated reset links
    use this public HTTPS origin.
  - Confirm the verified Resend domain and its Vercel DNS records remain valid.
  - Apply the settings and recreate the production API service. Confirm the
    hosting environment permits outbound SMTP on port 587 with STARTTLS.
  - Use a dedicated test account and controlled inbox to request a reset through
    the deployed website. Confirm Resend reports delivery, the email arrives,
    and the reset link opens the deployed application.
  - Verify the reset succeeds, the new password works, the old password fails,
    and the reset link cannot be reused.
  - Document the deployment settings and verification result without recording
    API keys, passwords, or reset tokens. Keep automated E2E tests on isolated reset fixtures with outbound email disabled.

  Done when production password recovery passes the delivery and reset checks
  above, with credentials stored securely outside version control.
