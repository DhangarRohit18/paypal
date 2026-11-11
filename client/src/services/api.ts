// API client for SHOPMATE AI frontend
const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const err: any = new Error(data.message || (data.reasons && data.reasons[0]) || data.error || `HTTP error ${response.status}`);
    err.violations = data.violations || data.reasons || [];
    err.suggestedFixes = data.suggestedFixes || [];
    err.status = response.status;
    throw err;
  }

  return data as T;
}

export const api = {
  request,
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: { name: string; email: string; password: string }) =>
    request<{ user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request<{ user: any }>('/auth/me'),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  // Products
  getProducts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ count: number; products: any[] }>(`/products?${query}`);
  },
  getProductById: (id: string) => request<{ product: any; fairPriceEvaluation: any }>(`/products/${id}`),
  getCategories: () => request<{ categories: string[] }>('/products/categories'),

  // Cart
  getCart: () => request<{ cart: any; spendingGuard: any; secondOpinion: any; policySummary: any }>('/cart'),
  addToCart: (productId: string, quantity = 1) =>
    request<{ success: boolean; cart: any }>('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    }),
  updateCartQuantity: (productId: string, quantity: number) =>
    request<{ success: boolean; cart: any }>('/cart/update', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    }),
  removeFromCart: (productId: string) =>
    request<{ success: boolean; cart: any }>('/cart/remove', {
      method: 'POST',
      body: JSON.stringify({ productId })
    }),
  clearCart: () => request<{ success: boolean; cart: any }>('/cart', { method: 'DELETE' }),

  // Passport & Mandate
  generatePassport: (missionGoal?: string) =>
    request<{ success: boolean; passport: any }>('/passport/generate', {
      method: 'POST',
      body: JSON.stringify({ missionGoal })
    }),
  getPassport: (passportId: string) => request<{ success?: boolean; passport: any }>(`/passport/${passportId}`),
  approvePassport: (passportId: string) =>
    request<{ success: boolean; passport: any; mandate: any; approval?: any }>(`/passport/${passportId}/approve`, {
      method: 'POST'
    }),
  rejectPassport: (passportId: string, reason?: string) =>
    request<{ success: boolean; passport: any }>(`/passport/${passportId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
  getMandate: (passportId: string) => request<{ mandate: any }>(`/passport/${passportId}/mandate`),
  getExportPassportUrl: (passportId: string, format = 'html') => `/api/passports/${passportId}/export?format=${format}`,

  // Security & Spending Policy
  getSecurityPolicies: () => request<{ success: boolean; policy: any }>('/security/policies'),
  updateSecurityPolicies: (policy: any) =>
    request<{ success: boolean; policy: any }>('/security/policies', {
      method: 'POST',
      body: JSON.stringify(policy)
    }),

  // Payments & PayPal
  getPayPalConfig: () =>
    request<{ configured: boolean; clientId: string | null; environment: string; currency: string }>(
      '/payments/config'
    ),
  createPayPalOrder: (passportId: string, approvalId: string) =>
    request<{ success: boolean; paypalOrderId: string; approveUrl: string; finalAmount: string; currency: string; configured: boolean }>(
      '/payments/create-order',
      {
        method: 'POST',
        body: JSON.stringify({ passportId, approvalId })
      }
    ),
  capturePayPalOrder: (paypalOrderId: string, approvalId: string) =>
    request<{ success: boolean; order: any; capture: any }>('/payments/capture-order', {
      method: 'POST',
      body: JSON.stringify({ paypalOrderId, approvalId })
    }),

  // Missions
  getMissionPresets: () => request<{ presets: any[] }>('/missions/presets'),
  createMission: (missionData: { goal: string; targetBudget: number; categoriesNeeded?: string[]; preferredBrands?: string[] }) =>
    request<{ success: boolean; mission: any }>('/missions/create', {
      method: 'POST',
      body: JSON.stringify(missionData)
    }),
  getMission: (id: string) => request<{ mission: any }>(`/missions/${id}`),
  selectMissionPlan: (missionId: string, planId: string) =>
    request<{ success: boolean; mission: any; addedItemCount: number }>('/missions/' + missionId + '/select-plan', {
      method: 'POST',
      body: JSON.stringify({ planId })
    }),

  // Security & Red Team
  getSecurityEvents: () => request<{ count: number; events: any[] }>('/security/events'),
  getAgentEvents: () => request<{ count: number; events: any[] }>('/security/agent-events'),
  getSpendingPolicy: () => request<{ policy: any }>('/security/policy'),
  updateSpendingPolicy: (policy: any) =>
    request<{ success: boolean; policy: any }>('/security/policy', {
      method: 'PUT',
      body: JSON.stringify(policy)
    }),
  toggleKillSwitch: (active: boolean) =>
    request<{ success: boolean; killSwitchActive: boolean; message: string }>('/security/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ active })
    }),
  simulateRedTeam: (scenarioId: string) =>
    request<{ simulation: any }>('/security/red-team/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId })
    }),

  // Orders & Resolutions
  getOrders: () => request<{ orders: any[] }>('/orders'),
  getOrderById: (orderId: string) => request<{ order: any; resolutions: any[] }>(`/orders/${orderId}`),
  createResolutionRequest: (orderId: string, requestType: string, reason: string) =>
    request<{ success: boolean; resolution: any }>(`/orders/${orderId}/resolution`, {
      method: 'POST',
      body: JSON.stringify({ requestType, reason })
    }),

  // Chat (Legacy)
  sendMessage: (message: string) =>
    request<{
      reply: string;
      understoodRequirements: any;
      agentMode: string;
      reasoning: string;
      products: any[];
      securityBlocked?: boolean;
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),

  // Shopping Co-Pilot & SSE Streaming Chat
  searchShopping: (filters: Record<string, any>) =>
    request<{ success: boolean; count: number; products: any[] }>('/shopping/search', {
      method: 'POST',
      body: JSON.stringify(filters)
    }),
  getShoppingConversations: () =>
    request<{ success: boolean; conversations: any[] }>('/shopping/conversations'),
  getShoppingConversation: (id: string) =>
    request<{ success: boolean; conversation: any }>(`/shopping/conversations/${id}`),
  deleteShoppingConversation: (id: string) =>
    request<{ success: boolean }>(`/shopping/conversations/${id}`, { method: 'DELETE' }),
  updateShoppingRequirements: (id: string, reqs: any) =>
    request<{ success: boolean; understoodRequirements: any }>(`/shopping/conversations/${id}/requirements`, {
      method: 'PATCH',
      body: JSON.stringify(reqs)
    }),
  streamShoppingChat: async (
    payload: { message: string; conversationId?: string; updatedRequirements?: any },
    onEvent: (event: string, data: any) => void,
    onError: (err: any) => void
  ) => {
    try {
      const response = await fetch(`${API_BASE}/shopping/chat?stream=true`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            try {
              const dataObj = JSON.parse(dataStr);
              onEvent(currentEvent, dataObj);
            } catch (e) {
              onEvent(currentEvent, dataStr);
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },

  // Diagnostic
  getHealth: () => request<any>('/health')
};

