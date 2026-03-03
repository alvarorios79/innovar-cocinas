import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadPDFiOS } from './pdf-download';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('downloadPDFiOS', () => {
  let mockBlob: Blob;
  let mockBlobUrl: string;
  let mockLink: HTMLAnchorElement;
  let createElementSpy: any;
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    // Setup
    mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockBlobUrl = 'blob:http://localhost/mock-blob-url';
    
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      } as Response)
    );

    // Mock URL.createObjectURL
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockBlobUrl);
    
    // Mock URL.revokeObjectURL
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock document.createElement
    mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
    } as any;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    // Mock appendChild and removeChild
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should download PDF successfully', async () => {
    const url = 'https://example.com/test.pdf';
    const filename = 'test.pdf';

    await downloadPDFiOS(url, filename);

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith(url);

    // Verify blob URL was created
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);

    // Verify link properties were set
    expect(mockLink.href).toBe(mockBlobUrl);
    expect(mockLink.download).toBe(filename);

    // Verify click was called
    expect(mockLink.click).toHaveBeenCalled();

    // Verify blob URL was revoked
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockBlobUrl);
  });

  it('should handle fetch errors', async () => {
    const url = 'https://example.com/test.pdf';
    const filename = 'test.pdf';

    // Mock fetch to return error
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Not Found',
      } as Response)
    );

    await downloadPDFiOS(url, filename);

    // Verify error toast was called
    expect(toast.error).toHaveBeenCalledWith('Error al descargar el PDF');
  });

  it('should handle network errors', async () => {
    const url = 'https://example.com/test.pdf';
    const filename = 'test.pdf';

    // Mock fetch to throw error
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    await downloadPDFiOS(url, filename);

    // Verify error toast was called
    expect(toast.error).toHaveBeenCalledWith('Error al descargar el PDF');
  });

  it('should set correct filename', async () => {
    const url = 'https://example.com/test.pdf';
    const filename = 'cotizacion-COT-2026-001.pdf';

    await downloadPDFiOS(url, filename);

    expect(mockLink.download).toBe(filename);
  });

  it('should handle special characters in filename', async () => {
    const url = 'https://example.com/test.pdf';
    const filename = 'cotizacion-COT-2026-001-Cliente-Especial.pdf';

    await downloadPDFiOS(url, filename);

    expect(mockLink.download).toBe(filename);
  });
});
