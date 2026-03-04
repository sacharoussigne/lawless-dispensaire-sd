
/**
 * Fetcher configuration
 */
type FetcherConfig = {
  baseUrl?: string;
  defaultHeaders?: HeadersInit;
  timeout?: number;
};

/**
 * Request options
 */
type RequestOptions = {
  headers?: HeadersInit;
  timeout?: number;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

/**
 * Next.js configuration for fetch
 */
type NextFetchRequestConfig = {
  revalidate?: number | false;
  tags?: string[];
};

/**
 * Custom error for the fetcher
 */
export class FetcherError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(message: string, status: number, statusText: string, data?: any) {
    super(message);
    this.name = "FetcherError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Main Fetcher class
 */
export class Fetcher {
  private readonly baseUrl: string;
  private readonly defaultHeaders: HeadersInit;
  private readonly defaultTimeout: number;

  constructor(config: FetcherConfig = {}) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.baseUrl = config.baseUrl ?? "";
    this.defaultHeaders = config.defaultHeaders || {
      "Content-Type": "application/json",
      "X-Timezone": timezone,
    };
    this.defaultTimeout = config.timeout ?? 10000; // 10 seconds by default
  }

  /**
   * Private method to execute requests with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number },
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...fetchOptions } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new FetcherError(
          `The request has exceeded the timeout of ${timeout}ms`,
          408,
          "Request Timeout",
        );
      }
      throw error;
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Process the response and handle errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    let data;

    const isSuccess = response.status >= 200 && response.status < 300;

    try {
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else if (contentType?.includes("text/")) {
        data = await response.text();
      } else if (response.status !== 204) {
        data = await response.blob();
      }
    } catch (error) {
      console.warn("Unable to parse the response:", error);
    }

    if (!isSuccess) {
      throw new FetcherError(
        `HTTP error: ${response.statusText || response.status}`,
        response.status,
        response.statusText,
        data,
      );
    }

    return data as T;
  }

  /**
   * Build the full URL
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }

    const baseWithoutTrailingSlash = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    const endpointWithoutLeadingSlash = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;

    return `${baseWithoutTrailingSlash}/${endpointWithoutLeadingSlash}`;
  }

  /**
   * GET method
   */
  async get<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const { headers, timeout, cache, next } = options;

    const response = await this.fetchWithTimeout(url, {
      method: "GET",
      headers: { ...this.defaultHeaders, ...headers },
      timeout,
      cache,
      next,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * POST method
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const { headers, timeout, next } = options;

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: { ...this.defaultHeaders, ...headers },
      body: data ? JSON.stringify(data) : undefined,
      timeout,
      next,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PUT method
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const { headers, timeout, next } = options;

    const response = await this.fetchWithTimeout(url, {
      method: "PUT",
      headers: { ...this.defaultHeaders, ...headers },
      body: data ? JSON.stringify(data) : undefined,
      timeout,
      next,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * PATCH method
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const { headers, timeout, next } = options;

    const response = await this.fetchWithTimeout(url, {
      method: "PATCH",
      headers: { ...this.defaultHeaders, ...headers },
      body: data ? JSON.stringify(data) : undefined,
      timeout,
      next,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * DELETE method
   */
  async delete<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const { headers, timeout, next } = options;

    const response = await this.fetchWithTimeout(url, {
      method: "DELETE",
      headers: { ...this.defaultHeaders, ...headers },
      timeout,
      next,
    });

    return this.handleResponse<T>(response);
  }
}

export const api = new Fetcher({
  baseUrl: "/",
  defaultHeaders: {
    "Content-Type": "application/json",
    "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  timeout: 15000, // 15 seconds
});

export default api;
