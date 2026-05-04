# GitHub Security Features Setup Instructions

## Step 1: Enable Dependabot Alerts

1. **Navigate to Repository Settings**
   - Go to your repository: `https://github.com/[your-username]/hazardos`
   - Click the "Settings" tab at the top

2. **Access Security & Analysis Settings**
   - In the left sidebar, click "Code security and analysis"

3. **Enable Dependabot Features**
   - Find the "Dependabot" section
   - Enable the following features:
     
     ✅ **Dependabot alerts**
     - Click "Enable" if not already enabled
     - This will notify you of vulnerabilities in dependencies
     
     ✅ **Dependabot security updates** 
     - Click "Enable" if not already enabled
     - This allows automatic PRs for security fixes
     
     ✅ **Dependabot version updates**
     - This should automatically be enabled due to our `.github/dependabot.yml` file
     - Provides regular dependency updates on schedule

4. **Enable Additional Security Features**
   
   ✅ **Private vulnerability reporting**
   - Click "Enable" to allow security researchers to report issues privately
   
   ✅ **Secret scanning**
   - Click "Enable" to automatically scan for leaked credentials
   
   ✅ **Push protection for secret scanning**
   - Click "Enable" to block pushes containing secrets

## Step 2: Configure Security Notifications

1. **Repository Notification Settings**
   - Still in "Settings" → "Code security and analysis"
   - Look for "Notifications" section
   
   Configure these notification preferences:
   - ✅ **Dependabot alerts**: Email notifications for new vulnerabilities
   - ✅ **Failed secret scanning pushes**: Immediate notification when secrets are detected
   - ✅ **Successful secret scanning pushes**: Optional (can be noisy)

2. **Personal Notification Settings**
   - Go to your GitHub profile settings: https://github.com/settings/notifications
   - Navigate to "Code security and analysis"
   
   Recommended settings:
   - ✅ **Dependabot alerts**: Email + Web notifications
   - ✅ **Secret scanning alerts**: Email + Web notifications
   - ✅ **Repository vulnerability alerts**: Email notifications

3. **Team/Organization Notifications** (if applicable)
   - If this is an organization repository:
   - Go to Organization Settings → Code security and analysis
   - Configure organization-wide policies
   - Set up team notifications for security alerts

## Step 3: Configure Branch Protection Rules

1. **Navigate to Branch Protection**
   - In repository Settings → "Branches" (left sidebar)
   - Click "Add rule" or edit existing rule for `main` branch

2. **Required Security Checks**
   Add these required status checks:
   - ✅ **Security Audit & Dependency Updates / security-audit**
   - ✅ **CI / lint-and-typecheck**  
   - ✅ **CI / test**
   - ✅ **CI / build**

3. **Additional Protection Settings**
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Do not allow bypassing the above settings** (for admins)

## Step 4: Set Up Security Advisories Monitoring

1. **Watch Security Advisories**
   - Go to https://github.com/advisories
   - Click "Watch" on relevant ecosystems:
     - ✅ **npm** (for Node.js packages)
     - ✅ **GitHub Actions** (for workflow dependencies)

2. **Configure Advisory Notifications**
   - In your notification settings, ensure you receive:
   - ✅ **Security advisories**: For packages you depend on
   - ✅ **Repository security advisories**: For this specific repo

## Step 5: Verify Configuration

After enabling all features, verify they're working:

1. **Check Dependabot Status**
   - Go to repository "Insights" tab
   - Click "Dependency graph" → "Dependabot"
   - Should show "Dependabot is monitoring this repository"

2. **Test Secret Scanning**
   - Create a test branch with a fake API key
   - Try to push it - should be blocked by push protection
   - Delete the test branch after verification

3. **Verify Workflow Integration**
   - Check that the security workflow is listed under "Actions" tab
   - Ensure it has proper permissions to create PRs

## Step 6: Team Communication

1. **Notify Team Members**
   - Send team notification about new security processes
   - Share this documentation with developers
   - Schedule brief training on security update procedures

2. **Create Security Contact List**
   - Designate security point persons
   - Set up escalation procedures
   - Document emergency response contacts

## Troubleshooting Common Issues

### Dependabot PRs Not Creating
- Check that `dependabot.yml` is in `.github/` directory
- Verify repository has write access for Dependabot
- Check organization/repository settings for Dependabot permissions

### Security Workflow Failures
- Ensure `GITHUB_TOKEN` has sufficient permissions
- Check that workflow files are in `.github/workflows/`
- Verify no syntax errors in YAML files

### Notification Issues
- Check spam/junk folders for security emails
- Verify notification settings in GitHub profile
- Check organization notification policies

## Quick Verification Checklist

After setup, you should see:
- ✅ Dependabot tab in repository Insights
- ✅ Security advisories listed if any exist
- ✅ Weekly Dependabot PRs (starting next Monday)
- ✅ Security workflow runs on pushes/PRs
- ✅ Email notifications for new vulnerabilities

## Next Steps

Once GitHub features are enabled:
1. Wait for first Dependabot PRs (next Monday)
2. Review and merge safe security updates
3. Monitor security workflow results
4. Test incident response procedures

---

**Note**: Some features may require repository admin permissions or organization policy changes. Contact your GitHub administrator if you encounter permission issues.