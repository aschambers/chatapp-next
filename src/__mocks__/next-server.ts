export class NextRequest {
  url: string;
  method: string;
  nextUrl: { searchParams: URLSearchParams };
  cookies = { get: () => null, set: () => {}, delete: () => {} };
  private _body: unknown;

  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = (init?.method || 'GET').toUpperCase();
    this.nextUrl = { searchParams: new URLSearchParams(new URL(url).search) };
    this._body = init?.body;
  }

  async json() {
    return typeof this._body === 'string' ? JSON.parse(this._body) : (this._body ?? {});
  }

  async formData() {
    return this._body instanceof FormData ? this._body : new FormData();
  }

  async text() {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }
}

export class NextResponse {
  status: number;
  cookies = { set: () => {}, get: () => null };
  private _data: unknown;

  constructor(data?: unknown, init?: { status?: number }) {
    this._data = data;
    this.status = init?.status ?? 200;
  }

  static json(data: unknown, init?: { status?: number }) {
    return new NextResponse(data, init);
  }

  async json() {
    return this._data;
  }
}
