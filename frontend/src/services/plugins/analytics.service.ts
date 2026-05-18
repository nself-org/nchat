/**
 * Analytics Plugin Service
 * Client-side service for interacting with Analytics plugin API
 */

export interface AnalyticsDashboard {
  activeUsers: number;
  totalMessages: number;
  totalChannels: number;
  avgMessagesPerUser: number;
  period: string;
  trends?: {
    activeUsers: TrendData;
    messages: TrendData;
    channels: TrendData;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: string;
  trend: "up" | "down" | "stable";
}

export interface UserAnalytics {
  userId: string;
  displayName: string;
  email: string;
  messageCount: number;
  channelCount: number;
  lastActive: string;
  engagementScore: number;
}

export interface ChannelAnalytics {
  channelId: string;
  name: string;
  memberCount: number;
  messageCount: number;
  activeMembers: number;
  lastActivity: string;
  peakHour?: string;
  growthRate?: string;
}

export interface MessageAnalytics {
  total: number;
  byType: {
    text: number;
    image: number;
    file: number;
    video: number;
    voice: number;
  };
  averagePerDay: number;
  peakDay: string;
  peakDayCount: number;
  trends: Record<string, string>;
  timeline?: Array<{ date: string; count: number }>;
}

export interface AnalyticsEvent {
  eventType: string;
  userId?: string;
  channelId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface AnalyticsEventResponse {
  success: boolean;
  tracked: number;
  message: string;
}

export interface AnalyticsInsight {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "milestone";
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  message: string;
  recommendation?: string;
  metric?: string;
  value?: number;
  previousValue?: number;
  change?: string;
  detectedAt: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  period: string;
  metrics: string[];
  format: "pdf" | "csv" | "excel" | "json";
  schedule?: string;
  recipients?: string[];
  createdAt: string;
  lastRunAt?: string;
  status: "active" | "paused" | "draft";
}

export interface CreateReportRequest {
  name: string;
  period: string;
  metrics: string[];
  format?: "pdf" | "csv" | "excel" | "json";
  schedule?: string;
  recipients?: string[];
}

export interface ExportOptions {
  format: "csv" | "json" | "excel";
  period: string;
  metrics: string[];
}

export interface HealthCheck {
  status: "healthy" | "unhealthy";
  version?: string;
  service?: string;
  error?: string;
}

class AnalyticsService {
  private baseUrl = "/api/plugins/analytics";

  async getDashboard(period: string = "30d"): Promise<AnalyticsDashboard> {
    const response = await fetch(`${this.baseUrl}/dashboard?period=${period}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserAnalytics(
    period: string = "7d",
    limit: number = 100,
  ): Promise<UserAnalytics[]> {
    const response = await fetch(
      `${this.baseUrl}/users?period=${period}&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user analytics: ${response.statusText}`);
    }

    const data = await response.json();
    return data.users || [];
  }

  async getChannelAnalytics(limit: number = 20): Promise<ChannelAnalytics[]> {
    const response = await fetch(`${this.baseUrl}/channels?limit=${limit}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch channel analytics: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.channels || [];
  }

  async trackEvent(event: AnalyticsEvent): Promise<AnalyticsEventResponse> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Failed to track event: ${response.statusText}`);
    }

    return response.json();
  }

  async trackEvents(events: AnalyticsEvent[]): Promise<AnalyticsEventResponse> {
    const response = await fetch(`${this.baseUrl}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`Failed to track events: ${response.statusText}`);
    }

    return response.json();
  }

  async checkHealth(): Promise<HealthCheck> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Message Analytics
  async getMessageAnalytics(
    period: string = "30d",
    groupBy: string = "day",
    channelId?: string,
  ): Promise<MessageAnalytics> {
    let url = `${this.baseUrl}/messages?period=${period}&groupBy=${groupBy}`;
    if (channelId) {
      url += `&channelId=${channelId}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch message analytics: ${response.statusText}`,
      );
    }

    return response.json();
  }

  // AI Insights
  async getInsights(
    period: string = "30d",
    type?: "trend" | "anomaly" | "recommendation" | "milestone",
    limit: number = 10,
  ): Promise<AnalyticsInsight[]> {
    let url = `${this.baseUrl}/insights?period=${period}&limit=${limit}`;
    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.statusText}`);
    }

    const data = await response.json();
    return data.insights || [];
  }

  // Reports Management
  async getReports(): Promise<AnalyticsReport[]> {
    const response = await fetch(`${this.baseUrl}/reports`);

    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.statusText}`);
    }

    const data = await response.json();
    return data.reports || [];
  }

  async getReport(reportId: string): Promise<AnalyticsReport> {
    const response = await fetch(`${this.baseUrl}/reports?id=${reportId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }

    return response.json();
  }

  async createReport(request: CreateReportRequest): Promise<AnalyticsReport> {
    const response = await fetch(`${this.baseUrl}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create report: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteReport(reportId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reports?id=${reportId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete report: ${response.statusText}`);
    }
  }

  // Data Export
  async exportData(options: ExportOptions): Promise<Blob | object> {
    const { format, period, metrics } = options;
    const url = `${this.baseUrl}/export?format=${format}&period=${period}&metrics=${metrics.join(",")}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.statusText}`);
    }

    if (format === "json") {
      return response.json();
    }

    return response.blob();
  }

  // Helper to download exported data
  async downloadExport(options: ExportOptions): Promise<void> {
    const data = await this.exportData(options);

    if (data instanceof Blob) {
      const extension = options.format === "excel" ? "xlsx" : options.format;
      const filename = `analytics-${options.period}-${Date.now()}.${extension}`;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // For JSON, create a file from the object
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const filename = `analytics-${options.period}-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}

export const analyticsService = new AnalyticsService();
