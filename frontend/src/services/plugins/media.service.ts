/**
 * Media Pipeline Plugin Service
 * Client-side service for interacting with Media Pipeline plugin API
 */

export interface MediaUploadResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl: string;
}

export interface MediaMetadata {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
}

class MediaService {
  private baseUrl = "/api/plugins/media";

  async uploadImage(file: File): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    return response.json();
  }

  getThumbnailUrl(id: string): string {
    return `${this.baseUrl}/${id}/thumbnail`;
  }

  async getMetadata(id: string): Promise<MediaMetadata> {
    const response = await fetch(`${this.baseUrl}/${id}/metadata`);

    if (!response.ok) {
      throw new Error(`Failed to get metadata: ${response.statusText}`);
    }

    return response.json();
  }

  async checkHealth() {
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
}

export const mediaService = new MediaService();
