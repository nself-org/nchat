/**
 * Hello Bot
 * A friendly bot that greets users and responds to hello messages
 */

import { bot, command } from "@/lib/bots";
import { helloCommand, waveCommand, goodbyeCommand } from "./commands";
import { handleGreetingMessage, handleMention } from "./handlers";
import manifest from "./manifest.json";

/**
 * Create and configure the Hello Bot
 */
export function createHelloBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions("read_messages", "send_messages", "mention_users")

      // Register commands
      .command(
        command("hello")
          .description("Say hello to someone")
          .aliases("hi", "hey")
          .stringArg("name", "Name of the person to greet")
          .example("/hello", "/hello World", "/hi @alice")
          .cooldown(3),
        helloCommand,
      )
      .command(
        command("wave")
          .description("Wave at someone")
          .userArg("user", "User to wave at")
          .example("/wave", "/wave @bob"),
        waveCommand,
      )
      .command(
        command("goodbye")
          .description("Say goodbye")
          .aliases("bye", "cya")
          .example("/goodbye", "/bye"),
        goodbyeCommand,
      )

      // Register message handlers
      .onMessage(handleGreetingMessage)
      .onMention(handleMention)

      // Initialization
      .onInit((instance, api) => {})

      .build()
  );
}

// Export the bot factory
export default createHelloBot;

// Export manifest for external use
export { manifest };

// Re-export commands for testing
export { helloCommand, waveCommand, goodbyeCommand };
