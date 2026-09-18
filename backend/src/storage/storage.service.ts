import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

export type UploadFolder = 'customerorder' | 'shop' | 'rider';

/**
 * Stores uploaded images.
 *
 * When Cloudinary is configured every image goes there and the returned URL is
 * absolute, so it survives redeploys — Render's disk does not. Without that
 * configuration the service keeps the original behaviour of writing under
 * ./uploads and returning a /uploads/... path, which is what local development
 * and every already-stored record rely on.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly cloudinaryEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('CLOUDINARY_URL');
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (url) {
      // The SDK reads CLOUDINARY_URL from the environment on its own.
      cloudinary.config({ secure: true });
      this.cloudinaryEnabled = true;
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.cloudinaryEnabled = true;
    } else {
      this.cloudinaryEnabled = false;
    }

    this.logger.log(
      this.cloudinaryEnabled
        ? 'Cloudinary configured — uploads are stored remotely'
        : 'Cloudinary not configured — falling back to local ./uploads (files are lost on redeploy)',
    );
  }

  get isRemote(): boolean {
    return this.cloudinaryEnabled;
  }

  private localDir(folder: UploadFolder): string {
    const uploadDir = path.join(process.cwd(), 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  private extFromMime(mimeType: string): string {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    if (mimeType === 'image/gif') return 'gif';
    return 'jpg';
  }

  /** Uploads raw bytes and returns the URL to store on the document. */
  async uploadBuffer(
    buffer: Buffer,
    folder: UploadFolder,
    mimeType = 'image/jpeg',
  ): Promise<string> {
    if (this.cloudinaryEnabled) {
      try {
        const result = await new Promise<{ secure_url: string }>(
          (resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              {
                folder: `laundry/${folder}`,
                resource_type: 'image',
                // Keep stored images a sane size; the originals are phone photos.
                transformation: [
                  { width: 1600, height: 1600, crop: 'limit' },
                  { quality: 'auto:good', fetch_format: 'auto' },
                ],
              },
              (error, uploaded) => {
                if (error || !uploaded) {
                  reject(
                    error instanceof Error
                      ? error
                      : new Error('Cloudinary upload failed'),
                  );
                  return;
                }
                resolve(uploaded as { secure_url: string });
              },
            );
            stream.end(buffer);
          },
        );
        return result.secure_url;
      } catch (error) {
        this.logger.error(
          `Cloudinary upload failed, falling back to local disk: ${String(error)}`,
        );
      }
    }

    const ext = this.extFromMime(mimeType);
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    fs.writeFileSync(path.join(this.localDir(folder), fileName), buffer);
    return `/uploads/${folder}/${fileName}`;
  }

  /**
   * Accepts a `data:image/...;base64,...` string and stores it. Anything else
   * (an existing /uploads path, an http URL, an empty value) is returned
   * untouched so callers can pass through values that are already stored.
   */
  async uploadDataUrl(value: string, folder: UploadFolder): Promise<string> {
    if (!value || typeof value !== 'string') return value;

    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return value;

    try {
      return await this.uploadBuffer(
        Buffer.from(match[2], 'base64'),
        folder,
        match[1],
      );
    } catch (error) {
      this.logger.error(`Failed to store image: ${String(error)}`);
      return value;
    }
  }

  /** Deletes a previously stored image, remote or local. Never throws. */
  async remove(url?: string): Promise<void> {
    if (!url || typeof url !== 'string') return;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!this.cloudinaryEnabled || !url.includes('res.cloudinary.com'))
        return;
      const publicId = this.publicIdFromUrl(url);
      if (!publicId) return;
      try {
        // invalidate clears the CDN copy too, which otherwise keeps serving
        // a deleted image for some time.
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
      } catch (error) {
        this.logger.warn(
          `Cloudinary delete failed for ${publicId}: ${String(error)}`,
        );
      }
      return;
    }

    if (!url.startsWith('/uploads/')) return;
    const segments = url.split('/').filter(Boolean); // uploads, <folder>, <file>
    if (segments.length < 3) return;
    const absolutePath = path.join(
      process.cwd(),
      'uploads',
      segments[1],
      path.basename(segments[2]),
    );
    try {
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    } catch {
      // ignore cleanup errors
    }
  }

  /**
   * Recovers the Cloudinary public id from a delivery URL: everything after
   * the version segment, minus the file extension.
   */
  private publicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match) return null;
    return match[1].replace(/\.[^./]+$/, '');
  }
}
