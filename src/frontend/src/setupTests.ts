import '@testing-library/jest-dom';

class MockEventSource {
  onerror: ((event: Event) => void) | null = null;

  addEventListener() {}

  removeEventListener() {}

  close() {}
}

globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
