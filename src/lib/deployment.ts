// src/lib/deployment.ts
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import type { User, MVP, Deployment, OAuthToken } from '../types';

export class DeploymentService {
  /**
   * Initiates the deployment process by creating an initial deployment record
   * and then initiating the GitHub OAuth flow for the buyer.
   * @param userId The ID of the user initiating the deployment.
   * @param mvpId The ID of the MVP being deployed.
   * @param repoName The desired name for the new GitHub repository.
   * @returns An object containing success status, a message, the deployment ID, and the GitHub OAuth URL if redirection is needed.
   */
  static async startDeployment(
    userId: string,
    mvpId: string,
    repoName: string
  ): Promise<{ success: boolean; message: string; deployment_id?: string; github_auth_url?: string }> {
    try {
      // 1. Create Initial Deployment Record
      const { data: newDeployment, error: insertError } = await supabase
        .from('deployments')
        .insert({
          user_id: userId,
          mvp_id: mvpId,
          repo_name: repoName,
          status: 'initializing', // Initial status
        })
        .select('id')
        .single();

      if (insertError || !newDeployment) {
        console.error('Error creating initial deployment record:', insertError);
        throw new Error('Failed to create initial deployment record.');
      }

      const deploymentId = newDeployment.id;
      console.log(`Initial deployment record created with ID: ${deploymentId}`);

      // 2. Initiate GitHub OAuth flow for the buyer
      const { data, error } = await supabase.functions.invoke('initiate-buyer-github-oauth', {
        body: {
          user_id: userId,
          mvp_id: mvpId,
          deployment_id: deploymentId, // Pass the newly created deployment ID
        },
      });

      if (error) {
        console.error('Error invoking initiate-buyer-github-oauth:', error);
        // Update deployment status to failed if OAuth initiation fails
        await supabase.from('deployments').update({
          status: 'failed',
          error_message: `GitHub OAuth initiation failed: ${error.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', deploymentId);
        throw new Error(error.message || 'Failed to initiate GitHub authentication.');
      }

      return {
        success: true,
        message: 'GitHub authentication initiated.',
        deployment_id: deploymentId,
        github_auth_url: data.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in startDeployment:', error);
      return {
        success: false,
        message: error.message || 'Failed to start deployment process.',
      };
    }
  }

  /**
   * Completes the GitHub OAuth process for the buyer.
   * @param code The authorization code from GitHub.
   * @param state The state parameter used for CSRF protection.
   * @returns An object containing success status, a message, GitHub username, MVP ID, and deployment ID.
   */
  static async completeGitHubAuth(
    code: string,
    state: string
  ): Promise<{ success: boolean; message: string; github_username?: string; mvp_id?: string; deployment_id?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-buyer-github-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error invoking handle-buyer-github-callback:', error);
        throw new Error(error.message || 'Failed to complete GitHub authentication.');
      }

      return {
        success: true,
        message: 'GitHub authentication completed successfully.',
        github_username: data.github_username,
        mvp_id: data.mvp_id,
        deployment_id: data.deployment_id,
      };
    } catch (error: any) {
      console.error('Error in completeGitHubAuth:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete GitHub authentication.',
      };
    }
  }

  /**
   * Creates a GitHub repository for the buyer and pushes the MVP code.
   * @param userId The ID of the user.
   * @param mvpId The ID of the MVP.
   * @param deploymentId The ID of the deployment record.
   * @param repoName The desired name for the GitHub repository.
   * @returns An object containing success status, a message, and the GitHub repository URL.
   */
  static async createRepoAndPushMVP(
    userId: string,
    mvpId: string,
    deploymentId: string,
    repoName: string
  ): Promise<{ success: boolean; message: string; github_repo_url?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('create-buyer-repo-and-push-mvp', {
        body: {
          user_id: userId,
          mvp_id: mvpId,
          deployment_id: deploymentId,
          repo_name: repoName,
        },
      });

      if (error) {
        console.error('Error invoking create-buyer-repo-and-push-mvp:', error);
        // Update deployment status to failed
        await supabase.from('deployments').update({
          status: 'failed',
          error_message: `Repo creation failed: ${error.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', deploymentId);
        throw new Error(error.message || 'Failed to create GitHub repository and push MVP.');
      }

      return {
        success: true,
        message: 'GitHub repository created and MVP code pushed.',
        github_repo_url: data.github_repo_url,
      };
    } catch (error: any) {
      console.error('Error in createRepoAndPushMVP:', error);
      return {
        success: false,
        message: error.message || 'Failed to create GitHub repository and push MVP.',
      };
    }
  }

  /**
   * Initiates the Netlify OAuth process for the buyer.
   * @param userId The ID of the user.
   * @param deploymentId The ID of the deployment record.
   * @param githubRepoUrl The URL of the GitHub repository.
   * @returns An object containing success status, a message, and the Netlify OAuth URL.
   */
  static async initiateNetlifyAuth(
    userId: string,
    deploymentId: string,
    githubRepoUrl: string
  ): Promise<{ success: boolean; message: string; netlify_auth_url?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-netlify-oauth', {
        body: {
          user_id: userId,
          deployment_id: deploymentId,
          github_repo_url: githubRepoUrl,
        },
      });

      if (error) {
        console.error('Error invoking initiate-netlify-oauth:', error);
        // Update deployment status to failed
        await supabase.from('deployments').update({
          status: 'failed',
          error_message: `Netlify OAuth initiation failed: ${error.message}`,
          updated_at: new Date().toISOString(),
        }).eq('id', deploymentId);
        throw new Error(error.message || 'Failed to initiate Netlify authentication.');
      }

      return {
        success: true,
        message: 'Netlify authentication initiated.',
        netlify_auth_url: data.netlify_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateNetlifyAuth:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate Netlify authentication.',
      };
    }
  }

