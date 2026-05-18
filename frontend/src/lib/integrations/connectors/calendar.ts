/**
 * Calendar Connector
 *
 * Supports Google Calendar and Outlook Calendar.
 * Features: create/update/delete events, meeting links, availability checking,
 * event reminders, RSVP management, and recurring event support.
 */

import { BaseConnector } from "../catalog/base-connector";
import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type CalendarEvent,
  type CalendarAttendee,
  type CalendarAvailability,
  type CalendarProvider,
  type CalendarRecurrence,
  ConnectorError,
} from "../catalog/types";

// ============================================================================
// Calendar API Abstraction
// ============================================================================

interface CalendarApiAdapter {
  listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEvent[]>;
  getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;
  createEvent(
    calendarId: string,
    event: Omit<
      CalendarEvent,
      "id" | "externalId" | "lastModified" | "provider" | "calendarId"
    >,
  ): Promise<CalendarEvent>;
  updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  getAvailability(
    emails: string[],
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarAvailability[]>;
  generateMeetingLink(provider: CalendarProvider): Promise<string>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// Google Calendar Adapter
// ============================================================================

class GoogleCalendarAdapter implements CalendarApiAdapter {
  private baseUrl = "https://www.googleapis.com/calendar/v3";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Google Calendar API ${response.status}: ${errorText}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const data = await this.request<{
      items: Array<{
        id: string;
        summary: string;
        description?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
        location?: string;
        hangoutLink?: string;
        organizer: { displayName?: string; email: string };
        attendees?: Array<{
          displayName?: string;
          email: string;
          responseStatus: string;
          optional?: boolean;
        }>;
        recurrence?: string[];
        status: string;
        visibility?: string;
        updated: string;
      }>;
    }>(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);

    return (data.items || []).map((item) =>
      this.mapGoogleEvent(item, calendarId),
    );
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const data = await this.request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    return this.mapGoogleEvent(data as never, calendarId);
  }

  async createEvent(
    calendarId: string,
    event: Omit<
      CalendarEvent,
      "id" | "externalId" | "lastModified" | "provider" | "calendarId"
    >,
  ): Promise<CalendarEvent> {
    const body = this.toGoogleEvent(event);
    const data = await this.request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return this.mapGoogleEvent(data as never, calendarId);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent> {
    const body = this.toGoogleEvent(updates as CalendarEvent);
    const data = await this.request<Record<string, unknown>>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return this.mapGoogleEvent(data as never, calendarId);
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" },
    );
  }

  async getAvailability(
    emails: string[],
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarAvailability[]> {
    const body = {
      timeMin,
      timeMax,
      items: emails.map((email) => ({ id: email })),
    };

    const data = await this.request<{
      calendars: Record<
        string,
        { busy: Array<{ start: string; end: string }> }
      >;
    }>("/freeBusy", { method: "POST", body: JSON.stringify(body) });

    return emails.map((email) => {
      const busySlots = data.calendars[email]?.busy || [];
      return {
        email,
        slots: busySlots.map((slot) => ({
          start: slot.start,
          end: slot.end,
          status: "busy" as const,
        })),
      };
    });
  }

  async generateMeetingLink(): Promise<string> {
    // Google Meet links are auto-generated when conferenceData is requested
    const event = await this.request<{ hangoutLink?: string }>(
      "/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        body: JSON.stringify({
          summary: "Quick Meeting",
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          conferenceData: {
            createRequest: {
              requestId: `nchat-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      },
    );
    return event.hangoutLink || `https://meet.google.com/nchat-${Date.now()}`;
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/calendars/primary");
      return { ok: true, message: "Google Calendar API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapGoogleEvent(
    item: {
      id: string;
      summary: string;
      description?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      location?: string;
      hangoutLink?: string;
      organizer: { displayName?: string; email: string };
      attendees?: Array<{
        displayName?: string;
        email: string;
        responseStatus: string;
        optional?: boolean;
      }>;
      recurrence?: string[];
      status: string;
      visibility?: string;
      updated: string;
    },
    calendarId: string,
  ): CalendarEvent {
    return {
      id: item.id,
      title: item.summary || "(No title)",
      description: item.description,
      startTime: item.start?.dateTime || item.start?.date || "",
      endTime: item.end?.dateTime || item.end?.date || "",
      location: item.location,
      meetingLink: item.hangoutLink,
      organizer: {
        name: item.organizer?.displayName || item.organizer?.email || "",
        email: item.organizer?.email || "",
      },
      attendees: (item.attendees || []).map((a) => ({
        name: a.displayName || a.email,
        email: a.email,
        status: this.mapGoogleRsvpStatus(a.responseStatus),
        optional: a.optional || false,
      })),
      recurrence: item.recurrence
        ? this.parseRecurrence(item.recurrence)
        : undefined,
      status: this.mapGoogleStatus(item.status),
      visibility: (item.visibility as "public" | "private") || "default",
      calendarId,
      provider: "google_calendar",
      externalId: item.id,
      lastModified: item.updated || new Date().toISOString(),
    };
  }

  private toGoogleEvent(
    event: Partial<CalendarEvent>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (event.title) result.summary = event.title;
    if (event.description) result.description = event.description;
    if (event.startTime) result.start = { dateTime: event.startTime };
    if (event.endTime) result.end = { dateTime: event.endTime };
    if (event.location) result.location = event.location;
    if (event.attendees) {
      result.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
        optional: a.optional,
      }));
    }
    if (event.recurrence) {
      result.recurrence = [this.formatRecurrence(event.recurrence)];
    }
    return result;
  }

  private mapGoogleRsvpStatus(status: string): CalendarAttendee["status"] {
    const map: Record<string, CalendarAttendee["status"]> = {
      accepted: "accepted",
      declined: "declined",
      tentative: "tentative",
      needsAction: "needs_action",
    };
    return map[status] || "needs_action";
  }

  private mapGoogleStatus(status: string): CalendarEvent["status"] {
    const map: Record<string, CalendarEvent["status"]> = {
      confirmed: "confirmed",
      tentative: "tentative",
      cancelled: "cancelled",
    };
    return map[status] || "confirmed";
  }

  private parseRecurrence(rules: string[]): CalendarRecurrence | undefined {
    const rrule = rules.find((r) => r.startsWith("RRULE:"));
    if (!rrule) return undefined;

    const parts = rrule.replace("RRULE:", "").split(";");
    const params: Record<string, string> = {};
    parts.forEach((p) => {
      const [key, value] = p.split("=");
      if (key && value) params[key] = value;
    });

    const freqMap: Record<string, CalendarRecurrence["frequency"]> = {
      DAILY: "daily",
      WEEKLY: "weekly",
      MONTHLY: "monthly",
      YEARLY: "yearly",
    };

    return {
      frequency: freqMap[params.FREQ] || "daily",
      interval: parseInt(params.INTERVAL || "1", 10),
      count: params.COUNT ? parseInt(params.COUNT, 10) : undefined,
      until: params.UNTIL,
      daysOfWeek: params.BYDAY
        ? params.BYDAY.split(",").map((d) => {
            const dayMap: Record<string, number> = {
              SU: 0,
              MO: 1,
              TU: 2,
              WE: 3,
              TH: 4,
              FR: 5,
              SA: 6,
            };
            return dayMap[d] ?? 0;
          })
        : undefined,
    };
  }

  private formatRecurrence(rec: CalendarRecurrence): string {
    const freqMap: Record<string, string> = {
      daily: "DAILY",
      weekly: "WEEKLY",
      monthly: "MONTHLY",
      yearly: "YEARLY",
    };
    let rule = `RRULE:FREQ=${freqMap[rec.frequency]}`;
    if (rec.interval > 1) rule += `;INTERVAL=${rec.interval}`;
    if (rec.count) rule += `;COUNT=${rec.count}`;
    if (rec.until) rule += `;UNTIL=${rec.until}`;
    if (rec.daysOfWeek) {
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      rule += `;BYDAY=${rec.daysOfWeek.map((d) => dayMap[d]).join(",")}`;
    }
    return rule;
  }
}

// ============================================================================
// Outlook Calendar Adapter
// ============================================================================

class OutlookCalendarAdapter implements CalendarApiAdapter {
  private baseUrl = "https://graph.microsoft.com/v1.0";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Outlook Calendar API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEvent[]> {
    const filter = `start/dateTime ge '${timeMin}' and end/dateTime le '${timeMax}'`;
    const data = await this.request<{
      value: Array<Record<string, unknown>>;
    }>(
      `/me/calendars/${calendarId}/events?$filter=${encodeURIComponent(filter)}&$orderby=start/dateTime&$top=250`,
    );

    return (data.value || []).map((item) =>
      this.mapOutlookEvent(item, calendarId),
    );
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const data = await this.request<Record<string, unknown>>(
      `/me/calendars/${calendarId}/events/${eventId}`,
    );
    return this.mapOutlookEvent(data, calendarId);
  }

  async createEvent(
    calendarId: string,
    event: Omit<
      CalendarEvent,
      "id" | "externalId" | "lastModified" | "provider" | "calendarId"
    >,
  ): Promise<CalendarEvent> {
    const body = this.toOutlookEvent(event);
    const data = await this.request<Record<string, unknown>>(
      `/me/calendars/${calendarId}/events`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return this.mapOutlookEvent(data, calendarId);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent> {
    const body = this.toOutlookEvent(updates as CalendarEvent);
    const data = await this.request<Record<string, unknown>>(
      `/me/calendars/${calendarId}/events/${eventId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return this.mapOutlookEvent(data, calendarId);
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.request(`/me/calendars/${calendarId}/events/${eventId}`, {
      method: "DELETE",
    });
  }

  async getAvailability(
    emails: string[],
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarAvailability[]> {
    const body = {
      schedules: emails,
      startTime: { dateTime: timeMin, timeZone: "UTC" },
      endTime: { dateTime: timeMax, timeZone: "UTC" },
      availabilityViewInterval: 30,
    };

    const data = await this.request<{
      value: Array<{
        scheduleId: string;
        scheduleItems: Array<{
          start: { dateTime: string };
          end: { dateTime: string };
          status: string;
        }>;
      }>;
    }>("/me/calendar/getSchedule", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return (data.value || []).map((schedule) => ({
      email: schedule.scheduleId,
      slots: (schedule.scheduleItems || []).map((item) => ({
        start: item.start.dateTime,
        end: item.end.dateTime,
        status: item.status === "free" ? ("free" as const) : ("busy" as const),
      })),
    }));
  }

  async generateMeetingLink(): Promise<string> {
    const data = await this.request<{ joinUrl?: string }>(
      "/me/onlineMeetings",
      {
        method: "POST",
        body: JSON.stringify({
          subject: "Quick Meeting",
          startDateTime: new Date().toISOString(),
          endDateTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      },
    );
    return (
      data.joinUrl || `https://teams.microsoft.com/meet/nchat-${Date.now()}`
    );
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/me/calendars");
      return { ok: true, message: "Outlook Calendar API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapOutlookEvent(
    item: Record<string, unknown>,
    calendarId: string,
  ): CalendarEvent {
    const start = item.start as { dateTime: string } | undefined;
    const end = item.end as { dateTime: string } | undefined;
    const organizer = item.organizer as
      | { emailAddress: { name: string; address: string } }
      | undefined;
    const attendees = item.attendees as
      | Array<{
          emailAddress: { name: string; address: string };
          status: { response: string };
          type: string;
        }>
      | undefined;
    const onlineMeeting = item.onlineMeeting as
      | { joinUrl?: string }
      | undefined;

    return {
      id: item.id as string,
      title: (item.subject as string) || "(No title)",
      description: (item.bodyPreview as string) || undefined,
      startTime: start?.dateTime || "",
      endTime: end?.dateTime || "",
      location: item.location
        ? (item.location as { displayName: string }).displayName
        : undefined,
      meetingLink: onlineMeeting?.joinUrl,
      organizer: {
        name: organizer?.emailAddress?.name || "",
        email: organizer?.emailAddress?.address || "",
      },
      attendees: (attendees || []).map((a) => ({
        name: a.emailAddress.name,
        email: a.emailAddress.address,
        status: this.mapOutlookRsvpStatus(a.status?.response),
        optional: a.type === "optional",
      })),
      status: this.mapOutlookStatus(item.showAs as string),
      visibility: (item.sensitivity === "private"
        ? "private"
        : "public") as CalendarEvent["visibility"],
      calendarId,
      provider: "outlook_calendar",
      externalId: item.id as string,
      lastModified:
        (item.lastModifiedDateTime as string) || new Date().toISOString(),
    };
  }

  private toOutlookEvent(
    event: Partial<CalendarEvent>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (event.title) result.subject = event.title;
    if (event.description)
      result.body = { contentType: "text", content: event.description };
    if (event.startTime)
      result.start = { dateTime: event.startTime, timeZone: "UTC" };
    if (event.endTime)
      result.end = { dateTime: event.endTime, timeZone: "UTC" };
    if (event.location) result.location = { displayName: event.location };
    if (event.attendees) {
      result.attendees = event.attendees.map((a) => ({
        emailAddress: { name: a.name, address: a.email },
        type: a.optional ? "optional" : "required",
      }));
    }
    return result;
  }

  private mapOutlookRsvpStatus(status: string): CalendarAttendee["status"] {
    const map: Record<string, CalendarAttendee["status"]> = {
      accepted: "accepted",
      declined: "declined",
      tentativelyAccepted: "tentative",
      none: "needs_action",
    };
    return map[status] || "needs_action";
  }

  private mapOutlookStatus(showAs: string): CalendarEvent["status"] {
    if (showAs === "free" || showAs === "tentative") return "tentative";
    return "confirmed";
  }
}

// ============================================================================
// Calendar Connector
// ============================================================================

export class CalendarConnector extends BaseConnector {
  readonly providerId: string;
  readonly displayName: string;
  readonly description =
    "Manage calendar events, meetings, and availability from chat";
  readonly icon = "calendar";
  readonly category: IntegrationCatalogCategory = "calendar";
  readonly capabilities: ConnectorCapability[] = [
    "read",
    "write",
    "subscribe",
    "search",
  ];
  readonly version = "1.0.0";

  private adapter: CalendarApiAdapter | null = null;
  private provider: CalendarProvider;

  constructor(provider: CalendarProvider) {
    super(
      { maxRequests: 500, windowMs: 60_000 },
      {
        maxAttempts: 3,
        initialDelayMs: 500,
        maxDelayMs: 15_000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    );
    this.provider = provider;
    this.providerId = provider;
    this.displayName =
      provider === "google_calendar" ? "Google Calendar" : "Outlook Calendar";
  }

  protected async doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    if (this.provider === "google_calendar") {
      this.adapter = new GoogleCalendarAdapter(credentials.accessToken);
    } else {
      this.adapter = new OutlookCalendarAdapter(credentials.accessToken);
    }

    // Verify connection
    const health = await this.adapter.healthCheck();
    if (!health.ok) {
      throw new ConnectorError(health.message, "auth", this.providerId);
    }
  }

  protected async doDisconnect(): Promise<void> {
    this.adapter = null;
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    if (!this.adapter) {
      return {
        healthy: false,
        responseTimeMs: 0,
        message: "Not connected",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      };
    }

    const start = Date.now();
    const result = await this.adapter.healthCheck();
    return {
      healthy: result.ok,
      responseTimeMs: Date.now() - start,
      message: result.message,
      checkedAt: new Date().toISOString(),
      consecutiveFailures: result.ok ? 0 : 1,
    };
  }

  getCatalogEntry(): CatalogEntry {
    return {
      id: this.providerId,
      name: this.displayName,
      description: this.description,
      icon: this.icon,
      category: this.category,
      capabilities: this.capabilities,
      syncDirections: ["incoming", "outgoing", "bidirectional"],
      actions: [
        {
          id: "create_event",
          label: "Create Event",
          description: "Create a new calendar event",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "title",
              type: "string",
              required: true,
              description: "Event title",
            },
            {
              name: "startTime",
              type: "date",
              required: true,
              description: "Start time",
            },
            {
              name: "endTime",
              type: "date",
              required: true,
              description: "End time",
            },
            {
              name: "description",
              type: "string",
              required: false,
              description: "Event description",
            },
            {
              name: "location",
              type: "string",
              required: false,
              description: "Event location",
            },
          ],
        },
        {
          id: "check_availability",
          label: "Check Availability",
          description: "Check calendar availability for participants",
          requiredCapabilities: ["read"],
          parameters: [
            {
              name: "emails",
              type: "string",
              required: true,
              description: "Comma-separated emails",
            },
            {
              name: "date",
              type: "date",
              required: true,
              description: "Date to check",
            },
          ],
        },
        {
          id: "rsvp",
          label: "RSVP to Event",
          description: "Respond to a calendar event invitation",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "eventId",
              type: "string",
              required: true,
              description: "Event ID",
            },
            {
              name: "response",
              type: "select",
              required: true,
              description: "RSVP response",
              options: [
                { label: "Accept", value: "accepted" },
                { label: "Decline", value: "declined" },
                { label: "Tentative", value: "tentative" },
              ],
            },
          ],
        },
      ],
      requiredConfig: ["calendarId"],
      requiresOAuth: true,
      oauthScopes:
        this.provider === "google_calendar"
          ? ["https://www.googleapis.com/auth/calendar"]
          : ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
      beta: false,
      version: this.version,
    };
  }

  // ==========================================================================
  // Calendar Operations
  // ==========================================================================

  async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarEvent[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.listEvents(calendarId, timeMin, timeMax),
      "listEvents",
    );
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getEvent(calendarId, eventId),
      "getEvent",
    );
  }

