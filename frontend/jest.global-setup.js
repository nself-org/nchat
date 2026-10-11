/**
 * Jest global setup: pin the time zone for every test run.
 *
 * CI runners default to UTC, which has no DST, so date maths that counts
 * elapsed milliseconds instead of calendar days passes there and fails for
 * users in DST zones. America/New_York changes offset twice a year, so
 * deadline tests with pinned clocks cross a real DST change everywhere.
 *
 * TZ must be set here, before Jest starts its workers: assigning
 * process.env.TZ inside a test file has no effect because Jest sandboxes
 * process.env per test file.
 */
module.exports = async () => {
  process.env.TZ = 'America/New_York'
}
