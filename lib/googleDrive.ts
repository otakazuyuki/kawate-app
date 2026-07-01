// lib/googleDrive.ts
import { google } from 'googleapis';

let driveClient: any = null;

export function getDriveClient() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth2用の環境変数が設定されていません。.env.localを確認してください。');
  }

  // OAuth2クライアントの初期化
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  // リフレッシュトークンをセット（これでアクセス期限が切れても裏で自動更新されます）
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return driveClient;
}