import { Document } from '../types';

const CLIENT_ID = "170103889263-8466jrib2n15r2tc9v49en8sl4a3qcuo.apps.googleusercontent.com";
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

let accessToken: string | null = null;

// Function to convert base64 string to a Blob, necessary for uploading non-text files.
const base64ToBlob = (base64Data: string, contentType: string = '', sliceSize: number = 512): Blob => {
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

/**
 * Initiates the Google OAuth2 flow to get an access token for the Drive API.
 * This will trigger a consent screen popup for the user.
 * @returns A promise that resolves with the access token string.
 */
export const authorizeGoogleDrive = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          accessToken = tokenResponse.access_token;
          resolve(accessToken!);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      reject(new Error("Google Identity Services library is not loaded."));
    }
  });
};

const findOrCreateFolder = async (folderName: string, token: string): Promise<string> => {
    const response = await fetch(`${DRIVE_API_URL}/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)&spaces=drive`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error('Failed to search for AetherVault folder.');
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };
        const createResponse = await fetch(`${DRIVE_API_URL}/files?fields=id`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fileMetadata)
        });
        if (!createResponse.ok) {
            throw new Error('Failed to create AetherVault folder.');
        }
        const createData = await createResponse.json();
        return createData.id;
    }
};

const uploadFile = async (file: Document, folderId: string, token: string): Promise<any> => {
    const fileContent: Blob = file.fileType.startsWith('text/')
        ? new Blob([file.content], { type: file.fileType })
        : base64ToBlob(file.content, file.fileType);

    const metadata = { name: file.name, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileContent, file.name);

    const response = await fetch(`${DRIVE_UPLOAD_URL}/files?uploadType=multipart`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to upload ${file.name}: ${error.error.message}`);
    }
    return response.json();
};

/**
 * Syncs the provided documents to the user's Google Drive in an 'AetherVault' folder.
 * @param documents - An array of Document objects to upload.
 * @param token - The OAuth2 access token.
 */
export const syncFilesToDrive = async (documents: Document[], token: string): Promise<void> => {
    if (!token) throw new Error("Authorization token is missing for sync.");
    if (documents.length === 0) return; // No files to sync

    const folderId = await findOrCreateFolder('AetherVault', token);
    // Upload files sequentially to be gentle on the API and network.
    for (const doc of documents) {
        await uploadFile(doc, folderId, token);
    }
};

/**
 * Revokes the current access token and clears it from memory.
 * Should be called on user logout.
 */
export const clearDriveToken = () => {
    if (window.google && accessToken) {
        window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
};