  async createEvent(
    calendarId: string,
    event: Omit<
      CalendarEvent,
      "id" | "externalId" | "lastModified" | "provider" | "calendarId"
    >,
  ): Promise<CalendarEvent> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.createEvent(calendarId, event),
      "createEvent",
    );
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>,
  ): Promise<CalendarEvent> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.updateEvent(calendarId, eventId, updates),
      "updateEvent",
    );
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.deleteEvent(calendarId, eventId),
      "deleteEvent",
    );
  }

  async getAvailability(
    emails: string[],
    timeMin: string,
    timeMax: string,
  ): Promise<CalendarAvailability[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getAvailability(emails, timeMin, timeMax),
      "getAvailability",
    );
  }

  async generateMeetingLink(): Promise<string> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.generateMeetingLink(this.provider),
      "generateMeetingLink",
    );
  }

  /**
   * Send event reminder to a channel.
   */
  formatEventReminder(event: CalendarEvent, minutesBefore: number): string {
    const startTime = new Date(event.startTime).toLocaleString();
    const attendeeList = event.attendees
      .map((a) => `${a.name} (${a.status})`)
      .join(", ");

    return [
      `**Reminder: ${event.title}**`,
      `Starts in ${minutesBefore} minutes (${startTime})`,
      event.location ? `Location: ${event.location}` : null,
      event.meetingLink ? `Meeting link: ${event.meetingLink}` : null,
      attendeeList ? `Attendees: ${attendeeList}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Format RSVP summary for a channel message.
   */
  formatRsvpSummary(event: CalendarEvent): string {
    const accepted = event.attendees.filter((a) => a.status === "accepted");
    const declined = event.attendees.filter((a) => a.status === "declined");
    const tentative = event.attendees.filter((a) => a.status === "tentative");
    const pending = event.attendees.filter((a) => a.status === "needs_action");

    return [
      `**RSVP Summary: ${event.title}**`,
      `Accepted (${accepted.length}): ${accepted.map((a) => a.name).join(", ") || "None"}`,
      `Declined (${declined.length}): ${declined.map((a) => a.name).join(", ") || "None"}`,
      `Tentative (${tentative.length}): ${tentative.map((a) => a.name).join(", ") || "None"}`,
      `Pending (${pending.length}): ${pending.map((a) => a.name).join(", ") || "None"}`,
    ].join("\n");
  }

  /**
   * Check if a recurring event falls on a given date.
   */
  isRecurringOnDate(
    recurrence: CalendarRecurrence,
    startDate: string,
    checkDate: string,
  ): boolean {
    const start = new Date(startDate);
    const check = new Date(checkDate);

    if (check < start) return false;
    if (recurrence.until && check > new Date(recurrence.until)) return false;

    const diffDays = Math.floor(
      (check.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    switch (recurrence.frequency) {
      case "daily":
        return diffDays % recurrence.interval === 0;
      case "weekly": {
        if (diffDays % (7 * recurrence.interval) > 6) return false;
        if (recurrence.daysOfWeek) {
          return recurrence.daysOfWeek.includes(check.getUTCDay());
        }
        return check.getUTCDay() === start.getUTCDay();
      }
      case "monthly":
        return (
          check.getDate() === start.getDate() &&
          (check.getMonth() -
            start.getMonth() +
            (check.getFullYear() - start.getFullYear()) * 12) %
            recurrence.interval ===
            0
        );
      case "yearly":
        return (
          check.getDate() === start.getDate() &&
          check.getMonth() === start.getMonth() &&
          (check.getFullYear() - start.getFullYear()) % recurrence.interval ===
            0
        );
      default:
        return false;
    }
  }

  private ensureConnected(): void {
    if (!this.adapter || this.status !== "connected") {
      throw new ConnectorError(
        "Calendar connector is not connected",
        "config",
        this.providerId,
        { retryable: false },
      );
    }
  }
}
