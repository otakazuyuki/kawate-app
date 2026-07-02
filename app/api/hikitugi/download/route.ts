import { NextRequest, NextResponse } from "next/server";

/**
 * 引き継ぎ資料の閲覧・ダウンロード用API
 * クライアントの <a> タグ（GETリクエスト）からファイルIDを受け取り、
 * Google Driveの公式プレビュー画面へ安全にリダイレクトします。
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

    // 💡【Word・Excel・PDFすべてを解決する極意】
    // Google Drive上のファイルをブラウザで綺麗にプレビューするための公式URLを生成します。
    // このURLにリダイレクトさせることで、PDFだけでなく、Word(.docx)やExcel(.xlsx)も
    // Googleドキュメント/スプレッドシートの高機能なビューアとしてブラウザ上でそのまま閲覧・印刷・DL可能になります！
    const googleDrivePreviewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

    // 2. 生成したプレビューURLへユーザーをリダイレクト（別タブで開く）
    return NextResponse.redirect(googleDrivePreviewUrl);

  } catch (error: any) {
    console.error("ダウンロードリダイレクトエラー:", error);
    return NextResponse.json(
      { success: false, error: "プレビューURLの生成に失敗しました。" },
      { status: 500 }
    );
  }
}