  /**
   * Completes the Netlify OAuth process and triggers site creation.
   * @param code The authorization code from Netlify.
   * @param state The state parameter used for CSRF protection.
   * @returns An object containing success status, a message, Netlify site URL, and deployment ID.
   */
  static async completeNetlifyAuth(
    code: string,
    state: string
  ): Promise<{ success: boolean; message: string; netlify_site_url?: string; deployment_id?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-netlify-callback', {
        body: { code, state },
      });

      if (error) {
        console.error('Error invoking handle-netlify-callback:', error);
        throw new Error(error.message || 'Failed to complete Netlify authentication.');
      }

      return {
        success: true,
        message: 'Netlify site deployed successfully!',
        netlify_site_url: data.site_url,
        deployment_id: data.deployment_id,
      };
    } catch (error: any) {
      console.error('Error in completeNetlifyAuth:', error);
      return {
        success: false,
        message: error.message || 'Failed to complete Netlify authentication.',
      };
    }
  }

  /**
   * Triggers the external deployment worker to process the MVP.
   * @param deploymentId The ID of the deployment record.
   * @returns An object indicating success or failure.
   */
  static async triggerDeploymentWorker(
    deploymentId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('trigger-deployment-worker', {
        body: { deployment_id: deploymentId },
      });

      if (error) {
        console.error('Error invoking trigger-deployment-worker:', error);
        throw new Error(error.message || 'Failed to trigger deployment worker.');
      }

      return {
        success: true,
        message: data.message || 'Deployment worker triggered successfully.',
      };
    } catch (error: any) {
      console.error('Error in triggerDeploymentWorker:', error);
      return {
        success: false,
        message: error.message || 'Failed to trigger deployment worker.',
      };
    }
  }

  /**
   * Retrieves the status of a deployment.
   * @param deploymentId The ID of the deployment record.
   * @returns An object containing the deployment status and details.
   */
  static async getDeploymentStatus(
    deploymentId: string
  ): Promise<{ status: string; netlify_site_url?: string; error_message?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('get-deployment-status', {
        body: { id: deploymentId },
      });

      if (error) {
        console.error('Error invoking get-deployment-status:', error);
        throw new Error(error.message || 'Failed to get deployment status.');
      }

      return {
        status: data.status,
        netlify_site_url: data.netlify_site_url,
        error_message: data.error_message,
      };
    } catch (error: any) {
      console.error('Error in getDeploymentStatus:', error);
      return {
        status: 'failed',
        error_message: error.message || 'Failed to retrieve deployment status.',
      };
    }
  }

  /**
   * Retrieves all deployments for a given user.
   * @param userId The ID of the user.
   * @returns An object containing success status, a message, and a list of deployments.
   */
  static async getUserDeployments(
    userId: string
  ): Promise<{ success: boolean; message: string; deployments?: Deployment[] }> {
    try {
      const { data, error } = await supabase
        .from('deployments')
        .select(`
          *,
          mvps(title, slug, preview_images)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user deployments:', error);
        throw new Error('Failed to fetch user deployments.');
      }

      return {
        success: true,
        message: 'User deployments fetched successfully.',
        deployments: data as Deployment[],
      };
    } catch (error: any) {
      console.error('Error in getUserDeployments:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch user deployments.',
      };
    }
  }

  /**
   * Initiates a general GitHub OAuth flow for a user, not tied to a specific MVP deployment.
   * This is used for connecting a user's GitHub account for general purposes (e.g., in user settings).
   * @param userId The ID of the user initiating the OAuth flow.
   * @returns An object containing success status, a message, and the GitHub OAuth URL.
   */
  static async initiateGeneralGitHubAuth(
    userId: string
  ): Promise<{ success: boolean; message: string; github_auth_url?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('initiate-github-oauth', {
        body: { user_id: userId },
      });

      if (error) {
        console.error('Error invoking initiate-github-oauth:', error);
        throw new Error(error.message || 'Failed to initiate GitHub authentication.');
      }

      return {
        success: true,
        message: 'GitHub authentication initiated.',
        github_auth_url: data.github_auth_url,
      };
    } catch (error: any) {
      console.error('Error in initiateGeneralGitHubAuth:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate GitHub authentication.',
      };
    }
  }
}
