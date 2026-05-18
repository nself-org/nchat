"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  messageEntry,
  reactionBurst,
  modalOverlay,
  modalContent,
  buttonPress,
  errorShake,
  successCheckmark,
  toastSlide,
  badgeBounce,
  staggerContainer,
  staggerItem,
  skeletonPulse,
} from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ScrollReveal,
  StaggeredScrollReveal,
  FadeInOnScroll,
} from "@/components/ui/scroll-reveal";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import {
  MessageListSkeleton,
  ChatLayoutSkeleton,
} from "@/components/ui/loading-skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  Heart,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

function AnimationsDemoContent() {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [inputSuccess, setInputSuccess] = useState(false);
  const [messageCount, setMessageCount] = useState(3);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="mb-2 text-4xl font-bold">Animation Showcase</h1>
            <p className="text-muted-foreground">
              Interactive demonstration of all animation variants in nself-chat
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8">
        {/* Messages */}
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Message Animations</CardTitle>
              <CardDescription>
                Slide in with fade effect - used for new messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => setMessageCount(messageCount + 1)}>
                Add Message
              </Button>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence mode="popLayout">
                  {Array.from({ length: messageCount }).map((_, i) => (
                    <motion.div
                      key={i}
                      variants={messageEntry}
                      layout
                      className="bg-muted/50 mb-2 flex items-start gap-3 rounded-lg p-4"
                    >
                      <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">User {i + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          This is a sample message with smooth entry animation
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Reactions */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Reaction Animations</CardTitle>
              <CardDescription>
                Burst effect for emoji reactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  variants={reactionBurst}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  className="border-primary/50 bg-primary/10 flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>12</span>
                </motion.button>

                <motion.button
                  variants={reactionBurst}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  className="flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-sm"
                >
                  <Heart className="h-4 w-4" />
                  <span>8</span>
                </motion.button>

                <motion.button
                  variants={reactionBurst}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  className="flex items-center gap-1 rounded-full border border-yellow-500/50 bg-yellow-500/10 px-3 py-1 text-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>5</span>
                </motion.button>
              </div>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Buttons */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Button Animations</CardTitle>
              <CardDescription>
                Tactile press feedback with scale
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button animated>Primary</Button>
              <Button animated variant="secondary">
                Secondary
              </Button>
              <Button animated variant="outline">
                Outline
              </Button>
              <Button animated variant="destructive">
                Destructive
              </Button>
              <Button animated variant="ghost">
                Ghost
              </Button>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Form Validation */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Form Validation Animations</CardTitle>
              <CardDescription>
                Shake on error, checkmark on success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={() => setInputError(!inputError)}
                  variant="outline"
                >
                  Toggle Error
                </Button>
                <Button
                  onClick={() => setInputSuccess(!inputSuccess)}
                  variant="outline"
                >
                  Toggle Success
                </Button>
              </div>

              <Input
                placeholder="Enter something..."
                error={inputError ? "This field is required" : undefined}
                success={inputSuccess}
              />

              {inputError && (
                <motion.div
                  variants={errorShake}
                  animate="animate"
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Please fix the error above</span>
                </motion.div>
              )}

              {inputSuccess && (
                <motion.div
                  variants={successCheckmark}
                  initial="initial"
                  animate="animate"
                  className="flex items-center gap-2 text-sm text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Looks good!</span>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Modal */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Modal Animations</CardTitle>
              <CardDescription>Overlay fade with content scale</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowModal(true)}>Open Modal</Button>

              <AnimatePresence>
                {showModal && (
                  <>
                    <motion.div
                      variants={modalOverlay}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="fixed inset-0 z-50 bg-black/80"
                      onClick={() => setShowModal(false)}
                    />
                    <motion.div
                      variants={modalContent}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
                    >
                      <h2 className="mb-2 text-xl font-semibold">
                        Modal Title
                      </h2>
                      <p className="mb-4 text-muted-foreground">
                        This modal demonstrates smooth entry and exit
                        animations.
                      </p>
                      <Button onClick={() => setShowModal(false)}>Close</Button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Toast */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Toast Animations</CardTitle>
              <CardDescription>Slide from top notification</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                }}
              >
                Show Toast
              </Button>

              <AnimatePresence>
                {showToast && (
                  <motion.div
                    variants={toastSlide}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="fixed right-4 top-4 z-50 rounded-lg border bg-background p-4 shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-semibold">Success!</div>
                        <div className="text-sm text-muted-foreground">
                          Your changes have been saved.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Badge Bounce */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Badge Animations</CardTitle>
              <CardDescription>Bounce effect for notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative">
                  <Button variant="outline">Messages</Button>
                  <motion.div
                    variants={badgeBounce}
                    initial="initial"
                    animate="animate"
                    className="absolute -right-2 -top-2"
                  >
                    <Badge variant="destructive">5</Badge>
                  </motion.div>
                </div>

                <div className="relative">
                  <Button variant="outline">Notifications</Button>
                  <motion.div
                    variants={badgeBounce}
                    initial="initial"
                    animate="animate"
                    className="absolute -right-2 -top-2"
                  >
                    <Badge>12</Badge>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Loading Skeletons */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Loading Skeletons</CardTitle>
              <CardDescription>
                Animated placeholders while loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageListSkeleton count={5} />
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Pull to Refresh */}
        <FadeInOnScroll direction="up">
          <Card>
            <CardHeader>
              <CardTitle>Pull to Refresh (Mobile)</CardTitle>
              <CardDescription>Drag down to refresh content</CardDescription>
            </CardHeader>
            <CardContent>
              <PullToRefresh onRefresh={handleRefresh}>
                <div className="h-64 overflow-auto rounded-lg border p-4">
                  {refreshing ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="rounded bg-muted p-4">
                          Item {i + 1}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PullToRefresh>
            </CardContent>
          </Card>
        </FadeInOnScroll>

        {/* Staggered Reveal */}
        <StaggeredScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Staggered Scroll Reveal</CardTitle>
              <CardDescription>
                Items reveal sequentially as you scroll
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary">1</div>
                  <div className="mt-2 font-semibold">First Item</div>
                  <div className="text-sm text-muted-foreground">
                    This appears first
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary">2</div>
                  <div className="mt-2 font-semibold">Second Item</div>
                  <div className="text-sm text-muted-foreground">
                    This appears second
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary">3</div>
                  <div className="mt-2 font-semibold">Third Item</div>
                  <div className="text-sm text-muted-foreground">
                    This appears third
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </StaggeredScrollReveal>
      </div>
    </div>
  );
}

export default function AnimationsDemo() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AnimationsDemoContent />
    </Suspense>
  );
}
