# Supabase Auth Security Configuration

## Leaked Password Protection

**Status**: ⚠️ NEEDS MANUAL CONFIGURATION

The Supabase database linter has identified that leaked password protection is currently disabled. This feature prevents users from using passwords that have been compromised in data breaches by checking against the HaveIBeenPwned.org database.

### How to Enable

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Find the **Password Security** section
4. Enable **Leaked Password Protection**

### Benefits

- Prevents users from using passwords that have been compromised in known data breaches
- Enhances overall security posture
- Reduces risk of account takeovers
- Complies with security best practices

### Implementation Details

- Uses HaveIBeenPwned.org API to check passwords
- Checks occur during user registration and password changes
- No actual passwords are sent to the service (uses k-anonymity)
- Minimal performance impact

### References

- [Supabase Password Security Documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)

---

**Action Required**: This must be manually enabled in the Supabase Dashboard as it cannot be configured via SQL migrations or environment variables.