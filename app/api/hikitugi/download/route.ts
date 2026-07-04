import { NextRequest, NextResponse } from "next/server";
import { getDriveClient } from "@/lib/googleDrive"; // 過去問と同じ関数をインポート

/**
 * 引き継ぎ資料の閲覧・ダウンロード用API（Webアプリ内で直接表示版）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. URLのクエリパラメータから google_drive_file_id を取得
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "ファイルID(id)が指定されていません。" },
        { status: 400 }
      );
    }

    // 2. 過去問と同じく、裏側でGoogle Driveクライアントを呼び出す
    const drive = getDriveClient();

    // 3. Google Driveからファイルの中身（ArrayBuffer）を裏で取得
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    // 4. ファイルのメタデータ（MIMEタイプやファイル名）を取得
    const metaResponse = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType',
    });

    const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
    const mimeType = metaResponse.data.mimeType || 'application/octet-stream';
    const fileName = metaResponse.data.name || 'download';

    // 5. 適切なヘッダーを設定してアプリ上でバイナリを返す
    // Content-Disposition: inline にすることでブラウザが直接開こうとします
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      },
    });

  } catch (error: any) {
    console.error("ダウンロードAPIエラー:", error);
    return NextResponse.json(
      { success: false, error: "ファイルの取得に失敗しました。" },
      { status: 500 }
    );
  }
}