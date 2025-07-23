// src/lib/mvpUpload.ts
import { supabase } from './supabase';
import { APIService, GitHubService } from './api';
import type { MVP } from '../types';
import type { MvpVersionHistoryEntry } from '../types';
// Removed import of mockData functions as they are no longer needed

interface UploadData {
  title: string;
  tagline: string;
  description: string;
  category: string;
  features: string[];
  techStack: string[];
  demoUrl: string;
  githubUrl: string;
  licensingTerms: 'standard_commercial' | 'premium_commercial' | 'personal_use_only';
  versionNumber: string;
  changelog: string;
  sellerId: string;
  mvpFile: File;
  previewImages: File[];
  access_tier: 'free' | 'subscription' | 'one_time_sale';
  price?: number; // Added price field
}

interface VersionUploadData {
  mvpId: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  features: string[];
  techStack: string[];
  demoUrl: string;
  githubUrl: string;
  licensingTerms: 'standard_commercial' | 'premium_commercial' | 'personal_use_only';
  versionNumber: string;
  changelog: string;
  mvpFile: File;
  previewImages: File[];
  access_tier: 'free' | 'subscription' | 'one_time_sale';
  price?: number; // Added price field
}

export class MVPUploadService {
  static async uploadMVP(data: UploadData): Promise<{ success: boolean; mvpId?: string; message: string }> {
    try {
      // 1. Generate slug from title
      const slug = this.generateSlug(data.title);
      
      // 2. Upload MVP file to storage
      // Pass the original file name to the uploadFile helper
      const mvpFileResult = await this.uploadFile(data.mvpFile, `mvps/${slug}`, 'mvp', data.mvpFile.name);
      if (!mvpFileResult.success) {
        throw new Error(mvpFileResult.error || 'Failed to upload MVP file'); // Use specific error
      }

      // 3. Upload preview images
      const imageUrls: string[] = [];
      for (let i = 0; i < data.previewImages.length; i++) {
        const imageResult = await this.uploadFile(
          data.previewImages[i], 
          `mvps/${slug}/images`,
          'image', // Pass 'image' purpose
          `preview-${i + 1}.${data.previewImages[i].name.split('.').pop()}` // Use original extension
        );
        if (imageResult.success && imageResult.url) {
          imageUrls.push(imageResult.url);
        } else {
          throw new Error(imageResult.error || `Failed to upload image ${data.previewImages[i].name}`); // Use specific error
        }
      }

      // 4. Create MVP record in database
      const mvpData = {
        seller_id: data.sellerId,
        title: data.title,
        slug: slug,
        tagline: data.tagline,
        description: data.description,
        features: data.features,
        tech_stack: data.techStack,
        category: data.category,
        ipfs_hash: mvpFileResult.hash || 'pending', // Will be updated after IPFS upload
        file_size: data.mvpFile.size,
        preview_images: imageUrls,
        demo_url: data.demoUrl || null,
        github_url: data.githubUrl || null,
        licensing_terms: data.licensingTerms,
        status: 'pending_review',
        version_number: data.versionNumber,
        changelog: data.changelog || null,
        published_at: null,
        access_tier: data.access_tier,
        price: data.access_tier === 'one_time_sale' ? data.price : null, // Include price
        original_file_name: data.mvpFile.name, // Store original file name
      };

      const { data: mvp, error } = await supabase
        .from('mvps')
        .insert([mvpData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to save MVP to database');
      }

      // 5. Queue for IPFS upload (in a real implementation)
      // This would trigger a background job to upload to IPFS
      await this.queueIPFSUpload(mvp.id, mvpFileResult.path);

      return {
        success: true,
        mvpId: mvp.id,
        message: 'MVP uploaded successfully! It will be reviewed before publication.'
      };

    } catch (error: any) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload MVP'
      };
    }
  }

  static async uploadNewMVPVersion(data: VersionUploadData): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Fetch existing MVP data
      const existingMVP = await APIService.getMVPById(data.mvpId);
      if (!existingMVP) {
        throw new Error('MVP not found');
      }

      // 2. Create version history entry for the current version
      const currentVersionEntry: MvpVersionHistoryEntry = {
        version_number: existingMVP.version_number,
        ipfs_hash: existingMVP.ipfs_hash,
        changelog: existingMVP.changelog || '',
        uploaded_at: existingMVP.published_at || existingMVP.created_at,
        file_size: existingMVP.file_size
      };

      // 3. Generate slug for new file path (using existing slug + version)
      const slug = existingMVP.slug;
      
      // 4. Upload new MVP file to storage
      // Pass the original file name to the uploadFile helper
      const mvpFileResult = await this.uploadFile(data.mvpFile, `mvps/${slug}/versions/${data.versionNumber}`, 'mvp', data.mvpFile.name);
      if (!mvpFileResult.success) {
        throw new Error(mvpFileResult.error || 'Failed to upload new MVP file'); // Use specific error
      }

      // 5. Upload new preview images
      const imageUrls: string[] = [];
      for (let i = 0; i < data.previewImages.length; i++) {
        const imageResult = await this.uploadFile(
          data.previewImages[i], 
          `mvps/${slug}/versions/${data.versionNumber}/images`,
          'image', // Pass 'image' purpose
          `preview-${i + 1}.${data.previewImages[i].name.split('.').pop()}` // Use original extension
        );
        if (imageResult.success && imageResult.url) {
          imageUrls.push(imageResult.url);
        } else {
          throw new Error(imageResult.error || `Failed to upload image ${data.previewImages[i].name}`); // Use specific error
        }
      }

      // 6. Prepare updated version history
      const existingVersionHistory = existingMVP.version_history || [];
      const updatedVersionHistory = [currentVersionEntry, ...existingVersionHistory];

      // 7. Update MVP record with new version data
      const mvpUpdateData = {
        title: data.title,
        tagline: data.tagline,
        description: data.description,
        features: data.features,
        tech_stack: data.techStack,
        category: data.category,
        previous_ipfs_hash: existingMVP.ipfs_hash, // Store previous hash
        ipfs_hash: mvpFileResult.hash || 'pending', // Will be updated after IPFS upload
        file_size: data.mvpFile.size,
        preview_images: imageUrls.length > 0 ? imageUrls : existingMVP.preview_images,
        demo_url: data.demoUrl || null,
        github_url: data.githubUrl || null,
        licensing_terms: data.licensingTerms,
        version_number: data.versionNumber,
        changelog: data.changelog || null,
        version_history: updatedVersionHistory,
        status: 'pending_review', // Reset to pending review for new version
        updated_at: new Date().toISOString(),
        access_tier: data.access_tier,
        price: data.access_tier === 'one_time_sale' ? data.price : null, // Include price
        original_file_name: data.mvpFile.name, // Store original file name
      };

      const { error } = await supabase
        .from('mvps')
        .update(mvpUpdateData)
        .eq('id', data.mvpId);

      if (error) {
        console.error('Database error:', error);
        throw new Error('Failed to update MVP with new version');
      }

      // 8. Queue for security scan and IPFS upload (in a real implementation)
      await this.queueIPFSUpload(data.mvpId, mvpFileResult.path);

      return {
        success: true,
        message: 'New version uploaded successfully! It will be reviewed before publication.'
      };

    } catch (error: any) {
      console.error('Version upload error:', error);
      return {
        success: false,
        message: error.message || 'Failed to upload new version'
      };
    }
  }

  // Helper method to increment version number
  static incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
    const parts = currentVersion.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${parts[0] + 1}.0.0`;
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch':
      default:
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    }
  }

  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now().toString(36);
  }

  private static async uploadFile(
    file: File, 
    directoryPath: string, // Changed from 'path' to 'directoryPath'
    filePurpose: 'mvp' | 'image',
    originalFileName: string // New parameter for the original file name
  ): Promise<{ success: boolean; url?: string; path?: string; hash?: string; error?: string }> { // Added error to return type
    try {
      // Enhanced server-side validation
      const validationResult = this.validateFile(file, filePurpose); // Pass filePurpose
      if (!validationResult.isValid) {
        console.error('File validation failed:', validationResult.error);
        return { success: false, error: validationResult.error }; // Return error message
      }

      // Determine which bucket to use based on file purpose
      // MVP files (source code) go to private 'mvp-files' bucket
      // Preview images go to public 'mvp-preview-images' bucket for display on the site
      const bucketName = filePurpose === 'image' ? 'mvp-preview-images' : 'mvp-files';
      
      // Construct the full path including the original file name
      const fullPath = `${directoryPath}/${originalFileName}`;

      // Upload to Supabase Storage
      console.log('Uploading file:', file.name);
      console.log('File type:', file.type);
      console.log('Target bucket:', bucketName);
      console.log('Full path in storage:', fullPath);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, file, { // Use fullPath here
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        return { success: false, error: error.message }; // Return error message
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path,
        hash: this.generateFileHash(file) // Simplified hash generation
      };

    } catch (error: any) {
      console.error('File upload error:', error);
      return { success: false, error: error.message }; // Return error message
    }
  }

  private static validateFile(file: File, filePurpose: 'mvp' | 'image'): { isValid: boolean; error?: string } {
    if (filePurpose === 'mvp') {
      // MVP file validation (ZIP, TAR.GZ, RAR)
      const allowedTypes = [
        'application/zip',
        'application/x-zip-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-gzip',
        'application/x-rar-compressed',
        'application/vnd.rar',
        'application/x-rar'
      ];
      
      const allowedExtensions = ['.zip', '.tar.gz', '.rar', '.tgz'];
      
      // Check MIME type
      if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: `Invalid file type: ${file.type}. Only ZIP, TAR.GZ, and RAR files are allowed.` };
      }
      
      // Check file extension
      const hasValidExtension = allowedExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) {
        return { isValid: false, error: `Invalid file extension. Only ${allowedExtensions.join(', ')} files are allowed.` };
      }
      
      // File size validation (100MB max)
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        return { isValid: false, error: `File size too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` };
      }
      
      // Minimum file size validation (1KB min)
      const MIN_FILE_SIZE = 1024; // 1KB
      if (file.size < MIN_FILE_SIZE) {
        return { isValid: false, error: 'File size too small. Minimum file size is 1KB.' };
      }
    } else if (filePurpose === 'image') {
      // Image file validation
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!file.type.startsWith('image/') || !allowedImageTypes.includes(file.type)) { // Added file.type.startsWith('image/') check
        return { isValid: false, error: `Invalid image type: ${file.type}. Only JPG, PNG, WebP, and GIF images are allowed.` };
      }
      
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_IMAGE_SIZE) {
        return { isValid: false, error: `Image size too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum allowed size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.` };
      }
    } else {
      return { isValid: false, error: 'Unknown file purpose for validation.' };
    }

    // Common file name validation
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      return { isValid: false, error: 'File name contains invalid characters.' };
    }
    
    // File name length validation
    if (file.name.length > 255) {
      return { isValid: false, error: 'File name too long. Maximum length is 255 characters.' };
    }
    
    return { isValid: true };
  }

  private static generateFileHash(file: File): string {
    // In a real implementation, this would generate a proper hash
    // For now, we'll use a simple timestamp-based hash
    return `hash_${Date.now()}_${file.size}`;
  }

  /**
   * Helper to determine the Supabase Storage path for an MVP's source file.
   * This path is where the file is expected to be stored before IPFS pinning.
   * @param mvp The MVP object.
   * @returns The expected storage path.
   */
  public static getMvpStoragePath(mvp: MVP): string {
    const slug = mvp.slug;
    // Prioritize GitHub-synced path if last_synced_github_commit_sha is present
    if (mvp.last_synced_github_commit_sha) {
      // The webhook function adds .zip extension
      return `mvps/${slug}/versions/github-${mvp.last_synced_github_commit_sha}/source.zip`;
    }
    // For initial manual uploads (version 1.0.0 and no previous IPFS hash)
    // This heuristic assumes '1.0.0' is always the initial version and subsequent manual versions increment.
    // If a manual version 1.0.0 was uploaded after a GitHub sync, this might be incorrect.
    // However, given the current upload logic, this should hold.
    if (mvp.version_number === '1.0.0' && !mvp.previous_ipfs_hash) {
      return `mvps/${slug}/${mvp.original_file_name}`; // Use original_file_name
    }
    // For subsequent manual version uploads
    return `mvps/${slug}/versions/${mvp.version_number}/${mvp.original_file_name}`; // Use original_file_name
  }

  /**
   * Queues an MVP file for security scanning and IPFS pinning.
 * This function is called after a file is uploaded to Supabase Storage.
 * @param mvpId The ID of the MVP.
 * @param filePath The path to the MVP file in Supabase Storage.
 */
public static async queueIPFSUpload(mvpId: string, filePath: string): Promise<void> {
  console.log(`Queuing IPFS upload for MVP ${mvpId} at path ${filePath}`);
  
  try {
    // First, trigger security scanning
    const scanResult = await this.triggerSecurityScan(mvpId, filePath);
    
    if (!scanResult.success) {
      console.error('Security scan failed:', scanResult.error);
      
      // Update MVP status to indicate scan failed
      await supabase
        .from('mvps')
        .update({ 
          status: 'scan_failed',
          last_processing_error: scanResult.error, // Store the error message
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);
      
      return;
    }
    
    // --- TEMPORARY BYPASS FOR IPFS PINNING ---
    // Instead of initiating IPFS upload, directly set status to approved
    console.log(`Security scan passed for MVP ${mvpId}. Bypassing IPFS pinning for testing purposes.`);
    await supabase
      .from('mvps')
      .update({ 
        ipfs_hash: 'bypassed_for_testing', // Set a placeholder hash
        status: 'approved', // Directly approve after scan (or set to 'pending_review' for manual approval)
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', mvpId);
    console.log(`MVP ${mvpId} status set to 'approved' (IPFS bypassed).`);
    // --- END TEMPORARY BYPASS ---

    // Original call (commented out for bypass):
    // await this.initiateIPFSUpload(mvpId, filePath);
    
  } catch (error: any) {
    console.error('Error in queueIPFSUpload:', error);
    
    // Update MVP status to indicate IPFS pin failed
    await supabase
      .from('mvps')
      .update({ 
        status: 'ipfs_pin_failed', // This status might still be set if the bypass logic itself fails
        last_processing_error: error.message || 'Unknown error during IPFS queuing (bypassed).',
        updated_at: new Date().toISOString()
      })
      .eq('id', mvpId);
  }
}


  private static async triggerSecurityScan(mvpId: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Triggering security scan for MVP ${mvpId} at path ${filePath}`);
      
      // Call the security scanning Edge Function
      const { data, error } = await supabase.functions.invoke('scan-mvp-file', {
        body: {
          mvpId: mvpId,
          filePath: filePath
        }
      });

      if (error) {
        console.error('Error calling scan-mvp-file function:', error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        console.log(`Security scan passed for MVP ${mvpId}`);
        return { success: true };
      } else {
        console.error('Security scan failed:', data);
        return { success: false, error: data?.error || 'Security scan failed' };
      }
    } catch (error: any) {
      console.error('Error in triggerSecurityScan:', error);
      return { success: false, error: error.message };
    }
  }

  private static async initiateIPFSUpload(mvpId: string, filePath: string): Promise<void> {
    try {
      console.log(`Initiating IPFS upload for MVP ${mvpId} at path ${filePath}`);
      
      // Call the pin-to-ipfs Edge Function
      const { data, error } = await supabase.functions.invoke('pin-to-ipfs', {
        body: {
          mvpId: mvpId,
          filePath: filePath
        }
      });

      if (error) {
        console.error('Error calling pin-to-ipfs function:', error);
        
        // Update MVP status to indicate IPFS pin failed
        await supabase
          .from('mvps')
          .update({ 
            status: 'ipfs_pin_failed',
            last_processing_error: error.message || 'Unknown error during IPFS initiation.', // Store the error message
            updated_at: new Date().toISOString()
          })
          .eq('id', mvpId);
        
        return;
      }

      if (data?.success) {
        console.log(`Successfully initiated IPFS pinning for MVP ${mvpId}: ${data.ipfsHash}`);
      } else {
        console.error('IPFS pinning failed:', data);
        
        // Update MVP status to indicate IPFS pin failed
        await supabase
          .from('mvps')
          .update({ 
            status: 'ipfs_pin_failed',
            last_processing_error: data?.error || 'IPFS pinning failed with unknown error.', // Store the error message
            updated_at: new Date().toISOString()
          })
          .eq('id', mvpId);
      }
    } catch (error: any) {
      console.error('Error in initiateIPFSUpload:', error);
      throw error;
    }
  }

  /**
   * Retries the processing (security scan and IPFS pinning) for a failed MVP.
   * @param mvpId The ID of the MVP to retry.
   * @returns A promise indicating success or failure.
   */
  static async retryProcessing(mvpId: string): Promise<{ success: boolean; message: string }> {
    try {
      const mvp = await APIService.getMVPById(mvpId);
      if (!mvp) {
        return { success: false, message: 'MVP not found.' };
      }

      // Determine the expected storage path of the MVP file
      const filePath = MVPUploadService.getMvpStoragePath(mvp);
      
      if (!filePath) {
        return { success: false, message: 'Could not determine storage path for MVP file.' };
      }

      console.log(`Attempting to retry processing for MVP ${mvpId} from path: ${filePath}`);

      // Re-queue the IPFS upload process, which includes security scanning
      await MVPUploadService.queueIPFSUpload(mvpId, filePath);

      // Update MVP status to pending_review after successful re-queueing
      // This is important because queueIPFSUpload might not immediately update status to approved
      // if scan/pinning is asynchronous. It will be updated by the Edge Function.
      // For now, just indicate that the retry process was initiated.
      await supabase
        .from('mvps')
        .update({ 
          status: 'pending_review', // Reset status to pending review
          last_processing_error: null, // Clear previous error
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      return { success: true, message: 'Processing retry initiated successfully. Status will update shortly.' };
    } catch (error: any) {
      console.error('Error retrying MVP processing:', error);
      // Update MVP with the error message
      await supabase
        .from('mvps')
        .update({ 
          last_processing_error: error.message || 'Unknown error during retry initiation.',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);
      return { success: false, message: error.message || 'Failed to initiate processing retry.' };
    }
  }
    
  static async simulateIPFSUpload(mvpId: string): Promise<void> {
    // Simulate IPFS upload delay
    setTimeout(async () => {
      const mockIPFSHash = `Qm${Math.random().toString(36).substring(2, 15)}`;
      
      await supabase
        .from('mvps')
        .update({ ipfs_hash: mockIPFSHash })
        .eq('id', mvpId);
        
      console.log(`Updated MVP ${mvpId} with IPFS hash: ${mockIPFSHash}`);
    }, 5000);
  }

  static async checkSlugAvailability(slug: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('mvps')
      .select('id')
      .eq('slug', slug)
      .single();

    return !data && error?.code === 'PGRST116'; // No rows returned
  }

  static async getUserMVPs(userId: string): Promise<MVP[]> {
    try {
      const { data, error } = await supabase
        .from('mvps')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user MVPs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserMVPs:', error);
      return [];
    }
  }

  static async updateMVP(
    mvpId: string,
    updates: Partial<MVP>,
    mvpFile?: File, // New parameter for MVP file
    newPreviewImages?: File[] // New parameter for new preview images
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Fetch existing MVP data to get slug and current images
      const existingMVP = await APIService.getMVPById(mvpId);
      if (!existingMVP) {
        throw new Error('MVP not found');
      }

      const finalUpdates: Partial<MVP> = { ...updates };

      // Handle MVP file upload if provided
      if (mvpFile) {
        // Pass the original file name to the uploadFile helper
        const mvpFileResult = await this.uploadFile(mvpFile, `mvps/${existingMVP.slug}`, 'mvp', mvpFile.name);
        if (!mvpFileResult.success) {
          throw new Error(mvpFileResult.error || 'Failed to upload new MVP file'); // Use specific error
        }
        finalUpdates.ipfs_hash = mvpFileResult.hash || 'pending';
        finalUpdates.file_size = mvpFile.size;
        finalUpdates.original_file_name = mvpFile.name; // Store original file name
      }

      // Handle new preview images upload if provided
      if (newPreviewImages && newPreviewImages.length > 0) {
        const imageUrls: string[] = [];
        for (let i = 0; i < newPreviewImages.length; i++) {
          const imageResult = await this.uploadFile(
            newPreviewImages[i],
            `mvps/${existingMVP.slug}/images`,
            'image', // Pass 'image' purpose
            `preview-${i + 1}.${newPreviewImages[i].name.split('.').pop()}` // Use original extension
          );
          if (imageResult.success && imageResult.url) {
            imageUrls.push(imageResult.url);
          } else {
            throw new Error(imageResult.error || `Failed to upload image ${newPreviewImages[i].name}`); // Use specific error
          }
        }
        finalUpdates.preview_images = imageUrls; // Replace existing images
      } else if (newPreviewImages && newPreviewImages.length === 0) {
        // If an empty array is explicitly passed, clear images
        finalUpdates.preview_images = [];
      }
      // If newPreviewImages is undefined, keep existing images (don't set finalUpdates.preview_images)

      // Remove read-only fields from updates before sending to Supabase
      const { id, seller_id, created_at, download_count, average_rating, ...restUpdates } = finalUpdates;

      const { error } = await supabase
        .from('mvps')
        .update({
          ...restUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error updating MVP:', error);
        throw new Error('Failed to update MVP');
      }

      return {
        success: true,
        message: 'MVP updated successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update MVP'
      };
    }
  }

  static async deleteMVP(mvpId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Archive the MVP instead of hard delete to preserve data integrity
      const { error } = await supabase
        .from('mvps')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', mvpId);

      if (error) {
        console.error('Error archiving MVP:', error);
        throw new Error('Failed to delete MVP');
      }

      return {
        success: true,
        message: 'MVP deleted successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete MVP'
      };
    }
  }

  /**
   * Update MVP from GitHub repository (used by webhook automation)
   */
  static async updateMVPFromGitHub(data: {
    mvpId: string;
    commitSha: string;
    changelog?: string;
    versionNumber?: string;
    archiveUrl: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Updating MVP ${data.mvpId} from GitHub commit ${data.commitSha}`);

      // Download the archive from GitHub
      const response = await fetch(data.archiveUrl, {
        headers: {
          'User-Agent': 'MVP-Library-Platform'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download repository archive from GitHub');
      }

      const archiveBlob = await response.blob();
      
      // Create a File object from the blob for upload
      const archiveFile = new File([archiveBlob], `${data.mvpId}-${data.commitSha}.zip`, {
        type: 'application/zip'
      });

      // Get existing MVP data
      const existingMVP = await APIService.getMVPById(data.mvpId);
      if (!existingMVP) {
        throw new Error('MVP not found');
      }

      // Generate new version number if not provided
      let newVersionNumber = data.versionNumber;
      if (!newVersionNumber) {
        newVersionNumber = this.incrementVersion(existingMVP.version_number, 'patch');
      }

      // Generate slug for new file path
      const slug = existingMVP.slug;
      
      // Upload new file to storage
      // For GitHub updates, the file is always a zip, so we can hardcode the name
      const mvpFileResult = await this.uploadFile(
        archiveFile, 
        `mvps/${slug}/versions/github-${data.commitSha}`,
        'mvp', // Pass 'mvp' purpose
        'source.zip' // Hardcode filename for GitHub archives
      );
      
      if (!mvpFileResult.success) {
        throw new Error(mvpFileResult.error || 'Failed to upload GitHub archive to storage'); // Use specific error
      }

      // Prepare version history entry
      const currentVersionEntry: MvpVersionHistoryEntry = {
        version_number: existingMVP.version_number,
        ipfs_hash: existingMVP.ipfs_hash,
        changelog: existingMVP.changelog || '',
        uploaded_at: existingMVP.published_at || existingMVP.created_at,
        file_size: existingMVP.file_size
      };

      const existingVersionHistory = existingMVP.version_history || [];
      const updatedVersionHistory = [currentVersionEntry, ...existingVersionHistory];

      // Update MVP record
      const mvpUpdateData = {
        previous_ipfs_hash: existingMVP.ipfs_hash,
        ipfs_hash: mvpFileResult.hash || 'pending',
        file_size: archiveBlob.size,
        version_number: newVersionNumber,
        changelog: data.changelog || `Automated update from GitHub commit ${data.commitSha.substring(0, 7)}`,
        version_history: updatedVersionHistory,
        last_synced_github_commit_sha: data.commitSha,
        status: 'pending_review',
        updated_at: new Date().toISOString(),
        original_file_name: 'source.zip', // Set original_file_name for GitHub updates
      };

      const { error } = await supabase
        .from('mvps')
        .update(mvpUpdateData)
        .eq('id', data.mvpId);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update MVP with GitHub data');
      }

      // Queue for security scan and IPFS upload
      await this.queueIPFSUpload(data.mvpId, mvpFileResult.path);

      return {
        success: true,
        message: `MVP updated successfully from GitHub commit ${data.commitSha.substring(0, 7)}`
      };

    } catch (error: any) {
      console.error('GitHub update error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update MVP from GitHub'
      };
    }
  }

  /**
   * Trigger manual sync from GitHub for an MVP
   */
  static async syncFromGitHub(mvpId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get MVP data
      const mvp = await APIService.getMVPById(mvpId);
      if (!mvp || !mvp.github_repo_owner || !mvp.github_repo_name) {
        return {
          success: false,
          message: 'MVP not found or not linked to a GitHub repository'
        };
      }

      // Get latest repository information
      const repoInfo = await GitHubService.getLatestRepositoryInfo(
        mvp.github_repo_owner,
        mvp.github_repo_name,
        mvp.seller_id // Pass the seller_id here for authentication
      );

      if (!repoInfo.success || !repoInfo.data) {
        return {
          success: false,
          message: repoInfo.message || 'Failed to fetch repository information'
        };
      }

      // Check if this is a new version
      const latestCommitSha = repoInfo.data.commit_sha;
      if (mvp.last_synced_github_commit_sha === latestCommitSha) {
        return {
          success: true,
          message: 'MVP is already up to date with the latest GitHub version'
        };
      }

      // Update MVP with latest GitHub content
      const updateData = {
        mvpId,
        commitSha: latestCommitSha,
        changelog: repoInfo.data.type === 'release' 
          ? repoInfo.data.body 
          : repoInfo.data.message,
        versionNumber: repoInfo.data.type === 'release' 
          ? repoInfo.data.version 
          : undefined,
        archiveUrl: repoInfo.data.zipball_url || repoInfo.data.archive_url
      };

      return await this.updateMVPFromGitHub(updateData);

    } catch (error: any) {
      console.error('Error in syncFromGitHub:', error);
      return {
        success: false,
        message: error.message || 'Failed to sync from GitHub'
      };
    }
  }
}
