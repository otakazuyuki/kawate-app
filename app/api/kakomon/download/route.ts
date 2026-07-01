// app/api/kakomon/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient } from '@/lib/googleDrive';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driveFileId = searchParams.get('id');

    if (!driveFileId) {
      return NextResponse.json({ error: 'ファイルIDが必要です' }, { status: 400 });
    }

    const drive = getDriveClient();

    // 1. Google Driveからファイルの中身（ArrayBuffer）を取得
    const fileResponse = await drive.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    // 2. ファイルのメタデータ（MIMEタイプやファイル名）を取得
    const metaResponse = await drive.files.get({
      fileId: driveFileId,
      fields: 'name, mimeType',
    });

    const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
    const mimeType = metaResponse.data.mimeType || 'application/octet-stream';
    const fileName = metaResponse.data.name || 'download';

    // 3. ブラウザで直接開けるように適切なヘッダーを設定してバイナリを返す
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Download API Error:', error);
    return NextResponse.json({ error: 'ファイルの取得に失敗しました' }, { status: 500 });
  }
}