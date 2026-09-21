import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface GalleryItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl: string;
  downloadUrl: string;
}

@Component({
  selector: 'app-media-upload',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './media-upload.html',
})
export class MediaUploadComponent implements OnInit {
  private readonly SCRIPT_URL = environment.weddingDriveEndpoint;
  private readonly PAGE_SIZE = 50;

  isUploading = signal(false);
  progressMessage = signal('');
  successCount = signal(0);
  errorMessage = signal('');

  // Galería y Paginación
  galleryFiles = signal<GalleryItem[]>([]);
  isLoadingGallery = signal(true);
  isLoadingMore = signal(false);
  hasMore = signal(false);
  currentOffset = signal(0);
  totalCount = signal(0);

  // Elemento seleccionado para el visor modal
  selectedMedia = signal<GalleryItem | null>(null);

  async ngOnInit() {
    await this.fetchGallery(true);
  }

  // Abrir / cerrar visor
  openViewer(item: GalleryItem) {
    this.selectedMedia.set(item);
  }

  closeViewer() {
    this.selectedMedia.set(null);
  }

  async fetchGallery(reset = false) {
    if (reset) {
      this.isLoadingGallery.set(true);
      this.currentOffset.set(0);
    } else {
      this.isLoadingMore.set(true);
    }

    try {
      const offset = reset ? 0 : this.currentOffset();
      const url = `${this.SCRIPT_URL}?pageSize=${this.PAGE_SIZE}&offset=${offset}`;

      const data: any = await this.fetchJsonp(url);

      if (data && data.status === 'success') {
        if (reset) {
          this.galleryFiles.set(data.files || []);
        } else {
          this.galleryFiles.update((prev) => [...prev, ...(data.files || [])]);
        }

        this.hasMore.set(data.hasMore);
        this.currentOffset.set(data.nextOffset);
        this.totalCount.set(data.totalCount || 0);
      }
    } catch (err) {
      console.error('Error cargando la galería:', err);
    } finally {
      this.isLoadingGallery.set(false);
      this.isLoadingMore.set(false);
    }
  }

  async loadMore() {
    if (this.isLoadingMore() || !this.hasMore()) return;
    await this.fetchGallery(false);
  }

  handleImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.onerror = null;
    target.src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
  }

  private fetchJsonp(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');

      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        resolve(data);
      };

      script.onerror = (err) => {
        delete (window as any)[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(err);
      };

      const separator = url.includes('?') ? '&' : '?';
      script.src = `${url}${separator}callback=${callbackName}`;
      document.body.appendChild(script);
    });
  }

  async onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files: File[] = Array.from(input.files);
    this.isUploading.set(true);
    this.errorMessage.set('');
    this.successCount.set(0);

    let uploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      this.progressMessage.set(`Subiendo archivo ${i + 1} de ${files.length}...`);

      try {
        const base64Data = await this.fileToBase64(file);

        await fetch(this.SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            fileName: `${Date.now()}_${file.name}`,
            mimeType: file.type || 'application/octet-stream',
            base64: base64Data,
          }),
        });

        uploaded++;
        this.successCount.set(uploaded);
      } catch (err) {
        console.error('Error subiendo:', file.name, err);
        this.errorMessage.set('Hubo un error al subir uno de los archivos.');
      }
    }

    this.isUploading.set(false);
    this.progressMessage.set('');
    input.value = '';

    await this.fetchGallery(true);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
