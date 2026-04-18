# Security Policy

## Supported Versions

We actively support the following versions of nself-chat with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

We take the security of nself-chat seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability publicly until it has been addressed
- Exploit the vulnerability beyond what is necessary to demonstrate it

### Reporting Process

**Email**: security@nself.org

Please include the following information in your report:

1. **Type of vulnerability** (e.g., XSS, SQL injection, CSRF, authentication bypass)
2. **Full path to affected source file(s)** if applicable
3. **Step-by-step instructions to reproduce** the vulnerability
4. **Proof-of-concept or exploit code** if possible
5. **Impact** of the vulnerability (who is affected, what can be compromised)
6. **Suggested fix** if you have one

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 5 business days
- **Progress Updates**: Every 5 business days until resolution
- **Disclosure Timeline**: We aim to address critical vulnerabilities within 30 days

### Coordinated Disclosure

We request that you:

1. Give us reasonable time to investigate and fix the issue
2. Avoid exploiting the vulnerability in production environments
3. Not disclose the vulnerability until we've issued a fix and advisory

We will:

1. Work with you to understand and validate the issue
2. Keep you informed of our progress
3. Credit you in the security advisory (unless you prefer to remain anonymous)
4. Coordinate the public disclosure with you

## Security Best Practices

When deploying nself-chat in production, please follow these security best practices:

### Environment Configuration

1. **Never use development authentication** in production:

   ```env
   NEXT_PUBLIC_USE_DEV_AUTH=false
   ```

2. **Use strong secrets** (minimum 32 characters):

   ```env
   HASURA_ADMIN_SECRET=<strong-random-string>
   JWT_SECRET=<strong-random-string>
   SOCIAL_MEDIA_ENCRYPTION_KEY=<strong-random-string>
   ```

3. **Use production URLs** (never localhost):

   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   NEXT_PUBLIC_GRAPHQL_URL=https://api.your-domain.com/v1/graphql
   ```

4. **Enable email verification**:
   ```env
   NEXT_PUBLIC_AUTH_REQUIRE_EMAIL_VERIFICATION=true
   ```

### Authentication

1. Configure OAuth providers with production credentials
2. Use domain restrictions for team workspaces:
   ```env
   NEXT_PUBLIC_AUTH_ACCESS_MODE=domain-restricted
   NEXT_PUBLIC_AUTH_ALLOWED_DOMAINS=your-company.com
   ```
3. Enable 2FA for admin accounts
4. Rotate JWT secrets periodically

### Network Security

1. Always use HTTPS in production
2. Configure proper CORS headers
3. Use environment-specific API keys
4. Keep all dependencies up to date

### Data Protection

1. Enable encryption at rest for database
2. Use encrypted connections for all services
3. Regularly backup your database
4. Implement proper key management for encryption keys

### Monitoring

1. Enable Sentry for error tracking:
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://...
   ```
2. Monitor failed authentication attempts
3. Set up alerts for suspicious activity
4. Review audit logs regularly

### Updates

1. Subscribe to security advisories
2. Apply security patches promptly
3. Test updates in staging before production
4. Keep nself CLI and all services updated

## Known Security Considerations

### Development Mode

- **Test users have weak passwords** - Never expose dev mode to the internet
- **Auto-login is enabled** - Only use in local development
- **Reduced security checks** - Many validations are disabled

### Third-Party Integrations

- **Social media tokens are encrypted** - But encryption key must be kept secret
- **OAuth credentials** - Store securely and never commit to git
- **API keys** - Use environment variables, not hardcoded values

### File Uploads

- File type validation is enforced
- File size limits are configurable
- Virus scanning is recommended for production (not included by default)

## Security Features

nself-chat includes the following security features:

- **JWT-based authentication** via Nhost Auth
- **Role-based access control (RBAC)** with 5 default roles
- **Content Security Policy (CSP)** headers
- **XSS protection** via React's built-in escaping
- **CSRF protection** via SameSite cookies
- **SQL injection protection** via Hasura's GraphQL layer
- **Rate limiting** on authentication endpoints
- **Audit logging** for admin actions
- **Token encryption** for third-party OAuth credentials
- **Secure password hashing** (bcrypt via Nhost)

## Security Audit History

| Date       | Auditor  | Scope         | Report                                                    |
| ---------- | -------- | ------------- | --------------------------------------------------------- |
| 2026-01-29 | Internal | Full codebase | [docs/SECURITY-AUDIT.md](security/SECURITY-AUDIT.md) |

## Compliance

nself-chat is designed with the following compliance considerations:

- **GDPR**: Data export and deletion capabilities
- **CCPA**: User data management and consent
- **SOC 2**: Audit logging and access controls
- **WCAG 2.1 AA**: Accessibility standards

## Additional Resources

- [Security Audit Report](security/SECURITY-AUDIT.md)
- [Authentication Documentation](configuration/Authentication.md)
- [Deployment Security Guide](deployment/DEPLOYMENT.md)
- [Environment Variables Reference](.env.example)

## Contact

- **Security Issues**: security@nself.org
- **General Support**: support@nself.org
- **Documentation**: https://github.com/nself-org/nchat/tree/main/docs

## Hall of Fame

We appreciate security researchers who help keep nself-chat safe:

<!-- Security researchers who responsibly disclose vulnerabilities will be listed here -->

---

**Last Updated**: January 30, 2026
**Version**: 0.3.0
