# Release Notes - v[VERSION]

**Release Date**: [DATE]
**Type**: [Major/Minor/Patch] Release

---

## 🎉 Highlights

<!-- 2-3 sentence summary of the most important changes -->

[Brief description of this release's main focus]

---

## ✨ New Features

<!-- List new features added in this release -->

### [Feature Category 1]

- **[Feature Name]**: Description of what it does and why it's useful
  - Technical details if needed
  - Usage example (optional)
  - Related issue: #[issue-number]

### [Feature Category 2]

- **[Feature Name]**: Description
  - Details
  - Issue: #[issue-number]

---

## 🐛 Bug Fixes

<!-- List bugs fixed in this release -->

- **[Component/Area]**: Description of the bug and how it was fixed
  - Impact: [Who was affected]
  - Fix: [How it was resolved]
  - Issue: #[issue-number]

---

## 🔧 Improvements

<!-- List enhancements to existing features -->

### Performance

- [Optimization description]
  - Before: [metric]
  - After: [metric]
  - Improvement: [X%]

### UX/UI

- [UI improvement description]
  - Benefit: [User benefit]

### Developer Experience

- [DX improvement]
  - Benefit: [Developer benefit]

---

## 📝 Documentation

<!-- List documentation additions/improvements -->

- Added [document name] for [purpose]
- Updated [document name] with [changes]
- Fixed typos/errors in [document name]

---

## 🔄 Changed

<!-- List changes to existing functionality -->

### Breaking Changes ⚠️

<!-- If any breaking changes, list them prominently -->

- **[What changed]**
  - **Before**: [Old behavior]
  - **After**: [New behavior]
  - **Migration**: [How to update your code]
  - **Reason**: [Why this change was necessary]

### Deprecations

- **[Feature/API]**: Deprecated in v[VERSION], will be removed in v[FUTURE-VERSION]
  - **Alternative**: [What to use instead]
  - **Timeline**: [When it will be removed]

---

## 🗑️ Removed

<!-- List features/APIs that were removed -->

- **[Feature name]**: Reason for removal
  - **Alternative**: [What to use instead]

---

## 🔐 Security

<!-- List security-related changes -->

- **[Security fix]**: Description
  - **Severity**: [Critical/High/Medium/Low]
  - **CVE**: [CVE-ID] (if applicable)
  - **Credit**: [Researcher name] (if external report)

---

## 📦 Dependencies

<!-- List major dependency updates -->

### Updated

- **[Package name]**: [old version] → [new version]
  - **Reason**: [Why it was updated]
  - **Breaking changes**: [Any breaking changes from the package]

### Added

- **[Package name]**: [version]
  - **Purpose**: [Why it was added]

### Removed

- **[Package name]**
  - **Reason**: [Why it was removed]

---

## 🏗️ Infrastructure

<!-- List infrastructure changes -->

- **[Infrastructure change]**: Description
  - **Impact**: [How it affects deployment/operations]

---

## 📊 Metrics

<!-- Include relevant metrics for this release -->

### Code Quality

| Metric               | Previous | Current | Change  |
| -------------------- | -------- | ------- | ------- |
| TypeScript Errors    | [N]      | [N]     | [+/-N]  |
| Test Coverage        | [%]      | [%]     | [+/-%]  |
| Total Tests          | [N]      | [N]     | [+N]    |
| Bundle Size (shared) | [KB]     | [KB]    | [+/-KB] |

### Performance

| Metric                   | Previous | Current | Change  |
| ------------------------ | -------- | ------- | ------- |
| Lighthouse Performance   | [score]  | [score] | [+/-N]  |
| First Contentful Paint   | [ms]     | [ms]    | [+/-ms] |
| Largest Contentful Paint | [ms]     | [ms]    | [+/-ms] |
| Time to Interactive      | [ms]     | [ms]    | [+/-ms] |

---

## 🧪 Testing

<!-- Describe testing done for this release -->

- **Unit Tests**: [N passed/N total]
- **Integration Tests**: [N passed/N total]
- **E2E Tests**: [N passed/N total]
- **Manual Testing**: [What was manually tested]
- **Browser Compatibility**: [Browsers tested]

---

## 📋 Upgrade Instructions

<!-- Brief upgrade guide or link to detailed guide -->

### Quick Upgrade (0.X.X → [VERSION])

```bash
# 1. Backup
[backup commands]

# 2. Update code
git pull origin main
git checkout v[VERSION]

# 3. Update dependencies
pnpm install

# 4. Run migrations (if any)
[migration commands]

# 5. Build and restart
pnpm build
[restart command]
```

For detailed upgrade instructions, see [UPGRADE-GUIDE.md](../UPGRADE-GUIDE.md).

---

## ⚠️ Known Issues

<!-- List any known issues in this release -->

- **[Issue description]**
  - **Workaround**: [How to work around it]
  - **Status**: [When fix is expected]
  - **Tracking**: #[issue-number]

---

## 🙏 Contributors

<!-- Thank contributors to this release -->

This release includes contributions from:

- [@username](https://github.com/username) - [Contribution description]
- [@username](https://github.com/username) - [Contribution description]

**First-time contributors** 🎉

- [@username](https://github.com/username)

Thank you to everyone who contributed!

---

## 📚 Additional Resources

- **Full Changelog**: [CHANGELOG.md](../CHANGELOG.md)
- **Upgrade Guide**: [UPGRADE-GUIDE.md](../UPGRADE-GUIDE.md)
- **Documentation**: https://docs.nself.org
- **API Changes**: [API.md](../API.md)

---

## 🔗 Links

- **Download**: [Release v[VERSION]](https://github.com/nself-org/nchat/releases/tag/v[VERSION])
- **Docker Image**: `nchat:[VERSION]`
- **npm Package**: `@nself/chat@[VERSION]`

---

## 📞 Support

Need help with this release?

- **GitHub Issues**: https://github.com/nself-org/nchat/issues
- **GitHub Discussions**: https://github.com/nself-org/nchat/discussions
- **Discord**: [Community Server Link]
- **Email**: support@nself.org

---

## 🗓️ Next Release

**Planned for**: [DATE]
**Focus**: [What the next release will focus on]

See our [roadmap](https://github.com/nself-org/nchat/projects) for more details.

---

_ɳChat is open source software released under the MIT License._
