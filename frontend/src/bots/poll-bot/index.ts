/**
 * Poll Bot
 * Create interactive polls and surveys in your channels
 */

import { bot, command } from "@/lib/bots";
import {
  pollCommand,
  quickpollCommand,
  pollResultsCommand,
  endPollCommand,
} from "./commands";
import {
  handleVoteReaction,
  checkExpiredPolls,
  cleanupOldPolls,
} from "./handlers";
import manifest from "./manifest.json";

/**
 * Create and configure the Poll Bot
 */
export function createPollBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions(
        "read_messages",
        "send_messages",
        "add_reactions",
        "manage_reactions",
      )

      // Register commands
      .command(
        command("poll")
          .description("Create a new poll")
          .stringArg("question", "The poll question", true)
          .stringArg("options", "Poll options separated by | (pipe)", true)
          .durationArg("duration", "How long the poll should last")
          .example(
            '/poll "What\'s for lunch?" "Pizza | Tacos | Sushi"',
            '/poll "Meeting time?" "10am | 2pm | 4pm" --duration 1h',
          )
          .cooldown(10),
        pollCommand,
      )
      .command(
        command("quickpoll")
          .description("Create a yes/no poll")
          .aliases("yesno")
          .stringArg("question", "The poll question", true)
          .example('/quickpoll "Should we have a team meeting today?"')
          .cooldown(5),
        quickpollCommand,
      )
      .command(
        command("pollresults")
          .description("Show results of a poll")
          .aliases("results")
          .stringArg("poll_id", "ID of the poll", true)
          .example("/pollresults abc123"),
        pollResultsCommand,
      )
      .command(
        command("endpoll")
          .description("End a poll early")
          .stringArg("poll_id", "ID of the poll to end", true)
          .example("/endpoll abc123"),
        endPollCommand,
      )

      // Handle vote reactions
      .onReaction(handleVoteReaction)

      // Initialization and periodic tasks
      .onInit((instance, api) => {
        // Check for expired polls periodically (every minute)
        const checkInterval = setInterval(() => {
          const expired = checkExpiredPolls();
          if (expired.length > 0) {
            // Could send results to channels here
          }
        }, 60 * 1000);

        // Cleanup old polls daily
        const cleanupInterval = setInterval(
          () => {
            const deleted = cleanupOldPolls();
            if (deleted > 0) {
              // Polls cleaned up
            }
          },
          24 * 60 * 60 * 1000,
        );

        // Register cleanup handlers to prevent memory leaks
        instance.registerCleanup(() => {
          clearInterval(checkInterval);
          clearInterval(cleanupInterval);
        });
      })

      .build()
  );
}

// Export the bot factory
export default createPollBot;

// Export manifest for external use
export { manifest };

// Re-export commands for testing
export { pollCommand, quickpollCommand, pollResultsCommand, endPollCommand };

// Re-export handlers for testing
export {
  handleVoteReaction,
  createPoll,
  getPoll,
  registerVote,
  formatPollResults,
} from "./handlers";
