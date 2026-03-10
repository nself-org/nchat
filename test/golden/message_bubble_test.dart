// message_bubble_test.dart
// T-0449 — Flutter: golden tests for chat/ message bubble component
//
// Mirrors claw/test/golden/message_bubble_test.dart for the chat app.
// chat/ uses a simpler bubble: sent/received only (no tool calls).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// ChatMessageBubble stub
// Replace with: import 'package:nself_chat/widgets/chat_message_bubble.dart';
// ---------------------------------------------------------------------------

class ChatMessageBubble extends StatelessWidget {
  final String content;
  final bool isSent;
  final String senderName;
  final bool isUnread;

  const ChatMessageBubble({
    super.key,
    required this.content,
    required this.isSent,
    required this.senderName,
    this.isUnread = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final bgColor = isSent ? colorScheme.primary : colorScheme.surfaceContainerHighest;
    final textColor = isSent ? colorScheme.onPrimary : colorScheme.onSurface;

    return Align(
      alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!isSent)
            Padding(
              padding: const EdgeInsets.only(left: 16, bottom: 2),
              child: Text(
                senderName,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.primary,
                ),
              ),
            ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
            constraints: const BoxConstraints(maxWidth: 280),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isSent ? 16 : 4),
                bottomRight: Radius.circular(isSent ? 4 : 16),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    content,
                    style: TextStyle(color: textColor, fontSize: 15),
                  ),
                ),
                if (isUnread) ...[
                  const SizedBox(width: 6),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

Widget _wrap(Widget child, {bool dark = false}) {
  return MaterialApp(
    theme: dark
        ? ThemeData.dark(useMaterial3: true)
        : ThemeData.light(useMaterial3: true),
    home: Scaffold(
      body: Center(child: child),
    ),
  );
}

// ---------------------------------------------------------------------------
// Golden tests
// ---------------------------------------------------------------------------

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ChatMessageBubble golden tests', () {
    testWidgets('chat_bubble_sent_light', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatMessageBubble(
            content: 'Hey everyone! Meeting in 5 minutes.',
            isSent: true,
            senderName: 'You',
          ),
        ),
      );

      await expectLater(
        find.byType(ChatMessageBubble),
        matchesGoldenFile('goldens/chat_bubble_sent_light.png'),
      );
    });

    testWidgets('chat_bubble_received_light', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatMessageBubble(
            content: 'On my way!',
            isSent: false,
            senderName: 'Ali',
          ),
        ),
      );

      await expectLater(
        find.byType(ChatMessageBubble),
        matchesGoldenFile('goldens/chat_bubble_received_light.png'),
      );
    });

    testWidgets('chat_bubble_unread_light', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatMessageBubble(
            content: 'Did you see the announcement?',
            isSent: false,
            senderName: 'Team',
            isUnread: true,
          ),
        ),
      );

      await expectLater(
        find.byType(ChatMessageBubble),
        matchesGoldenFile('goldens/chat_bubble_unread_light.png'),
      );
    });

    testWidgets('chat_bubble_sent_dark', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatMessageBubble(
            content: 'Hey everyone! Meeting in 5 minutes.',
            isSent: true,
            senderName: 'You',
          ),
          dark: true,
        ),
      );

      await expectLater(
        find.byType(ChatMessageBubble),
        matchesGoldenFile('goldens/chat_bubble_sent_dark.png'),
      );
    });

    testWidgets('chat_bubble_received_dark', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const ChatMessageBubble(
            content: 'On my way!',
            isSent: false,
            senderName: 'Ali',
          ),
          dark: true,
        ),
      );

      await expectLater(
        find.byType(ChatMessageBubble),
        matchesGoldenFile('goldens/chat_bubble_received_dark.png'),
      );
    });
  });
}
