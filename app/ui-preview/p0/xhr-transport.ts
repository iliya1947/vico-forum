/** Browser XHR surface used by the real editor; all application HTTP uses the fetch dispatcher. */
export function installPreviewXhrTransport({
  host, originalXhr, nativeAsset,
}: {
  host: Window & typeof globalThis;
  originalXhr: typeof XMLHttpRequest;
  nativeAsset: (url: URL, method: string) => boolean;
}) {
  const active = new Set<PreviewXhr>();
  let closed = false;

  class PreviewXhr extends EventTarget {
    onload: ((event: ProgressEvent) => void) | null = null;
    onerror: ((event: ProgressEvent) => void) | null = null;
    onabort: ((event: ProgressEvent) => void) | null = null;
    onreadystatechange: ((event: ProgressEvent) => void) | null = null;
    readonly upload = Object.assign(new EventTarget(), {
      onprogress: null as ((event: ProgressEvent) => void) | null,
    });
    responseType: XMLHttpRequestResponseType = "";
    withCredentials = false;
    private native: XMLHttpRequest | null = null;
    private url: URL | null = null;
    private method = "";
    private headers = new Headers();
    private responseHeaders = new Headers();
    private controller: AbortController | null = null;
    private state = 0;
    private statusValue = 0;
    private statusTextValue = "";
    private textValue = "";
    private sent = false;
    private finished = false;

    get readyState() { return this.native?.readyState ?? this.state; }
    get status() { return this.native?.status ?? this.statusValue; }
    get statusText() { return this.native?.statusText ?? this.statusTextValue; }
    get responseText() { return this.native?.responseText ?? this.textValue; }
    get response() { return this.native?.response ?? this.textValue; }
    get responseURL() { return this.native?.responseURL ?? this.url?.href ?? ""; }

    getResponseHeader(name: string) {
      return this.native?.getResponseHeader(name)
        ?? (this.state >= 2 ? this.responseHeaders.get(name) : null);
    }
    getAllResponseHeaders() {
      if (this.native) return this.native.getAllResponseHeaders();
      return this.state >= 2
        ? Array.from(this.responseHeaders, ([name, value]) => name + ": " + value + "\r\n").join("")
        : "";
    }

    private emit(type: "load" | "error" | "abort" | "readystatechange") {
      const event = new ProgressEvent(type);
      this["on" + type as keyof Pick<PreviewXhr,
        "onload" | "onerror" | "onabort" | "onreadystatechange">]?.(event);
      this.dispatchEvent(event);
    }
    private changeState(value: number) {
      this.state = value;
      this.emit("readystatechange");
    }
    private progress(loaded: number, total: number, lengthComputable: boolean) {
      const options = { lengthComputable, loaded, total };
      this.upload.onprogress?.(new ProgressEvent("progress", options));
      this.upload.dispatchEvent(new ProgressEvent("progress", options));
    }
    private complete(type: "load" | "error" | "abort") {
      if (this.finished) return;
      this.finished = true;
      active.delete(this);
      if (!this.native) this.changeState(type === "abort" ? 0 : 4);
      this.emit(type);
    }

    open(method: string, url: string, asynchronous = true) {
      if (!asynchronous) throw new Error("P1 synchronous XMLHttpRequest is unsupported");
      if (this.sent && !this.finished) this.abort();
      this.method = method.toUpperCase();
      this.url = new URL(url, host.location.href);
      this.headers = new Headers();
      this.responseHeaders = new Headers();
      this.statusValue = 0;
      this.statusTextValue = "";
      this.textValue = "";
      this.controller = null;
      this.sent = false;
      this.finished = false;
      this.native = null;
      if (nativeAsset(this.url, this.method) && !closed) {
        const native = new originalXhr();
        this.native = native;
        for (const type of ["load", "error", "abort"] as const) {
          native.addEventListener(type, () => this.complete(type));
        }
        native.addEventListener("readystatechange", () => this.emit("readystatechange"));
        native.upload.addEventListener("progress", (event) => {
          const progress = event as ProgressEvent;
          this.progress(progress.loaded, progress.total, progress.lengthComputable);
        });
        native.open(method, this.url.href, asynchronous);
      } else {
        this.changeState(1);
      }
    }

    setRequestHeader(name: string, value: string) {
      if (this.sent || this.readyState !== 1) {
        throw new DOMException("XHR headers require OPENED state", "InvalidStateError");
      }
      if (this.native) this.native.setRequestHeader(name, value);
      else this.headers.append(name, value);
    }

    send(body: BodyInit | null = null) {
      if (closed || !this.url || this.sent || this.readyState !== 1) {
        throw new DOMException("XHR request is not open", "InvalidStateError");
      }
      if (this.native) {
        this.native.responseType = this.responseType;
        this.native.withCredentials = this.withCredentials;
        this.sent = true;
        active.add(this);
        try { this.native.send(body as Blob); }
        catch (error) { active.delete(this); throw error; }
        return;
      }
      if (this.responseType !== "" && this.responseType !== "text") {
        throw new Error("P1 XHR responseType unsupported: " + this.responseType);
      }
      this.sent = true;
      const controller = new AbortController();
      this.controller = controller;
      active.add(this);
      const url = this.url.href;
      const method = this.method;
      if (body instanceof Blob) {
        queueMicrotask(() => {
          if (!this.finished && !controller.signal.aborted) {
            this.progress(body.size, body.size, true);
          }
        });
      }
      void (async () => {
        try {
          if (this.url?.origin !== host.location.origin) {
            throw new TypeError("P1 external XMLHttpRequest denied: " + this.url?.origin);
          }
          const response = await host.fetch(url, {
            method, headers: this.headers,
            body: method === "GET" || method === "HEAD" ? null : body,
            credentials: this.withCredentials ? "include" : "same-origin",
            signal: controller.signal,
          });
          if (this.finished || controller.signal.aborted) return;
          this.statusValue = response.status;
          this.statusTextValue = response.statusText;
          this.responseHeaders = response.headers;
          this.changeState(2);
          this.textValue = await response.text();
          if (this.finished || controller.signal.aborted) return;
          this.complete("load");
        } catch {
          if (!this.finished && !controller.signal.aborted) this.complete("error");
        }
      })();
    }

    abort() {
      if (!this.sent || this.finished) return;
      this.controller?.abort(new DOMException("XHR aborted", "AbortError"));
      if (this.native) this.native.abort();
      this.complete("abort");
    }
  }

  host.XMLHttpRequest = PreviewXhr as unknown as typeof XMLHttpRequest;
  return {
    reset() {
      if (closed) throw new Error("P1 XMLHttpRequest transport disposed");
      for (const request of Array.from(active)) request.abort();
    },
    dispose() {
      if (closed) return;
      closed = true;
      for (const request of Array.from(active)) request.abort();
      if (host.XMLHttpRequest === (PreviewXhr as unknown as typeof XMLHttpRequest)) {
        host.XMLHttpRequest = originalXhr;
      }
    },
  };
}
