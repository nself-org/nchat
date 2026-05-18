"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type ExtendedUserProfile } from "./UserCard";
import { UserBio } from "./UserBio";
import { UserLinks } from "./UserLinks";
import { UserTimezone } from "./UserTimezone";
import { UserRoles } from "./UserRoles";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, Briefcase, Users, Globe } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserProfileAboutProps extends React.HTMLAttributes<HTMLDivElement> {
  user: ExtendedUserProfile;
  showContactInfo?: boolean;
  showWorkInfo?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserProfileAbout = React.forwardRef<
  HTMLDivElement,
  UserProfileAboutProps
>(
  (
    { className, user, showContactInfo = true, showWorkInfo = true, ...props },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn("space-y-6 p-6", className)} {...props}>
        {/* Bio */}
        {user.bio && (
          <section>
            <h3 className="mb-3 text-sm font-semibold">About</h3>
            <UserBio bio={user.bio} />
          </section>
        )}

        {/* Contact information */}
        {showContactInfo && (user.email || user.phone) && (
          <section>
            <h3 className="mb-3 text-sm font-semibold">Contact</h3>
            <div className="space-y-3">
              {user.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href={`mailto:${user.email}`}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {user.email}
                    </a>
                  </div>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <a
                      href={`tel:${user.phone}`}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {user.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <Separator />

        {/* Work information */}
        {showWorkInfo && (user.title || user.department || user.team) && (
          <section>
            <h3 className="mb-3 text-sm font-semibold">Work</h3>
            <div className="space-y-3">
              {user.title && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Title</p>
                    <p className="text-sm text-muted-foreground">
                      {user.title}
                    </p>
                  </div>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">
                      {user.department}
                    </p>
                  </div>
                </div>
              )}
              {user.team && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Team</p>
                    <p className="text-sm text-muted-foreground">{user.team}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <Separator />

        {/* Timezone */}
        {user.timezone && (
          <section>
            <h3 className="mb-3 text-sm font-semibold">Local Time</h3>
            <UserTimezone timezone={user.timezone} />
          </section>
        )}

        {/* Website and social links */}
        {(user.website ||
          (user.socialLinks && user.socialLinks.length > 0)) && (
          <>
            <Separator />
            <section>
              <h3 className="mb-3 text-sm font-semibold">Links</h3>
              <div className="space-y-3">
                {user.website && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {user.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}
                {user.socialLinks && user.socialLinks.length > 0 && (
                  <UserLinks links={user.socialLinks} />
                )}
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Role and permissions */}
        <section>
          <h3 className="mb-3 text-sm font-semibold">Role & Permissions</h3>
          <UserRoles role={user.role} />
        </section>
      </div>
    );
  },
);
UserProfileAbout.displayName = "UserProfileAbout";

export { UserProfileAbout };
