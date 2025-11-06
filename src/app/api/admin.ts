import { HubStatus, RestartResponse } from '../../types/index';

const API_BASE = '/api/admin';

export class AdminAPI {
  private static async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error('Unauthorized - please login again');
    }

    if (response.status === 403) {
      throw new Error('Insufficient permissions');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response;
  }

  static async getHubs(): Promise<HubStatus[]> {
    const response = await this.fetchWithAuth('/hubs');
    const data = await response.json();
    return data.hubs || [];
  }

  static async restartHub(hubId: string): Promise<RestartResponse> {
    const response = await this.fetchWithAuth(`/hubs/${hubId}/restart`, {
      method: 'POST',
    });
    return response.json();
  }
}